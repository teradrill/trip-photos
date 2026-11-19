create extension if not exists pgcrypto;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(char_length(username) between 2 and 32),
 created_at timestamptz not null default now()
);
create table if not exists public.albums(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references public.profiles(id) on delete cascade,
 title text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.album_permissions(
 album_id uuid not null references public.albums(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 granted_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 primary key(album_id,user_id)
);
create table if not exists public.media(
 id uuid primary key default gen_random_uuid(),
 album_id uuid not null references public.albums(id) on delete cascade,
 uploader_id uuid not null references public.profiles(id) on delete cascade,
 storage_path text not null unique,
 file_name text not null,
 mime_type text not null,
 media_type text not null check(media_type in ('image','video')),
 file_size bigint not null check(file_size > 0),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 approved_at timestamptz
);
create table if not exists public.app_settings(key text primary key,value text not null);

create index if not exists media_album_status_idx on public.media(album_id,status,created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare n text;
begin
 n:=regexp_replace(lower(coalesce(nullif(new.raw_user_meta_data->>'name',''),split_part(new.email,'@',1),'friend')),'[^a-z0-9_]+','','g');
 if length(n)<2 then n:='friend'; end if;
 insert into public.profiles(id,username)
  values(new.id,left(n,20) || '_' || substr(replace(new.id::text,'-',''),1,6))
  on conflict(id) do nothing;
 insert into public.albums(owner_id,title) values(new.id,coalesce(new.raw_user_meta_data->>'name',split_part(new.email,'@',1)) || ' album') on conflict(owner_id) do nothing;
 return new;
end; $$;
drop trigger if exists trip_memories_new_user on auth.users;
create trigger trip_memories_new_user after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.albums enable row level security;
alter table public.album_permissions enable row level security;
alter table public.media enable row level security;
alter table public.app_settings enable row level security;

create policy "signed in can see usernames" on public.profiles for select to authenticated using(true);
create policy "users update own profile" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "signed in can see album cards" on public.albums for select to authenticated using(true);
create policy "users see their permissions" on public.album_permissions for select to authenticated using(user_id=auth.uid());
create policy "authorized users see approved media" on public.media for select to authenticated using(
 status='approved' and exists(select 1 from public.albums a where a.id=album_id and
 (a.owner_id=auth.uid() or exists(select 1 from public.album_permissions p where p.album_id=a.id and p.user_id=auth.uid())))
);
-- Server routes use the service-role key only after checking the signed-in user and ADMIN_EMAIL.
-- Create a private Storage bucket named trip-media in the dashboard.
-- Do not create public read policies for this bucket. Server creates short-lived signed URLs.
