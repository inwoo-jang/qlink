---
name: ui-design-system
description: 큐링크 디자인 토큰(컬러·타이포·스페이싱)과 컴포넌트 라이브러리 정의
owner: ux-ui-designer
---

# UI 디자인 시스템 스킬

## 컬러 토큰
```
--qlink-primary:    #4F46E5  (Indigo 600)
--qlink-primary-2:  #818CF8  (Indigo 400)
--qlink-accent:     #F59E0B  (Amber 500) — QR/저장 강조
--qlink-bg:         #FFFFFF / dark: #0B0F19
--qlink-surface:    #F7F8FB / dark: #131826
--qlink-border:     #E5E7EB / dark: #1F2937
--qlink-text:       #0F172A / dark: #E5E7EB
--qlink-text-muted: #64748B
--qlink-success:    #10B981
--qlink-error:      #EF4444
```

## 타이포그래피
```
font-family: "Pretendard", -apple-system, "SF Pro", sans-serif
h1: 22 / 28 / 700
h2: 18 / 24 / 700
body: 14 / 20 / 400
caption: 12 / 16 / 400
tag: 11 / 14 / 600 uppercase
```

## 스페이싱 (4px 기준)
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48`

## 라운딩
```
--r-sm: 8px
--r-md: 12px
--r-lg: 16px
--r-pill: 999px
```

## 그림자
```
--shadow-sm: 0 1px 2px rgba(0,0,0,.04)
--shadow-md: 0 4px 14px rgba(0,0,0,.08)
```

## 컴포넌트 카탈로그
- `Button` — primary / secondary / ghost / icon
- `Card` — 링크 카드(섬네일 좌·요약 우)
- `Sheet` — 하단 슬라이드 시트
- `TabBar` — 하단 5탭
- `Tag` — 태그 칩(클릭 가능)
- `Toast` — 상단/하단 토스트
- `Input` — 검색 필드, URL 필드
- `EmptyState` — 일러스트 + 텍스트

## 다크 모드
- prefers-color-scheme + 사용자 토글 모두 지원
- 토큰은 CSS 변수로 한 번만 정의, 테마 클래스로 스왑

## 산출물
- `prototype/styles.css` — 토큰의 reference impl
- `docs/design-system.md` — 사용 가이드
