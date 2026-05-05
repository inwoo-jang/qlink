# Supabase 셋업 가이드

## 1. 프로젝트 생성

1. https://supabase.com 가입 → "New project"
2. 프로젝트 이름: `qlink-prod` (또는 `qlink-staging`)
3. 비밀번호 설정 (DB 직접 접속용 — 안전한 곳에 저장)
4. Region: **Northeast Asia (Seoul)** 권장
5. 무료 티어 OK — 생성까지 약 2분

## 2. 환경변수 확인

프로젝트 생성 후 Settings → API 에서:

```
Project URL:   https://xxxxxxxxxxx.supabase.co
anon (public) key: eyJhbGciOiJIUzI1Ni... (긴 JWT)
service_role key: ...  (서버 전용, 절대 클라이언트에 노출 금지)
```

이걸 `app/.env` 에 저장:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 3. 스키마 적용

### 옵션 A — Supabase Studio (권장)
1. Supabase 대시보드 → SQL Editor
2. `New query`
3. `migrations/0001_initial_schema.sql` 전체 복사·붙여넣기 → Run
4. "Success. No rows returned" 메시지 확인

### 옵션 B — Supabase CLI
```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref xxxxxxxxxxx
supabase db push
```

## 4. 인증 설정

Authentication → Providers 에서:

### 4-1. Email
- "Enable Email provider" 체크
- "Confirm email" — 개발 중엔 끄거나, Email Templates 커스터마이징

### 4-2. Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 생성
2. APIs & Services → OAuth consent screen 설정
3. Credentials → Create Credentials → OAuth 2.0 Client ID
4. Authorized redirect URIs: `https://xxxxxxxxxxx.supabase.co/auth/v1/callback`
5. Client ID / Secret 을 Supabase 의 Google provider 에 입력

### 4-3. Kakao OAuth
1. [카카오 개발자센터](https://developers.kakao.com) → 애플리케이션 추가
2. 플랫폼 → Web → 사이트 도메인: `https://app.qlink.app` (실제 도메인)
3. 카카오 로그인 → 활성화 + Redirect URI: `https://xxxxxxxxxxx.supabase.co/auth/v1/callback`
4. REST API 키와 Client Secret 을 Supabase Custom OAuth provider 로 추가
   (Kakao는 Supabase 내장이 아니라 Custom 으로 설정 — [공식 문서](https://supabase.com/docs/guides/auth/social-login/auth-kakao))

## 5. 스토리지 (썸네일·아바타용, 선택)

Storage → Create bucket:
- Name: `avatars`, Public: yes
- Name: `thumbnails`, Public: yes

각 버킷의 정책 — 자신의 파일만 업로드/수정 가능:
```sql
create policy "users upload own avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
```

## 6. 클라이언트 코드 (앱에 추가)

```ts
// app/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

이메일 로그인 예시:
```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email, password,
});
```

소셜 로그인:
```ts
await supabase.auth.signInWithOAuth({ provider: 'google' });
```

링크 추가:
```ts
const { data, error } = await supabase
  .from('links')
  .insert({ url, owner_id: user.id, folder_id, source_type: 'url' })
  .select().single();
```

## 7. RLS 검증

Authentication → Users 에 테스트 유저 만든 후, SQL Editor에서 본인이 만든 데이터만 조회되는지 확인:

```sql
-- 1. 다른 사용자 ID로 가짜 인증 (개발 검증용)
set local role authenticated;
set local request.jwt.claims = '{"sub":"<USER_UUID_A>"}';
select * from public.links;  -- A의 링크만 보여야 함

set local request.jwt.claims = '{"sub":"<USER_UUID_B>"}';
select * from public.links;  -- B의 링크만 보여야 함 (A것 안 보임)
```

## 8. 비용 모니터링

대시보드 Settings → Usage:
- DB row count
- Storage size
- 인증 MAU
- API requests

무료 티어 한도:
- DB: 500MB (링크 1개 ≈ 1KB → 50만 개)
- Auth: 50,000 MAU
- Storage: 1GB
- Bandwidth: 5GB/월

거의 모든 개인/소규모 서비스는 무료 티어로 충분.
