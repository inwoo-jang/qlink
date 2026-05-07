# 큐링크 (QLink) — 프로젝트 구조

URL/QR 북마크 정리·공유 앱. AI가 자동 요약·분류해주는 모바일 웹앱(PWA).

## 디렉토리

```
qlink/
├── README.md            # 개발자용 quick-start (루트)
├── prototype/           # 즉시 실행 가능한 HTML 목업 (디자인·플로우 검증용, 라이브 데모)
│   ├── index.html, styles.css, app.js
│   └── supabase-*.js    # 프로토타입 백엔드(이전 단계, anon key 공개)
├── app/                 # React + Vite + TS + PWA (실서비스 본체, 부트스트랩만)
│   ├── src/{components,features,lib,styles}/, public/
│   └── package.json, vite.config.ts, README.md
├── extension/           # Chrome 확장 PoC (Gemini/ChatGPT 웹세션 브릿지)
│   ├── manifest.json, background.js
│   └── content/{qlink-bridge.js, gemini.js}
├── supabase/            # 프로토타입의 현재 라이브 백엔드 (Postgres+Auth+RLS)
│   ├── migrations/00{01,02,03}_*.sql
│   └── email-templates/
│   # ⚠️ 실서비스 DB는 AWS로 신규 설계 — docs/database.md 참고
├── docs/
│   ├── brief.md         # 원본 기획 메모
│   ├── PROJECT.md       # 이 파일 — 전체 구조 + 병렬 작업 시나리오
│   ├── DEPLOY.md        # Vercel + 도메인 + CI/CD 배포 가이드
│   ├── database.md      # AWS DB 설계 (엔티티 / 권한 / 마이그레이션 출처)
│   ├── planning/        # 기획 산출물 (개요·PRD·유저플로우·상세기능명세서)
│   │   ├── 01_프로젝트개요.md
│   │   ├── 02_PRD.md
│   │   ├── 04_유저플로우.md
│   │   ├── 05_상세기능명세서.md     # md 동반본
│   │   ├── 05_상세기능명세서.xlsx  # 정식 산출물 (6시트)
│   │   └── build_qlink_spec.py     # xlsx 빌더
│   ├── agents/          # 역할별 에이전트 정의 (병렬 작업 단위)
│   ├── skills/          # 에이전트가 사용하는 스킬 매뉴얼
│   └── screenshots/     # 화면 캡처 (홈/폴더/검색/설정/할일)
├── vercel.json          # 정적 배포 설정 (output: prototype/)
└── .gitignore
```

## 에이전트 ↔ 스킬 매핑

| 에이전트 | 사용 스킬 | 산출물 |
|---------|----------|--------|
| product-planner | prd-writing, user-flow-design, feature-spec | PRD, 유저플로우, 기능 명세 |
| ux-ui-designer | wireframing, ui-design-system | 와이어프레임, 디자인 토큰 |
| frontend-developer | react-pwa-implementation, qr-scanner-integration | React PWA 앱 |
| backend-developer | backend-api-spec, deployment | REST API, 데이터 모델 |
| ai-integration-developer | ai-web-bridge | Chrome 확장 + API 어댑터 |
| qa-engineer | qa-testing | 테스트 계획·케이스, E2E |
| devops-engineer | deployment | CI/CD, 호스팅 |

## 권장 기술 스택

- **프론트엔드**: React 19 + Vite + TypeScript + Tailwind + PWA
- **상태**: Zustand + TanStack Query
- **QR**: html5-qrcode
- **백엔드 (실서비스)**: AWS 직접 설계 — RDS(Postgres) + Cognito(Auth) + Lambda + API Gateway. 상세는 [database.md](database.md)
- **백엔드 (현재 프로토타입)**: Supabase (Postgres + Auth + RLS) — 라이브 데모용으로만 유지
- **AI 통합**:
  - 메인: Chrome Extension이 사용자 웹 Gemini/ChatGPT/Claude 세션을 통해 요약 (사용자 비용 0)
  - 폴백: 사용자 본인 API 키
- **배포**: Vercel(웹) + AWS(API/DB)
- **모니터링**: Sentry + PostHog

## AI 통합 방식 (핵심 결정)

기획에서 요청한 "웹 Gemini/ChatGPT/Claude 로그인 세션 활용"은 다음과 같이 구현합니다:

1. **Chrome Extension (메인)** — 사용자 브라우저의 로그인 세션을 그대로 사용해 합법적으로 요약 수행. Manifest V3, content script로 각 AI 사이트의 입력창에 프롬프트 주입 → 응답 파싱 → 큐링크 앱으로 postMessage.
2. **공식 API (폴백)** — 사용자가 본인 API 키 입력 시 사용. Gemini/OpenAI/Anthropic SDK 분기.
3. **헤드리스 브라우저(서버)** — ToS 위반 가능성 때문에 비권장. 옵션으로만 명세.

자세한 내용은 [skills/ai-web-bridge.md](skills/ai-web-bridge.md).

## 프로토타입 실행

빌드 도구 없이 바로 열 수 있습니다.

```bash
# 가장 간단한 방법: Python 내장 서버
cd prototype
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속

# 또는 Node 사용
npx serve prototype
```

> ⚠️ 카메라 QR 스캔은 **HTTPS 또는 localhost** 환경에서만 동작합니다. `file://`로 열면 카메라 권한이 거부됩니다.

### 프로토타입 기능
- ✅ 홈 피드 (시드 데이터 3개)
- ✅ 링크 추가 (URL 붙여넣기 + 클립보드 자동 인식)
- ✅ QR 스캔 (실제 카메라 + Mock 버튼)
- ✅ AI 요약 mock (URL 패턴 기반, 1.4초 지연)
- ✅ 폴더 생성·이동
- ✅ 검색 (디바운스 + 하이라이트)
- ✅ 링크 상세 (열기·공유·이동·알림·삭제)
- ✅ AI 제공자 선택(6종)
- ✅ 다크 모드
- ✅ 데이터 초기화

데이터는 `localStorage`에 저장됩니다 (`qlink:state:v1`).

## 병렬 작업 시나리오 (실서비스 구현 시작)

```
주차 1 (병렬)
├── product-planner: PRD 확정, 마일스톤 정의
├── ux-ui-designer:  디자인 토큰 + 와이어프레임 → Figma
└── devops-engineer: 레포 + CI + Vercel/Supabase 셋업

주차 2 (병렬)
├── frontend-developer: 라우팅·홈·추가시트·QR
├── backend-developer:  스키마·인증·링크 CRUD API
├── ai-integration-developer: 어댑터 인터페이스 + API 폴백 구현
└── qa-engineer: 테스트 계획서, 케이스 작성

주차 3 (병렬)
├── frontend-developer: 검색·폴더·상세·설정
├── ai-integration-developer: Chrome 확장 MVP
├── backend-developer:  검색·폴더·알림 API
└── qa-engineer: E2E 시나리오 자동화 시작

주차 4
├── 통합 테스트 / 버그 수정
├── 모바일 실기기 검증
└── 베타 배포
```

## 다음 단계 제안

1. 이 구조로 OK인지 확인
2. OK 시 → React 프로젝트 부트스트랩(`pnpm create vite`)부터 진행
3. 프로토타입에서 검증된 디자인을 React 컴포넌트로 이관
4. Chrome 확장 PoC (1개 provider만 먼저)
