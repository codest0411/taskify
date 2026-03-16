'use client'

import React, { useState, useEffect } from 'react'
import { useScreenShareStore } from '@/store/screen-share-store'
import { useScreenShare } from '@/hooks/use-screen-share'
import { MousePointer2, X, Check, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ControlRequestToast() {
  const { controlState, controlRequester, setControlState } = useScreenShareStore()
  const { grantControl, revokeControl } = useScreenShare()
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    if (controlState !== 'requested') return
    
    setCountdown(30)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setControlState('none')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [controlState, setControlState])

  if (controlState !== 'requested' || !controlRequester) return null

  return (
    <div className="fixed bottom-6 right-6 z-[10003] w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-300">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <MousePointer2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Remote Control Request</h4>
              <p className="text-xs text-gray-400 mt-0.5">Permission needed</p>
            </div>
          </div>
          <button 
            onClick={() => setControlState('none')}
            className="p-1 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            <span className="font-bold text-white">{controlRequester.userName}</span> wants to control your screen.
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            They will be able to move your cursor, type, and click within this browser tab. You can revoke access at any time.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 flex items-center gap-2 px-3 h-10 rounded-lg bg-gray-800 text-[11px] text-gray-400">
            <Timer className="w-3.5 h-3.5" />
            Auto-denying in <span className="font-mono text-white">{countdown}s</span>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-10 px-4 text-xs font-bold text-gray-400 hover:text-white"
            onClick={() => setControlState('none')}
          >
            Deny
          </Button>
          <Button 
            size="sm" 
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-2"
            onClick={grantControl}
          >
            <Check className="w-4 h-4" />
            Allow Access
          </Button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1 bg-gray-800">
        <div 
          className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
          style={{ width: `${(countdown / 30) * 100}%` }}
        />
      </div>
    </div>
  )
}
