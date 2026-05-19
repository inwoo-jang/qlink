# QLINK Components — 신규 컴포넌트 목록 & 디자인 토큰 매핑

> 산출물 #3. `prototype/`(모바일) + `prototype-web/`(데스크톱) 두 prototype의 공통/반복 컴포넌트를 추출하고, 기존 `component-design` 라이브러리와 비교한 결과.

---

## 1. Prototype 공통/반복 컴포넌트 추출 (raw)

### 1-1. prototype-web (데스크톱) 주요 클래스

| 카테고리 | 클래스 |
|---|---|
| Layout    | `app`, `sidebar`, `main`, `topbar`, `content`, `detail-panel`, `overlay-backdrop`, `modal-backdrop`, `modal` |
| Brand     | `brand`, `brand-mark`, `brand-text`, `newtab-brand` |
| Nav       | `sb-cta`, `sb-nav`, `sb-item`, `sb-section`, `sb-section-add`, `sb-footer`, `sb-profile`, `sidebar-toggle` |
| Topbar    | `topbar-search`, `topbar-actions`, `icon-btn` |
| Card      | `card`, `card-favicon`, `card-meta`, `card-domain`, `card-title`, `card-summary`, `card-tags`, `card-actions`, `card-pin`, `card-act`, `card-todo`, `card-todo-line`, `card-todo-badge`, `card-todo-vis` |
| Filter    | `filter-bar`, `chip` |
| Detail    | `detail-panel-header`, `detail-section`, `detail-title`, `detail-url`, `detail-summary`, `detail-tags`, `detail-actions`, `todo-display`, `todo-history-list`, `todo-history-row`, `todo-history-toggle`, `btn-add-todo`, `memo-display`, `memo-privacy-note` |
| Modal     | `modal`, `modal-header`, `modal-body`, `modal-footer`, `search-group`, `search-item`, `field-label`, `field-row`, `input`, `add-modal`, `add-actions` |
| Todo edit | `todo-edit-card`, `todo-edit-header`, `todo-num`, `mode-chips`, `weekday-row`, `weekday-chip`, `visibility-row`, `visibility-chip`, `recurring-preview` |
| Todo list | `todo-section`, `todo-section-title`, `todo-row`, `todo-row-main`, `todo-row-favicon`, `todo-row-title`, `todo-row-source`, `todo-row-badge` |
| Theme     | `theme-switcher`, `theme-swatch` |
| Newtab    | `newtab-hero`, `newtab-greeting`, `newtab-search-wrap`, `newtab-search`, `newtab-search-btn`, `newtab-search-modes`, `newtab-shortcuts`, `newtab-shortcut`, `newtab-quick-actions`, `newtab-quick-action`, `newtab-section`, `newtab-todo-grid`, `newtab-todo`, `newtab-folders`, `newtab-folder`, `newtab-hint` |
| Misc      | `tag`, `btn`, `btn-sm`, `btn-add-row`, `empty`, `shortcut-hint`, `shortcut-picker-item`, `shared-meta-bar`, `shared-meta-avatar`, `page-header`, `page-title`, `page-meta`, `page-emoji` |

### 1-2. prototype (모바일) 주요 클래스

| 카테고리 | 클래스 |
|---|---|
| Layout    | `device-frame`, `screen`, `app-header`, `header-left/center/right`, `header-back`, `header-action-btn`, `tab-bar`, `tab-item`, `tab-icon-wrap`, `tab-icon-svg`, `fab`, `fab-menu-btn` |
| Sheet     | `sheet`, `sheet-backdrop`, `sheet-handle`, `sheet-stack`, `sheet-title` |
| List      | `list`, `list-item`, `filter-bar`, `filter-chip`, `sort-bar`, `sort-pill` |
| Card      | `link-card`, `link-thumb`, `link-body`, `link-title`, `link-summary`, `link-tags`, `folder-card`, `folder-card-head`, `folder-card-meta`, `folder-grid`, `kakao-card`, `todo-card`, `todo-card-line`, `todo-card-text` |
| Todo      | `todo-display`, `todo-display-wrap`, `todo-display-body`, `todo-history`, `todo-history-row/list/toggle`, `todo-edit-row`, `todo-mode-chips`, `todo-mode-config`, `todo-recurring-preview`, `todo-list-mini`, `todo-mini-line/badge/more`, `todo-visibility-badge`, `todo-done-toggle` |
| Form      | `input`, `input-wrap`, `input-eye`, `radio-group`, `radio-item`, `mode-chip`, `weekday-chip`, `weekday-row`, `visibility-chip`, `visibility-chips`, `visibility-row`, `select-checkbox`, `toggle`, `memo-textarea`, `picker-label` |
| Button    | `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-kakao`, `btn-social`, `btn-logout`, `btn-add-member`, `btn-remove-todo`, `upload-avatar-btn` |
| Avatar    | `avatar`, `avatars`, `avatar-grid`, `avatar-edit-icon`, `avatar-preview-circle`, `avatar-preview-wrap`, `account-avatar`, `account-avatar-btn` |
| Account   | `account-card`, `account-info`, `account-rows`, `account-row`, `account-row-info/label/value`, `account-name`, `account-email`, `account-provider`, `account-leave-link/text` |
| Folder    | `folder-shared-row`, `folder-shared-text`, `folder-invite`, `folder-delete`, `folder-section`, `folder-section-title/count`, `member-chips`, `member-chip`, `member-empty`, `member-add-row` |
| Auth      | `screen-login`, `login-stack`, `login-content`, `login-logo`, `login-tagline`, `login-divider`, `login-foot`, `login-toggle-link/row`, `login-guest-btn`, `email-wait`, `email-wait-body/title/help/emoji/status/status-text` |
| Onboard   | `onboard-tips`, `onboard-tip`, `info-banner`, `qr-help`, `invite-hint`, `invite-mini-btn` |
| Feedback  | `empty`, `empty-shared`, `toast`, `selection-bar` |
| Misc      | `tag`, `social-badge`, `provider-mini`, `provider-mini-info/label/value/change`, `emoji-grid`, `emoji-cell`, `accent-picker`, `accent-swatch`, `reminder-card-line`, `reminder-grid`, `reminder-option`, `reminder-help`, `kakao-card-*`, `kakao-icon`, `kakao-cta`, `home-search-box`, `search-box` |

---

## 2. `component-design` 기존 라이브러리 비교 (Q5)

기존 21개 컴포넌트: `alert-dialog, alert, avatar, badge, button, card, checkbox, dialog, icon, input, label, popover, progress, radio-group, select, skeleton, switch, tabs, text, textarea, tooltip`

### 2-1. 기존 ↔ prototype 매핑

| 기존 컴포넌트 | prototype 매핑 | 차이 / 보강 필요 |
|---|---|---|
| **alert-dialog** | `modal` + `add-modal` (확인 모달 패턴 없음, dialog 변형으로 충분) | `dialog`에 `variant="confirm"` 추가로 흡수 가능 |
| **alert**     | `info-banner`, `memo-privacy-note`, `visibility-hint`, `reminder-help`, `qr-help`, `onboard-tip` | variant 추가: `info / warning / success / danger / hint`, leading-icon 슬롯 |
| **avatar**    | `avatar`, `avatars`, `sb-profile-avatar`, `shared-meta-avatar`, `card-domain .author-avatar`, `account-avatar` | size variant (`xs/sm/md/lg/xl`) + `AvatarGroup` 합성 컴포넌트 필요 |
| **badge**     | `tag`, `card-todo-badge`, `todo-mini-badge`, `todo-visibility-badge`, `todo-vis-row`, `social-badge`, `folder-tag` | variant: `tag / status / overdue / public / private / folder`, `dot` 옵션 |
| **button**    | `btn`, `btn-primary/secondary/ghost/danger/social/kakao/sm`, `icon-btn`, `sb-cta`, `btn-add-row/todo`, `fab` | variant: `default / primary / secondary / ghost / danger / kakao / social`, size: `sm/md/lg/icon`, `fab`은 별도 `Fab` 컴포넌트로 분리 권장 |
| **card**      | `card`(web link), `link-card`(mobile), `folder-card`, `todo-card`, `kakao-card`, `account-card`, `todo-edit-card`, `newtab-todo`, `todo-row`, `shared-meta-bar`, `home-search-box` | 모든 카드 패턴을 `Card` 한 컴포넌트 + 슬롯(`<CardHeader>`, `<CardBody>`, `<CardActions>`)으로 흡수. variant: `flat / elevated / interactive / outlined` |
| **checkbox**  | `todo-check`, `card-todo-line .check`, `newtab-todo .check`, `select-checkbox` | size variant (`sm/md`), `round` variant (원형 체크) |
| **dialog**    | `modal`(desktop), `sheet`(mobile bottom), `add-modal` | platform 어댑티브 변형 `placement="center" / "bottom"` |
| **icon**      | `icon`, `tab-icon-svg`, `card-favicon`, `card-act`, `icon-btn`의 내부 아이콘 | 이미지/SVG 두 종류 처리. `Icon` (SVG) + `Favicon`(이미지) 분리 |
| **input**     | `input`, `input-wrap`, `input-eye`, `memo-textarea`, `home-search-box`, `topbar-search`, `newtab-search`, `search-box`, `modal-header input` | variant: `text / search / inline-search / pill-search`. `prefix/suffix slot`(아이콘·버튼) 필수 |
| **label**     | `field-label`, `picker-label`, `screen-title`, `page-title`, `header-title`, `detail-title`, `account-row-label` | typography 토큰화로 흡수, `Label`은 form context 한정 |
| **popover**   | 명시적 popover 없음 (드롭다운/컨텍스트메뉴 미구현) | 신규 — 카드 우상단 …메뉴(`card-act`)에 필요 |
| **progress**  | 없음 | 신규 — 업로드/AI 처리 진행도용 |
| **radio-group**| `radio-group/item`, `mode-chips`(seg), `visibility-chips`(seg), `accent-picker` | `RadioGroup`(라디오) + `ToggleGroup`(seg control) 분리 권장 |
| **select**    | 모바일은 `sheet`로 picker, 데스크톱은 명시적 select 없음 | 신규 — `Select`(데스크톱) / `SheetPicker`(모바일) 어댑티브 |
| **skeleton**  | 없음 | 신규 — 카드/리스트 로딩 placeholder |
| **switch**    | `toggle` | 매핑. size variant |
| **tabs**      | `tab-bar/tab-item`(bottom nav), `filter-bar`(필터바도 tab 성격), `mode-chips`(seg) | `BottomTabs`(모바일 nav 전용) + `Tabs`(콘텐츠 탭) + `Segmented`(seg control) 3종 분리 |
| **text**      | `screen-title`, `page-title`, `link-title`, `link-summary`, body 등 다수 | typography 토큰만 정의, 별도 컴포넌트 불필요 (`<Text>` slot 단순화) |
| **textarea**  | `memo-textarea` | 매핑 |
| **tooltip**   | `shortcut-hint` (글로벌 단축키 힌트) | 매핑. `Tooltip` + delay 옵션 |

### 2-2. 기존에 없는 prototype 컴포넌트 (신규 후보)

| 신규 컴포넌트 | 출처 | 비고 |
|---|---|---|
| **AppHeader**    | `app-header`(모바일), `topbar`(데스크톱) | sticky header. slot: `left / center(title) / right(actions)` |
| **Sidebar**      | `sidebar` + `sb-*`(데스크톱) | 컨테이너 + 자식: `SidebarItem`, `SidebarSection`, `SidebarProfile`, `SidebarCTA` |
| **BottomTabs**   | `tab-bar`(모바일) | nav 전용. `Tabs`와 분리 (역할 다름) |
| **Fab**          | `fab`(모바일) | floating action button. `FabMenu` 합성 |
| **Sheet**        | `sheet`(모바일 bottom sheet) | `Dialog`의 placement 변형으로 흡수 OR 별도 컴포넌트 |
| **Chip**         | `chip / filter-chip / sort-pill / mode-chip / weekday-chip / visibility-chip` | `Badge`와 분리 (interactive). variant: `filter / sort / selectable / removable` |
| **SegmentedControl** | `mode-chips`, `visibility-chips`, `weekday-row`, `accent-picker` | `Tabs`/`RadioGroup`의 시각적 변형 — 별도 분리 |
| **Toast**        | `toast` | snackbar |
| **EmptyState**   | `empty`, `empty-shared`, `member-empty` | slot: `emoji / title / description / actions` |
| **Kbd**          | `.kbd` 다수 | 단축키 표시. inline 요소 |
| **DetailPanel**  | `detail-panel`(데스크톱) | sliding side panel. 1600px↑에선 inline, 미만은 overlay |
| **CommandPalette** | `modal` + `search-group/item`(데스크톱 ⌘K) | `Dialog` + grouped result. 별도 추상화 권장 |
| **Favicon**      | `card-favicon`, `link-thumb`, `shortcut-picker-item .fav`, `todo-row-favicon`, `newtab-shortcut .tile` | URL 기반 도메인 이미지 with fallback |
| **LinkCard**     | `card` / `link-card` | `Card` variant로 흡수 가능. but 도메인 표시·요약·태그·todo 인라인이 특수 → preset 컴포넌트로 유지 권장 |
| **TodoItem**     | `todo-display`, `todo-row`, `newtab-todo`, `card-todo-line` | `Checkbox` + `Text` + `Badge` 합성. layout variant: `inline / row / display` |
| **TodoEditor**   | `todo-edit-card / todo-edit-row` | 복합 폼. mode-chips + weekday-row + visibility-row + recurring-preview 포함 |
| **TodoHistory**  | `todo-history-*` | toggle + list |
| **ShortcutTile** | `newtab-shortcut` | 둥근 이미지 + 라벨, hover에 remove 버튼 |
| **ThemeSwitcher**| `theme-switcher`, `theme-swatch`, `accent-picker` | accent 컬러 swatch 그룹 |
| **AccountRow**   | `account-row`, `provider-mini` | key-value 디스플레이 row |
| **MemberChip**   | `member-chip`, `member-chips`, `member-add-row` | avatar+name+close 형 칩 그룹 |
| **AvatarGroup**  | `avatars`, `shared-meta-avatars`, `avatar-grid` | overlap 컬렉션 |
| **Toggle/Switch** | `toggle` | `switch`로 흡수 |
| **PageHeader**   | `page-header`(데스크톱), `screen-title`(모바일) | title + meta + emoji + actions |
| **SearchInput**  | `topbar-search`, `home-search-box`, `newtab-search`, `search-box`, `modal-header input` | `Input` variant로 흡수 가능 — pill/elevated/inline 옵션 |

---

## 3. 신규 통합 컴포넌트 목록 (Q6)

> 원칙: 기존 21개를 최대한 재사용. 동일한 시각 패턴은 variant/state로 흡수, 역할이 명확히 다른 것만 신규.

### 3-1. 기존 컴포넌트 확장 (variant·state 추가)

| 기존 | 추가 variant / 슬롯 | 흡수 대상 |
|---|---|---|
| `Alert`        | `variant`: info / warning / success / danger / hint · `leadingIcon` · `dismissible` | info-banner, memo-privacy-note, visibility-hint, qr-help, onboard-tip, reminder-help |
| `Avatar`       | `size`: 2xs/xs/sm/md/lg/xl · `+ AvatarGroup` 합성 · `editable` | sb-profile-avatar, shared-meta-avatar, account-avatar, avatar-grid |
| `Badge`        | `variant`: tag / status / overdue / public / private / folder · `dot` · `removable` | tag, card-todo-badge, todo-vis-row, social-badge |
| `Button`       | `variant`: default / primary / secondary / ghost / danger / kakao / social · `size`: xs/sm/md/lg/icon · `leadingIcon`, `trailingIcon`, `loading`, `block` | btn-*, sb-cta, btn-add-row/todo, icon-btn |
| `Card`         | `variant`: flat / outlined / elevated / interactive · `padding`: sm/md/lg · 슬롯 `<CardHeader>/<CardBody>/<CardFooter>/<CardActions>` | folder-card, todo-card, kakao-card, account-card, shared-meta-bar |
| `Checkbox`     | `size`: sm/md · `shape`: square/round · `state`: indeterminate | todo-check, select-checkbox, card-todo-line .check |
| `Dialog`       | `placement`: center / bottom(=sheet) / right(=detail) · `size`: sm/md/lg · `backdrop` 옵션 | modal, sheet, detail-panel(우측 placement 활용 시) |
| `Icon`         | size 토큰화. SVG 한정 | tab-icon-svg, card-act 내부, header-back |
| `Input`        | `variant`: default / search / pill / inline · `size`: sm/md/lg · prefix·suffix 슬롯 · `clearable`, `password` | input, input-wrap, input-eye, topbar-search, newtab-search, search-box, memo-textarea(→ Textarea) |
| `Label`        | form context 한정 | field-label, picker-label, account-row-label |
| `Popover`      | `align`: start/center/end · `side`: top/bottom/left/right · `trigger` | 카드 …메뉴(`card-act`), kebab menu |
| `Progress`     | `variant`: linear / circular · `indeterminate` | 업로드, AI 처리 |
| `RadioGroup`   | classic radio | radio-group/item |
| `Select`       | adaptive: 데스크톱=dropdown, 모바일=Sheet picker | (신규 — 출처 추상화) |
| `Skeleton`     | `shape`: text / rect / circle | 신규 |
| `Switch`       | size variant | toggle |
| `Tabs`         | top tabs (`variant`: line / pill) | (콘텐츠 탭 — newtab section header 등) |
| `Textarea`     | auto-resize 옵션 | memo-textarea |
| `Tooltip`      | delay, placement | shortcut-hint |

### 3-2. 신규 컴포넌트 (역할이 명확히 다른 것)

| 신규 | 출처 | 비고 |
|---|---|---|
| `AppHeader`        | app-header, topbar | sticky / blur backdrop / 3-slot layout |
| `Sidebar` (+ `SidebarItem`, `SidebarSection`, `SidebarProfile`, `SidebarCTA`) | sidebar | 데스크톱 nav |
| `BottomTabs` (+ `BottomTabItem`) | tab-bar | 모바일 nav — `Tabs`와 분리 |
| `Fab` (+ `FabMenu`) | fab | floating CTA |
| `Chip`              | chip / filter-chip / sort-pill | interactive — `variant`: filter / sort / selectable / removable · `selected` 상태 |
| `SegmentedControl`  | mode-chips, visibility-chips, weekday-row, accent-picker | `RadioGroup`의 시각적 변형이지만 빈도/패턴 차이 큼 — 별도 |
| `Toast` (+ `Toaster`) | toast | snackbar — `variant`: default/success/error · auto-dismiss |
| `EmptyState`        | empty, empty-shared, member-empty | preset feedback 슬롯 |
| `Kbd`               | `.kbd` | inline 단축키 표시 |
| `Favicon`           | card-favicon, link-thumb, newtab-shortcut .tile | URL→이미지 + fallback emoji |
| `LinkCard`          | card / link-card | `Card`로 흡수 가능하나 도메인/요약/태그/todo 인라인 패턴이 충분히 특수 → preset 유지 |
| `TodoItem`          | todo-display, todo-row, newtab-todo, card-todo-line | layout variant: inline / row / display |
| `TodoEditor`        | todo-edit-card, todo-mode-config | 복합 form |
| `TodoHistory`       | todo-history-* | collapsible list |
| `ShortcutTile`      | newtab-shortcut | newtab 전용 |
| `ThemeSwitcher`     | theme-switcher, accent-picker | accent swatch row |
| `AccountRow`        | account-row, provider-mini | key-value row |
| `MemberChip`        | member-chip + member-add-row | avatar+name+close, +add row |
| `AvatarGroup`       | avatars, shared-meta-avatars | overlap 컬렉션 (Avatar 합성) |
| `PageHeader`        | page-header, screen-title | title+meta+emoji+actions |
| `CommandPalette`    | modal + search-group + search-item | ⌘K |
| `DetailPanel`       | detail-panel | desktop slide panel — `Dialog placement="right"`로 흡수 가능하지만 inline 모드(>=1600px) 때문에 별도 권장 |

### 3-3. 최종 컴포넌트 목록 (총 41개)

```
[기존 22 — 확장 적용]
Alert, AlertDialog, Avatar (+ AvatarGroup), Badge, Button, Card (+ Header/Body/Footer/Actions),
Checkbox, Dialog, Icon, Input, Label, Popover, Progress, RadioGroup, Select,
Skeleton, Switch, Tabs, Text, Textarea, Tooltip

[신규 22]
AppHeader, Sidebar (+ SidebarItem/Section/Profile/CTA),
BottomTabs (+ BottomTabItem), Fab (+ FabMenu),
Chip, SegmentedControl, Toast (+ Toaster), EmptyState, Kbd,
Favicon, LinkCard, TodoItem, TodoEditor, TodoHistory,
ShortcutTile, ThemeSwitcher, AccountRow, MemberChip, PageHeader,
CommandPalette, DetailPanel, Sheet (= Dialog placement="bottom" — 모바일 의미보존 위해 별도 export)
```

---

## 4. 디자인 토큰 누락 검증 & 보강 (Q7)

신규 41개 컴포넌트가 사용하는 토큰을 역으로 검증한 결과, `theme.ts` / `design-tokens.json`에 누락된 항목을 보강했습니다.

### 4-1. 검증 결과 (커버됨)

| 컴포넌트 카테고리 | 사용 토큰 | 커버 상태 |
|---|---|---|
| Color base                | background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring | OK (shadcn 표준) |
| Sidebar/Nav               | sidebar*, sidebar-border, sidebar-accent | OK (shadcn sidebar) |
| Status                    | success, warning, destructive | success/warning 확장으로 추가 |
| Hover/Active glow         | glow-rgb (RGB) | OK |
| Gradient brand            | grad-primary, grad-soft | OK |
| Shadow elevation          | shadow-sm/md/lg/card/glow/fab/modal | fab/modal 추가 보강 |
| Radius                    | sm(6)/md(8)/lg(10)/xl(12)/2xl(14)/3xl(20)/4xl(28)/pill | sheet 상단 28px(4xl) 누락 → 추가 보강 |
| Z-index                   | sticky, backdrop, sidePanel, sidebar, modal, popover, tooltip, toast | OK |
| Typography                | 2xs~5xl + hero, weight 400~900, line-height, letter-spacing | OK |
| Motion                    | duration(fast/base/slow/slower), easing(spring 추가) | spring easing 추가 보강 |
| Icon filter               | iconTint (accent별) | OK |
| Overlay                   | overlay (backdrop dim), blur(sm/md/lg) | OK |
| Breakpoint                | 480 / 720 / 960 / 1180 / 1440 / 1600 | OK |

### 4-2. 추가된 토큰 (이미 `design-tokens.json`에 반영)

- `color.extended.warning / warning-foreground` — todo overdue 별 외 카드 핀(즐겨찾기 #F59E0B) 색상.
- `shadow.fab` — fab 전용 (4px outer ring 포함).
- `shadow.modal` — `0 24px 60px rgba(0,0,0,.3)`.
- `radius.4xl` (28px) — sheet 상단 모서리.
- `motion.easing.spring` — sheet open/close cubic-bezier.
- `iconTint.pink/blue/gray` — accent별 필터 매트릭스.

---

## 5. 컴포넌트별 Props · 용도 · 토큰 매핑 (Q8)

> variant·state·on-call action과 적용 토큰을 1줄 매핑.

### 5-1. 기존 (확장) 컴포넌트

| Component   | Props (핵심)                                                                  | State                                | On call                       | 디자인 토큰 매핑 |
|-------------|--------------------------------------------------------------------------------|---------------------------------------|--------------------------------|------------------|
| **Alert**       | `variant: info\|warning\|success\|danger\|hint`, `leadingIcon?`, `dismissible?`, `title?`, `children` | hover(dismissible) | `onDismiss?`         | `card`, `border`, `foreground`, `muted-foreground`, variant→`primary / warning / success / destructive`, `accent-foreground` |
| **AlertDialog** | `open`, `title`, `description`, `confirmText`, `cancelText`, `tone: default\|danger` | open/close                   | `onConfirm`, `onCancel`, `onOpenChange` | `background`, `border`, `foreground`, `muted-foreground`, `primary`, `destructive`, `shadow-modal`, `overlay`, `z.modal` |
| **Avatar**      | `src?`, `fallback`(initial/emoji), `size: 2xs\|xs\|sm\|md\|lg\|xl`, `shape: circle\|rounded`, `editable?` | hover(editable) | `onEditClick?` | `muted`, `mutedForeground`, `border`, `card` |
| **AvatarGroup** | `max`, `size`, `overlap`, `children: Avatar[]`                                  | —                                     | `onMoreClick?`                 | `card`(stack border), `border` |
| **Badge**       | `variant: tag\|status\|overdue\|public\|private\|folder\|primary`, `dot?`, `removable?` | hover(removable) | `onRemove?`              | tag→`muted / mutedForeground`, primary→`primary / primaryForeground`, overdue→`destructive / destructive-foreground`, public→`primary` (alpha 0.12), folder→`primary` (alpha 0.12) |
| **Button**      | `variant: default\|primary\|secondary\|ghost\|danger\|kakao\|social\|fab`, `size: xs\|sm\|md\|lg\|icon`, `block?`, `loading?`, `leadingIcon?`, `trailingIcon?` | hover/active/disabled/loading | `onClick`                | default→`secondary / secondaryForeground / border`, primary→`primary / primaryForeground`, ghost→transparent/`accent / accentForeground`, danger→`destructive / destructiveForeground`, fab→`grad-primary / shadow-fab`, focus→`ring` |
| **Card**        | `variant: flat\|outlined\|elevated\|interactive`, `padding: sm\|md\|lg`         | hover(interactive)                    | `onClick?`                     | `card`, `cardForeground`, `border` or `borderSoft`, interactive→`shadowCard`/hover `shadowMd`+`primary` border |
| **Checkbox**    | `checked`, `indeterminate?`, `size: sm\|md`, `shape: square\|round`, `disabled?` | hover/focus/checked/disabled         | `onCheckedChange`              | `input`, `primary`, `primaryForeground`, `ring`, `border`, `mutedForeground` |
| **Chip**        | `variant: filter\|sort\|selectable\|removable`, `selected?`, `count?`, `leadingEmoji?` | hover/selected/disabled              | `onSelect`, `onRemove?`        | default→`surface / borderSoft / mutedForeground`, selected→`primary / primaryForeground / primary`, hover→`primary`(border) |
| **CommandPalette** | `open`, `groups: { title, items }[]`                                          | open/searching/highlighted item       | `onSelect`, `onClose`, `onQueryChange` | `popover`, `popoverForeground`, `border`, `mutedForeground`, hover→`accent`, mark→`primary` alpha 0.25, `shadowModal`, `overlay`, `z.modal` |
| **Dialog**      | `open`, `placement: center\|bottom\|right`, `size: sm\|md\|lg\|full`, `dismissible?`, `title?` | open/close                          | `onOpenChange`                 | `card`, `cardForeground`, `border`, `shadowModal`/`shadowLg`, `overlay`, `z.modal`, radius 2xl(center)/4xl-top(bottom) |
| **Icon**        | `name`, `size: xs\|sm\|md\|lg`, `color?`                                       | —                                     | —                              | `foreground`(default), 부모 context 색상 상속 |
| **Input**       | `variant: default\|search\|pill\|inline`, `size: sm\|md\|lg`, `prefix?`, `suffix?`, `clearable?`, `password?`, `error?` | focus/error/disabled/filled        | `onChange`, `onClear`, `onSubmit` | `surface`(bg) or `background`, `input`(border), focus→`primary` border + `ring` 알파 0.15 글로우, `foreground`, `mutedForeground`(placeholder), error→`destructive` |
| **Label**       | `htmlFor`, `required?`, `size: sm\|md`                                          | —                                     | —                              | `foreground`, `mutedForeground` (helper) |
| **Popover**     | `open`, `side: top\|right\|bottom\|left`, `align: start\|center\|end`, `offset?` | open/close                          | `onOpenChange`                 | `popover`, `popoverForeground`, `border`, `shadowMd`, `z.popover` |
| **Progress**    | `value`, `max`, `variant: linear\|circular`, `indeterminate?`, `size`           | progress %                            | —                              | track→`muted`, fill→`primary` (or grad-primary), `mutedForeground`(label) |
| **RadioGroup**  | `value`, `options: { label, value }[]`, `orientation`                            | selected/focus                        | `onValueChange`                | `input`, `primary`, `ring`, `foreground`, `mutedForeground` |
| **Select**      | `value`, `options`, `placeholder`, `size`, `adaptive?`(데스크톱 dropdown / 모바일 sheet) | open/focus/disabled              | `onValueChange`                | `surface`, `border`, `foreground`, `mutedForeground`, `popover`, hover→`accent`, focus→`ring`, error→`destructive` |
| **Skeleton**    | `shape: text\|rect\|circle`, `width`, `height`, `lines?`                         | shimmer animation                     | —                              | `accent` 또는 `muted` (shimmer 그라데이션 base) |
| **Switch**      | `checked`, `size: sm\|md`, `disabled?`                                          | checked/focus/disabled                | `onCheckedChange`              | track→`input`(off) / `primary`(on), thumb→`background`, `ring` |
| **Tabs**        | `value`, `items`, `variant: line\|pill`                                          | active/hover                          | `onValueChange`                | active→`primary`(line/text), inactive→`mutedForeground`, hover→`foreground`, pill→`muted` track |
| **Text**        | `variant: hero\|title\|body\|caption\|label`, `weight?`, `color: foreground\|muted\|primary\|destructive` | — | — | typography 토큰 매트릭스 + `foreground` / `mutedForeground` / `primary` / `destructive` |
| **Textarea**    | `value`, `rows`, `autoResize?`, `error?`                                         | focus/error/disabled                  | `onChange`                     | `surface`, `input`(border), focus→`primary` + `ring` glow, `foreground`, `mutedForeground`, error→`destructive` |
| **Tooltip**     | `content`, `side`, `delay`                                                       | open/close                            | —                              | `foreground`(bg invert), `background`(text invert) — 다크 칩 스타일, `z.tooltip` |

### 5-2. 신규 컴포넌트

| Component   | Props (핵심)                                                                  | State                                | On call                       | 디자인 토큰 매핑 |
|-------------|--------------------------------------------------------------------------------|---------------------------------------|--------------------------------|------------------|
| **AppHeader**        | `title?`, `back?`, `leftSlot?`, `rightSlot?`, `transparent?`, `sticky?`           | scroll-bound shadow                   | `onBack?`                      | `background`(blur backdrop alpha), `border`, `foreground`, `mutedForeground`, gradient text(`grad-primary`), `z.sticky` |
| **Sidebar**          | `collapsed?`, `width?`, `mode: docked\|overlay`                                    | collapsed/open(mobile)                | `onCollapse?`                  | `sidebar`, `sidebarForeground`, `sidebarBorder`, `z.sidebar`, mobile shadow `shadowLg` |
| **SidebarItem**      | `icon`, `label`, `count?`, `kbd?`, `active?`, `href?`                              | active/hover                          | `onClick`                      | default→`sidebarForeground`(muted), hover→`muted`, active→`sidebarAccent / sidebarAccentForeground / shadowSm` + 좌측 3px `primary` rail |
| **SidebarSection**   | `title`, `count?`, `actionLabel?`(`+ 새 폴더…`)                                     | —                                     | `onActionClick?`               | `mutedForeground`, uppercase typography, `borderSoft` |
| **SidebarProfile**   | `avatar`, `name`, `email`                                                          | hover                                 | `onClick`                      | `surfaceElevated`(hover), `foreground`, `mutedForeground` |
| **SidebarCTA**       | `label`, `kbd?`                                                                    | hover/active                          | `onClick`                      | `grad-primary`, `primaryForeground`, `shadowMd`/hover `shadowLg`, kbd→`primaryForeground` alpha 0.22 |
| **BottomTabs**       | `value`, `items: { key, label, icon, image? }[]`                                   | active                                | `onValueChange`                | `background`(blur alpha), `border`, default→`mutedForeground`, active→`primary` + glow `shadowGlow`, `iconTint`(이미지 아이콘) |
| **BottomTabItem**    | `icon\|image`, `label`, `active?`                                                   | active                                | `onClick`                      | active wrap→`primary` 알파 0.18 bg, drop-shadow glow `primary` 0.5, image filter `iconTint` |
| **Fab**              | `icon`, `label?`(접근성), `position`                                                | hover/active                          | `onClick`                      | `grad-primary`, `primaryForeground`, `shadowFab`, `z.fixed`, primary glow |
| **FabMenu**          | `open`, `items: { emoji, label, onClick }[]`                                        | open/close                            | `onOpenChange`                 | `card`, `border`, `foreground`, `shadowLg`, `z.modal` |
| **SegmentedControl** | `value`, `options`, `variant: chips\|pills\|cells`, `block?`                       | selected/disabled                     | `onValueChange`                | track→`surface`, item→`mutedForeground` default / `primaryForeground` selected, selected bg→`primary`, border→`border` |
| **Toast**            | `variant: default\|success\|error`, `title`, `description?`, `duration?`            | enter/exit                            | `onDismiss`                    | bg→`foreground`(invert), text→`background`(invert), success→`success`, error→`destructive`, `shadowLg`, `z.toast` |
| **EmptyState**       | `emoji?`, `title`, `description?`, `actions?`                                       | —                                     | —                              | `mutedForeground`, `foreground`(title), emoji typography 5xl |
| **Kbd**              | `children`, `size: xs\|sm`                                                          | —                                     | —                              | `surfaceElevated` / `mutedForeground`, radius `xs`, mono font |
| **Favicon**          | `url`, `fallback?`(emoji/initials), `size`, `shape: rounded\|circle`                | loaded/error                          | —                              | `muted`(bg fallback), `mutedForeground`, `iconTint` |
| **LinkCard**         | `favicon`, `domain`, `title`, `summary?`, `tags?`, `todoPreview?`, `pinned?`, `active?` | hover/active/pinned                | `onClick`, `onPin`, `onAction(menu)`  | `card`, `border`/`borderSoft`, hover→`primary` border + `shadowMd` + translateY, active→`primary` 2px ring `glow`, pinned→`warning` alpha 0.12 bg + `warning` color |
| **TodoItem**         | `variant: inline\|row\|display`, `text`, `done`, `badge?: { label, overdue? }`, `visibility?: public\|private` | done/hover/overdue | `onToggle`, `onClick?`         | `surface`/`card`, `border`/`borderSoft`, done→`mutedForeground` + line-through, overdue→`destructive`, public badge→`primary` alpha 0.12, check on→`primary / primaryForeground` |
| **TodoEditor**       | `value`, `mode: none\|time\|recurring`, `time?`, `weekdays?`, `visibility`, `index?`(num) | mode-change                       | `onChange`, `onRemove`         | `surface`(bg), `border`, `shadowSm`, mode-chips/visibility-chips→ SegmentedControl 토큰, num→`primary / primaryForeground`, recurring preview→`primary` alpha 0.1 |
| **TodoHistory**      | `entries: { date, time }[]`, `open?`                                                | open/close                            | `onToggle`                     | `surface`, `border`, `foreground`(date), `mutedForeground`(time) |
| **ShortcutTile**     | `image`, `label`, `add?: boolean`, `removable?`                                     | hover                                 | `onClick`, `onRemove?`         | tile→`surface / borderSoft` + `shadowSm`/hover→`primary` + `shadowMd`, add→`surfaceElevated` dashed, remove→`foreground` bg / `destructive` hover |
| **ThemeSwitcher**    | `accent: pink\|blue\|gray`, `mode: light\|dark`                                     | selected                              | `onAccentChange`, `onModeToggle` | `surface` track, `borderSoft`, swatch colors (pink/blue/gray primary), selected ring→`foreground` |
| **AccountRow**       | `label`, `value`, `onAction?`, `actionLabel?`                                       | hover                                 | `onActionClick?`               | `card`, `borderSoft`, `mutedForeground`(label), `foreground`(value), `primary`(action) |
| **MemberChip**       | `avatar`, `name`, `removable?`                                                      | hover                                 | `onRemove?`                    | `surface`, `border`, `foreground`, `mutedForeground`, hover→`destructive`(remove btn) |
| **PageHeader**       | `title`, `emoji?`, `meta?`, `actions?`                                              | —                                     | —                              | `foreground`(title 3xl/extrabold), `mutedForeground`(meta) |
| **DetailPanel**      | `open`, `title`, `url`, `mode: inline\|overlay`(자동 1600px↑)                       | open/close/overlay-mode               | `onOpenChange`                 | `surface`, `borderSoft`(left border), `shadowLg`(overlay), `z.sidePanel` |
| **Sheet**            | `open`, `dismissible?`, `snapPoints?`, `title?`                                     | open/close/dragging                   | `onOpenChange`                 | `background`, `border`(2px top), radius `4xl`-top, `shadowLg`, handle→`border`, `z.modal`, easing `spring` |

---

## 6. 산출물 자체 검증 (Verification)

> 신규 컴포넌트 목록과 디자인 토큰을 상호 검토. 누락 / 잘못된 매핑 점검.

### 6-1. 토큰 누락 점검

- ✅ 모든 컴포넌트가 사용하는 색상은 `color.base + color.sidebar + color.extended` 안에서 해석됨.
- ✅ Fab 전용 그림자(white outer ring 4px), Modal 전용 그림자 별도 노출.
- ✅ Sheet의 상단 모서리(28px = `radius.4xl`) 토큰화.
- ✅ Spring easing(`cubic-bezier(0.34, 1.2, 0.64, 1)`) `motion.easing.spring`으로 분리.
- ✅ Favicon/BottomTabs의 이미지 아이콘 보정(`iconTint`) accent별 매트릭스 제공.
- ✅ Blur layer(backdrop/topbar/tab-bar) `blur.sm/md/lg`로 노출.

### 6-2. 잘못된 매핑 / 의식적 결정

- ⚠️ **mobile dark border**: `prototype/styles.css` 다크모드는 `--qlink-border`를 `var(--qlink-primary)`(`#ff8fa3`)로 덮어써 강한 분홍 테두리 사용. 그러나 `prototype-web`은 별도 어두운 톤(`#4A2D3F`) 사용. → 통합 시 **web 변형 채택** (UX 일관성·접근성 우선). 필요 시 `border-accent` 확장 토큰으로 재현 가능.
- ⚠️ **mobile surface = web sidebar**: `qlink-surface` 의미가 web(#FFFFFF)과 mobile(#FFEFF6)에서 다름. → 통합 시 `card` = 흰 카드, `sidebar` / `surfaceElevated` = 핑크 톤 컨테이너로 의미 분리. 모바일 코드 마이그레이션 시 기존 `surface` 사용처는 `sidebar` 또는 `surfaceElevated`로 치환 필요.
- ⚠️ **accent vs accent-yellow**: shadcn `accent`(소프트 hover 강조)와 prototype `--qlink-accent`(노란 강조)는 의미 다름. → shadcn 표준 `accent`는 보존, prototype 노란색은 `accentYellow` 확장 토큰으로 분리.
- ⚠️ **DetailPanel vs Dialog(right)**: 1600px 이상에선 inline column, 미만에선 overlay로 모드가 자동 전환되는 패턴 때문에 `Dialog placement="right"`로 흡수하지 않고 별도 컴포넌트로 분리.

### 6-3. 추가 권고

- `Fab`의 다크모드 그림자(`0 0 0 2px var(--qlink-border)`) — 현재 `shadow.fab.dark` 값이 동일 패턴 사용. ring 색상은 `border` 토큰을 직접 참조하므로 accent 변경에 자동 추종됨. ✅
- `Tooltip`의 invert 배경은 OS 다크모드와 상관없이 항상 hi-contrast가 좋음 → `foreground` 직접 참조가 적절. ✅
- `BottomTabs`의 image 아이콘은 PNG 사용 중 → SVG 마이그레이션 시 `iconTint` 의존 제거 권장. (현재는 보존)
