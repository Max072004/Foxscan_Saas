-- Phase 3 mobile-device registration and push delivery records.
create table public.mobile_devices(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,tenant_id uuid not null references public.tenants(id) on delete cascade,expo_push_token text not null unique,platform text not null check(platform in ('ios','android')),device_name text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index mobile_devices_user_idx on public.mobile_devices(user_id,updated_at desc);
alter table public.mobile_devices enable row level security;
create policy "user manages own mobile device" on public.mobile_devices for all using (user_id=auth.uid()) with check (user_id=auth.uid() and tenant_id=(select tenant_id from public.profiles where id=auth.uid()));
create table public.notification_deliveries(id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.notifications(id) on delete cascade,device_id uuid references public.mobile_devices(id) on delete set null,provider text not null check(provider in ('EXPO','FCM','APNS','IN_APP')),status text not null check(status in ('PENDING','SENT','FAILED')),provider_receipt text,created_at timestamptz not null default now());
alter table public.notification_deliveries enable row level security;
create policy "recipient reads delivery" on public.notification_deliveries for select using (exists(select 1 from public.notifications n where n.id=notification_id and n.recipient_id=auth.uid()));
