# 배포 가이드

`prototype/` (정적 HTML) 또는 `app/` (React PWA) 모두 Vercel·Cloudflare Pages·Netlify에 배포 가능.

권장 조합: **Vercel (프론트) + Supabase (백엔드)**

---

## A. 프로토타입을 즉시 띄우기 (가장 빠름, 데이터는 기기별 localStorage)

```bash
cd prototype
npx vercel          # 프로젝트 루트에서 1회
# 또는
npx vercel --prod   # 프로덕션 배포
```

**Vercel CLI가 처음이면**:
1. `npm i -g vercel`
2. `vercel login` (이메일 인증)
3. `vercel` → 프로젝트 이름·범위 선택 → 빌드 명령은 자동 감지 (정적이라 그냥 deploy)

→ `https://qlink-xxxxxx.vercel.app` 같은 URL이 발급됨. 도메인 연결 전이라도 즉시 공유 가능.

---

## B. React 앱 (`app/`) 배포

### B-1. GitHub에 push

```bash
cd /Users/inwoo/MyAgents/qlink
git init
git add .
git commit -m "Initial commit: QLINK prototype + React app"
gh repo create qlink --private --source=. --push   # gh CLI 사용 시
# 또는 GitHub 웹에서 빈 레포 만들고
git remote add origin git@github.com:USER/qlink.git
git push -u origin main
```

`.gitignore`에 `node_modules`, `dist`, `.env*` 들어가 있는지 확인.

### B-2. Vercel 연결

1. https://vercel.com → "Add New" → "Project"
2. GitHub 저장소 import
3. **Root Directory**: `app` ← 중요! (저장소 루트가 아닌 app 폴더)
4. Framework Preset: Vite (자동 감지됨)
5. Build Command: `pnpm build` (또는 `npm run build`)
6. Output Directory: `dist`

### B-3. 환경변수 등록

Project Settings → Environment Variables:

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |
| `VITE_KAKAO_APP_KEY` | `xxxx` (선택, Kakao Share용) | Production |

⚠️ `service_role` 키는 절대 클라이언트 변수로 등록하지 말 것 (서버 전용).

### B-4. 배포

- main 브랜치에 push → 자동 production 배포
- PR → 자동 preview URL 발급 (`qlink-git-feature-x.vercel.app`)
- 빌드 로그는 Deployments → 클릭

---

## C. 도메인 연결

### C-1. 도메인 구입
- 가비아 / Namecheap / Cloudflare Registrar 등
- 추천: Cloudflare Registrar (마진 0% — 가장 저렴, ~13,000원/년)
- 예: `qlink.app`, `qlink.kr`

### C-2. Vercel에서 도메인 추가
1. Project Settings → Domains → Add `qlink.app`
2. Vercel이 알려주는 DNS 레코드를 도메인 등록업체 콘솔에서 추가
   - `A` 레코드 또는 `CNAME` (Vercel 안내대로)
3. SSL 인증서는 자동 발급 (Let's Encrypt)
4. `app.qlink.app`(앱), `qlink.app`(랜딩) 식으로 분리하려면 서브도메인 추가

### C-3. Supabase 도메인 화이트리스트

Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://app.qlink.app`
- Redirect URLs: `https://app.qlink.app/**`, `http://localhost:5173/**`

---

## D. CI/CD (GitHub Actions, 선택)

Vercel 자체 빌드만으로도 충분하지만, 별도 검증을 추가하려면:

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: app } }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, cache-dependency-path: app/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm build
```

main 머지 후 Vercel이 자동 배포. PR마다 preview.

---

## E. 모니터링

- **Sentry** — 프론트엔드 에러 추적 ([sentry.io](https://sentry.io), 5K events/월 무료)
- **PostHog** — 사용자 행동 분석 ([posthog.com](https://posthog.com), 1M events/월 무료)
- **Supabase Logs** — DB / Edge Function 로그 (대시보드 내장)

---

## F. 비용 요약

| 항목 | 무료 티어 | 첫 유료 시점 |
|------|----------|-------------|
| Vercel | Hobby (무제한 정적 배포, 100GB 트래픽) | 팀 협업 / 빌드 시간 폭증 시 $20/월 |
| Supabase | 500MB DB, 50K MAU | DB > 500MB 또는 MAU > 50K → $25/월 |
| 도메인 | — | ~13,000원/년 (Cloudflare Registrar) |
| Sentry / PostHog | 충분 | 트래픽 폭증 시 |

→ **MVP·베타까지 약 1만 5천원/년 (도메인비)** 으로 운영 가능.
