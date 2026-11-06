create table public.imperio_state (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.imperio_state enable row level security;

create policy "Authenticated users can read Imperio data"
  on public.imperio_state for select to authenticated
  using (true);

create policy "Authenticated users can create Imperio data"
  on public.imperio_state for insert to authenticated
  with check (true);

create policy "Authenticated users can update Imperio data"
  on public.imperio_state for update to authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.imperio_state;