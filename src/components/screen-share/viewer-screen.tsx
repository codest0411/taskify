'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useScreenShareStore } from '@/store/screen-share-store'
import { useScreenViewer } from '@/hooks/use-screen-viewer'
import { normalizeCoords, ControlEvent } from '@/lib/webrtc/remote-control'
import { 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  MousePointer2, 
  Settings2, 
  Activity,
  LogOut,
  Scan,
  Monitor
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function ViewerScreen() {
  const { 
    mode, 
    remoteStream, 
    hasControl, 
    remoteDimensions, 
    dataChannel, 
    connectionStats,
    remoteCursorPos 
  } = useScreenShareStore()
  const { leaveSession, requestControl } = useScreenViewer()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [objectFit, setObjectFit] = useState<'contain' | 'cover' | 'none'>('contain')
  const [isStatsOpen, setIsStatsOpen] = useState(false)

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  if (mode !== 'viewing' || !remoteStream) return null

  const sendControlEvent = (event: ControlEvent) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(event))
    }
  }

  const handleMouseEvent = (e: any) => {
    if (!hasControl || !videoRef.current) return
    
    // Support both React events and synthetic events from touch/wheel
    const nativeEvent = e.nativeEvent || e
    const coords = normalizeCoords(nativeEvent, videoRef.current, remoteDimensions.width, remoteDimensions.height)
    
    const typeMap: Record<string, string> = {
      mousemove: 'mousemove',
      mousedown: 'mousedown',
      mouseup: 'mouseup',
      click: 'click',
      dblclick: 'dblclick',
      contextmenu: 'contextmenu'
    }

    if (typeMap[e.type]) {
      sendControlEvent({
        type: typeMap[e.type],
        x: coords.x,
        y: coords.y,
        button: e.button ?? 0
      } as any)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (!hasControl || !videoRef.current) return
    const coords = normalizeCoords(e.nativeEvent, videoRef.current, remoteDimensions.width, remoteDimensions.height)
    sendControlEvent({
      type: 'wheel',
      x: coords.x,
      y: coords.y,
      deltaX: e.deltaX,
      deltaY: e.deltaY
    })
  }

  const handleKeyboard = (e: React.KeyboardEvent) => {
    if (!hasControl) return
    e.preventDefault()
    
    const modifiers = []
    if (e.ctrlKey) modifiers.push('ctrl')
    if (e.shiftKey) modifiers.push('shift')
    if (e.altKey) modifiers.push('alt')
    if (e.metaKey) modifiers.push('meta')

    sendControlEvent({
      type: e.type as 'keydown' | 'keyup',
      key: e.key,
      code: e.code,
      modifiers
    })
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col text-white select-none overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 bg-gray-900 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={leaveSession}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm tracking-tight text-white/90">Remote Desktop</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-green-500 uppercase">Connected</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-white/5 rounded-lg">
            <Button 
              size="sm" 
              variant="ghost" 
              className={cn("h-8 gap-2 text-xs", objectFit === 'contain' && "bg-white/10 text-white")}
              onClick={() => setObjectFit('contain')}
            >
              <Scan className="w-3.5 h-3.5" /> Fit
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className={cn("h-8 gap-2 text-xs", objectFit === 'cover' && "bg-white/10 text-white")}
              onClick={() => setObjectFit('cover')}
            >
              <Maximize2 className="w-3.5 h-3.5" /> Fill
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className={cn("h-8 gap-2 text-xs", objectFit === 'none' && "bg-white/10 text-white")}
              onClick={() => setObjectFit('none')}
            >
              <Minimize2 className="w-3.5 h-3.5" /> 1:1
            </Button>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1" />

          {hasControl ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500 text-white">
              <MousePointer2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">In Control</span>
            </div>
          ) : (
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-9 gap-2 bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={requestControl}
            >
              <MousePointer2 className="w-4 h-4" /> Request Control
            </Button>
          )}

          <Button 
            size="icon" 
            variant="ghost" 
            className={cn("h-9 w-9", isStatsOpen && "bg-white/10")} 
            onClick={() => setIsStatsOpen(!isStatsOpen)}
          >
            <Activity className="w-4 h-4" />
          </Button>

          <Button 
            size="sm" 
            variant="destructive" 
            className="h-9 gap-2 ml-2"
            onClick={leaveSession}
          >
            <LogOut className="w-4 h-4" /> Exit
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={cn(
          "flex-1 relative bg-black overflow-auto flex items-center justify-center",
          hasControl && "cursor-none"
        )}
        onKeyDown={handleKeyboard}
        tabIndex={0}
      >
        <div 
          className="relative max-w-full max-h-full"
          onMouseMove={handleMouseEvent}
          onMouseDown={handleMouseEvent}
          onMouseUp={handleMouseEvent}
          onClick={handleMouseEvent}
          onDoubleClick={handleMouseEvent}
          onContextMenu={handleMouseEvent}
          onWheel={handleWheel}
          onTouchStart={(e) => {
            if (!hasControl || !videoRef.current) return
            const touch = e.touches[0]
            const rect = videoRef.current.getBoundingClientRect()
            const fakeEvent = {
              type: 'mousedown',
              clientX: touch.clientX,
              clientY: touch.clientY,
              button: 0,
              nativeEvent: { clientX: touch.clientX, clientY: touch.clientY } as any
            } as any
            handleMouseEvent(fakeEvent)
          }}
          onTouchMove={(e) => {
            if (!hasControl || !videoRef.current) return
            const touch = e.touches[0]
            const fakeEvent = {
              type: 'mousemove',
              clientX: touch.clientX,
              clientY: touch.clientY,
              button: 0,
              nativeEvent: { clientX: touch.clientX, clientY: touch.clientY } as any
            } as any
            handleMouseEvent(fakeEvent)
          }}
          onTouchEnd={() => {
            if (!hasControl) return
            const fakeEvent = { type: 'mouseup', button: 0 } as any
            handleMouseEvent(fakeEvent)
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ 
              width: objectFit === 'none' ? remoteDimensions.width : '100%',
              height: objectFit === 'none' ? remoteDimensions.height : '100%',
              objectFit: objectFit === 'none' ? 'none' : objectFit,
              display: 'block'
            }}
            className={cn(
              "shadow-2xl transition-all duration-300",
              hasControl && "ring-2 ring-blue-500 ring-offset-4 ring-offset-black"
            )}
          />

          {/* Virtual Cursor (Rendered on Host, controlled by Viewer, or synced back) 
              Actually, the user wants the viewer to see where the cursor is.
          */}
          {remoteCursorPos && (
             <div 
               className="absolute pointer-events-none z-50 transition-[top,left] duration-75 ease-out"
               style={{ 
                 left: `${(remoteCursorPos.x / remoteDimensions.width) * 100}%`,
                 top: `${(remoteCursorPos.y / remoteDimensions.height) * 100}%`
               }}
             >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.65376 12.3673L19.4991 3.29813C20.697 2.51139 22.0673 4.10325 21.0967 5.14811L13.8441 12.9157C13.4144 13.3751 13.2505 14.0205 13.4124 14.6186L15.3995 21.9213C15.7725 23.2929 13.9216 23.9785 13.1973 22.7412L5.47466 9.51683C4.85691 8.45524 4.88566 7.15286 5.54841 6.11524L5.65376 12.3673Z" fill="#3B82F6" stroke="white" strokeWidth="2"/>
                </svg>
             </div>
          )}
        </div>
        
        {/* Stats Overlay */}
        {isStatsOpen && (
          <div className="absolute top-4 right-4 w-48 bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-3 z-50">
            <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Capture Stats</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Bitrate</span>
                <span className="text-xs font-mono">{Math.round(connectionStats.bitrate / 1000)} Kbps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Frame Rate</span>
                <span className="text-xs font-mono">{connectionStats.fps} FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Latency</span>
                <span className="text-xs font-mono">{connectionStats.latencyMs}ms</span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    connectionStats.bitrate > 5000000 ? "bg-green-500" : "bg-yellow-500"
                  )} />
                  <span className="text-[10px] font-semibold">
                    {connectionStats.bitrate > 5000000 ? "High Quality" : "Balanced"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasControl && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-500 rounded-full shadow-2xl flex items-center gap-2 z-[10001] animate-bounce-slow">
           <MousePointer2 className="w-4 h-4" />
           <span className="text-xs font-bold whitespace-nowrap">Remote Control Active</span>
        </div>
      )}

      <style jsx global>{`
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -10px); }
        }
      `}</style>
    </div>
  )
}
