-- MindCare Phase 3: durable retry protection for chat turns.
-- Apply this migration in Supabase BEFORE deploying code that sends client_turn_id.
-- Existing messages remain valid because the new column is nullable.

alter table public.messages
  add column if not exists client_turn_id uuid;

-- One user message and one assistant message are allowed for a given client turn.
-- NULL keys preserve compatibility with older clients that do not send a turn ID.
create unique index if not exists messages_user_client_turn_role_uidx
  on public.messages (user_id, client_turn_id, role)
  where client_turn_id is not null;

comment on column public.messages.client_turn_id is
  'Client-generated UUID reused for retries of the same logical chat turn; not a clinical identifier.';
