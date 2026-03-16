CREATE TABLE screenshare_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_code TEXT UNIQUE NOT NULL,   -- 6-digit e.g. "847291"
  host_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id      UUID REFERENCES teams(id) ON DELETE CASCADE,
  is_active    BOOLEAN DEFAULT TRUE,
  control_granted_to UUID REFERENCES profiles(id) DEFAULT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE screenshare_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ss_select" ON screenshare_sessions FOR SELECT USING (
  host_user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM team_members WHERE team_id = screenshare_sessions.team_id AND user_id = auth.uid())
);

CREATE POLICY "ss_insert" ON screenshare_sessions FOR INSERT WITH CHECK (host_user_id = auth.uid());
CREATE POLICY "ss_update" ON screenshare_sessions FOR UPDATE USING (host_user_id = auth.uid());
CREATE POLICY "ss_delete" ON screenshare_sessions FOR DELETE USING (host_user_id = auth.uid());
