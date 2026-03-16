'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'

interface PeerSignal {
  senderId: string
  targetId: string
  signal: any
}

export function VoiceChat({ teamId }: { teamId: string }) {
  const { isVoiceJoined, currentUser, setVoiceJoined } = useAppStore()
  const { toast } = useToast()
  const supabase = createClient()
  
  const [activeVoiceUsers, setActiveVoiceUsers] = useState<string[]>([])
  const channelRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})
  const audioElements = useRef<Record<string, HTMLAudioElement>>({})

  useEffect(() => {
    if (!currentUser) return

    const channel = supabase.channel(`voice-${teamId}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'voice-signal' }, async ({ payload }: { payload: PeerSignal }) => {
        if (payload.targetId !== currentUser.id) return
        
        const { senderId, signal } = payload
        
        if (signal.type === 'offer') {
          await handleOffer(senderId, signal.sdp)
        } else if (signal.type === 'answer') {
          await handleAnswer(senderId, signal.sdp)
        } else if (signal.type === 'ice') {
          await handleIceCandidate(senderId, signal.candidate)
        }
      })
      .on('broadcast', { event: 'voice-join' }, ({ payload }) => {
        if (payload.userId === currentUser.id) return
        if (isVoiceJoined) {
          // If we are already in, initiate a call to the newcomer
          initiateCall(payload.userId)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      stopLocalStream()
    }
  }, [teamId, currentUser?.id, isVoiceJoined])

  // Track voice presence
  useEffect(() => {
    if (!currentUser) return
    const channel = supabase.channel(`voice-presence-${teamId}`)
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users: string[] = []
        Object.keys(state).forEach(id => {
          const presence = (state[id] as any)[0]
          if (presence?.isVoice) users.push(id)
        })
        setActiveVoiceUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ isVoice: isVoiceJoined })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [teamId, isVoiceJoined])

  async function startLocalStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      return stream
    } catch (err) {
      toast({ 
        title: "Microphone Error", 
        description: "Could not access your microphone.",
        variant: "destructive"
      })
      setVoiceJoined(false)
      return null
    }
  }

  function stopLocalStream() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    // Close all peers
    Object.values(peerConnections.current).forEach(pc => pc.close())
    peerConnections.current = {}
    // Remove audio elements
    Object.values(audioElements.current).forEach(a => a.remove())
    audioElements.current = {}
  }

  useEffect(() => {
    if (isVoiceJoined) {
      startLocalStream().then(stream => {
        if (stream && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'voice-join',
            payload: { userId: currentUser?.id }
          })
        }
      })
    } else {
      stopLocalStream()
    }
  }, [isVoiceJoined])

  function createPeerConnection(peerId: string) {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId]

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'voice-signal',
          payload: {
            senderId: currentUser?.id,
            targetId: peerId,
            signal: { type: 'ice', candidate: event.candidate }
          }
        })
      }
    }

    pc.ontrack = (event) => {
      if (!audioElements.current[peerId]) {
        const audio = new Audio()
        audio.autoplay = true
        audioElements.current[peerId] = audio
      }
      audioElements.current[peerId].srcObject = event.streams[0]
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    peerConnections.current[peerId] = pc
    return pc
  }

  async function initiateCall(peerId: string) {
    const pc = createPeerConnection(peerId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'voice-signal',
      payload: {
        senderId: currentUser?.id,
        targetId: peerId,
        signal: { type: 'offer', sdp: offer.sdp }
      }
    })
  }

  async function handleOffer(senderId: string, sdp: string) {
    const pc = createPeerConnection(senderId)
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'voice-signal',
      payload: {
        senderId: currentUser?.id,
        targetId: senderId,
        signal: { type: 'answer', sdp: answer.sdp }
      }
    })
  }

  async function handleAnswer(senderId: string, sdp: string) {
    const pc = peerConnections.current[senderId]
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
    }
  }

  async function handleIceCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = peerConnections.current[senderId]
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  return null // Headless component
}
