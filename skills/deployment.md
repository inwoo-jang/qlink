---
name: deployment
description: Vercel + Supabase 기반 배포 및 CI/CD 셋업 가이드
owner: devops-engineer
---

# 배포 / CI/CD 스킬

## 환경 분리
- `local` — 로컬 dev
- `preview` — PR마다 Vercel preview URL
- `staging` — `develop` 브랜치 → staging.qlink.app
- `production` — `main` 브랜치 → app.qlink.app

## Vercel 설정
- Framework: Vite
- Build: `pnpm build`
- Output: `dist/`
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC`

## Supabase 설정
- Auth: Email + Google OAuth
- DB 스키마: `supabase/migrations/`로 버전 관리
- RLS 정책 예시:
```sql
create policy "users can read own links"
on links for select
using (auth.uid() = user_id);
```
- Edge Functions: `summarize-link`, `extract-meta`

## GitHub Actions (요약)
```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm i --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
  e2e:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:e2e
```

## Web Push 키 발급
```bash
npx web-push generate-vapid-keys
```
- public → 클라이언트 환경변수
- private → 서버에만 보관

## 모니터링
- Sentry: 프론트엔드 에러
- PostHog: 이벤트 분석(저장률, AI 요약 만족도)
- Supabase Logs: DB / Edge Functions

## 보안 체크리스트
- [ ] 모든 트래픽 HTTPS
- [ ] CSP 헤더(`script-src`, `connect-src` 화이트리스트)
- [ ] Supabase RLS 켜짐
- [ ] 시크릿 스캔(gitleaks pre-commit)
- [ ] Dependabot 활성화
