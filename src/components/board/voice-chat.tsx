'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'

interface PeerSignal {
  senderId: string
  senderSessionId: string
  targetId: string
  targetSessionId: string
  signal: any
}

export function VoiceChat({ teamId }: { teamId: string }) {
  const { isVoiceJoined, currentUser, setVoiceJoined, setTalkingUsers } = useAppStore()
  const supabase = createClient()
  
  const [activeVoiceUsers, setActiveVoiceUsers] = useState<string[]>([])
  const sessionId = useRef(Math.random().toString(36).substring(7))
  const channelRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})
  const audioElements = useRef<Record<string, HTMLAudioElement>>({})
  const audioContainerRef = useRef<HTMLDivElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const vadRef = useRef<{ audioCtx: AudioContext; animFrame: number } | null>(null)

  // ── Channel Setup (signaling + presence + talking) ──
  useEffect(() => {
    if (!currentUser || !teamId) return

    const channel = supabase.channel(`voice-engine-${teamId}`)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users: string[] = []
        Object.keys(state).forEach(key => {
          const presences = state[key] as any[]
          presences.forEach(p => {
            if (p?.isVoice && p.userId) {
              if (!users.includes(p.userId)) users.push(p.userId)
              const pSid = p.sessionId
              if (isVoiceJoined && pSid !== sessionId.current && !peerConnections.current[pSid]) {
                if (sessionId.current < pSid) {
                  initiateCall(pSid)
                }
              }
            }
          })
        })
        setActiveVoiceUsers(users)
      })
      .on('broadcast', { event: 'voice-signal' }, async ({ payload }: { payload: PeerSignal }) => {
        if (payload.senderSessionId === sessionId.current) return
        if (payload.targetSessionId !== sessionId.current) return
        
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
        
        if ((window as any)[`vt_${userId}`]) clearTimeout((window as any)[`vt_${userId}`])
        ;(window as any)[`vt_${userId}`] = setTimeout(() => {
          useAppStore.getState().setTalkingUsers((prev: string[]) => 
            prev.filter((id: string) => id !== userId)
          )
        }, 2500)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ 
            isVoice: isVoiceJoined, 
            sessionId: sessionId.current,
            userId: currentUser.id 
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, currentUser?.id, isVoiceJoined])

  // ── Join/Leave Voice ──
  useEffect(() => {
    if (!currentUser) return

    if (isVoiceJoined) {
      // Get mic, then start VAD + recording
      startLocalStream().then(stream => {
        if (stream) {
          startVAD(stream)
          startRecording(stream)
        }
        // Re-track presence as voice-active
        channelRef.current?.track({ 
          isVoice: true, 
          sessionId: sessionId.current,
          userId: currentUser.id 
        })
      })
    } else {
      stopVAD()
      stopLocalStream()
      stopRecording()
    }
  }, [isVoiceJoined, currentUser])

  // ── Mic stream ──
  async function startLocalStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      return stream
    } catch (err) {
      return null
    }
  }

  function stopLocalStream() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    Object.values(peerConnections.current).forEach(pc => pc.close())
    peerConnections.current = {}
    Object.values(audioElements.current).forEach(el => el.remove())
    audioElements.current = {}
    setTalkingUsers([])
  }

  // ── Voice Activity Detection (runs AFTER mic is acquired) ──
  function startVAD(stream: MediaStream) {
    if (!currentUser) return
    stopVAD() // clean up any previous

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let isTalking = false
    let silenceFrames = 0
    const userId = currentUser.id

    const check = () => {
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
      const avg = sum / dataArray.length

      if (avg > 5) {
        silenceFrames = 0
        if (!isTalking) {
          isTalking = true
          channelRef.current?.send({
            type: 'broadcast',
            event: 'voice-talking',
            payload: { userId }
          })
          useAppStore.getState().setTalkingUsers((prev: string[]) => 
            prev.includes(userId) ? prev : [...prev, userId]
          )
        } else if (Math.random() > 0.7) {
          // Keep-alive broadcasts while talking
          channelRef.current?.send({
            type: 'broadcast',
            event: 'voice-talking',
            payload: { userId }
          })
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

      const frame = requestAnimationFrame(check)
      vadRef.current = { audioCtx, animFrame: frame }
    }

    if (audioCtx.state === 'suspended') audioCtx.resume()
    const frame = requestAnimationFrame(check)
    vadRef.current = { audioCtx, animFrame: frame }
  }

  function stopVAD() {
    if (vadRef.current) {
      cancelAnimationFrame(vadRef.current.animFrame)
      vadRef.current.audioCtx.close()
      vadRef.current = null
    }
  }

  // ── WebRTC Peer Connections ──
  function createPeerConnection(peerId: string) {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId]

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    })

    pc.oniceconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        if (audioElements.current[peerId]) {
          audioElements.current[peerId].remove()
          delete audioElements.current[peerId]
        }
        pc.close()
        delete peerConnections.current[peerId]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'voice-signal',
          payload: {
            senderId: currentUser?.id,
            senderSessionId: sessionId.current,
            targetSessionId: peerId,
            signal: { type: 'ice', candidate: event.candidate }
          }
        })
      }
    }

    pc.ontrack = (event) => {
      if (!audioElements.current[peerId]) {
        const audio = new Audio()
        audio.autoplay = true
        audio.volume = 1.0
        audioElements.current[peerId] = audio
        if (audioContainerRef.current) {
          audioContainerRef.current.appendChild(audio)
        }
      }
      audioElements.current[peerId].srcObject = event.streams[0]
      audioElements.current[peerId].play().catch(() => {
        const resume = () => {
          audioElements.current[peerId]?.play()
          window.removeEventListener('click', resume)
        }
        window.addEventListener('click', resume)
      })
    }

    // Add local tracks if we have mic, otherwise receive-only
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

  async function initiateCall(peerId: string) {
    if (!currentUser) return
    if (sessionId.current > peerId) return

    const pc = createPeerConnection(peerId)
    if (pc.signalingState !== 'stable') return

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
      // Silent
    }
  }

  async function handleOffer(senderId: string, sdp: string) {
    if (!currentUser) return
    const pc = createPeerConnection(senderId)
    
    if (pc.signalingState !== 'stable') return

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }))
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
    } catch (e) {
      // Silent
    }
  }

  async function handleAnswer(senderId: string, sdp: string) {
    const pc = peerConnections.current[senderId]
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
      } catch (e) {
        // Silent
      }
    }
  }

  async function handleIceCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = peerConnections.current[senderId]
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        // Silent
      }
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

  return (
    <div ref={audioContainerRef} className="hidden pointer-events-none" aria-hidden="true" />
  )
}
