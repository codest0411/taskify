import { create } from 'zustand'
import { Task, Team, TeamMember, Profile } from '@/types'

interface AppState {
  // Current team
  currentTeam: Team | null
  setCurrentTeam: (team: Team | null) => void

  // Teams list
  teams: Team[]
  setTeams: (teams: Team[]) => void

  // Team members
  members: TeamMember[]
  setMembers: (members: TeamMember[]) => void

  // Profiles cache
  profiles: Record<string, Profile>
  setProfile: (profile: Profile) => void
  setProfiles: (profiles: Profile[]) => void

  // Tasks
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void

  // UI state
  selectedTaskId: string | null
  setSelectedTaskId: (id: string | null) => void
  isTaskDrawerOpen: boolean
  setTaskDrawerOpen: (open: boolean) => void
  isCreateModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
  isQuickCreateOpen: boolean
  setQuickCreateOpen: (open: boolean) => void
  isPasteImportOpen: boolean
  setPasteImportOpen: (open: boolean) => void
  isInviteModalOpen: boolean
  setInviteModalOpen: (open: boolean) => void
  isActivityFeedOpen: boolean
  setActivityFeedOpen: (open: boolean) => void

  // Voice state
  isVoiceJoined: boolean
  setVoiceJoined: (joined: boolean) => void
  talkingUsers: string[]
  setTalkingUsers: (usersOrFn: string[] | ((prev: string[]) => string[])) => void

  // Filters
  filterAssignee: string | null
  setFilterAssignee: (id: string | null) => void
  filterPriority: string | null
  setFilterPriority: (p: string | null) => void
  filterTag: string | null
  setFilterTag: (t: string | null) => void
  searchQuery: string
  setSearchQuery: (q: string) => void

  // Current user
  currentUser: Profile | null
  setCurrentUser: (user: Profile | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentTeam: null,
  setCurrentTeam: (team) => set({ currentTeam: team }),

  teams: [],
  setTeams: (teams) => set((s) => {
    const unique = teams.filter((obj, index, self) => 
      index === self.findIndex((t) => t.id === obj.id)
    )
    return { teams: unique }
  }),

  members: [],
  setMembers: (members) => set({ 
    members: members.filter((obj, index, self) => 
      index === self.findIndex((t) => t.id === obj.id)
    )
  }),

  profiles: {},
  setProfile: (profile) => set((s) => ({ profiles: { ...s.profiles, [profile.id]: profile } })),
  setProfiles: (profiles) => set((s) => {
    const map = { ...s.profiles }
    profiles.forEach(p => { map[p.id] = p })
    return { profiles: map }
  }),

  tasks: [],
  setTasks: (tasks) => set({ 
    tasks: tasks.filter((obj, index, self) => 
      index === self.findIndex((t) => t.id === obj.id)
    )
  }),
  addTask: (task) => set((s) => {
    if (s.tasks.some(t => t.id === task.id)) return s
    return { tasks: [task, ...s.tasks] }
  }),
  updateTask: (id, updates) => set((s) => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),

  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  isTaskDrawerOpen: false,
  setTaskDrawerOpen: (open) => set({ isTaskDrawerOpen: open }),
  isCreateModalOpen: false,
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  isQuickCreateOpen: false,
  setQuickCreateOpen: (open) => set({ isQuickCreateOpen: open }),
  isPasteImportOpen: false,
  setPasteImportOpen: (open) => set({ isPasteImportOpen: open }),
  isInviteModalOpen: false,
  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),
  isActivityFeedOpen: false,
  setActivityFeedOpen: (open: boolean) => set({ isActivityFeedOpen: open }),
  isVoiceJoined: false,
  setVoiceJoined: (joined) => set({ isVoiceJoined: joined }),
  talkingUsers: [],
  setTalkingUsers: (usersOrFn: string[] | ((prev: string[]) => string[])) => set((s) => ({ 
    talkingUsers: typeof usersOrFn === 'function' ? usersOrFn(s.talkingUsers) : usersOrFn 
  })),

  filterAssignee: null,
  setFilterAssignee: (id) => set({ filterAssignee: id }),
  filterPriority: null,
  setFilterPriority: (p) => set({ filterPriority: p }),
  filterTag: null,
  setFilterTag: (t) => set({ filterTag: t }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}))
