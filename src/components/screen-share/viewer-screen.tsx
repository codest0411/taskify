'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useScreenShareStore } from '@/store/screen-share-store'
import { useScreenViewer } from '@/hooks/use-screen-viewer'
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
    connectionStats 
  } = useScreenShareStore()
  const { leaveSession } = useScreenViewer()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [objectFit, setObjectFit] = useState<'contain' | 'cover' | 'none'>('contain')
  const [isStatsOpen, setIsStatsOpen] = useState(false)

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  if (mode !== 'viewing' || !remoteStream) return null


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

      <div 
        className="flex-1 relative bg-black overflow-auto flex items-center justify-center"
      >
        <div className="relative max-w-full max-h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: objectFit === 'none' ? 'contain' : objectFit,
              display: 'block'
            }}
            className="shadow-2xl transition-all duration-300"
          />

          {/* Virtual Cursor (Rendered on Host, controlled by Viewer, or synced back) 
              Actually, the user wants the viewer to see where the cursor is.
          */}
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
