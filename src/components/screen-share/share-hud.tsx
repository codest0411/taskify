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
  const { mode, sessionCode, viewer, connectionStats, isHudMinimized, setHudMinimized, remoteDimensions } = useScreenShareStore()
  const { stopSharing } = useScreenShare()
  
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

          </div>

          <div className="h-px bg-white/5" />

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="h-8 text-[10px] bg-white/5 border-white/10 hover:bg-white/10 text-white gap-1.5">
              <Pause className="w-3 h-3" /> Pause
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-[10px] bg-white/5 border-white/10 hover:bg-white/10 text-white gap-1.5" disabled>
              <Lock className="w-3 h-3" /> Control Off
            </Button>
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
