'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { VolumeX, Volume2 } from 'lucide-react'

interface PeerSignal {
  senderId: string
  senderSessionId: string
  targetId: string
  targetSessionId: string
  signal: any
}

// React component to correctly handle the audio element lifecycle and mobile browser playback
function AudioPlayer({ 
  stream, 
  peerId, 
  onAutoplayBlocked 
}: { 
  stream: MediaStream
  peerId: string
  onAutoplayBlocked: () => void 
}) {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream
      
      const tryPlay = async () => {
        if (!audioRef.current) return
        try {
          await audioRef.current.play()
          console.log(`[Voice] ▶️ Audio playing for peer ${peerId}`)
        } catch (err) {
          console.warn(`[Voice] ⚠️ Autoplay blocked for peer ${peerId}`, err)
          onAutoplayBlocked()
        }
      }
      
      tryPlay()
    }
  }, [stream, peerId, onAutoplayBlocked])

  // CRITICAL: NEVER use display:none (hidden) for audio elements. 
  // Mobile browsers strictly block audio playing from "hidden" DOM subtrees.
  return (
    <audio 
      ref={audioRef} 
      autoPlay 
      playsInline 
      className="w-0 h-0 opacity-0 absolute pointer-events-none" 
      aria-hidden="true" 
    />
  )
}

export function VoiceChat({ teamId }: { teamId: string }) {
  const { isVoiceJoined, currentUser, setVoiceJoined, setTalkingUsers } = useAppStore()
  const supabase = createClient()

  const sessionId = useRef(Math.random().toString(36).substring(7))
  const channelRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})
  
  // Replace direct DOM mutation with React State for audio streams
  const [activeAudioStreams, setActiveAudioStreams] = useState<Record<string, MediaStream>>({})
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const vadRef = useRef<{ audioCtx: AudioContext; intervalId: ReturnType<typeof setInterval> } | null>(null)
  const isSubscribedRef = useRef(false)
  const isVoiceJoinedRef = useRef(false)
  const iceCandidateQueues = useRef<Record<string, RTCIceCandidateInit[]>>({})
  
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  // Explicit sync of ref for stable callbacks
  useEffect(() => {
    isVoiceJoinedRef.current = isVoiceJoined
  }, [isVoiceJoined])

  // ── Channel Setup (STABLE) ──
  useEffect(() => {
    if (!currentUser || !teamId) return

    const channel = supabase.channel(`voice-engine-${teamId}`)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users: string[] = []
        const remoteSessions: string[] = []

        Object.keys(state).forEach(key => {
          const presences = state[key] as any[]
          presences.forEach(p => {
            if (p.userId) { // Track EVERYONE, not just isVoice!
              if (!users.includes(p.userId) && p.isVoice) users.push(p.userId)
              const pSid = p.sessionId
              if (pSid && pSid !== sessionId.current) {
                remoteSessions.push(pSid)
              }
            }
          })
        })

        // Connect to ALL remote sessions immediately (listen-only if we don't have mic)
        remoteSessions.forEach(pSid => {
          if (!peerConnections.current[pSid]) {
            if (sessionId.current < pSid) {
              initiateCall(pSid)
            }
          }
        })
      })
      .on('broadcast', { event: 'voice-signal' }, async ({ payload }: { payload: PeerSignal }) => {
        if (payload.senderSessionId === sessionId.current) return
        if (payload.targetSessionId !== sessionId.current) return
        // We universally accept incoming calls so we can hear them!

        const { senderSessionId, signal } = payload

        if (signal.type === 'offer') {
          await handleOffer(senderSessionId, signal.sdp)
        } else if (signal.type === 'answer') {
          await handleAnswer(senderSessionId, signal.sdp)
        } else if (signal.type === 'ice') {
          await handleIceCandidate(senderSessionId, signal.candidate)
        }
      })
      .on('broadcast', { event: 'voice-talking' }, ({ payload }) => {
        const { userId } = payload
        if (userId === currentUser.id) return

        useAppStore.getState().setTalkingUsers((prev: string[]) =>
          prev.includes(userId) ? prev : [...prev, userId]
        )

        // Clear existing timeout if any, then set a new one
        if ((window as any)[`vt_${userId}`]) clearTimeout((window as any)[`vt_${userId}`])
        ;(window as any)[`vt_${userId}`] = setTimeout(() => {
          useAppStore.getState().setTalkingUsers((prev: string[]) =>
            prev.filter((id: string) => id !== userId)
          )
        }, 2500)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true
          await channel.track({
            isVoice: isVoiceJoinedRef.current,
            sessionId: sessionId.current,
            userId: currentUser.id
          })
        }
      })

    return () => {
      isSubscribedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [teamId, currentUser?.id])

  // ── Join/Leave Voice ──
  useEffect(() => {
    if (!currentUser) return

    if (isVoiceJoined) {
      startLocalStream().then(stream => {
        if (stream) {
          startVAD(stream)
          startRecording(stream)
          
          // Add newly acquired tracks to all existing peer connections (triggers onnegotiationneeded)
          Object.values(peerConnections.current).forEach(pc => {
            stream.getTracks().forEach(track => {
              const senders = pc.getSenders()
              if (!senders.find(s => s.track === track)) {
                pc.addTrack(track, stream)
              }
            })
          })
        }

        if (channelRef.current && isSubscribedRef.current) {
          channelRef.current.track({
            isVoice: true,
            sessionId: sessionId.current,
            userId: currentUser.id
          })
        }

        const retryScan = () => {
          if (!channelRef.current) return
          const state = channelRef.current.presenceState()
          Object.keys(state).forEach((key: string) => {
            const presences = state[key] as any[]
            presences.forEach((p: any) => {
              if (p.sessionId && p.sessionId !== sessionId.current) {
                const pSid = p.sessionId
                if (!peerConnections.current[pSid] && sessionId.current < pSid) {
                  initiateCall(pSid)
                }
              }
            })
          })
        }

        // Retry connection scans to ensure everyone is peered
        setTimeout(retryScan, 1000)
        setTimeout(retryScan, 3000)
      })
    } else {
      stopVAD()
      stopRecording()
      
      // Stop pushing local tracks to peers but DO NOT destroy the connections! We want to keep listening.
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
        Object.values(peerConnections.current).forEach(pc => {
          pc.getSenders().forEach(sender => {
            if (sender.track) pc.removeTrack(sender)
          })
        })
        localStreamRef.current = null
      }
      setTalkingUsers([])

      if (channelRef.current && isSubscribedRef.current) {
        channelRef.current.track({
          isVoice: false,
          sessionId: sessionId.current,
          userId: currentUser.id
        })
      }
    }
  }, [isVoiceJoined, currentUser])

  // Clean-up on unmount entirely
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
      Object.values(peerConnections.current).forEach(pc => pc.close())
    }
  }, [])

  // ── Mic stream ──
  async function startLocalStream() {
    try {
      // Mobile Safari specific optimizations for capturing audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      localStreamRef.current = stream
      return stream
    } catch (err) {
      console.warn('[Voice] Mic access denied, joining as listener')
      return null
    }
  }

  // ── Voice Activity Detection (VAD) ──
  function startVAD(stream: MediaStream) {
    if (!currentUser) return
    stopVAD()

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let isTalking = false
    let silenceFrames = 0
    let lastBroadcast = 0
    const userId = currentUser.id

    const intervalId = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
      const avg = sum / dataArray.length
      const now = Date.now()

      if (avg > 5) {
        silenceFrames = 0
        if (!isTalking) {
          isTalking = true
          if (now - lastBroadcast > 500 && channelRef.current && isSubscribedRef.current) {
            lastBroadcast = now
            channelRef.current.send({ type: 'broadcast', event: 'voice-talking', payload: { userId } })
          }
          useAppStore.getState().setTalkingUsers((prev: string[]) =>
            prev.includes(userId) ? prev : [...prev, userId]
          )
        } else if (now - lastBroadcast > 1500 && channelRef.current && isSubscribedRef.current) {
          lastBroadcast = now
          channelRef.current.send({ type: 'broadcast', event: 'voice-talking', payload: { userId } })
        }
      } else {
        silenceFrames++
        if (silenceFrames > 25 && isTalking) {
          isTalking = false
          useAppStore.getState().setTalkingUsers((prev: string[]) =>
            prev.filter((id: string) => id !== userId)
          )
        }
      }
    }, 100)

    if (audioCtx.state === 'suspended') {
      // iOS WebAudio start-up requirement
      audioCtx.resume()
    }
    vadRef.current = { audioCtx, intervalId }
  }

  function stopVAD() {
    if (vadRef.current) {
      clearInterval(vadRef.current.intervalId)
      vadRef.current.audioCtx.close().catch(() => {})
      vadRef.current = null
    }
  }

  // ── WebRTC Peer Connections ──
  function createPeerConnection(peerId: string) {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId]

    iceCandidateQueues.current[peerId] = []

    // Provide robust TURN servers for mobile carrier NAT traversal
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { 
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        { 
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        { 
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    })

    // Handle dynamic renegotiation (when mic is turned on/off)
    pc.onnegotiationneeded = async () => {
      // Don't negotiate if signaling state isn't stable, wait for it to stabilize
      if (pc.signalingState !== 'stable') return
      
      console.log(`[Voice] 🔄 Renegotiating with ${peerId}`)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        channelRef.current?.send({
          type: 'broadcast',
          event: 'voice-signal',
          payload: {
            senderId: currentUser?.id,
            senderSessionId: sessionId.current,
            targetId: 'ANY',
            targetSessionId: peerId,
            signal: { type: 'offer', sdp: offer.sdp }
          }
        })
      } catch (e) {
        console.error('[Voice] Renegotiation failed', e)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`[Voice] ICE state for ${peerId}: ${pc.iceConnectionState}`)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log(`[Voice] ✅ Connected to peer ${peerId}`)
      }
      if (pc.iceConnectionState === 'failed') {
        console.log(`[Voice] ❌ Connection failed to ${peerId}, retrying...`)
        cleanupPeer(peerId)
        if (sessionId.current < peerId) {
          setTimeout(() => {
            if (!peerConnections.current[peerId]) initiateCall(peerId)
          }, 2000)
        }
      }
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        cleanupPeer(peerId)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'voice-signal',
          payload: {
            senderId: currentUser?.id,
            senderSessionId: sessionId.current,
            targetSessionId: peerId,
            signal: { type: 'ice', candidate: event.candidate.toJSON() }
          }
        })
      }
    }

    pc.ontrack = (event) => {
      console.log(`[Voice] 🔊 Got audio track from ${peerId}`)
      if (event.streams && event.streams[0]) {
        // Automatically inject the stream into React state to mount <audio> tag
        setActiveAudioStreams(prev => ({
          ...prev,
          [peerId]: event.streams[0]
        }))
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    } else {
      pc.addTransceiver('audio', { direction: 'recvonly' })
    }

    peerConnections.current[peerId] = pc
    return pc
  }

  function cleanupPeer(peerId: string) {
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close()
      delete peerConnections.current[peerId]
    }
    
    // Remove stream from UI map to destroy <audio> tag cleanly
    setActiveAudioStreams(prev => {
      const next = { ...prev }
      delete next[peerId]
      return next
    })
    
    delete iceCandidateQueues.current[peerId]
  }

  async function flushIceCandidates(peerId: string) {
    const pc = peerConnections.current[peerId]
    const queue = iceCandidateQueues.current[peerId]
    if (!pc || !queue) return

    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        // ignore
      }
    }
    iceCandidateQueues.current[peerId] = []
  }

  async function initiateCall(peerId: string) {
    if (!currentUser) return
    if (sessionId.current > peerId) return

    console.log(`[Voice] 📞 Initiating call to ${peerId}`)
    const pc = createPeerConnection(peerId)
    
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      channelRef.current?.send({
        type: 'broadcast',
        event: 'voice-signal',
        payload: {
          senderId: currentUser.id,
          senderSessionId: sessionId.current,
          targetId: 'ANY',
          targetSessionId: peerId,
          signal: { type: 'offer', sdp: offer.sdp }
        }
      })
    } catch (e) {
      console.error('[Voice] Failed to create offer:', e)
    }
  }

  async function handleOffer(senderId: string, sdp: string) {
    if (!currentUser) return
    console.log(`[Voice] 📨 Got offer from ${senderId}`)

    if (peerConnections.current[senderId] && peerConnections.current[senderId].signalingState !== 'stable') {
      cleanupPeer(senderId)
    }

    const pc = createPeerConnection(senderId)

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }))
      await flushIceCandidates(senderId)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      channelRef.current?.send({
        type: 'broadcast',
        event: 'voice-signal',
        payload: {
          senderId: currentUser.id,
          senderSessionId: sessionId.current,
          targetId: 'ANY',
          targetSessionId: senderId,
          signal: { type: 'answer', sdp: answer.sdp }
        }
      })
      console.log(`[Voice] ✉️ Sent answer to ${senderId}`)
    } catch (e) {
      console.error('[Voice] Failed to handle offer:', e)
    }
  }

  async function handleAnswer(senderId: string, sdp: string) {
    const pc = peerConnections.current[senderId]
    if (!pc) return
    console.log(`[Voice] 📨 Got answer from ${senderId}`)

    if (pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
        await flushIceCandidates(senderId)
      } catch (e) {
        console.error('[Voice] Failed to handle answer:', e)
      }
    }
  }

  async function handleIceCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = peerConnections.current[senderId]
    if (!pc) return

    if (!pc.remoteDescription) {
      if (!iceCandidateQueues.current[senderId]) {
        iceCandidateQueues.current[senderId] = []
      }
      iceCandidateQueues.current[senderId].push(candidate)
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      // ignore
    }
  }

  // ── Recording ──
  function startRecording(stream: MediaStream) {
    if (mediaRecorderRef.current) return
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        uploadRecording(blob)
        audioChunksRef.current = []
      }

      recorder.start()
      recordingIntervalRef.current = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.stop()
          recorder.start()
        }
      }, 30000)
    } catch (err) {
      // Silent
    }
  }

  function stopRecording() {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
  }

  async function uploadRecording(blob: Blob) {
    if (!currentUser || !teamId) return
    const fileName = `${teamId}/${currentUser.id}/${Date.now()}.webm`
    try {
      const { error: storageError } = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, blob)
      if (storageError) throw storageError

      await supabase
        .from('voice_recordings')
        .insert({
          team_id: teamId,
          user_id: currentUser.id,
          file_url: fileName,
          duration: 30
        })
    } catch (err) {
      // Silent
    }
  }

  // Unlock all audio manually when user clicks
  function forceUnlockAudio() {
    setAutoplayBlocked(false)
    const audioTags = document.querySelectorAll('audio')
    audioTags.forEach(a => {
      if (a.id.startsWith('voice-audio-')) {
        a.play().catch(() => {})
      }
    })
  }

  return (
    <>
      {Object.entries(activeAudioStreams).map(([peerId, stream]) => (
        <AudioPlayer 
          key={peerId} 
          stream={stream} 
          peerId={peerId}
          onAutoplayBlocked={() => setAutoplayBlocked(true)}
        />
      ))}

      {autoplayBlocked && (
        <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5">
          <Button 
            variant="destructive" 
            onClick={forceUnlockAudio}
            className="shadow-xl rounded-full px-6 flex items-center gap-2"
          >
            <VolumeX className="w-5 h-5" />
            <span className="font-bold">Tap to unmute Voice</span>
          </Button>
        </div>
      )}
    </>
  )
}
