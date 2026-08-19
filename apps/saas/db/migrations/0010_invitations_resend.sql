-- Resend support for invitations: track last update + how many times the link was (re)issued.
alter table invitations add column if not exists updated_at timestamptz not null default now();
alter table invitations add column if not exists sent_count int not null default 1;
