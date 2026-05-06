---
name: qr-scanner-integration
description: 웹앱에서 카메라 QR 스캐너를 안전하게 통합하는 가이드
owner: frontend-developer
---

# QR 스캐너 통합 스킬

## 라이브러리 비교
| 라이브러리 | 장점 | 단점 |
|-----------|------|------|
| `html5-qrcode` | 간단한 API, 모바일 호환 좋음 | 번들 사이즈 ~120KB |
| `@zxing/browser` | 더 다양한 코드 지원 | API 다소 verbose |
| `BarcodeDetector` (네이티브) | 무료/빠름 | iOS Safari 미지원 |

→ MVP: `html5-qrcode`, 폴백으로 `BarcodeDetector` 감지 시 우선 사용

## 권한 흐름
1. 사용자 액션(QR 탭 클릭) 후에만 `getUserMedia` 호출
2. 거절되면 명확한 안내 + 브라우저 설정 가이드 노출
3. `facingMode: { ideal: 'environment' }` — 후면 카메라 우선

## 구현 스니펫
```tsx
import { Html5Qrcode } from 'html5-qrcode';

function QRScanner({ onResult }: { onResult: (text: string) => void }) {
  useEffect(() => {
    const scanner = new Html5Qrcode('qr-region');
    scanner.start(
      { facingMode: { ideal: 'environment' } },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decoded) => {
        scanner.stop();
        onResult(decoded);
      },
      () => {}
    );
    return () => { scanner.stop().catch(() => {}); };
  }, []);
  return <div id="qr-region" className="aspect-square w-full" />;
}
```

## 결과 처리
- URL 정규식 매칭 → 자동 저장 플로우(F-01) 진입
- 비-URL 텍스트 → 메모로 저장 옵션
- 중복 URL 감지 → "이미 저장된 링크입니다" 토스트

## 모바일 디바이스 주의사항
- iOS는 PWA(Standalone) 모드에서도 카메라 동작 — 단, HTTPS 필수
- Android는 Chrome 사용 권장 (Samsung Internet에서 일부 코덱 이슈)
