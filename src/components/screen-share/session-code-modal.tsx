'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useScreenShareStore } from '@/store/screen-share-store'
import { useScreenShare } from '@/hooks/use-screen-share'
import { useScreenViewer } from '@/hooks/use-screen-viewer'
import { 
  X, 
  Monitor, 
  MonitorDown, 
  Copy, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SessionCodeModalProps {
  mode: 'host' | 'viewer'
  teamId?: string
}

export function SessionCodeModal({ mode: initialMode, teamId }: SessionCodeModalProps) {
  const { isCodeModalOpen, setIsCodeModalOpen, sessionCode } = useScreenShareStore()
  const { startSharing } = useScreenShare()
  const { joinSession } = useScreenViewer()
  
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (isCodeModalOpen && initialMode === 'viewer') {
      inputsRef.current[0]?.focus()
    }
  }, [isCodeModalOpen, initialMode])

  if (!isCodeModalOpen) return null

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split('')
      const newCode = [...code]
      pasted.forEach((char, i) => {
        if (index + i < 6) newCode[index + i] = char
      })
      setCode(newCode)
      inputsRef.current[Math.min(5, index + pasted.length - 1)]?.focus()
      return
    }

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleJoin = async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 6) return
    
    setIsLoading(true)
    setError(null)
    try {
      await joinSession(fullCode)
      // Don't close modal — the ViewerScreen will take over the UI automatically
      // when mode becomes 'viewing' and remoteStream is set
    } catch (err: any) {
      console.error('Join failed:', err)
      setError(err.message || 'Failed to join session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartHost = async () => {
    if (!teamId) return
    setIsLoading(true)
    try {
      await startSharing(teamId)
      setIsCodeModalOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to start session')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsCodeModalOpen(false)}
      />
      
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <button 
          onClick={() => setIsCodeModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {initialMode === 'host' ? (
          <div className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Monitor className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Share Your Screen</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Start a real-time session with remote control capabilities.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Security Features
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5" />
                    Encrypted WebRTC peer-to-peer connection
                  </li>
                  <li className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5" />
                    Explicit permission required for remote control
                  </li>
                  <li className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5" />
                    Instant access revocation at any time
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm gap-2"
                  onClick={handleStartHost}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Start Sharing Now
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  onClick={() => setIsCodeModalOpen(false)}
                >
                  Maybe later
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <MonitorDown className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Join Screen Share</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter the 6-digit code to connect to a remote session.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-8">
              <div className="flex justify-center gap-2 sm:gap-3">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputsRef.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={e => handleInputChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className={cn(
                      "w-10 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-800 border-2 rounded-xl focus:outline-none transition-all",
                      digit ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-gray-100 dark:border-white/5",
                      error ? "border-red-500 animate-shake" : ""
                    )}
                  />
                ))}
              </div>

              {error && (
                <p className="text-center text-sm text-red-500 font-medium">{error}</p>
              )}

              <div className="flex flex-col gap-3">
                <Button 
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm gap-2"
                  onClick={handleJoin}
                  disabled={isLoading || code.some(d => !d)}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Connect to Session
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  onClick={() => setIsCodeModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  )
}
