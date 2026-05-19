# QLINK — Web (Desktop) IA

작성일: 2026-05-19
버전: v1.0 (web 분리본 — 03_IA.md의 desktop 부분 상세화)
상위 문서: `03_IA.md`(통합 오버뷰), `02_PRD.md`, `04_유저플로우.md`, `docs/design-system/components.md`
대상 환경: viewport ≥ 1024px, React Router v6, PWA

> 개발자 핸드오프용. 화면 ID → 라우트 → 레이아웃 슬롯 → 사용 컴포넌트 → 데이터 의존성 → 상태(empty/loading/error)의 단일 출처.

---

## 0. TL;DR — 1분 요약

- **레이아웃**: 3-column persistent (Sidebar 260 | Main fluid | DetailPanel 440 — inline≥1600px / overlay<1600px / 숨김<감기 토글)
- **View 종류**: persistent shell(사이드바·탑바·detail panel) + content view 5종 + modal 4종
- **Content view 5종**: `newtab`, `home`(전체보기), `todos`, `folder`(개인/공유), `settings`
- **Modal 4종**: `search`(⌘K), `add-link`(N), `shortcut-picker`(newtab "+"), `confirm`(공통)
- **Detail panel**: `link-detail` 단일 — 카드 클릭 시 우측에 슬라이드/inline
- **인증·import 진입은 페이지 전환**(persistent shell 미적용): `login`, `signup`, `verify`, `import-flow`, `share-accept`

---

## 1. 사이트맵 (트리)

```
[Persistent Shell — 인증 후 모든 경로에서 공통]
├── Sidebar (260px)
│   ├── Brand
│   ├── CTA: "＋ 새 링크" (N)
│   ├── Nav: 🏡 홈(=newtab) / 📚 전체 보기 / ✅ 할일
│   ├── Section: 내 폴더 + "＋ 폴더 추가"
│   ├── Section: 공유 폴더 + "＋ 공유 참여"
│   └── Footer: ThemeSwitcher · SidebarProfile
├── Topbar
│   ├── SidebarToggle (★ <960px 햄버거)
│   ├── TopbarSearch ("⌘K"-trigger)
│   └── TopbarActions: 🔔 알림 · ⚙ 설정
├── Main Content (#content) ◀── view 5종 중 하나
└── DetailPanel (조건부) ◀── #LINK-DETAIL

[Content Views — Main에 마운트]
├── #NEWTAB              (default 진입)
├── #HOME-FEED           ("전체 보기")
├── #TODOS
├── #FOLDER-DETAIL       (개인 / 공유)
└── #SETTINGS (+ 7 sub-views)

[Modals — body 최상위]
├── #SEARCH-MODAL        (⌘K)
├── #ADD-LINK-MODAL      (N · 사이드바 CTA · OS 공유)
├── #SHORTCUT-PICKER     (newtab "+")
└── #CONFIRM-MODAL       (삭제·로그아웃 등 공용)

[Non-Shell Pages — 인증/대량 작업 — full-screen]
├── #SPLASH
├── #AUTH-LOGIN / #AUTH-SIGNUP / #AUTH-VERIFY
├── #SHARE-ACCEPT        (/invite/:token)
└── #IMPORT-FLOW         (#IMPORT-UPLOAD → #IMPORT-PREVIEW → #IMPORT-PROGRESS)
```

---

## 2. 라우팅 매트릭스

| Path | Screen ID | Auth | Shell | 비고 |
|---|---|---|---|---|
| `/` | #NEWTAB | ✅ | persistent | 사용자가 "홈 = #HOME-FEED"로 설정 시 #HOME-FEED |
| `/newtab` | #NEWTAB | ✅ | persistent | Chrome 확장 newtab override 타깃 |
| `/home` | #HOME-FEED | ✅ | persistent | 카드 그리드 (auto-fill 260~280px) |
| `/todos` | #TODOS | ✅ | persistent | `?filter=all\|undone\|upcoming\|overdue\|done` |
| `/folders/:id` | #FOLDER-DETAIL | ✅ + 멤버 | persistent | shared 폴더 멤버권 체크 |
| `/links/:id` | #LINK-DETAIL (패널) | ✅ | persistent | 딥링크 → 현재 view 위에 패널만 열림 |
| `/search` | #SEARCH-MODAL | ✅ | persistent | URL 보존용 (실제로는 모달) |
| `/settings` | #SETTINGS | ✅ | persistent | 진입점 메뉴 |
| `/settings/profile` | #SETTINGS-PROFILE | ✅ | persistent | 닉네임·아바타 |
| `/settings/ai` | #SETTINGS-AI | ✅ | persistent | 제공자 + API 키 |
| `/settings/password` | #SETTINGS-PASSWORD | ✅ | persistent | info-banner 포함 |
| `/settings/theme` | #SETTINGS-THEME | ✅ | persistent | 라이트/다크 + 핑크/블루/그레이 |
| `/settings/notification` | #SETTINGS-NOTIFICATION | ✅ | persistent | 데스크톱 알림 권한 |
| `/settings/extension` | #SETTINGS-EXT | ✅ + 데스크톱 | persistent | newtab override 토글, sync 권한 |
| `/settings/import` | #SETTINGS-IMPORT | ✅ + 데스크톱 | persistent | bookmarks.html import |
| `/import/upload` | #IMPORT-UPLOAD | ✅ | **non-shell** | 풀스크린 |
| `/import/preview` | #IMPORT-PREVIEW | ✅ | **non-shell** | 폴더 트리 |
| `/import/progress` | #IMPORT-PROGRESS | ✅ | **non-shell** | progress bar |
| `/login` | #AUTH-LOGIN | — | **non-shell** | |
| `/signup` | #AUTH-SIGNUP | — | **non-shell** | |
| `/verify` | #AUTH-VERIFY | — | **non-shell** | 가입 직후만 유효 |
| `/invite/:token` | #SHARE-ACCEPT | 권장 | **non-shell** | 미인증 시 토큰 보관 |
| `/share/receive` | (auto) → /home + #ADD-LINK-MODAL | ✅ | persistent | Web Share Target |

라우터: **React Router v6**. `<RootLayout>`이 persistent shell, `<AuthLayout>`/`<ImportLayout>`이 non-shell. nested route + outlet 구조.

---

## 3. 레이아웃 시스템 (반응형)

### 3.1 Breakpoint 매트릭스

| Width | Sidebar | DetailPanel | 카드 그리드 | 비고 |
|---|---|---|---|---|
| ≥ 1600 | docked 260px | **inline** 440px (3-column) | auto-fill min 280 | 가장 넓은 데스크톱 |
| 1180~1599 | docked 260px | **overlay** (transform slide) + backdrop | auto-fill min 280 | 일반 노트북 |
| 960~1179 | docked 220px | overlay | auto-fill min 260 | 분할창·작은 데스크톱 |
| <960 | **overlay** (햄버거 토글) | overlay (full-width <720) | auto-fill min 260 | 좁은 viewport — 모바일 PWA 권장 |
| <720 | overlay | **full-width** overlay | 1열 | viewport 안 좁힘 |

### 3.2 슬롯 정의

```
┌──────────────────┬──────────────────────────────────────┬──────────────────┐
│                  │  Topbar  (search + actions)          │                  │
│                  ├──────────────────────────────────────┤                  │
│    Sidebar       │                                      │   DetailPanel    │
│                  │           Main Content               │   (조건부)        │
│                  │           (#content)                 │                  │
│                  │                                      │                  │
└──────────────────┴──────────────────────────────────────┴──────────────────┘
       z=60                     z=base                          z=55
```

z-index: `sidebar(60) > detail-panel(55) > backdrop(50) > sticky-header(20) > base`. Modals layer at `100+` over all.

---

## 4. 화면 카탈로그 (Main content views)

### 4.1 #NEWTAB — 새 탭 / 시작 페이지

| 항목 | 값 |
|---|---|
| **Path** | `/`, `/newtab` |
| **Entry** | 기본 진입, 사이드바 "🏡 홈" 클릭, 브라우저 시작 페이지 설정, Chrome 확장 newtab override |
| **Layout slot** | Main content (sidebar/topbar persist) |
| **컴포넌트** | `PageHeader`(생략 — 자체 hero 사용), `Input` variant=pill, `SegmentedControl`(검색 모드), `ShortcutTile` (xN), `Button`, `TodoItem` variant=display, `Chip` (폴더), `Kbd` |
| **데이터** | `links[where pinned=true OR recent].limit(4)`, `todos[today OR recurring-today]`, `folders[order by linkCount desc].limit(6)`, `user.name` |
| **States** | • default: 인사 + 모든 위젯<br>• empty-shortcuts: "+ 바로가기 추가" 단독<br>• empty-todos: "오늘 할 일 없음"<br>• loading: skeleton (shortcuts/todos/folders) |
| **Transitions out** | • 검색바 enter → 외부 검색 OR `#SEARCH-MODAL` open<br>• "+ 타일" → `#SHORTCUT-PICKER`<br>• todo 클릭 → `/links/:id` (`#LINK-DETAIL` panel)<br>• 폴더 chip → `/folders/:id`<br>• 빠른 액션 "새 링크" → `#ADD-LINK-MODAL` |
| **단축키** | ⌘K(검색), N(추가) — 전역과 동일 |
| **Data API** | `GET /api/newtab` (위젯 묶음 응답 권장 — links.recent + todos.today + folders.frequent) |

---

### 4.2 #HOME-FEED — 전체 보기

| 항목 | 값 |
|---|---|
| **Path** | `/home` |
| **Entry** | 사이드바 "📚 전체 보기" |
| **Layout slot** | Main content |
| **컴포넌트** | `PageHeader`, `LinkCard` (xN, hover 액션), `Chip`(필터바 — 향후), `EmptyState` |
| **데이터** | `links[order by createdAt desc]`, paginate (infinite) |
| **States** | default / empty(`#HOME-FEED-EMPTY`) / loading(`Skeleton` 카드 6개) / error(retry) |
| **Card hover 액션** | `card-pin` (즐겨찾기 ★), `card-act` (메뉴) |
| **Card click** | DetailPanel 오픈 (`/links/:id`) |
| **⌘클릭 / Ctrl+클릭** | 원본 URL 새 창 |
| **Data API** | `GET /api/links?cursor=&limit=24` |

---

### 4.3 #TODOS — 할일 통합

| 항목 | 값 |
|---|---|
| **Path** | `/todos`, `/todos?filter=...` |
| **Entry** | 사이드바 "✅ 할일" |
| **Layout slot** | Main content |
| **컴포넌트** | `PageHeader`, `Chip` filter bar (전체/미완료/알림예정/기간지남/완료), `TodoItem` variant=row (xN), `TodoHistory`(누적 토글), `EmptyState` |
| **데이터** | `todos.flatMap(link.todos)` — `link`와 join. 필터 server-side 권장 |
| **States** | default / per-filter-empty / loading / error |
| **Sections** | 기간지남(overdue) → 알림예정(upcoming) → 완료(done — `?filter=done`에서만) |
| **Item click** | `/links/:id` (#LINK-DETAIL panel, todo focus) |
| **Toggle check** | `PATCH /api/todos/:id/occurrences` (회차 추가) |
| **Data API** | `GET /api/todos?filter=...`, `POST /api/todos/:id/occurrences` |

---

### 4.4 #FOLDER-DETAIL — 폴더 (개인/공유)

| 항목 | 값 |
|---|---|
| **Path** | `/folders/:id` |
| **Entry** | 사이드바 폴더 아이템 클릭 |
| **Layout slot** | Main content |
| **컴포넌트** | `PageHeader`(이모지+이름+meta), `Card` (shared-meta-bar — 공유 시), `AvatarGroup`, `Button` "공유"/"멤버", `LinkCard` grid, `EmptyState` |
| **데이터** | `folder` + `folder.links` + `folder.members`(shared) |
| **권한** | shared 폴더는 멤버만 접근. 비멤버 → 403 → /invite 안내 |
| **States** | default(private) / default(shared+meta-bar) / empty / loading / error / forbidden(non-member) |
| **Variants** | `folder.shared === false` → meta-bar 숨김, members 섹션 숨김 |
| **Data API** | `GET /api/folders/:id`, `GET /api/folders/:id/members` |

---

### 4.5 #SETTINGS + sub-views

7개 하위 화면(profile/ai/password/theme/notification/extension/import). 모두 **Main content 슬롯**에 마운트. 사이드바·탑바 유지. 좌측 sub-nav 또는 breadcrumb 없이 sidebar 안의 ⚙ 진입점에서 라우팅.

| Sub-screen ID | Path | 컴포넌트 | 데이터 | API |
|---|---|---|---|---|
| #SETTINGS | `/settings` | `Card` list, `SidebarItem`-like rows | `user` 요약 | `GET /api/me` |
| #SETTINGS-PROFILE | `/settings/profile` | `Input`, `Avatar` editable, `EmojiPicker` | `user.{name,avatar}` | `PATCH /api/me` |
| #SETTINGS-AI | `/settings/ai` | `RadioGroup` (6종), `Input` (API key, password type) | `user.aiProvider`, `user.apiKey` | `PATCH /api/me/ai` |
| #SETTINGS-PASSWORD | `/settings/password` | `Alert` info-banner, `Input` × 2 | `user` | `PATCH /api/me/password` |
| #SETTINGS-THEME | `/settings/theme` | `Switch` (다크), `ThemeSwitcher` (accent 3종) | `user.theme`, `user.accent` | `PATCH /api/me/theme` |
| #SETTINGS-NOTIFICATION | `/settings/notification` | `Switch` (desktop push), `Alert`(권한 안내) | `user.notification.{desktop,mobile}` | `PATCH /api/me/notification` |
| #SETTINGS-EXT | `/settings/extension` | `Alert`, `Button` (확장 설치), `Switch` (newtab override) | `user.extension.installed` | `GET /api/me/extension` |
| #SETTINGS-IMPORT | `/settings/import` | `Button` "가져오기" | — | (action만 — non-shell 페이지로 이동) |

---

## 5. Detail Panel — #LINK-DETAIL

| 항목 | 값 |
|---|---|
| **Path** | `/links/:id` (overlay on top of 현재 view) |
| **Entry** | LinkCard 클릭, /todos item 클릭, 검색 결과 클릭, 푸시 알림 |
| **모드** | • inline (≥1600): 우측 컬럼 영구 노출<br>• overlay (<1600): 우측 슬라이드 + backdrop |
| **컴포넌트** | `DetailPanel`, `Button` icon (close), `Badge` tag, `TodoItem` variant=display × N, `TodoHistory`, `Textarea`(memo) |
| **섹션** | URL/타이틀 헤더 → 요약(AI summary) → 태그 → 할일 목록 + "+ 할 일 추가" → 메모(공개 폴더 시 `Alert` privacy note) → 하단 액션 그리드(`Button` 6종: 열기/공유/이동/알림/편집/삭제) |
| **States** | loading / loaded / 작성자 view(편집 가능) / 멤버 view(공유 폴더) |
| **Close** | 우상단 ✕ / Esc / backdrop 클릭(overlay 모드 한정) |
| **Data API** | `GET /api/links/:id` (with todos + history + memo) |

---

## 6. Modal 인벤토리

| Modal ID | Trigger | 컴포넌트 | 데이터 | Close |
|---|---|---|---|---|
| **#SEARCH-MODAL** | ⌘K · 탑바 search · 검색 아이콘 | `Dialog` placement=center, `Input` autofocus, `CommandPalette` grouped 결과 (folders / links / todos), `Kbd` footer | 즉시 검색 `GET /api/search?q=...` (debounce 200ms) | Esc / ✕ / backdrop / 결과 선택 시 자동 |
| **#ADD-LINK-MODAL** | N키 · 사이드바 CTA · OS share → /share/receive · 카드 hover "+" | `Dialog` size=lg, `Input`(URL — 클립보드 자동 감지), `Select`(폴더), `Input`(메모), `TodoEditor` × N, `Button`(저장+AI 요약) | `folders[]` (select option), 클립보드 URL | Esc / ✕ / 취소 / 저장 후 자동 |
| **#SHORTCUT-PICKER** | #NEWTAB "+ 바로가기 추가" | `Dialog` size=md, `Input`(검색), 미고정 링크 리스트(클릭 시 `pinned=true`) | `links[where pinned=false]` | Esc / ✕ / 선택 후 자동 / 8개 도달 시 안내 |
| **#CONFIRM-MODAL** | 삭제·로그아웃·데이터 초기화 등 | `AlertDialog` (variant=danger) | — | 확인/취소 |

모든 모달: `z-index 100+`, `backdrop blur(6px) + rgba(0,0,0,.4)`, body scroll lock.

---

## 7. 키보드 단축키 매트릭스

| 키 | 액션 | 컨텍스트 |
|---|---|---|
| ⌘K / Ctrl+K | #SEARCH-MODAL open | 전역 (인풋 포커스 무관) |
| N | #ADD-LINK-MODAL open | 전역 (인풋 포커스 시 무시) |
| J / K | 카드 다음/이전 | #HOME-FEED, #FOLDER-DETAIL, #TODOS |
| Enter | 선택 카드 → DetailPanel | 카드 hover/select 시 |
| ⌘클릭 / Ctrl+클릭 | 원본 URL 새 창 | 카드/링크 |
| Shift+클릭 | 다중 선택 (범위) | 카드 그리드 |
| ⌘A / Ctrl+A | 현재 화면 카드 전체 선택 | 카드 그리드 |
| Del / Backspace | 선택 항목 삭제 (확인 모달) | 카드 선택 시 |
| Esc | 모달 → DetailPanel(overlay) → 선택 해제 → 사이드바(overlay) 순서 | 전역 |
| ? | 단축키 도움말 토스트 | 전역 |

우선순위(`Esc` 처리 순서): 모달 > DetailPanel(overlay) > 다중선택 해제 > 사이드바(<960px overlay).

---

## 8. 컴포넌트 사용 매트릭스 (화면 × 컴포넌트)

> 컴포넌트 정의는 [components.md](../design-system/components.md). 화면별 핵심 컴포넌트만 표기.

| 컴포넌트 | NEWTAB | HOME-FEED | TODOS | FOLDER-DETAIL | SETTINGS-* | LINK-DETAIL | 모달 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| AppHeader (=Topbar) | shell | shell | shell | shell | shell | shell | — |
| Sidebar(+children) | shell | shell | shell | shell | shell | shell | — |
| PageHeader | ✕(hero) | ✅ | ✅ | ✅ | ✅ | — | — |
| LinkCard | preview용 | ✅ | — | ✅ | — | — | — |
| TodoItem | display | — | row | inline(카드 내) | — | display | — |
| Chip (filter) | 모드 chip | — | ✅ | — | — | — | — |
| Button | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Input | search(pill) | — | — | — | ✅ | ✅(memo→Textarea) | ✅ |
| Select | — | — | — | — | — | — | ✅(폴더) |
| RadioGroup | — | — | — | — | ✅(AI) | — | — |
| Switch | — | — | — | — | ✅(theme/알림) | — | — |
| ThemeSwitcher | — | — | — | — | ✅ | — | — |
| ShortcutTile | ✅ | — | — | — | — | — | — |
| Card | — | (=LinkCard) | — | shared-meta | rows | — | — |
| AvatarGroup | — | — | — | ✅(shared) | — | — | — |
| Avatar | header | — | — | — | ✅ | — | — |
| Badge | — | tag/badge | overdue | — | — | tag | — |
| Alert | — | — | — | — | info-banner | privacy note | — |
| Dialog | — | — | — | — | — | — | ✅(all) |
| AlertDialog | — | — | — | — | — | — | ✅(confirm) |
| CommandPalette | — | — | — | — | — | — | ✅(search) |
| TodoEditor | — | — | — | — | — | — | ✅(add) |
| TodoHistory | — | — | ✅(toggle) | — | — | ✅ | — |
| DetailPanel | — | — | — | — | — | ✅ | — |
| EmptyState | shortcuts/todos | feed | per-filter | folder | — | — | — |
| Skeleton | widgets | cards | rows | cards | — | sections | results |
| Tooltip | — | — | — | — | — | — | — |
| Kbd | quick-actions/hint | — | — | — | — | — | search/add footer |

---

## 9. 데이터 의존성

| 화면 | 1차 쿼리 | 2차 쿼리 | mutation |
|---|---|---|---|
| #NEWTAB | `GET /api/newtab` (위젯 묶음) | — | shortcut toggle: `PATCH /api/links/:id` `{pinned}` |
| #HOME-FEED | `GET /api/links?cursor` | — | delete: `DELETE /api/links/:id` |
| #TODOS | `GET /api/todos?filter` | — | check: `POST /api/todos/:id/occurrences` |
| #FOLDER-DETAIL | `GET /api/folders/:id` | `GET /api/folders/:id/members` (shared 시) | — |
| #LINK-DETAIL | `GET /api/links/:id` | `GET /api/todos/:id/acceptances`(공개 todo), `GET /api/todos/:id/occurrences` | edit/delete/move/share |
| #SEARCH-MODAL | `GET /api/search?q` (debounce 200ms) | — | — |
| #ADD-LINK-MODAL | `GET /api/folders` (select) | clipboard read (browser API) | `POST /api/links` (+ AI summarize) |
| #SHORTCUT-PICKER | `GET /api/links?pinned=false` | — | `PATCH /api/links/:id {pinned:true}` |
| #SETTINGS-* | `GET /api/me` | — | sub-screen별 `PATCH /api/me/{section}` |

상세 API는 [`06_API명세서.md`](06_API명세서.md) 참조.

---

## 10. 화면 공통 상태 (Empty / Loading / Error / Forbidden)

| 상태 | 화면 적용 | UI 패턴 |
|---|---|---|
| **Empty** | NEWTAB-shortcuts, NEWTAB-todos, HOME-FEED, TODOS(filter별), FOLDER-DETAIL, SEARCH-MODAL | `EmptyState` (emoji + title + description + 1차 CTA) |
| **Loading** | 모든 데이터 페치 화면 | `Skeleton` 카드/로우 (shimmer animation, ≥300ms 지연 시 노출 — flash 방지) |
| **Error** | 모든 GET 실패 | `EmptyState` variant=danger + "다시 시도" `Button` |
| **Forbidden (403)** | FOLDER-DETAIL (비멤버), LINK-DETAIL (비멤버) | `EmptyState` + "초대 받아 들어가기" 안내 |
| **Stale (offline)** | 전역 | `Toast` 하단 노출 ("오프라인 — 변경은 동기화 대기") |

---

## 11. 외부 진입 & 통합

| 진입점 | 도착 | 처리 |
|---|---|---|
| Web Share Target (`/share/receive?url=...`) | persistent shell 진입 후 즉시 `#ADD-LINK-MODAL` open with URL prefilled | manifest.json `share_target` |
| Chrome 확장 — newtab override | `/newtab` → #NEWTAB | manifest `chrome_url_overrides.newtab` |
| Chrome 확장 — 즐겨찾기 sync | background only (UI 진입 없음) | `chrome.bookmarks` API |
| 푸시 알림 클릭 | `/links/:id` → 현재 view + #LINK-DETAIL | service worker `notificationclick` |
| 초대 링크 | `/invite/:token` (non-shell) → 수락 후 `/folders/:id` | 미인증 시 `localStorage` 토큰 보관 → 로그인 후 자동 |
| Bookmarks.html 업로드 | `/import/*` (non-shell 3단계) | IMPORT-001 |

---

## 12. 변경 이력

| 일자 | 버전 | 변경 |
|---|---|---|
| 2026-05-19 | v1.0 | `03_IA.md`에서 desktop 부분만 분리. layout 슬롯·breakpoint·modal 인벤토리·컴포넌트 매트릭스·데이터 의존성 상세화 |
