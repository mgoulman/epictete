-- Attachments (Vercel Blob URLs) and links to internal records for memos/rapports.
CREATE TABLE IF NOT EXISTS memo_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  path text,
  mime text,
  size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memo_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  ref_type text NOT NULL,          -- inventory | sales | menu | personnel
  ref_id text NOT NULL,
  label text NOT NULL,
  sub text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memo_attachments_memo ON memo_attachments(memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_links_memo ON memo_links(memo_id);
