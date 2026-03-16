-- ============================================================
-- TaskFlow — Complete Database Schema
-- Run this in Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE IF NOT EXISTS team_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TYPE task_status   AS ENUM ('pending', 'in_progress', 'review', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  assigned_to     UUID[] DEFAULT '{}',
  status          task_status   NOT NULL DEFAULT 'pending',
  priority        task_priority NOT NULL DEFAULT 'medium',
  due_date        TIMESTAMPTZ,
  reminder_at     TIMESTAMPTZ,
  google_event_id TEXT,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TASK ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS task_attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES profiles(id),
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  size        BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASK ACTIVITY
-- ============================================================
CREATE TYPE activity_action AS ENUM (
  'created', 'moved', 'assigned', 'commented',
  'uploaded', 'updated', 'reminder_sent'
);

CREATE TABLE IF NOT EXISTS task_activity (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id),
  action     activity_action NOT NULL,
  old_value  TEXT,
  new_value  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASK COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMAIL REMINDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_reminders (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id),
  send_at    TIMESTAMPTZ NOT NULL,
  sent       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams           ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity   ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a member of the given team?
CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;

-- Profiles: users can see all profiles (needed for showing assignees)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- Teams: members can see their teams
CREATE POLICY "teams_select" ON teams FOR SELECT USING (is_team_member(id));
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Team members
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (is_team_member(team_id));
CREATE POLICY "team_members_insert" ON team_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM team_members WHERE team_id = team_members.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "team_members_update" ON team_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin'))
);
CREATE POLICY "team_members_delete" ON team_members FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin'))
);

-- Tasks
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (is_team_member(team_id));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (is_team_member(team_id));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (is_team_member(team_id));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (is_team_member(team_id));

-- Task attachments
CREATE POLICY "attachments_select" ON task_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_attachments.task_id AND is_team_member(team_id))
);
CREATE POLICY "attachments_insert" ON task_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_attachments.task_id AND is_team_member(team_id))
);

-- Task activity
CREATE POLICY "activity_select" ON task_activity FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_activity.task_id AND is_team_member(team_id))
);
CREATE POLICY "activity_insert" ON task_activity FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_activity.task_id AND is_team_member(team_id))
);

-- Task comments
CREATE POLICY "comments_select" ON task_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_comments.task_id AND is_team_member(team_id))
);
CREATE POLICY "comments_insert" ON task_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_comments.task_id AND is_team_member(team_id))
);
CREATE POLICY "comments_update" ON task_comments FOR UPDATE USING (user_id = auth.uid());

-- Email reminders (service role only in practice)
CREATE POLICY "reminders_select" ON email_reminders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "reminders_insert" ON email_reminders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE id = email_reminders.task_id AND is_team_member(team_id))
);
CREATE POLICY "reminders_update" ON email_reminders FOR UPDATE USING (true);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  true,
  26214400, -- 25MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'task-attachments');
CREATE POLICY "storage_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'task-attachments' AND auth.role() = 'authenticated'
);
CREATE POLICY "storage_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_team_id     ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks USING GIN(assigned_to);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_send_at ON email_reminders(send_at) WHERE NOT sent;
CREATE INDEX IF NOT EXISTS idx_activity_task_id  ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id  ON task_comments(task_id);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activity;
