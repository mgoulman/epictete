-- Internal reports ("memos"): authored by users with memos.write, published to
-- specific users and/or roles, with per-user read tracking and reminders.
CREATE TABLE IF NOT EXISTS memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal',   -- normal | high
  author_id uuid,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memo_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  recipient_type text NOT NULL,              -- 'user' | 'role'
  recipient_value text NOT NULL
);
CREATE TABLE IF NOT EXISTS memo_reads (
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (memo_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memo_recipients_memo ON memo_recipients(memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_recipients_lookup ON memo_recipients(recipient_type, recipient_value);

INSERT INTO permissions (name, resource, action, description)
SELECT 'memos.write','memos','write','Rédiger et publier des rapports internes'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='memos.write');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE p.name='memos.write' AND r.name IN ('admin','manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;
