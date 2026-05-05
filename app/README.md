# QLINK App (React + Vite + PWA)

프로토타입(`../prototype`)의 React 포팅. PWA로 모바일 설치 가능.

## 실행

```bash
cd app
pnpm install   # 또는 npm install / yarn install
pnpm dev       # http://localhost:5173
```

## 프로덕션 빌드 / 미리보기

```bash
pnpm build
pnpm preview
```

빌드 결과는 `dist/` — Vercel이나 Cloudflare Pages 등에 그대로 정적 호스팅 가능.

## 구조

```
app/
├── public/                  # 정적 자산 (icons, manifest 자동 생성)
├── src/
│   ├── main.tsx             # 진입점
│   ├── App.tsx              # 라우팅 (screen state 기반)
│   ├── styles/app.css       # 디자인 토큰 + 컴포넌트 스타일 (prototype에서 포팅)
│   ├── lib/
│   │   ├── types.ts         # 도메인 타입
│   │   ├── store.ts         # Zustand 스토어 (persist)
│   │   ├── utils.ts         # uid, getDomain, faviconFor, timeAgo
│   │   └── mockAi.ts        # mockSummarize + autoClassifyFolder
│   ├── components/
│   │   ├── DeviceFrame.tsx
│   │   ├── Header.tsx       # 홈은 로고, 그 외는 ← + 타이틀
│   │   └── TabBar.tsx
│   └── features/
│       ├── auth/LoginScreen.tsx       # 2단계 (방법 선택 → 프로필)
│       ├── home/HomeScreen.tsx        # 필터 + 정렬 + 카드
│       ├── folders/FoldersScreen.tsx  # 내/공유 분리 + 정렬
│       └── settings/SettingsScreen.tsx
├── vite.config.ts           # vite-plugin-pwa
├── tsconfig.json
└── package.json
```

## 현재 포팅된 기능

- ✅ 디자인 토큰·테마(핑크/블루/그레이 × 라이트/다크)
- ✅ 로그인 mock — 2단계, 닉네임 + 아바타(이모지 48 + 사진 업로드)
- ✅ 홈 — 필터 칩 + 정렬 + 카드
- ✅ 폴더 — 내 / 공유 분리, 정렬 (추가/편집은 미포팅)
- ✅ 설정 — 테마 / 액센트 / 알림 / 로그아웃
- ✅ 헤더 컨텍스트 — 홈은 로고 + 액션, 비홈은 뒤로가기 + 타이틀
- ✅ Zustand persist (localStorage 키 `qlink-state-v2`)

## 미포팅 (TBD)

- 추가 시트 (URL/QR + 폴더 자동분류 + AI 제공자 변경)
- 폴더 편집 시트 (이모지 그리드, 멤버 관리, 삭제)
- 카톡 공유 sheet + simulateInviteAccept
- 폴더 상세 / 링크 상세 / 검색 / QR 스캐너
- 프로필 편집 sheet (설정에서 진입)
- FAB

→ 이들은 prototype/app.js 의 동일 함수를 React 훅·컴포넌트로 옮기면 됨. CSS는 이미 다 있음.

## Supabase 연결 (Step 2 이후)

`src/lib/supabase.ts` 파일을 만들고 `@supabase/supabase-js` 클라이언트를 export.
`store.ts` 의 각 액션을 Supabase 쿼리로 교체하거나 `lib/api.ts` 로 추상화.

`.env` (Vercel / 로컬):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
