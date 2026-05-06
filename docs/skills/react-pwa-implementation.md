---
name: react-pwa-implementation
description: React + Vite + TypeScript + PWA 부트스트랩 및 핵심 컴포넌트 구현 가이드
owner: frontend-developer
---

# React PWA 구현 스킬

## 부트스트랩
```bash
pnpm create vite@latest qlink-app -- --template react-ts
cd qlink-app
pnpm add react-router-dom zustand @tanstack/react-query
pnpm add -D vite-plugin-pwa workbox-window
pnpm add tailwindcss postcss autoprefixer
pnpm add html5-qrcode
```

## 디렉토리 구조 (제안)
```
src/
  app/                  # 라우터, 전역 프로바이더
  features/
    links/              # 링크 도메인 (CRUD, 카드, 상세)
    folders/
    search/
    qr/
    settings/
  components/           # 재사용 UI 프리미티브
  lib/
    ai/                 # AI 어댑터 클라이언트
    api.ts              # fetch 래퍼
    storage.ts          # localStorage / IndexedDB
  styles/
public/
  manifest.webmanifest
  icons/
```

## PWA 설정 핵심
```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: '큐링크',
    short_name: 'QLink',
    theme_color: '#4F46E5',
    background_color: '#FFFFFF',
    display: 'standalone',
    icons: [/* 192/512 */],
  },
  workbox: {
    runtimeCaching: [/* API GET 캐시, 이미지 캐시 */],
  },
})
```

## 라우트 (제안)
- `/` — Home
- `/add` — Add sheet (modal route)
- `/qr` — QR scanner
- `/links/:id` — 상세
- `/folders` / `/folders/:id`
- `/search`
- `/settings`

## 상태 (Zustand 예)
```ts
interface LinkStore {
  links: Link[];
  add(link: Link): void;
  update(id: string, patch: Partial<Link>): void;
  remove(id: string): void;
}
```

## 클립보드 자동 인식
- `navigator.clipboard.readText()` 권한 — Add 시트 진입 시 1회 시도
- 실패 시 사용자 붙여넣기로 폴백

## 성능 가이드
- `React.lazy` + 코드 스플리팅(라우트 단위)
- 이미지 lazy loading, 썸네일 webp
- 카드 리스트 가상화(react-virtuoso)
