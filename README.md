# 큐링크 (QLINK)

> URL/QR 북마크를 AI가 자동 요약·분류해주는 모바일 웹앱(PWA).
> **라이브 데모**: https://qlink-iota.vercel.app

---

## 무엇이 있고 어디서 시작하나

| 폴더 | 상태 | 용도 |
|------|------|------|
| [`prototype/`](prototype/) | ✅ 완성 (라이브 배포) | HTML/CSS/JS 단일 페이지 목업. **디자인·플로우의 ground truth**. React 작업자는 이걸 참고해서 컴포넌트로 이관. |
| [`app/`](app/) | 🟡 부트스트랩만 | React 19 + Vite + TS 골격. 실서비스 본체. 작업 시작점. |
| [`extension/`](extension/) | 🟡 PoC | Chrome 확장 (Gemini 웹세션 브릿지). MV3 Manifest + content script 골격. |
| [`supabase/`](supabase/) | ⚠️ Legacy | 프로토타입의 라이브 백엔드. **실서비스는 AWS로 신규 설계** ([docs/database.md](docs/database.md)). |
| [`docs/`](docs/) | 📚 기획·스펙 전체 | PRD·에이전트·스킬·DB·배포 — 작업 전 반드시 통독. |

---

## 5분 안에 프로토타입 띄우기

```bash
# 1. 클론
git clone https://github.com/inwoo-jang/qlink.git
cd qlink

# 2. 정적 서버
cd prototype && python3 -m http.server 8000
# 또는: npx serve prototype
```

`http://localhost:8000` 접속. 카메라(QR 스캔)는 **HTTPS 또는 localhost**에서만 동작 (`file://` 안됨).

게스트 모드로 가입 없이 즉시 둘러볼 수 있고, 이메일 가입 시 `prototype/supabase-config.js`의 Supabase 인스턴스로 데이터가 저장됩니다.

---

## 개발 시작 가이드 (역할별)

각 에이전트 정의 파일에 **사용할 스킬·산출물·기간**이 명시되어 있습니다.

| 역할 | 먼저 읽을 파일 |
|------|--------------|
| 기획 (PRD/유저플로우) | [docs/agents/product-planner.md](docs/agents/product-planner.md) |
| UX/UI 디자인 | [docs/agents/ux-ui-designer.md](docs/agents/ux-ui-designer.md) |
| 프론트엔드 (React PWA) | [docs/agents/frontend-developer.md](docs/agents/frontend-developer.md) → [docs/skills/react-pwa-implementation.md](docs/skills/react-pwa-implementation.md) |
| 백엔드 (AWS) | [docs/agents/backend-developer.md](docs/agents/backend-developer.md) → [docs/database.md](docs/database.md), [docs/skills/backend-api-spec.md](docs/skills/backend-api-spec.md) |
| AI 통합 (확장+API) | [docs/agents/ai-integration-developer.md](docs/agents/ai-integration-developer.md) → [docs/skills/ai-web-bridge.md](docs/skills/ai-web-bridge.md) |
| QA | [docs/agents/qa-engineer.md](docs/agents/qa-engineer.md) → [docs/skills/qa-testing.md](docs/skills/qa-testing.md) |
| DevOps | [docs/agents/devops-engineer.md](docs/agents/devops-engineer.md) → [docs/DEPLOY.md](docs/DEPLOY.md) |

병렬 작업 시나리오(주차별 분담): [docs/PROJECT.md](docs/PROJECT.md#병렬-작업-시나리오-실서비스-구현-시작)

---

## 기술 스택 (확정)

- **프론트**: React 19 + Vite + TypeScript + Tailwind + PWA + Zustand + TanStack Query
- **QR**: `html5-qrcode`
- **백엔드 (실서비스)**: **AWS 직접 설계** — RDS(Postgres) + Cognito + Lambda + API Gateway
- **백엔드 (프로토타입)**: Supabase (legacy, 라이브 데모만 유지)
- **AI**: Chrome 확장으로 사용자의 Gemini/ChatGPT/Claude 웹 세션을 활용 (메인) + 사용자 API 키 폴백
- **배포**: Vercel(웹) + AWS(API/DB), Sentry + PostHog

---

## 자주 보는 문서

**기획 (docs/planning/)**
- 프로젝트 개요: [docs/planning/01_프로젝트개요.md](docs/planning/01_프로젝트개요.md)
- PRD: [docs/planning/02_PRD.md](docs/planning/02_PRD.md)
- 유저플로우: [docs/planning/04_유저플로우.md](docs/planning/04_유저플로우.md)
- 상세 기능명세서: [docs/planning/05_상세기능명세서.md](docs/planning/05_상세기능명세서.md) + [.xlsx](docs/planning/05_상세기능명세서.xlsx)

**구조·DB·배포**
- 전체 구조: [docs/PROJECT.md](docs/PROJECT.md)
- DB 설계 (AWS): [docs/database.md](docs/database.md)
- 배포: [docs/DEPLOY.md](docs/DEPLOY.md)
- 원본 기획 메모: [docs/brief.md](docs/brief.md)
- 화면 참고: [docs/screenshots/](docs/screenshots/)

---

## 라이선스 / 기여

기여 가이드는 추후 추가. 모든 PR은 `main` 브랜치에 머지되면 Vercel이 자동 배포합니다.
