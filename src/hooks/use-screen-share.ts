import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useScreenShareStore } from '@/store/screen-share-store'
import { createPeerConnection } from '@/lib/webrtc/peer-connection'
import { startScreenCapture, stopStream, getScreenDimensions } from '@/lib/webrtc/screen-share'
import { broadcastSignal } from '@/lib/webrtc/signaling'

export function useScreenShare() {
  const supabase = createClient()
  const store = useScreenShareStore()
  
  const stopSharing = useCallback(async () => {
    const channel = useScreenShareStore.getState().signalingChannel
    if (channel) {
      await broadcastSignal(channel, { event: 'host-stopped', payload: {} })
      channel.unsubscribe()
    }

    const code = useScreenShareStore.getState().sessionCode
    if (code) {
      await fetch(`/api/screenshare/session/${code}`, { method: 'DELETE' })
    }

    const stream = useScreenShareStore.getState().localStream
    stopStream(stream)
    
    const pc = useScreenShareStore.getState().peerConnection
    if (pc) pc.close()
    
    store.reset()
  }, [store])



  const createOffer = useCallback(async (pc: RTCPeerConnection, stream: MediaStream) => {
    const channel = useScreenShareStore.getState().signalingChannel
    if (!channel) return

    stream.getTracks().forEach(track => pc.addTrack(track, stream))
    

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    console.log('[Host] Sending offer to viewer')
    broadcastSignal(channel, { event: 'offer', payload: offer })
  }, [store])

  const startSharing = useCallback(async (teamId: string) => {
    try {
      // 1. Create session via API
      const res = await fetch('/api/screenshare/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId }),
      })
      
      const resData = await res.json()
      
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to create session')
      }
      
      const session_code = resData.session_code
      console.log('[Host] Session created with code:', session_code)
      
      // 2. Capture screen
      const stream = await startScreenCapture()
      const dimensions = getScreenDimensions(stream)
      
      store.setLocalStream(stream)
      store.setRemoteDimensions(dimensions)
      store.setSessionCode(session_code)
      store.setMode('hosting')

      // 3. Create peer connection
      const pc = createPeerConnection()
      store.setPeerConnection(pc)

      pc.onicecandidate = (event) => {
        const ch = useScreenShareStore.getState().signalingChannel
        if (event.candidate && ch) {
          broadcastSignal(ch, { event: 'ice-candidate', payload: event.candidate })
        }
      }

      pc.onconnectionstatechange = () => {
        console.log('[Host] Connection state:', pc.connectionState)
      }

      // 4. Subscribe to the signaling channel AND store it in Zustand
      const channel = supabase.channel(`screenshare-${session_code}`)
      store.setSignalingChannel(channel)

      channel
        .on('broadcast', { event: 'viewer-ready' }, ({ payload }) => {
          console.log('[Host] Viewer ready:', payload)
          store.setViewer(payload)
          
          // Send screen metadata immediately
          const dims = getScreenDimensions(stream)
          broadcastSignal(channel, { event: 'screen-meta', payload: dims })
          
          createOffer(pc, stream)
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          console.log('[Host] Received answer from viewer')
          await pc.setRemoteDescription(new RTCSessionDescription(payload))
          
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload))
          } catch (err) {
            console.error('[Host] Error adding ICE candidate:', err)
          }
        })
        .subscribe((status) => {
          console.log('[Host] Channel status:', status)
        })

      // 5. Handle stream ending
      stream.getVideoTracks()[0].onended = () => {
        stopSharing()
      }

    } catch (error) {
      console.error('Failed to start sharing', error)
      store.reset()
      throw error
    }
  }, [supabase, store, createOffer, stopSharing])

  // Stats collection
  useEffect(() => {
    if (store.mode !== 'hosting' || !store.peerConnection) return

    const interval = setInterval(async () => {
      const pc = useScreenShareStore.getState().peerConnection
      if (!pc) return
      const stats = await pc.getStats()
      let bitrate = 0
      let fps = 0
      
      stats.forEach(report => {
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          bitrate = report.bytesSent
          fps = report.framesPerSecond || 0
        }
      })
      
      store.setConnectionStats({ bitrate, latencyMs: 0, fps })
    }, 2000)

    return () => clearInterval(interval)
  }, [store.mode, store.peerConnection])

  return {
    startSharing,
    stopSharing,
  }
}
