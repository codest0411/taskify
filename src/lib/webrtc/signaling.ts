import { RealtimeChannel } from '@supabase/supabase-js'

export type SignalMessage =
  | { event: 'offer';         payload: RTCSessionDescriptionInit }
  | { event: 'answer';        payload: RTCSessionDescriptionInit }
  | { event: 'ice-candidate'; payload: RTCIceCandidateInit }
  | { event: 'viewer-ready';  payload: { userId: string; userName: string } }
  | { event: 'control-request'; payload: { userId: string; userName: string } }
  | { event: 'control-grant';   payload: {} }
  | { event: 'control-revoke';  payload: {} }
  | { event: 'host-stopped';    payload: {} }
  | { event: 'cursor-sync';     payload: { x: number; y: number } }
  | { event: 'screen-meta';     payload: { width: number; height: number } }

export function broadcastSignal(channel: RealtimeChannel, message: SignalMessage) {
  return channel.send({
    type: 'broadcast',
    event: message.event,
    payload: message.payload,
  })
}
