-- Migration: 20260913024000_sdr_conversations
-- Escopo: aditivo. Cria tabelas SDR, índices e RLS por tenant.

CREATE TABLE IF NOT EXISTS sdr_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  phone text NOT NULL,
  flow_id text NOT NULL DEFAULT 'sdr-odonto-v2.6',
  stage text NOT NULL DEFAULT 'saudacao',
  state_json jsonb DEFAULT '{}',
  tenant_id uuid NOT NULL,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdr_conversations_tenant ON sdr_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sdr_conversations_stage ON sdr_conversations(stage);
CREATE INDEX IF NOT EXISTS idx_sdr_conversations_phone_active
  ON sdr_conversations(phone, updated_at DESC)
  WHERE stage <> 'encerrado';

CREATE TABLE IF NOT EXISTS sdr_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  daily_limit integer NOT NULL DEFAULT 50 CHECK (daily_limit BETWEEN 1 AND 200),
  delay_min_minutes integer NOT NULL DEFAULT 2 CHECK (delay_min_minutes >= 1),
  delay_max_minutes integer NOT NULL DEFAULT 5 CHECK (delay_max_minutes >= 1),
  send_window_start time NOT NULL DEFAULT '08:00',
  send_window_end time NOT NULL DEFAULT '18:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (delay_max_minutes >= delay_min_minutes)
);

CREATE INDEX IF NOT EXISTS idx_sdr_settings_tenant ON sdr_settings(tenant_id);

ALTER TABLE sdr_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sdr_conversations_tenant_select" ON sdr_conversations;
CREATE POLICY "sdr_conversations_tenant_select" ON sdr_conversations
  FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "sdr_conversations_tenant_insert" ON sdr_conversations;
CREATE POLICY "sdr_conversations_tenant_insert" ON sdr_conversations
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "sdr_conversations_tenant_update" ON sdr_conversations;
CREATE POLICY "sdr_conversations_tenant_update" ON sdr_conversations
  FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "sdr_settings_tenant_select" ON sdr_settings;
CREATE POLICY "sdr_settings_tenant_select" ON sdr_settings
  FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "sdr_settings_tenant_insert" ON sdr_settings;
CREATE POLICY "sdr_settings_tenant_insert" ON sdr_settings
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "sdr_settings_tenant_update" ON sdr_settings;
CREATE POLICY "sdr_settings_tenant_update" ON sdr_settings
  FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
