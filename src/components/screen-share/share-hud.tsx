'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useScreenShareStore } from '@/store/screen-share-store'
import { useScreenShare } from '@/hooks/use-screen-share'
import { Button } from '@/components/ui/button'
import { 
  Monitor, 
  Copy, 
  User, 
  Gamepad2, 
  XSquare, 
  Pause, 
  Play, 
  ChevronUp, 
  ChevronDown,
  BarChart2,
  Lock,
  Unlock
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ShareHUD() {
  const { mode, sessionCode, viewer, controlState, controlRequester, isBeingControlled, connectionStats, isHudMinimized, setHudMinimized, remoteCursorPos } = useScreenShareStore()
  const { stopSharing, grantControl, revokeControl } = useScreenShare()
  
  const [position, setPosition] = useState({ top: 16, right: 16 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })


  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPosition(prev => ({
      top: Math.max(0, prev.top + dy),
      right: Math.max(0, prev.right - dx)
    }))
    dragStart.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const copyCode = () => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode)
    }
  }

  if (mode !== 'hosting') return null

  if (isHudMinimized) {
    return (
      <div 
        style={{ top: position.top, right: position.right }}
        className="fixed z-[9999] flex items-center gap-2 px-3 py-1.5 bg-gray-900/95 backdrop-blur-md border border-red-500/30 rounded-full shadow-2xl cursor-move group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-white text-xs font-bold tracking-tight">LIVE — {sessionCode}</span>
        <button 
          onClick={() => setHudMinimized(false)}
          className="ml-1 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <>
      {isBeingControlled && (
        <div className="fixed inset-0 z-[9998] border-4 border-red-500 pointer-events-none animate-pulse-border" />
      )}

      {isBeingControlled && remoteCursorPos && (
        <div 
          className="fixed pointer-events-none z-[10000] transition-[top,left] duration-75 ease-out"
          style={{ 
            left: `${remoteCursorPos.x}px`,
            top: `${remoteCursorPos.y}px`
          }}
        >
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.65376 12.3673L19.4991 3.29813C20.697 2.51139 22.0673 4.10325 21.0967 5.14811L13.8441 12.9157C13.4144 13.3751 13.2505 14.0205 13.4124 14.6186L15.3995 21.9213C15.7725 23.2929 13.9216 23.9785 13.1973 22.7412L5.47466 9.51683C4.85691 8.45524 4.88566 7.15286 5.54841 6.11524L5.65376 12.3673Z" fill="#3B82F6" stroke="white" strokeWidth="2"/>
            </svg>
            <div className="absolute top-0 left-0 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          </div>
        </div>
      )}
      
      <div 
        style={{ top: position.top, right: position.right }}
        className="fixed z-[9999] w-72 bg-gray-900/95 backdrop-blur-md border border-red-500/30 rounded-xl shadow-2xl overflow-hidden text-white"
      >
        {/* Header/Drag Handle */}
        <div 
          className="flex items-center justify-between px-3 py-2 bg-gray-800/50 cursor-move border-b border-white/5"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Live</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setHudMinimized(true)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Session Code */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] text-gray-400 uppercase font-medium">Session Code</p>
              <p className="text-lg font-mono font-bold tracking-[0.2em]">{sessionCode?.split('').join(' ')}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white" onClick={copyCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-px bg-white/5" />

          {/* Connection Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] text-gray-400">Viewer</p>
                <p className="text-xs font-semibold truncate">
                  {viewer ? viewer.userName : 'Waiting for connection...'}
                </p>
              </div>
              {viewer && <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                isBeingControlled ? "bg-red-500/20" : "bg-gray-800"
              )}>
                <Gamepad2 className={cn("w-4 h-4", isBeingControlled ? "text-red-400" : "text-gray-400")} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-gray-400">Remote Control</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase",
                    isBeingControlled ? "text-red-400" : "text-gray-500"
                  )}>
                    {isBeingControlled ? 'Active' : 'Disabled'}
                  </span>
                  {isBeingControlled && (
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>
              </div>
              {isBeingControlled && (
                <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={revokeControl}>
                  Revoke
                </Button>
              )}
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Actions */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-8 text-[10px] bg-white/5 border-white/10 hover:bg-white/10 text-white gap-1.5">
                <Pause className="w-3 h-3" /> Pause
              </Button>
              
              {controlState === 'requested' ? (
                <Button 
                  size="sm" 
                  className="h-8 text-[10px] bg-green-600 hover:bg-green-700 text-white gap-1.5 border-0" 
                  onClick={grantControl}
                >
                  <Unlock className="w-3 h-3" /> Allow
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-8 text-[10px] bg-white/5 border-white/10 hover:bg-white/10 text-white gap-1.5" disabled>
                  <Lock className="w-3 h-3" /> Control Off
                </Button>
              )}
            </div>
            
            {controlState === 'requested' && controlRequester && (
              <p className="text-[10px] text-center text-blue-400 font-medium">
                {controlRequester.userName} is requesting control
              </p>
            )}
          </div>

          <Button 
            className="w-full h-9 bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-2 mt-2"
            onClick={stopSharing}
          >
            <XSquare className="w-4 h-4" />
            Stop Sharing
          </Button>

          {/* Stats */}
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <div className="flex items-center gap-3 text-[9px] text-gray-500 font-medium">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-2.5 h-2.5" />
                <span>{Math.round(connectionStats.bitrate / 1000)} Kbps</span>
              </div>
              <span>{connectionStats.fps} FPS</span>
              <span>{connectionStats.latencyMs}ms</span>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes pulse-border {
          0% { border-color: rgba(239, 68, 68, 0.4); }
          50% { border-color: rgba(239, 68, 68, 1); }
          100% { border-color: rgba(239, 68, 68, 0.4); }
        }
        .animate-pulse-border {
          animation: pulse-border 2s infinite;
        }
      `}</style>
    </>
  )
}
