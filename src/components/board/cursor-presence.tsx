'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { Profile } from '@/types'
import { getInitials, cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic } from 'lucide-react'

interface CursorInfo {
  x: number
  y: number
  user: Profile
  lastSeen: number
  draggingTaskId: string | null
  isVoice: boolean
}

export function CursorPresence({ teamId, activeDragId }: { teamId: string, activeDragId?: string | null }) {
  const { currentUser, tasks, isVoiceJoined } = useAppStore()
  const [cursors, setCursors] = useState<Record<string, CursorInfo>>({})
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!currentUser) return

    const channel = supabase.channel(`team-presence-${teamId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineUsers: Record<string, { profile: Profile, isVoice: boolean }> = {}
        
        Object.keys(state).forEach((userId) => {
          if (userId === currentUser.id) return
          const userState = (state[userId] as any)?.[0]
          if (userState?.user) {
            onlineUsers[userId] = { 
              profile: userState.user, 
              isVoice: !!userState.isVoice 
            }
          }
        })
        
        // Sync cursor objects
        setCursors(prev => {
          const next = { ...prev }
          Object.keys(next).forEach(id => {
            if (!onlineUsers[id]) delete next[id]
          })
          Object.keys(onlineUsers).forEach(id => {
            if (!next[id]) {
              next[id] = { 
                x: 50, y: 50, 
                user: onlineUsers[id].profile, 
                lastSeen: Date.now(), 
                draggingTaskId: null,
                isVoice: onlineUsers[id].isVoice
              }
            } else {
              next[id].isVoice = onlineUsers[id].isVoice
            }
          })
          return next
        })
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.userId === currentUser.id) return
        setCursors(prev => {
          const user = prev[payload.userId]
          if (!user) return prev
          return {
            ...prev,
            [payload.userId]: {
              ...user,
              x: payload.x,
              y: payload.y,
              lastSeen: Date.now(),
              draggingTaskId: payload.draggingTaskId
            }
          }
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user: currentUser,
            isVoice: isVoiceJoined,
            onlineAt: new Date().toISOString()
          })
        }
      })

    channelRef.current = channel

    // Faster throttle for "Proper Real-Time" (30fps)
    let lastMove = 0
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastMove > 33) { // ~30fps
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'cursor',
            payload: {
              userId: currentUser.id,
              x: (e.clientX / window.innerWidth) * 100,
              y: (e.clientY / window.innerHeight) * 100,
              draggingTaskId: activeDragId || null
            }
          })
        }
        lastMove = now
      }
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      supabase.removeChannel(channel)
    }
  }, [teamId, currentUser?.id, activeDragId])

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {Object.entries(cursors)
          .filter(([_, info]) => info.user && Date.now() - info.lastSeen < 10000)
          .map(([userId, info]) => {
            const draggedTask = info.draggingTaskId ? tasks.find(t => t.id === info.draggingTaskId) : null
            
            return (
              <motion.div
                key={userId}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: `${info.x}vw`, 
                  y: `${info.y}vh` 
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', damping: 40, stiffness: 450, mass: 0.1 }}
                className="absolute left-0 top-0 flex flex-col items-start z-[100]"
                style={{ translate: '-50% -50%', transformStyle: 'preserve-3d' }}
              >
                {/* Dragged Task Preview */}
                <AnimatePresence>
                  {draggedTask && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20, rotate: 0 }}
                      animate={{ opacity: 1, scale: 1, y: -60, rotate: -3 }}
                      exit={{ opacity: 0, scale: 0.8, y: 0 }}
                      className="absolute left-8 w-64 p-3 bg-card border-2 border-primary/50 shadow-2xl rounded-xl ring-8 ring-primary/5 backdrop-blur-sm"
                      style={{ 
                        borderColor: `hsl(${parseInt(userId.slice(0, 8), 16) % 360}, 70%, 60%)`,
                        boxShadow: `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px rgba(var(--primary), 0.2)`
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                         <span className="text-[9px] font-bold uppercase tracking-wider">Moving Task</span>
                      </div>
                      <p className="text-[11px] font-bold line-clamp-1">{draggedTask.title}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mouse Pointer Icon */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary drop-shadow-md"
                  style={{ color: `hsl(${parseInt(userId.slice(0, 8), 16) % 360}, 70%, 60%)` }}
                >
                  <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="currentColor" fillOpacity="0.2" />
                </svg>

                {/* User Avatar Circle */}
                <div className="flex items-center gap-2 -mt-1 ml-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-full bg-card border-2 shadow-2xl flex items-center justify-center backdrop-blur-md overflow-hidden ring-4 transition-all duration-500",
                      info.isVoice ? "ring-emerald-500/40 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]" : "ring-black/5"
                    )}
                    style={{ borderColor: info.isVoice ? undefined : `hsl(${parseInt(userId.slice(0, 8), 16) % 360}, 70%, 60%)` }}
                  >
                    {info.user.avatar_url ? (
                      <img src={info.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold" style={{ color: `hsl(${parseInt(userId.slice(0, 8), 16) % 360}, 70%, 60%)` }}>
                        {getInitials(info.user.full_name || info.user.email)}
                      </span>
                    )}
                  </div>
                  
                  {/* Name Badge */}
                  <div 
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-xl whitespace-nowrap flex items-center gap-1",
                      info.isVoice && "bg-emerald-500 animate-pulse"
                    )}
                    style={{ backgroundColor: info.isVoice ? undefined : `hsl(${parseInt(userId.slice(0, 8), 16) % 360}, 70%, 60%)` }}
                  >
                    {info.user.full_name?.split(' ')[0] || 'Member'}
                    {info.isVoice && <Mic className="w-2.5 h-2.5" />}
                  </div>
                </div>
              </motion.div>
            )
          })}
      </AnimatePresence>
    </div>
  )
}
