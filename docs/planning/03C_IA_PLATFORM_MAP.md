# QLINK — Web ↔ App 플랫폼 매핑

작성일: 2026-05-19
버전: v1.0
상위 문서: `03A_IA_WEB.md`, `03B_IA_APP.md`, `03_IA.md`

> 단일 React PWA 코드베이스에서 viewport(또는 device class)로 분기되는 두 IA의 매핑 표. 같은 의미의 화면·동작·컴포넌트가 양쪽에서 어떻게 표현되는지 단일 출처로 정리.

---

## 1. 화면(라우트) 매핑

| 의미(라우트) | Web 화면 | App 화면 | 분기 포인트 |
|---|---|---|---|
| `/` | #NEWTAB (default) | #M-HOME | desktop: newtab 위젯 hub / mobile: 카드 피드 |
| `/home` | #HOME-FEED ("전체 보기") | (= `/`의 #M-HOME) | mobile에선 `/home`을 `/`로 redirect |
| `/newtab` | #NEWTAB | (없음 — `/`로 redirect 또는 위젯만 dropdown) | desktop 전용 진입점 |
| `/folders` | (사이드바 목록만 — 별도 view 없음) | #M-FOLDERS | web은 sidebar에 트리, mobile은 별도 탭 |
| `/folders/:id` | #FOLDER-DETAIL | #M-FOLDER-DETAIL | 동일 의미 — 레이아웃만 다름 |
| `/todos` | #TODOS | #M-TODOS | 동일 (필터·정렬 동일 스펙) |
| `/links/:id` | #LINK-DETAIL (overlay/inline 패널) | #M-LINK-DETAIL (sub-screen push) | desktop=panel / mobile=screen |
| `/search` | #SEARCH-MODAL (⌘K) | (헤더 검색 → 검색 화면 또는 home-search-box 인라인) | desktop은 모달 / mobile은 인라인 검색 박스 |
| `/settings` | #SETTINGS | #M-SETTINGS | 동일 |
| `/settings/profile`/`/ai`/... | #SETTINGS-* (Main 슬롯) | (대부분 sheet로 흡수) | desktop=sub-view / mobile=sheet |
| `/settings/account` | (없음 — 통합 sub-view) | #M-ACCOUNT | mobile만 별도 sub-screen |
| `/settings/extension`/`/import` | #SETTINGS-EXT, #SETTINGS-IMPORT | (모바일에선 안내 toast만) | desktop 전용 |
| `/qr` | (없음 — 카메라 UX 부적합) | #M-QR-SCAN | mobile 전용 |
| `/login`·`/signup`·`/verify` | #AUTH-* (full-screen) | #M-AUTH-* (non-shell) | 동일 의미, 폼 레이아웃만 다름 |
| `/invite/:token` | #SHARE-ACCEPT | #M-SHARE-ACCEPT | 동일 |
| `/share/receive` | persistent shell + #ADD-LINK-MODAL | tab+header shell + #M-LINK-ADD-SHEET | OS 통합 진입 |
| `/import/*` | #IMPORT-FLOW (3단계 풀스크린) | (안내만) | desktop 전용 |

---

## 2. 모달 / 시트 매핑

같은 의미를 가지지만 플랫폼별 표현(Modal vs Sheet)이 다른 표면.

| 의미 | Web | App | 비고 |
|---|---|---|---|
| 새 링크 추가 | `#ADD-LINK-MODAL` (center, lg) | `#M-LINK-ADD-SHEET` (bottom, medium) | 폼 동일 |
| 검색 | `#SEARCH-MODAL` (CommandPalette) | 헤더 🔍 → 인라인 검색 박스 (`home-search-box`) | mobile은 모달 안 씀 |
| 폴더 생성 | (사이드바 "+" → `#ADD-LINK-MODAL` 변형 또는 별도 micro modal) | `#M-NEW-FOLDER-SHEET` | (web에 micro modal 추가 필요 — TODO) |
| 폴더 편집 | DetailPanel 안 inline action | `#M-EDIT-FOLDER-SHEET` | |
| 폴더 picker (이동) | `Select` 컴포넌트 dropdown | `#M-FOLDER-PICKER-SHEET` | |
| 바로가기 picker | `#SHORTCUT-PICKER` (md) | (모바일 newtab 미적용 — 미사용) | desktop 전용 |
| 할일 추가/편집 | `#ADD-LINK-MODAL` 안 `TodoEditor` 인라인 / 별도 micro modal | `#M-TODO-SHEET` | |
| 메모 편집 | DetailPanel 안 `Textarea` inline | `#M-MEMO-SHEET` (full) | mobile은 메모가 별도 sheet |
| 이메일 6자리 코드 대기 | non-shell 페이지 `#AUTH-VERIFY` | `#M-EMAIL-WAIT-SHEET` | |
| 프로필 편집 | `#SETTINGS-PROFILE` sub-view | `#M-EDIT-PROFILE-SHEET` | |
| 비밀번호 변경 | `#SETTINGS-PASSWORD` sub-view | `#M-PASSWORD-CHANGE-SHEET` | info-banner 양쪽 동일 |
| AI 제공자 선택 | `#SETTINGS-AI` sub-view | `#M-PROVIDER-SHEET` | |
| 카톡 공유 | (`Button` Kakao SDK 호출) | `#M-KAKAO-SHARE-SHEET` | desktop은 sheet 없이 즉시 호출 |
| 확인 (삭제·로그아웃) | `#CONFIRM-MODAL` (`AlertDialog`) | `#M-CONFIRM-SHEET` (`AlertDialog` 변형) | `Dialog placement="bottom"`으로 흡수 가능 |
| FAB 메뉴 | (없음 — 사이드바·단축키로 대체) | `#M-FAB-MENU` | mobile 전용 |

→ 컴포넌트 레벨에선 `Dialog` 하나로 `placement: "center" | "bottom"` 분기. UX 명세는 위 표대로 명확히 분리.

---

## 3. 레이아웃 분기 매트릭스

| 영역 | Web (≥1024) | App (<1024) | 분기 코드 위치 |
|---|---|---|---|
| Shell | `<DesktopShell>` (Sidebar + Topbar + DetailPanel) | `<MobileShell>` (Header + Screen + FAB + TabBar) | RootLayout — viewport hook |
| 좌측 네비 | Sidebar (영구) | TabBar bottom (영구) | — |
| 헤더 | Topbar (검색·알림) | AppHeader (back·title·actions) | — |
| 상세 보기 | DetailPanel (≥1600 inline / <1600 overlay) | sub-screen push (`/links/:id`) | route + viewport |
| 추가 액션 | 사이드바 CTA · 카드 hover · N키 | Fab (홈/폴더/할일) | — |
| 모달 표면 | `Dialog placement="center"` | `Sheet` (`Dialog placement="bottom"`) | platform 분기 hook |
| 검색 | `Dialog` + `CommandPalette` | 헤더 → 인라인 검색 박스 | route + platform |
| Settings sub-view | `/settings/*` sub-view | `Sheet` open | route + platform |

### 분기 hook 예시

```ts
// hooks/useDeviceClass.ts
export function useDeviceClass(): 'web' | 'app' {
  const w = useViewport();
  return w >= 1024 ? 'web' : 'app';
}

// AdaptiveDialog.tsx
function AdaptiveDialog({ open, ...rest }) {
  const device = useDeviceClass();
  return (
    <Dialog
      open={open}
      placement={device === 'web' ? 'center' : 'bottom'}
      size={device === 'web' ? 'lg' : 'medium'}
      {...rest}
    />
  );
}
```

---

## 4. 컴포넌트 사용 차이

같은 컴포넌트가 두 플랫폼에서 다르게 보이는 케이스만 명시.

| 컴포넌트 | Web variant | App variant | 코드 분기 |
|---|---|---|---|
| Button | `size: md` 기본, hover state 활용 | `size: lg` 기본 (탭 영역 ≥44px), active state 활용 | platform prop 또는 CSS-only |
| Input | `variant: pill`(검색), `variant: default`(폼) | `variant: search`(home-search-box), `variant: default` | — |
| Card | hover lift + shadow-md | active scale 0.98 | — |
| Dialog | center, lg | bottom, full | `placement` prop |
| Tabs | 사이드바 nav가 대체 | `BottomTabs` 별도 컴포넌트 | — |
| Tooltip | hover-based | (없음 — long-press hint로 대체) | — |
| ShortcutTile | 사용 | (미사용) | desktop 전용 |
| Fab | (없음 — 사이드바 CTA로 대체) | 사용 | mobile 전용 |
| AppHeader | Topbar 형태 | sticky header 형태 | shell 단위 분기 |
| Sidebar | 사용 | (없음 — TabBar로 대체) | — |
| BottomTabs | (없음) | 사용 | — |
| DetailPanel | 사용 (slide/inline) | (sub-screen으로 대체) | — |
| Kbd | 다수 노출 | (제스처 안내 토스트로 대체) | — |

---

## 5. 단축키 / 제스처 매핑

| 의도 | Web (키보드) | App (제스처) |
|---|---|---|
| 검색 열기 | ⌘K / Ctrl+K | 헤더 🔍 탭 |
| 새 링크 추가 | N | FAB 짧게 탭 |
| 다른 액션 메뉴 | (사이드바·hover 메뉴) | FAB 길게 탭 (FabMenu) |
| 이전/다음 카드 | J / K | (스와이프 좌우 — v1.1 검토) |
| 상세 열기 | Enter | 카드 탭 |
| 원본 새 창 | ⌘클릭 / Ctrl+클릭 | 카드 길게 탭 → 컨텍스트 메뉴 "원본 열기" |
| 다중 선택 | Shift+클릭, ⌘A | 카드 길게 탭 → SelectionBar |
| 삭제 | Del / Backspace | SelectionBar 휴지통 |
| 닫기 | Esc | back gesture / sheet swipe-down |
| 도움말 | ? | 설정 화면 안 "도움말" |
| 새로고침 | (자동) | Pull-to-refresh |

---

## 6. 진입점 매핑

| 진입점 | Web 도착 | App 도착 |
|---|---|---|
| 첫 진입 (인증됨) | `/` → #NEWTAB | `/` → #M-HOME |
| 첫 진입 (비인증) | `/login` → #AUTH-LOGIN | `/login` → #M-AUTH-LOGIN |
| OS Share (URL 공유) | `/share/receive` → shell + #ADD-LINK-MODAL | `/share/receive` → shell + #M-LINK-ADD-SHEET |
| 푸시 알림 | `/links/:id` (DetailPanel) | `/links/:id` (sub-screen) |
| 초대 링크 | `/invite/:token` → #SHARE-ACCEPT → `/folders/:id` | 동일 |
| Chrome 확장 newtab | `/newtab` → #NEWTAB | (미적용 — desktop 전용) |
| 즐겨찾기 sync (확장) | background | (미적용) |
| Bookmarks.html | `/settings/import` → #IMPORT-FLOW | (안내 toast만) |
| QR 스캔 | (미적용 — 카메라 UX 부적합) | 헤더 QR 또는 #M-LINK-ADD-SHEET → `/qr` |

---

## 7. 데이터 / API 동일성

> 두 플랫폼은 **같은 API 엔드포인트**를 호출. 차이는 호출 빈도·캐시 전략·UI 표현뿐.

| 엔드포인트 | Web | App |
|---|---|---|
| `GET /api/newtab` | #NEWTAB에서 호출 | (사용 안 함 — 개별 호출 fallback) |
| `GET /api/links` | #HOME-FEED, #SHORTCUT-PICKER | #M-HOME |
| `GET /api/links/:id` | #LINK-DETAIL panel | #M-LINK-DETAIL |
| `GET /api/folders` | sidebar render, #ADD-LINK-MODAL select | #M-FOLDERS, #M-FOLDER-PICKER-SHEET |
| `GET /api/folders/:id` | #FOLDER-DETAIL | #M-FOLDER-DETAIL |
| `GET /api/todos` | #TODOS | #M-TODOS |
| `POST /api/links` | #ADD-LINK-MODAL | #M-LINK-ADD-SHEET |
| `POST /api/todos/:id/occurrences` | #TODOS check, #LINK-DETAIL check | 동일 |
| `GET/PATCH /api/me*` | #SETTINGS-* | #M-SETTINGS, sheets |
| `POST /api/auth/*` | #AUTH-* | #M-AUTH-* |
| `GET /api/search?q` | #SEARCH-MODAL | 헤더 검색 또는 인라인 |

API 명세 상세는 [`06_API명세서.md`](06_API명세서.md).

---

## 8. 개발 우선순위 (P0/P1/P2)

> 두 플랫폼 동시 출시. 코드 공유 최대화. 분기는 layout과 modal 표면에만 집중.

| 우선순위 | 영역 | 비고 |
|---|---|---|
| **P0** | RootLayout 분기 (`useDeviceClass`), 인증 흐름, #HOME-FEED ↔ #M-HOME, #FOLDER-DETAIL ↔ #M-FOLDER-DETAIL, #LINK-DETAIL ↔ #M-LINK-DETAIL, #ADD-LINK ↔ #M-LINK-ADD, 인증 | 양 플랫폼 공통 코어 |
| **P0** | Dialog adaptive (`placement: center | bottom`) | 모든 sheet/modal의 베이스 |
| **P1** | #TODOS ↔ #M-TODOS, settings, #SEARCH | 검색은 web 모달 / app 인라인 분기 |
| **P1** | #NEWTAB (web 전용) | desktop 정착 후 chrome extension override |
| **P2** | #IMPORT-FLOW, #SETTINGS-EXT | desktop 전용 |
| **P2** | #M-QR-SCAN | mobile 전용 |
| **P2** | Chrome 확장 (newtab + bookmarks sync) | 별도 트랙 |

---

## 9. 변경 이력

| 일자 | 버전 | 변경 |
|---|---|---|
| 2026-05-19 | v1.0 | 최초 작성. 화면·모달·레이아웃·컴포넌트·단축키·진입점·API 7개 매트릭스 |
