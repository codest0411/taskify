-- ============================================================
-- VOICE RECORDINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_recordings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  duration    INTEGER, -- in seconds
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_recordings_select" ON voice_recordings FOR SELECT USING (is_team_member(team_id));
CREATE POLICY "voice_recordings_insert" ON voice_recordings FOR INSERT WITH CHECK (is_team_member(team_id));

-- Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings',
  true,
  52428800, -- 50MB
  ARRAY['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "voice_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'voice-recordings');
CREATE POLICY "voice_storage_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'voice-recordings' AND auth.role() = 'authenticated'
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE voice_recordings;
