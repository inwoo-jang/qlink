# QLINK 데스크톱 웹 프로토타입

`prototype/`(모바일 PWA 목업)과 별개로 **데스크톱 웹 UI/UX 미리보기**용 정적 HTML 목업.

> 📌 **목적**: 개발자가 React 작업하는 `app/` 폴더는 건드리지 않고, 디자인/PM 입장에서 웹 레이아웃을 빠르게 검증하기 위한 격리 프로토타입.

## 실행 방법

```bash
# 가장 간단: Python 내장 서버
cd prototype-web
python3 -m http.server 8001
# → http://localhost:8001
```

또는 그냥 `index.html`을 브라우저에 드래그해서 열면 됨 (file:// 동작).

권장 화면 폭: **1280px 이상**. 1024px 미만은 모바일 PWA(`prototype/`)를 사용.

## 포함 화면·기능

| 영역 | 상태 |
|---|---|
| 사이드바 (브랜드 / 새 링크 / 홈 / 할일 / 검색 / 내 폴더·공유 폴더 / 테마·프로필) | ✅ |
| 홈 — 카드 그리드 (2~4열 반응형) | ✅ |
| 폴더 상세 — 개인 / 공유 (멤버 표시·아바타) | ✅ |
| 할일 통합 — 기간지남·알림예정·완료 그룹 + 누적 토글 | ✅ |
| 우측 상세 패널 — 1920px+에서 카드 클릭 시 노출 | ✅ |
| 검색 모달 (⌘K / Ctrl+K) | ✅ |
| 링크 추가 모달 (N키) — 다중 할일 + 모드 chip + 가시성 (공유 폴더만) | ✅ |
| 테마 전환 — 라이트/다크 × 핑크/블루/그레이 | ✅ |
| 카드 hover 액션 | ✅ |
| 키보드 단축키 (⌘K, N, Esc) | ✅ |

## 데이터 모델 호환성

`prototype/app.js`와 **동일 데이터 모델**:
- `link.todos[]` (다중 할 일)
- `notifyMode: 'none'|'once'|'recurring'`
- `weekdays: number[]` (0=일~6=토)
- `completions[]` (회차별 완료)
- `visibility: 'private'|'public'` (공유 폴더 todo)
- `acceptances[]` (공개 todo 수락 멤버)

→ React 본체 구현 시 데이터 어댑터 그대로 재사용 가능.

## 디자인 토큰

`prototype/styles.css`에서 토큰만 복사 (라이트/다크 × 핑크/블루/그레이 6변형). 코드 재사용 X, 토큰만 일관성.

## 배포 (선택)

```bash
# Vercel CLI로 단독 배포 시
cd prototype-web && npx vercel --prod
# → qlink-web.vercel.app
```

또는 메인 프로젝트의 `vercel.json`을 수정해서 `/web/` 경로로 alias.

## 알려진 한계

- localStorage·서버 동기화 없음 (메모리 시드만)
- 새 링크 저장은 모달 열림까지만 작동 (실제 추가 X)
- 알림 발송 시뮬레이션 없음
- 진짜 동작은 `prototype/` 모바일 PWA에서 확인

## 다음 단계

- [ ] 디자이너·PM 피드백 수렴
- [ ] React 본체(`app/`)에 레이아웃·컴포넌트 이관
- [ ] Tailwind responsive로 모바일·웹 단일 코드베이스 완성 (PRD WEB-001)
