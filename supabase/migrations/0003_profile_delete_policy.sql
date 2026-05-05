-- =========================================================
-- 0003: 회원탈퇴 — 사용자가 자신의 프로필을 삭제할 수 있도록 RLS 추가
-- 프로필 삭제 시 cascade 로 folders, links, folder_members 등 모두 정리됨
-- =========================================================
create policy "users delete own profile" on public.profiles
  for delete using (auth.uid() = id);
