'use client'

import { useState } from 'react'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { X, ClipboardPaste, Loader2, Check } from 'lucide-react'

interface Props {
  teamId: string
  onClose: () => void
}

export function PasteImport({ teamId, onClose }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const { addTask } = useAppStore()
  const { toast } = useToast()

  const parsedTasks = text.trim()
    ? text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    : []

  async function handleImport() {
    if (!parsedTasks.length) return
    setLoading(true)

    const results = await Promise.all(
      parsedTasks.map(title =>
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, team_id: teamId, priority: 'medium', status: 'pending' }),
        }).then(r => r.json())
      )
    )

    results.forEach(data => { if (data.task) addTask(data.task) })
    toast({ title: `✅ Imported ${parsedTasks.length} tasks` })
    onClose()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-w-lg glass-card sm:rounded-2xl shadow-2xl animate-fade-in flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-primary" />
            <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Paste Import
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Paste a list of tasks, one per line. Each line becomes a separate task.
            </p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Design homepage mockup\nImplement auth flow\nWrite unit tests\nFix mobile layout bug`}
              rows={8}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-input text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              autoFocus
            />
          </div>

          {parsedTasks.length > 0 && (
            <div className="rounded-lg bg-muted/50 border border-border p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Preview — {parsedTasks.length} tasks
              </p>
              <div className="space-y-1">
                {parsedTasks.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={!parsedTasks.length || loading}
              className="flex-1 gap-1.5"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : `Import ${parsedTasks.length || 0} Tasks`
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
