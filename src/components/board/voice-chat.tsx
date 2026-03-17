'use client'

import { useEffect, useState, useRef } from 'react'
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

  const sessionId = useRef(Math.random().toString(36).substring(7))
  const channelRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})
  const audioElements = useRef<Record<string, HTMLAudioElement>>({})
  const audioContainerRef = useRef<HTMLDivElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const vadRef = useRef<{ audioCtx: AudioContext; intervalId: ReturnType<typeof setInterval> } | null>(null)
  const isSubscribedRef = useRef(false)
  const isVoiceJoinedRef = useRef(false)
  const iceCandidateQueues = useRef<Record<string, RTCIceCandidateInit[]>>({})

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
              if (!users.includes(p.userId) && p.isVoice) users.push(p.userId) // Only show in UI if mic is on
              const pSid = p.sessionId
              if (pSid && pSid !== sessionId.current) {
                remoteSessions.push(pSid)
              }
            }
          })
        })

        // We only use activeVoiceUsers for the UI "talking" indication implicitly elsewhere if needed
        // but setTalkingUsers is the main one.

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
      // Actually destroy everything on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
      Object.values(peerConnections.current).forEach(pc => pc.close())
      Object.values(audioElements.current).forEach(el => {
        el.srcObject = null
        el.remove()
      })
    }
  }, [])

  // ── Mic stream ──
  async function startLocalStream() {
    try {
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

  // ── VAD ──
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

    if (audioCtx.state === 'suspended') audioCtx.resume()
    vadRef.current = { audioCtx, intervalId }
  }

  function stopVAD() {
    if (vadRef.current) {
      clearInterval(vadRef.current.intervalId)
      vadRef.current.audioCtx.close()
      vadRef.current = null
    }
  }

  // ── WebRTC Peer Connections ──
  function createPeerConnection(peerId: string) {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId]

    iceCandidateQueues.current[peerId] = []

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' } // Fallback STUN
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
      console.log(`[Voice] 🔊 Got audio track from ${peerId}`, event.streams)
      if (audioElements.current[peerId]) {
        audioElements.current[peerId].srcObject = null
        audioElements.current[peerId].remove()
        delete audioElements.current[peerId]
      }

      const audio = document.createElement('audio')
      audio.autoplay = true
      audio.setAttribute('playsinline', '')
      audio.volume = 1.0
      audio.id = `voice-audio-${peerId}`
      audio.srcObject = event.streams[0]
      document.body.appendChild(audio)
      audioElements.current[peerId] = audio

      const tryPlay = () => {
        audio.play().then(() => {
          console.log(`[Voice] ▶️ Audio playing for ${peerId}`)
        }).catch((err) => {
          console.warn(`[Voice] ⚠️ Autoplay blocked for ${peerId}, waiting for user interaction`, err)
          const resume = () => {
            audio.play()
            document.removeEventListener('click', resume)
            document.removeEventListener('touchstart', resume)
          }
          document.addEventListener('click', resume, { once: true })
          document.addEventListener('touchstart', resume, { once: true })
        })
      }
      tryPlay()
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
    if (audioElements.current[peerId]) {
      audioElements.current[peerId].srcObject = null
      audioElements.current[peerId].remove()
      delete audioElements.current[peerId]
    }
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close()
      delete peerConnections.current[peerId]
    }
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

  return null
}
