-- =========================================================
-- QLINK 초기 스키마
-- =========================================================

-- profiles: auth.users 와 1:1, 공개 프로필 정보
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar text,                          -- 이모지 또는 dataURL/URL
  provider text not null default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- folders
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  emoji text not null default '📁',
  shared boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_folders_owner on public.folders(owner_id);

-- folder_members: 공유 폴더의 멤버
create table public.folder_members (
  folder_id uuid not null references public.folders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',  -- 'owner' | 'member' | 'viewer'
  joined_at timestamptz not null default now(),
  primary key (folder_id, user_id)
);
create index idx_folder_members_user on public.folder_members(user_id);

-- links
create table public.links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  url text not null,
  title text,
  summary text,
  one_liner text,
  tags text[] not null default '{}',
  thumbnail_url text,
  source_type text not null default 'url',  -- 'url' | 'qr'
  reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_links_owner_created on public.links(owner_id, created_at desc);
create index idx_links_folder on public.links(folder_id);
create index idx_links_tags on public.links using gin(tags);

-- 풀텍스트 검색용 인덱스 (한글 'simple' 토크나이저)
create index idx_links_search on public.links using gin(
  to_tsvector('simple',
    coalesce(title, '') || ' ' ||
    coalesce(summary, '') || ' ' ||
    coalesce(one_liner, '') || ' ' ||
    array_to_string(tags, ' ')
  )
);

-- folder_invites: 공유 초대 토큰
create table public.folder_invites (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create index idx_invites_token on public.folder_invites(token);

-- AI 요약 작업 큐 (Edge Function이 처리)
create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links(id) on delete cascade,
  provider text not null,
  status text not null default 'pending', -- 'pending' | 'done' | 'failed'
  raw_response jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- updated_at 자동 갱신 트리거
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_links_updated before update on public.links
  for each row execute function public.touch_updated_at();

-- =========================================================
-- RLS — Row Level Security
-- =========================================================

alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.folder_members enable row level security;
alter table public.links enable row level security;
alter table public.folder_invites enable row level security;
alter table public.ai_jobs enable row level security;

-- profiles: 자신의 프로필 + 같은 폴더 멤버의 프로필 읽기
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "users read folder co-members" on public.profiles
  for select using (
    exists (
      select 1 from public.folder_members fm1
      join public.folder_members fm2 on fm2.folder_id = fm1.folder_id
      where fm1.user_id = auth.uid() and fm2.user_id = profiles.id
    )
  );
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- folders: 소유자 또는 멤버만 조회/수정
create policy "owner reads own folders" on public.folders
  for select using (owner_id = auth.uid());
create policy "members read shared folders" on public.folders
  for select using (
    shared and exists (
      select 1 from public.folder_members
      where folder_id = folders.id and user_id = auth.uid()
    )
  );
create policy "owner inserts own folders" on public.folders
  for insert with check (owner_id = auth.uid());
create policy "owner updates own folders" on public.folders
  for update using (owner_id = auth.uid());
create policy "owner deletes own folders" on public.folders
  for delete using (owner_id = auth.uid());

-- folder_members: 본인의 멤버십 + 같은 폴더 멤버 목록 읽기
create policy "users read own membership" on public.folder_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.folder_members fm
      where fm.folder_id = folder_members.folder_id and fm.user_id = auth.uid()
    )
  );
-- 자기 자신을 멤버로 추가(초대 수락 RPC가 호출)
create policy "users insert own membership" on public.folder_members
  for insert with check (user_id = auth.uid());
-- 본인 또는 폴더 소유자는 멤버 제거 가능
create policy "users or owner remove member" on public.folder_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.folders f where f.id = folder_id and f.owner_id = auth.uid())
  );

-- links: 소유자 또는 폴더 멤버
create policy "owner accesses own links" on public.links
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members read shared folder links" on public.links
  for select using (
    folder_id is not null and exists (
      select 1 from public.folder_members fm
      join public.folders f on f.id = fm.folder_id
      where f.id = links.folder_id and fm.user_id = auth.uid() and f.shared = true
    )
  );

-- folder_invites: 폴더 소유자만 발급, 토큰으로 비로그인 사용자도 열람 가능 (token 기반은 RPC로)
create policy "owner reads own invites" on public.folder_invites
  for select using (inviter_id = auth.uid());
create policy "owner creates invites" on public.folder_invites
  for insert with check (inviter_id = auth.uid());

-- ai_jobs: 본인의 링크에 대한 잡만
create policy "owner reads own ai_jobs" on public.ai_jobs
  for select using (
    exists (select 1 from public.links where links.id = ai_jobs.link_id and links.owner_id = auth.uid())
  );

-- =========================================================
-- RPC — 초대 토큰으로 폴더 가입
-- =========================================================
create or replace function public.accept_folder_invite(invite_token text)
returns uuid language plpgsql security definer as $$
declare
  v_folder_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception '로그인이 필요합니다';
  end if;

  select folder_id into v_folder_id
  from public.folder_invites
  where token = invite_token and expires_at > now();

  if v_folder_id is null then
    raise exception '유효하지 않거나 만료된 초대 링크입니다';
  end if;

  insert into public.folder_members (folder_id, user_id, role)
  values (v_folder_id, v_user_id, 'member')
  on conflict do nothing;

  return v_folder_id;
end $$;

-- =========================================================
-- 새 가입 시 profiles 자동 생성 트리거
-- =========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar, provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar', '🌸'),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
