import { create } from 'zustand'
import { RealtimeChannel } from '@supabase/supabase-js'

interface ConnectionStats {
  bitrate: number
  latencyMs: number
  fps: number
}

interface UserInfo {
  userId: string
  userName: string
}

interface ScreenShareState {
  // Mode
  mode: 'idle' | 'hosting' | 'viewing'
  setMode: (m: 'idle' | 'hosting' | 'viewing') => void

  // Session
  sessionCode: string | null
  setSessionCode: (code: string | null) => void

  // Streams
  localStream: MediaStream | null
  setLocalStream: (s: MediaStream | null) => void
  remoteStream: MediaStream | null
  setRemoteStream: (s: MediaStream | null) => void

  // Remote screen dimensions
  remoteDimensions: { width: number; height: number }
  setRemoteDimensions: (d: { width: number; height: number }) => void

  // Peer connection
  peerConnection: RTCPeerConnection | null
  setPeerConnection: (pc: RTCPeerConnection | null) => void

  // Data channel
  dataChannel: RTCDataChannel | null
  setDataChannel: (dc: RTCDataChannel | null) => void

  // Signaling channel (shared across all components)
  signalingChannel: RealtimeChannel | null
  setSignalingChannel: (ch: RealtimeChannel | null) => void

  // Control state
  controlState: 'none' | 'requested' | 'granted'
  setControlState: (s: 'none' | 'requested' | 'granted') => void
  controlRequester: UserInfo | null
  setControlRequester: (r: UserInfo | null) => void
  isBeingControlled: boolean
  setIsBeingControlled: (v: boolean) => void
  hasControl: boolean
  setHasControl: (v: boolean) => void

  // Viewer info
  viewer: UserInfo | null
  setViewer: (v: UserInfo | null) => void

  // UI flags
  isHudMinimized: boolean
  setHudMinimized: (v: boolean) => void
  isCodeModalOpen: boolean
  setIsCodeModalOpen: (v: boolean) => void

  // Connection quality
  connectionStats: ConnectionStats
  setConnectionStats: (s: ConnectionStats) => void

  // Custom cursor position
  remoteCursorPos: { x: number; y: number } | null
  setRemoteCursorPos: (p: { x: number; y: number } | null) => void

  // Reset
  reset: () => void
}

const initialState = {
  mode: 'idle' as const,
  sessionCode: null,
  localStream: null,
  remoteStream: null,
  remoteDimensions: { width: 1920, height: 1080 },
  peerConnection: null,
  dataChannel: null,
  signalingChannel: null,
  controlState: 'none' as const,
  controlRequester: null,
  isBeingControlled: false,
  hasControl: false,
  viewer: null,
  isHudMinimized: false,
  isCodeModalOpen: false,
  connectionStats: { bitrate: 0, latencyMs: 0, fps: 0 },
  remoteCursorPos: null,
}

export const useScreenShareStore = create<ScreenShareState>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),
  setSessionCode: (sessionCode) => set({ sessionCode }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setRemoteDimensions: (remoteDimensions) => set({ remoteDimensions }),
  setPeerConnection: (peerConnection) => set({ peerConnection }),
  setDataChannel: (dataChannel) => set({ dataChannel }),
  setSignalingChannel: (signalingChannel) => set({ signalingChannel }),
  setControlState: (controlState) => set({ controlState }),
  setControlRequester: (controlRequester) => set({ controlRequester }),
  setIsBeingControlled: (isBeingControlled) => set({ isBeingControlled }),
  setHasControl: (hasControl) => set({ hasControl }),
  setViewer: (viewer) => set({ viewer }),
  setHudMinimized: (isHudMinimized) => set({ isHudMinimized }),
  setIsCodeModalOpen: (isCodeModalOpen) => set({ isCodeModalOpen }),
  setConnectionStats: (connectionStats) => set({ connectionStats }),
  setRemoteCursorPos: (remoteCursorPos) => set({ remoteCursorPos }),

  reset: () => set(initialState),
}))
