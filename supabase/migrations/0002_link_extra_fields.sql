-- =========================================================
-- 0002: 링크에 할일/메모 컬럼 추가 (프로토타입에 이미 있는 필드)
-- =========================================================
alter table public.links add column if not exists todo text;
alter table public.links add column if not exists todo_done boolean default false;
alter table public.links add column if not exists memo text;
