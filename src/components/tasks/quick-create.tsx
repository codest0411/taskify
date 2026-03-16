'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Zap, X } from 'lucide-react'

interface Props {
  teamId: string
  onClose: () => void
}

export function QuickCreate({ teamId, onClose }: Props) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addTask } = useAppStore()
  const { toast } = useToast()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || loading) return
    setLoading(true)

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: value.trim(),
        team_id: teamId,
        priority: 'medium',
        status: 'pending',
      }),
    })
    const data = await res.json()
    if (res.ok) {
      addTask(data.task)
      toast({ title: '⚡ Task created', description: value.trim() })
      setValue('')
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl glass-card rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <form onSubmit={handleSubmit} className="flex-1">
            <Input
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Type task title and press Enter..."
              className="border-0 shadow-none focus-visible:ring-0 text-base px-0 bg-transparent"
              disabled={loading}
            />
          </form>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↵ Enter</kbd>
          to create •
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Esc</kbd>
          to dismiss
        </div>
      </div>
    </div>
  )
}
