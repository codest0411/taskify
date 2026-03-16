'use client'

import { Button } from './button'
import { cn } from '@/lib/utils'
import { AlertCircle, Trash2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'primary'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
  loading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-[360px] animate-in zoom-in-95 fade-in duration-200">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          {/* Decorative background element */}
          <div className={cn(
            "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-10",
            variant === 'destructive' ? "bg-red-500" : "bg-primary"
          )} />

          <div className="flex flex-col items-center text-center">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg",
              variant === 'destructive' 
                ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                : "bg-primary/10 text-primary border border-primary/20"
            )}>
              {variant === 'destructive' ? <Trash2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>

            <h3 className="text-lg font-bold mb-2 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {description}
            </p>

            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                onClick={onCancel} 
                className="flex-1 h-10 rounded-xl font-medium"
                disabled={loading}
              >
                {cancelText}
              </Button>
              <Button 
                variant={variant === 'destructive' ? 'destructive' : 'default'}
                onClick={onConfirm}
                className={cn(
                  "flex-1 h-10 rounded-xl font-semibold shadow-lg transition-transform active:scale-95",
                  variant === 'destructive' && "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                )}
                disabled={loading}
              >
                {loading ? "..." : confirmText}
              </Button>
            </div>
          </div>
          
          <button 
            onClick={onCancel}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )
}
