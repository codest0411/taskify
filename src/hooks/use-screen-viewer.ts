import { useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useScreenShareStore } from '@/store/screen-share-store'
import { createPeerConnection } from '@/lib/webrtc/peer-connection'
import { broadcastSignal } from '@/lib/webrtc/signaling'

export function useScreenViewer() {
  const supabase = createClient()
  const store = useScreenShareStore()
  const pcRef = useRef<RTCPeerConnection | null>(null)

  const leaveSession = useCallback(() => {
    const channel = useScreenShareStore.getState().signalingChannel
    if (channel) {
      channel.unsubscribe()
    }

    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    store.reset()
  }, [store])

  const joinSession = useCallback(async (code: string) => {
    // 1. Validate session code via API
    const res = await fetch(`/api/screenshare/session?code=${code}`)
    const data = await res.json()

    if (!data.valid) {
      throw new Error('Invalid or inactive session code')
    }

    // 2. Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    store.setSessionCode(code)
    store.setMode('viewing')

    // 3. Subscribe to the Supabase broadcast channel AND store it in Zustand
    const channel = supabase.channel(`screenshare-${code}`)
    store.setSignalingChannel(channel)

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        console.log('[Viewer] Received offer from host')
        try {
          const pc = createPeerConnection()
          pcRef.current = pc
          store.setPeerConnection(pc)

          pc.onicecandidate = (event) => {
            const ch = useScreenShareStore.getState().signalingChannel
            if (event.candidate && ch) {
              broadcastSignal(ch, { event: 'ice-candidate', payload: event.candidate })
            }
          }

          pc.ontrack = (event) => {
            console.log('[Viewer] Got remote track', event.streams)
            store.setRemoteStream(event.streams[0])
          }


          pc.onconnectionstatechange = () => {
            console.log('[Viewer] Connection state:', pc.connectionState)
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          const ch = useScreenShareStore.getState().signalingChannel
          console.log('[Viewer] Sending answer to host')
          broadcastSignal(ch!, { event: 'answer', payload: answer })
        } catch (err) {
          console.error('[Viewer] Error handling offer:', err)
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload))
          } catch (err) {
            console.error('[Viewer] Error adding ICE candidate:', err)
          }
        }
      })
      .on('broadcast', { event: 'host-stopped' }, () => {
        console.log('[Viewer] Host stopped sharing')
        leaveSession()
      })
      .on('broadcast', { event: 'screen-meta' }, ({ payload }) => {
        console.log('[Viewer] Received screen metadata:', payload)
        store.setRemoteDimensions(payload)
      })
      .subscribe((status) => {
        console.log('[Viewer] Channel status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[Viewer] Sending initial viewer-ready signal')
          const sendReady = () => {
            if (pcRef.current) return // Already got offer/connected
            broadcastSignal(channel, {
              event: 'viewer-ready',
              payload: { userId: user.id, userName: user.user_metadata?.full_name || user.email || 'Viewer' }
            })
          }
          
          sendReady()
          // Retry every 5s if no offer received
          const interval = setInterval(() => {
            if (pcRef.current) {
              clearInterval(interval)
              return
            }
            console.log('[Viewer] Retrying viewer-ready...')
            sendReady()
          }, 5000)

          return () => clearInterval(interval)
        }
      })
  }, [supabase, store, leaveSession])


  return {
    joinSession,
    leaveSession,
  }
}
