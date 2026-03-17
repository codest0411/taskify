'use client'

import React from 'react'
import { useAppStore } from '@/store'

export function TalkingCircles() {
  const { talkingUsers, members, profiles } = useAppStore()

  if (talkingUsers.length === 0) return null

  return (
    <div className="fixed bottom-10 left-8 z-[2147483647] flex flex-col-reverse gap-6 pointer-events-none">
      {talkingUsers.map((userId) => {
        const profile = profiles[userId] || members.find(m => m.user_id === userId)?.profile
        const name = profile?.full_name || profile?.email || 'User'
        const initials = name.slice(0, 2).toUpperCase()

        return (
          <div 
            key={userId}
            className="flex flex-col items-center gap-2 animate-in slide-in-from-left-12 fade-in duration-700 ease-out"
          >
            <div className="relative flex items-center justify-end pointer-events-auto">
              <div className="mr-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-emerald-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transform transition-all hover:scale-105 active:scale-95">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[11px] font-bold text-emerald-400 whitespace-nowrap tracking-wide">
                    {name.split(' ')[0]} is talking...
                  </p>
                </div>
                <div className="absolute right-[-2.5px] top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500/20 rotate-45 border-r border-t border-emerald-500/30" />
              </div>

              <div className="relative">
                <div className="absolute inset-[-6px] rounded-full border border-emerald-500/20 animate-[ping_2s_infinite]" />
                <div className="absolute inset-[-12px] rounded-full border border-emerald-500/10 animate-[ping_3s_infinite]" />
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)]" />
                
                <div className="relative w-16 h-16 rounded-full border-2 border-emerald-500 bg-gray-900 shadow-2xl overflow-hidden ring-4 ring-black/50 transition-transform duration-500 hover:scale-110">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-600/20 to-emerald-900/40 text-emerald-400 text-xl font-extrabold tracking-tighter">
                      {initials}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-2 gap-0.5 pointer-events-none">
                    <div className="w-1 bg-emerald-500 rounded-full animate-[voice-bar_0.4s_infinite_ease-in-out]" style={{ height: '30%' }} />
                    <div className="w-1 bg-emerald-500 rounded-full animate-[voice-bar_0.6s_infinite_ease-in-out_0.2s]" style={{ height: '60%' }} />
                    <div className="w-1 bg-emerald-500 rounded-full animate-[voice-bar_0.5s_infinite_ease-in-out_0.1s]" style={{ height: '45%' }} />
                  </div>
                </div>

                <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-emerald-500 rounded-md shadow-lg border border-white/20 transform rotate-12 flex items-center gap-1">
                  <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                  <span className="text-[7px] font-black text-black uppercase">LIVE</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
