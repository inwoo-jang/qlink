# QLINK — App (Mobile PWA) IA

작성일: 2026-05-19
버전: v1.0 (mobile 분리본 — 03_IA.md의 mobile 부분 상세화)
상위 문서: `03_IA.md`(통합 오버뷰), `02_PRD.md`, `04_유저플로우.md`, `docs/design-system/components.md`
대상 환경: viewport < 1024px, iOS Safari / Android Chrome PWA, React Router v6

> 개발자 핸드오프용. 화면 ID → 라우트 → 레이아웃 슬롯 → 사용 컴포넌트 → 데이터 의존성 → 상태 → 제스처의 단일 출처.

---

## 0. TL;DR — 1분 요약

- **레이아웃**: device-frame(viewport 전체) 안에 `Header(sticky top) + Screen(scroll) + Fab + TabBar(fixed bottom)` 4-slot. `Sheet`는 bottom-up overlay.
- **Top-level 화면 4종 (탭바)**: 홈 / 폴더 / 할일 / 설정. 검색은 헤더 아이콘.
- **Sub-screen 진입**: 폴더→폴더상세, 홈→링크상세, 홈→QR, 인증 흐름은 별도 풀스크린.
- **모든 모달은 Sheet**(슬라이드업): 13종. 풀스크린 모달 없음.
- **FAB**: 홈/폴더/할일에서 노출. 길게 누름 → FabMenu(다른 동작). 짧게 누름 → 빠른 링크 추가.
- **인증 / QR**: Header·TabBar 숨김. screen-login·screen-qr 단독.

---

## 1. 사이트맵 (트리)

```
[Device Frame — 360~480px width, height 100dvh]
├── AppHeader (sticky top)
│   ├── header-left  : 뒤로가기 (sub-screen에서만)
│   ├── header-center: 로고(top-level) / 타이틀(sub-screen)
│   └── header-right : 검색/설정(기본) · "..."(컨텍스트 액션)
├── Screen (스크롤 영역) ◀── 1개만 active
└── BottomTabBar (fixed bottom)
    └── 홈 · 폴더 · 할일 · 설정    (FAB는 우하단 absolute, 탭바 위 띄움)

[Top-level Screens — 탭바로 전환]
├── #M-HOME             (탭: 홈)
├── #M-FOLDERS          (탭: 폴더)
├── #M-TODOS            (탭: 할일)
└── #M-SETTINGS         (탭: 설정)

[Sub-Screens — 진입 시 헤더 뒤로가기 노출]
├── #M-FOLDER-DETAIL    ← #M-FOLDERS 폴더 카드 탭
├── #M-LINK-DETAIL      ← 카드 탭 (홈/폴더 상세)
├── #M-QR-SCAN          ← #M-LINK-ADD-SHEET QR 탭 / 헤더 QR 버튼
└── #M-ACCOUNT          ← #M-SETTINGS "계정 관리"

[Non-Shell Screens — Header·TabBar 숨김]
├── #M-SPLASH
├── #M-AUTH-LOGIN (step 1: 방법 선택 / step 2: 프로필 설정)
├── #M-AUTH-VERIFY      (이메일 6자리 코드 입력 — sheet로 처리 가능)
└── #M-SHARE-ACCEPT     (/invite/:token)

[Sheets — bottom-up overlay, body 위에 마운트]
├── #M-LINK-ADD-SHEET         (FAB 짧게 / OS 공유 / 헤더 + 버튼)
├── #M-FAB-MENU               (FAB 길게)
├── #M-NEW-FOLDER-SHEET       (폴더 화면 "+")
├── #M-EDIT-FOLDER-SHEET      (폴더 상세 "...")
├── #M-FOLDER-PICKER-SHEET    (링크 상세 "이동")
├── #M-MEMO-SHEET             (링크 상세 메모 편집)
├── #M-TODO-SHEET             (링크 상세 / 할일 탭 — 할일 추가·편집)
├── #M-EMAIL-WAIT-SHEET       (가입/이메일 변경 시 6자리 코드 대기)
├── #M-EDIT-PROFILE-SHEET     (#M-ACCOUNT 닉네임·아바타)
├── #M-EMAIL-CHANGE-SHEET     (#M-ACCOUNT 이메일 변경)
├── #M-PASSWORD-CHANGE-SHEET  (#M-ACCOUNT 비밀번호)
├── #M-ACCOUNT-SHEET          (탈퇴/로그아웃 등 위험 액션 — 별도 시트 vs sub-screen 선택)
├── #M-KAKAO-SHARE-SHEET      (공유 폴더 카톡 공유)
└── #M-PROVIDER-SHEET         (#M-SETTINGS AI 제공자 선택)

[Floating]
├── Fab (홈/폴더/할일에서 노출)
├── Toast (전역, 하단)
└── SelectionBar (다중 선택 모드 — 헤더 자리 교체)
```

---

## 2. 라우팅 매트릭스

> PWA. URL은 React Router로 관리하되 모바일 UX는 화면 ID와 시트 open 상태가 함께 라우트를 결정. 시트는 query (`?sheet=...`) 또는 `<Outlet />` modal route.

| Path | Screen ID | Auth | Shell | 비고 |
|---|---|---|---|---|
| `/` | #M-HOME | ✅ | tab+header | viewport <1024px |
| `/folders` | #M-FOLDERS | ✅ | tab+header | |
| `/folders/:id` | #M-FOLDER-DETAIL | ✅ + 멤버 | header(뒤로) | 탭바 유지 (deep) |
| `/todos` | #M-TODOS | ✅ | tab+header | `?filter=...` |
| `/settings` | #M-SETTINGS | ✅ | tab+header | |
| `/settings/account` | #M-ACCOUNT | ✅ | header(뒤로) | sub-screen |
| `/links/:id` | #M-LINK-DETAIL | ✅ | header(뒤로) | sub-screen (sheet 아님) |
| `/qr` | #M-QR-SCAN | ✅ | **non-shell** | 풀스크린 카메라 |
| `/login` | #M-AUTH-LOGIN | — | **non-shell** | step 1·2 in-screen |
| `/verify` | #M-AUTH-VERIFY (or sheet) | — | **non-shell** | |
| `/invite/:token` | #M-SHARE-ACCEPT | 권장 | **non-shell** | |
| `/share/receive` | (auto) → /home + #M-LINK-ADD-SHEET | ✅ | tab+header | Web Share Target |

**시트 라우팅 컨벤션**: sheet open 시 URL `?sheet=link-add` 같은 query 추가하여 뒤로가기/딥링크 지원. 닫으면 query 제거.

---

## 3. 레이아웃 시스템

### 3.1 슬롯 정의

```
┌──────────────────────────┐
│  Header (sticky top z=10)│ 56px
│  ┌──────┬─────────┬────┐ │
│  │ left │ center  │ rt │ │
│  └──────┴─────────┴────┘ │
├──────────────────────────┤
│                          │
│      Screen (scroll)     │ flex:1
│                          │
│                          │
│      [Fab (floating)]    │ ↘ 우하단 z=5
├──────────────────────────┤
│  TabBar (fixed bottom)   │ 56px + safe-area
│  [홈][폴더][할일][설정]  │
└──────────────────────────┘

[overlay] Sheet (z=51, slide-up)
[overlay] SheetBackdrop (z=50)
[overlay] Toast (z=130, bottom safe-area)
[overlay] SelectionBar (헤더 자리 교체, z=10)
```

### 3.2 안전 영역 (Safe Area)

- iOS 노치 / 홈 인디케이터 대응: `env(safe-area-inset-{top,bottom})`
- TabBar `padding-bottom: env(safe-area-inset-bottom)`
- Fab `bottom: calc(56px + env(safe-area-inset-bottom) + 16px)`
- Sheet `padding-bottom: max(20px, env(safe-area-inset-bottom))`

### 3.3 헤더 모드

| 모드 | 좌측 | 중앙 | 우측 | 적용 |
|---|---|---|---|---|
| top-level | (없음) | 로고 (gradient) | 🔍 검색 · ⚙ 설정 | #M-HOME, #M-FOLDERS, #M-TODOS, #M-SETTINGS |
| sub-screen | ← 뒤로 | 타이틀 | 컨텍스트 액션(`...` 또는 공유·편집) | #M-FOLDER-DETAIL, #M-LINK-DETAIL, #M-ACCOUNT |
| selection | ✕ 취소 | "N개 선택" | 전체·공유·삭제 액션 | 다중 선택 모드 |
| non-shell | (없음 — 헤더 전체 숨김) | — | — | #M-AUTH-*, #M-QR-SCAN |

### 3.4 TabBar 노출 매트릭스

| 화면 | TabBar |
|---|---|
| top-level 4개 | ✅ |
| #M-FOLDER-DETAIL | ✅ (deep 진입에서도 유지) |
| #M-LINK-DETAIL | ❌ (콘텐츠 집중) |
| #M-ACCOUNT | ❌ (form 페이지) |
| #M-QR-SCAN, #M-AUTH-* | ❌ |
| sheet open 시 | ✅ (탭바는 sheet 뒤에 깔림 — z 순서: tabbar=z기본, backdrop=50, sheet=51) |

---

## 4. 화면 카탈로그 (Screens)

### 4.1 #M-HOME — 홈 (탭)

| 항목 | 값 |
|---|---|
| **Path** | `/` |
| **Entry** | TabBar 홈, 모든 작업 후 fallback |
| **Header** | top-level (로고 · 🔍 · ⚙) |
| **컴포넌트** | `Input` variant=search (home-search-box), `Chip` filter-bar (전체/폴더/최근/추천), `Chip` sort (최신순/오래된순/제목), `LinkCard` (xN), `Fab`, `EmptyState`(empty) |
| **데이터** | `links[order by createdAt desc].paginate` |
| **States** | default / empty / loading(skeleton) / error |
| **Pull-to-refresh** | ✅ 새로고침 |
| **Long-press 카드** | 다중 선택 모드 진입 → `SelectionBar` 노출 |
| **Card tap** | → `/links/:id` (#M-LINK-DETAIL push) |
| **Data API** | `GET /api/links?cursor=&limit=20` |

### 4.2 #M-FOLDERS — 폴더 (탭)

| 항목 | 값 |
|---|---|
| **Path** | `/folders` |
| **Header** | top-level |
| **컴포넌트** | `PageHeader` (텍스트형), `Card`(folder-card) grid 2-col, `Button`(folder-section "+" 새 폴더), 공유 폴더 섹션 (`AvatarGroup`), `EmptyState` |
| **데이터** | `folders[].with(linkCount, memberCount)` 개인 + 공유 분리 |
| **States** | default / empty(개인·공유 각각) / loading |
| **Card tap** | → `/folders/:id` |
| **"+ 새 폴더"** | `#M-NEW-FOLDER-SHEET` open |
| **"+ 공유 참여"** | (오너 초대 링크 받기 안내) — sheet 또는 toast |
| **Data API** | `GET /api/folders` |

### 4.3 #M-FOLDER-DETAIL — 폴더 상세

| 항목 | 값 |
|---|---|
| **Path** | `/folders/:id` |
| **Header** | sub-screen (← · 이모지+이름 · "...") |
| **컴포넌트** | `Chip` sort-bar, `LinkCard` list (1-col), `Card`(folder-shared-row — 공유 폴더만, `AvatarGroup`), `Fab`(폴더 컨텍스트 추가), `EmptyState` |
| **데이터** | `folder` + `folder.links` + `folder.members`(shared) |
| **권한** | shared 폴더는 멤버만, 비멤버 → forbidden state |
| **States** | default(private) / default(shared+meta) / empty / loading / forbidden |
| **"..." 컨텍스트** | private → 편집·삭제. shared(오너) → 편집·멤버·삭제. shared(멤버) → 나가기 |
| **Data API** | `GET /api/folders/:id`, `GET /api/folders/:id/members` |

### 4.4 #M-TODOS — 할일 (탭)

| 항목 | 값 |
|---|---|
| **Path** | `/todos`, `?filter=...` |
| **Header** | top-level |
| **컴포넌트** | `Chip` filter-bar (전체/미완료/⏰알림예정/🔥기간지남/✓완료), `TodoItem` variant=row × N, `Fab`(할일 추가), `EmptyState` |
| **데이터** | `todos.flatMap(link.todos)` join `link` (favicon·title 미리보기) |
| **Sections** | 기간지남 → 알림예정 → 완료(`?filter=done`에서만) |
| **States** | default / per-filter-empty / loading / error |
| **Tap row** | → `/links/:id` with todo focused |
| **Check tap** | `POST /api/todos/:id/occurrences` (회차 추가) |
| **FAB** | `#M-TODO-SHEET` open (할일 추가, 링크 선택 포함) |
| **Data API** | `GET /api/todos?filter` |

### 4.5 #M-LINK-DETAIL — 링크 상세

| 항목 | 값 |
|---|---|
| **Path** | `/links/:id` |
| **Header** | sub-screen (← · 도메인 · "...") |
| **TabBar** | ❌ 숨김 |
| **컴포넌트** | hero(`Card` detail-hero — 썸네일/이모지·도메인·제목), `Badge` tag list, `Textarea`(memo — read mode), `Alert`(privacy note — 공유 폴더 시), `TodoItem` × N (display), `Button` "+ 할 일 추가", `TodoHistory` (누적 토글), `Button` row 액션 5종 (열기·공유·이동·알림·삭제) |
| **데이터** | `link` (with todos + history + memo + acceptances) |
| **States** | loading(skeleton hero+sections) / loaded / 작성자 view / 멤버 view |
| **메모 탭** | `#M-MEMO-SHEET` open (편집) |
| **할일 추가** | `#M-TODO-SHEET` open with `linkId` prefilled |
| **이동** | `#M-FOLDER-PICKER-SHEET` open |
| **삭제** | `AlertDialog`(=sheet 형태도 가능) 확인 |
| **Data API** | `GET /api/links/:id`, `POST/PUT/DELETE /api/links/:id` 액션 |

### 4.6 #M-SETTINGS — 설정 (탭)

| 항목 | 값 |
|---|---|
| **Path** | `/settings` |
| **Header** | top-level (검색 X — 우상단 컨텍스트 액션 비움) |
| **컴포넌트** | `Card`(account-card — 아바타·이메일·프로바이더), list of `AccountRow` (AI 제공자·알림·다크모드·하이라이트 컬러·계정 관리), `Switch`, `ThemeSwitcher`, `RadioGroup`(provider — sheet로 분기), version footer |
| **데이터** | `user` |
| **AI 제공자 탭** | `#M-PROVIDER-SHEET` open (6종 라디오 + API 키) |
| **알림 토글** | `PATCH /api/me/notification` |
| **다크모드 토글** | `PATCH /api/me/theme` (즉시 반영) |
| **하이라이트 컬러** | accent-picker — `PATCH /api/me/theme` |
| **계정 관리 →** | `/settings/account` (sub-screen) |
| **Data API** | `GET /api/me`, `PATCH /api/me/*` |

### 4.7 #M-ACCOUNT — 계정 관리

| 항목 | 값 |
|---|---|
| **Path** | `/settings/account` |
| **Header** | sub-screen (← · "계정 관리") |
| **TabBar** | ❌ 숨김 |
| **컴포넌트** | `Avatar` editable + 닉네임 (sheet로 변경), `AccountRow` list (이메일·소셜연동·로그아웃·탈퇴), `Button` danger |
| **닉네임·아바타 →** | `#M-EDIT-PROFILE-SHEET` |
| **이메일 변경 →** | `#M-EMAIL-CHANGE-SHEET` (변경 후 `#M-EMAIL-WAIT-SHEET`) |
| **비밀번호 변경 →** | `#M-PASSWORD-CHANGE-SHEET` |
| **로그아웃** | `AlertDialog`(sheet 형태) 확인 → /login |
| **탈퇴** | `AlertDialog` 비밀번호 재입력 → DELETE |

### 4.8 #M-QR-SCAN — QR 스캐너

| 항목 | 값 |
|---|---|
| **Path** | `/qr` (또는 `?qr=1` modal-route) |
| **Header / TabBar** | ❌ 숨김 (풀스크린) |
| **컴포넌트** | 카메라 viewport(`#qr-region`), 안내 박스, `Button` "Mock 스캔"(dev), `Button` ghost "취소" |
| **권한** | 카메라 권한 미부여 시 안내 + 시스템 설정 가이드 |
| **인식 성공** | `#M-LINK-ADD-SHEET` open with URL prefilled, /qr 닫기 |

### 4.9 #M-AUTH-LOGIN — 로그인 / 회원가입

| 항목 | 값 |
|---|---|
| **Path** | `/login` |
| **Shell** | non-shell |
| **Step 1** (방법 선택) | `Input`(이메일·비밀번호·비밀번호확인 — toggle), 소셜 버튼 (Google·카카오), 가입↔로그인 토글, "둘러보기" 게스트 |
| **Step 2** (프로필 설정) | `Avatar` preview + 업로드, 이모지 grid, 닉네임 `Input`, "시작하기" |
| **States** | step-1 (가입 OR 로그인) / step-2 / 오류(이메일 중복 등) |
| **로그인 성공** | → `/` |
| **가입 성공** | → `#M-EMAIL-WAIT-SHEET` (코드 입력) → step-2 → `/` |

---

## 5. Sheet 인벤토리 (13종)

> 모든 sheet: bottom-up slide (cubic-bezier(0.34, 1.2, 0.64, 1) 300ms), `border-radius: 28px 28px 0 0`, dimmed backdrop, body scroll lock, swipe-down to dismiss.

| Sheet ID | Trigger | Size | 컴포넌트 | Mutation |
|---|---|---|---|---|
| **#M-LINK-ADD-SHEET** | FAB 짧게 · OS 공유 · 헤더 + | medium(~70vh) | `Input`(URL·메모), `Select`(폴더), `TodoEditor` × N, `Button` 저장 | `POST /api/links` |
| **#M-FAB-MENU** | FAB 길게 | small | `Button` list (링크·할일·폴더·QR) | — (각 액션 분기) |
| **#M-NEW-FOLDER-SHEET** | #M-FOLDERS "+" | small | `EmojiPicker`, `Input` 이름 | `POST /api/folders` |
| **#M-EDIT-FOLDER-SHEET** | 폴더 상세 "..." | medium | `EmojiPicker`, `Input`, `Switch` 공유, `Button` danger 삭제 | `PATCH/DELETE /api/folders/:id` |
| **#M-FOLDER-PICKER-SHEET** | #M-LINK-DETAIL "이동" | medium | `Input` 검색, 폴더 list | `PATCH /api/links/:id {folderId}` |
| **#M-MEMO-SHEET** | #M-LINK-DETAIL 메모 영역 | full(~90vh) | `Textarea` autoresize, `Alert` privacy note (공유 폴더 시) | `PATCH /api/links/:id {memo}` |
| **#M-TODO-SHEET** | #M-LINK-DETAIL "+할일" · #M-TODOS FAB | medium | `TodoEditor` (제목·모드·시간·반복·종료일·visibility) | `POST/PATCH /api/todos` |
| **#M-EMAIL-WAIT-SHEET** | 가입/이메일 변경 | small | 6자리 코드 입력, 만료 타이머, 재발송 `Button` | `POST /api/auth/verify-code` |
| **#M-EDIT-PROFILE-SHEET** | #M-ACCOUNT 닉네임/아바타 | medium | `Input` 닉네임, `Avatar` grid + 업로드 | `PATCH /api/me` |
| **#M-EMAIL-CHANGE-SHEET** | #M-ACCOUNT 이메일 변경 | small | `Input` 새 이메일, "코드 전송" | `POST /api/me/email/request` → wait sheet |
| **#M-PASSWORD-CHANGE-SHEET** | #M-ACCOUNT 비밀번호 변경 | small | `Alert` info-banner, `Input` × 2 (eye toggle) | `PATCH /api/me/password` |
| **#M-KAKAO-SHARE-SHEET** | 폴더 공유 → 카톡 | small | 미리보기 카드 + 공유 버튼 | (Kakao SDK 호출) |
| **#M-PROVIDER-SHEET** | #M-SETTINGS AI 제공자 | medium | `RadioGroup` 6종 + 선택 시 `Input` API 키 | `PATCH /api/me/ai` |

추가: `#M-CONFIRM-SHEET` — 삭제·로그아웃·탈퇴 확인 (Sheet에 `AlertDialog` 패턴 적용 — 별도 컴포넌트로 추출 가능).

---

## 6. 제스처 매트릭스

| 제스처 | 액션 | 적용 |
|---|---|---|
| Tap | 기본 선택/진입 | 전역 |
| Long-press 카드 | 다중 선택 모드 진입 | #M-HOME, #M-FOLDER-DETAIL |
| Swipe left/right 카드 | (선택) 빠른 액션 — 폴더 이동 / 삭제 | (v1.1 검토) |
| Pull-to-refresh | 새로고침 | 모든 top-level 화면 |
| Swipe-down sheet | sheet 닫기 | 모든 sheet |
| Tap backdrop | sheet 닫기 | 모든 sheet |
| Tap FAB | 짧게: 빠른 링크 추가 / 길게: FabMenu | #M-HOME, #M-FOLDERS, #M-FOLDER-DETAIL, #M-TODOS |
| Back button (Android) / Swipe-back (iOS) | 한 단계 이전 (sheet → screen → tab) | 전역 |
| Hardware Back at top-level | 앱 종료 확인 | top-level 4개 |

---

## 7. 외부 진입

| 진입점 | 도착 | 처리 |
|---|---|---|
| Web Share Target (`/share/receive?url=...`) | tab+header shell → 즉시 `#M-LINK-ADD-SHEET` open | manifest `share_target` |
| 푸시 알림 클릭 | `/links/:id` (#M-LINK-DETAIL) — sub-screen으로 push | service worker `notificationclick` |
| 초대 링크 | `/invite/:token` (non-shell) → 수락 후 `/folders/:id` | 미인증 시 localStorage 보관 |
| OS 공유 시트 (iOS Share Extension) | (PWA 한계 — Android만 Web Share Target 지원) | — |
| Add to Home Screen | manifest start_url=`/` | PWA |

---

## 8. 컴포넌트 사용 매트릭스 (화면 × 컴포넌트)

| 컴포넌트 | M-HOME | M-FOLDERS | M-FOLDER-DETAIL | M-TODOS | M-LINK-DETAIL | M-SETTINGS | M-ACCOUNT | M-QR | M-AUTH | Sheets |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| AppHeader | top | top | sub | top | sub | top | sub | ❌ | ❌ | — |
| BottomTabs | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | — |
| Fab | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| LinkCard | ✅ | — | ✅ | — | hero | — | — | — | — | — |
| Card (folder/account) | — | folder | shared-meta | — | — | account | — | — | — | — |
| TodoItem | — | — | inline(card) | row | display | — | — | — | — | — |
| Chip (filter/sort) | filter+sort | — | sort | filter | — | — | — | — | — | — |
| Button | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Input | search | — | — | — | — | — | — | — | ✅ | ✅ |
| Textarea | — | — | — | — | display | — | — | — | — | ✅(memo) |
| RadioGroup | — | — | — | — | — | — | — | — | — | ✅(provider) |
| Switch | — | — | — | — | — | ✅ | — | — | — | ✅ |
| ThemeSwitcher | — | — | — | — | — | ✅ | — | — | — | — |
| Avatar | — | — | — | — | — | ✅ | ✅ | — | ✅ | ✅(profile) |
| AvatarGroup | — | — | shared-meta | — | — | — | — | — | — | — |
| Badge | — | — | — | overdue | tag | — | — | — | — | — |
| Alert | — | — | — | — | privacy note | — | — | qr-help | — | ✅(password info-banner) |
| EmptyState | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| Skeleton | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| Sheet | — | — | — | — | — | — | — | — | wait | ✅(all) |
| Toast | 전역 | 전역 | 전역 | 전역 | 전역 | 전역 | 전역 | — | 전역 | 전역 |
| AlertDialog (=ConfirmSheet) | — | — | 삭제 | 삭제 | 삭제 | — | 로그아웃·탈퇴 | — | — | — |
| TodoEditor | — | — | — | — | — | — | — | — | — | ✅(todo·link-add) |
| MemberChip | — | — | shared | — | — | — | — | — | — | invite |
| SegmentedControl | — | — | — | — | mode chips | — | — | — | — | ✅(todo mode) |

---

## 9. 데이터 의존성

| 화면 | 1차 쿼리 | 2차 쿼리 | mutation |
|---|---|---|---|
| #M-HOME | `GET /api/links?cursor` | — | check(todo): `POST /api/todos/:id/occurrences` |
| #M-FOLDERS | `GET /api/folders` | — | — |
| #M-FOLDER-DETAIL | `GET /api/folders/:id` | `GET /api/folders/:id/members` | — |
| #M-TODOS | `GET /api/todos?filter` | — | check: `POST /api/todos/:id/occurrences` |
| #M-LINK-DETAIL | `GET /api/links/:id` | `GET /api/todos/:id/acceptances`, `/occurrences` | edit/delete/move/share |
| #M-SETTINGS | `GET /api/me` | — | `PATCH /api/me/*` |
| #M-ACCOUNT | `GET /api/me` | — | `PATCH/DELETE /api/me` |
| #M-QR-SCAN | — (camera stream) | — | (스캔 후 #M-LINK-ADD-SHEET로 전달) |
| #M-AUTH-* | — | — | `POST /api/auth/{login,signup,verify,oauth}` |
| Sheets | sheet별 상이 — §5 참조 | | |

상세 API는 [`06_API명세서.md`](06_API명세서.md) 참조.

---

## 10. 화면 공통 상태

| 상태 | 화면 적용 | UI 패턴 |
|---|---|---|
| **Empty** | M-HOME, M-FOLDERS(개인/공유 각각), M-FOLDER-DETAIL, M-TODOS(filter별) | `EmptyState` (emoji + 1줄 안내 + 1차 CTA Button) |
| **Loading** | 모든 데이터 화면 | `Skeleton` 카드/로우 (≥300ms 지연 시 노출 — flash 방지) |
| **Error** | GET 실패 | `EmptyState` variant=danger + "다시 시도" |
| **Forbidden (403)** | M-FOLDER-DETAIL(비멤버), M-LINK-DETAIL(비멤버) | `EmptyState` + "초대 받아 들어가기" |
| **Offline** | 전역 | `Toast` 하단 ("오프라인 — 변경은 동기화 대기"), 카드 옆에 동기화 대기 점 |
| **권한 (카메라)** | M-QR-SCAN | `EmptyState` + "시스템 설정에서 카메라 권한 허용" |

---

## 11. 라우터 구현 가이드

```tsx
// Routes (React Router v6 — nested layout 패턴)
<Routes>
  <Route element={<AuthLayout />}>
    <Route path="/login" element={<LoginScreen />} />
    <Route path="/verify" element={<VerifyScreen />} />
    <Route path="/invite/:token" element={<ShareAcceptScreen />} />
  </Route>

  <Route element={<RequireAuth />}>
    <Route element={<MobileShellLayout />}>{/* Header + TabBar */}
      <Route path="/" element={<HomeScreen />} />
      <Route path="/folders" element={<FoldersScreen />} />
      <Route path="/folders/:id" element={<FolderDetailScreen />} />
      <Route path="/todos" element={<TodosScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/settings/account" element={<AccountScreen />} />
      <Route path="/links/:id" element={<LinkDetailScreen />} />
      <Route path="/share/receive" element={<ShareReceive />} />
    </Route>

    {/* 풀스크린 (헤더·탭바 없음) */}
    <Route path="/qr" element={<QrScanScreen />} />
  </Route>
</Routes>

// Sheet는 zustand로 글로벌 관리 + URL query sync
useSheetStore: { current: null | 'link-add' | 'fab-menu' | ..., context }
```

`MobileShellLayout`에서 viewport ≥1024px일 때 desktop shell로 재라우팅(또는 별도 빌드 분리).

---

## 12. 변경 이력

| 일자 | 버전 | 변경 |
|---|---|---|
| 2026-05-19 | v1.0 | `03_IA.md`에서 mobile 부분 분리. 13개 sheet 인벤토리, 헤더 모드 매트릭스, 제스처 매트릭스, 컴포넌트 사용 매트릭스, 라우터 구현 가이드 추가 |
