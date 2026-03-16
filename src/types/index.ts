export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TeamRole = 'owner' | 'admin' | 'member'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string
  created_at: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  owner_id: string
  invite_code: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  joined_at: string
  profile?: Profile
}

export interface Task {
  id: string
  title: string
  description: string | null
  team_id: string
  created_by: string
  assigned_to: string[]
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  reminder_at: string | null
  google_event_id: string | null
  tags: string[]
  created_at: string
  updated_at: string
  attachments?: TaskAttachment[]
  comments?: TaskComment[]
  activity?: TaskActivity[]
  assignees?: Profile[]
}

export interface TaskAttachment {
  id: string
  task_id: string
  uploader_id: string
  file_url: string
  file_name: string
  file_type: string
  size: number
  created_at: string
  uploader?: Profile
}

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: 'created' | 'moved' | 'assigned' | 'commented' | 'uploaded' | 'updated' | 'reminder_sent'
  old_value: string | null
  new_value: string | null
  created_at: string
  user?: Profile
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: Profile
}

export interface EmailReminder {
  id: string
  task_id: string
  user_id: string
  send_at: string
  sent: boolean
  created_at: string
}

export interface TeamWithMembers extends Team {
  members?: TeamMember[]
}

export interface DashboardStats {
  totalTasks: number
  completedThisWeek: number
  completedLastWeek: number
  overdueTasks: number
  avgVelocity: number
}

export interface MemberStats {
  profile: Profile
  assigned: number
  completed: number
  rate: number
}
