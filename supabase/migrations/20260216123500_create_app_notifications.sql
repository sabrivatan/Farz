create table public.app_notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  type text default 'general', -- 'general', 'alert', 'info', 'checkin'
  active boolean default true,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

alter table public.app_notifications enable row level security;

create policy "Allow public read" on public.app_notifications
  for select using (true);

-- Optional: Policy for inserting ensuring only admins can insert (if you have auth roles)
-- For now, we assume you insert via Supabase Dashboard directly.
