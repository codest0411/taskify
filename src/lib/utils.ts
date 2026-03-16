import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { TaskPriority, TaskStatus } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function getPriorityColor(priority: TaskPriority): string {
  const colors = {
    low: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    urgent: 'text-red-400 bg-red-400/10 border-red-400/20',
  }
  return colors[priority]
}

export function getStatusColor(status: TaskStatus): string {
  const colors = {
    pending: 'text-slate-400 bg-slate-400/10',
    in_progress: 'text-blue-400 bg-blue-400/10',
    review: 'text-violet-400 bg-violet-400/10',
    completed: 'text-emerald-400 bg-emerald-400/10',
  }
  return colors[status]
}

export function getStatusLabel(status: TaskStatus): string {
  const labels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
  }
  return labels[status]
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function isImageFile(fileType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(fileType)
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

/**
 * Dynamically determines the base URL for the application.
 * Returns the current origin if in the browser, otherwise falls back to environment variables.
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Public URL provided by the user (highest priority)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Automatic Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Local development fallback
  return 'http://localhost:3000'
}
