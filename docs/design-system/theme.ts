/**
 * QLINK Design Theme — shadcn-style HSL tokens
 *
 * 구조
 *  - THEME.light / THEME.dark  : 기본(default = pink accent) 테마. shadcn 표준 + qlink 확장 토큰.
 *  - THEME_ACCENTS             : pink / blue / gray 액센트 별 light·dark 오버라이드.
 *  - 모든 색상은 HSL 문자열 형태(`"hsl(H S% L%)"`)로 통일하여 NativeWind / Tailwind 3.4.17 변수에 그대로 주입 가능.
 *  - rgba()용 glow 값은 별도 `glowRgb` 토큰으로 분리 (RGB 문자열).
 *
 * shadcn 기본 토큰 vs qlink 확장 토큰
 *  - 기본 토큰명은 shadcn 표준을 그대로 사용 (background, foreground, card, primary, secondary, muted, accent, destructive, border, input, ring, radius, chart1~5, sidebar*)
 *  - prototype 고유 토큰은 기본 토큰과 의미가 겹치지 않게 확장 토큰으로 분리:
 *      primary2(그라데이션 종점), success/warning(상태), accentYellow(다크모드 강조),
 *      borderSoft(경계 부드러운 경우 — divider/section line),
 *      surface/surfaceElevated(레이어 분리), overlay(backdrop dimming),
 *      gradPrimary/gradSoft(브랜드 그라데이션),
 *      iconTint(이미지 아이콘 톤 보정 filter),
 *      shadowSm/Md/Lg/Glow/Card(전용 그림자 — glow 컬러 반영)
 *  - radius는 기본값을 0.875rem(=14px ≒ 카드 기본값)으로 prototype에 맞춤.
 */

export type AccentName = "pink" | "blue" | "gray";
export type ThemeMode = "light" | "dark";

export const THEME = {
  light: {
    /* ===== shadcn base ===== */
    background: "hsl(330 100% 98.4%)",          // #FFF7FB
    foreground: "hsl(326 39% 17%)",             // #3D1A2E
    card: "hsl(0 0% 100%)",                     // #FFFFFF (web surface)
    cardForeground: "hsl(326 39% 17%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(326 39% 17%)",
    primary: "hsl(338 100% 71%)",               // #FF6B9D
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(330 79% 94%)",              // #FCE4F0 (qlink-surface-2)
    secondaryForeground: "hsl(326 39% 17%)",
    muted: "hsl(335 100% 96.7%)",               // #FFEFF6 (qlink-bg-sidebar)
    mutedForeground: "hsl(327 18% 52%)",        // #9B6E84
    accent: "hsl(330 79% 94%)",                 // = secondary (hover/소프트 강조)
    accentForeground: "hsl(338 100% 45%)",      // primary darken
    destructive: "hsl(0 84% 60%)",              // #EF4444
    destructiveForeground: "hsl(0 0% 100%)",
    border: "hsl(340 100% 88%)",                // #FFC4D6
    input: "hsl(340 100% 88%)",                 // = border (form border)
    ring: "hsl(338 100% 71%)",                  // = primary (focus ring)
    radius: "0.875rem",                         // 14px (--r-md)
    chart1: "hsl(338 100% 71%)",                // primary pink
    chart2: "hsl(282 65% 73%)",                 // primary-2 purple
    chart3: "hsl(218 100% 65%)",                // accent blue
    chart4: "hsl(50 100% 62%)",                 // accent yellow
    chart5: "hsl(160 84% 39%)",                 // success green

    /* ===== shadcn sidebar (v4 convention) ===== */
    sidebar: "hsl(335 100% 96.7%)",             // #FFEFF6
    sidebarForeground: "hsl(326 39% 17%)",
    sidebarPrimary: "hsl(338 100% 71%)",
    sidebarPrimaryForeground: "hsl(0 0% 100%)",
    sidebarAccent: "hsl(0 0% 100%)",            // active item 흰 카드
    sidebarAccentForeground: "hsl(338 100% 71%)",
    sidebarBorder: "hsl(327 56% 92%)",          // #F5E2EC (border-soft)
    sidebarRing: "hsl(338 100% 71%)",

    /* ===== qlink 확장: 컬러 ===== */
    primary2: "hsl(282 65% 73%)",               // #C589E8 (gradient mid)
    glowRgb: "255, 107, 157",                   // primary rgba용
    success: "hsl(160 84% 39%)",                // #10B981
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(38 92% 50%)",                 // amber (todo pin)
    warningForeground: "hsl(0 0% 100%)",
    accentYellow: "hsl(50 100% 62%)",           // #FFD93D (qlink-accent)
    borderSoft: "hsl(327 56% 92%)",             // #F5E2EC (divider/section)
    surface: "hsl(0 0% 100%)",                  // = card (alias for clarity)
    surfaceElevated: "hsl(335 100% 96.7%)",     // = muted (chip bg)
    overlay: "hsla(0 0% 0% / 0.35)",            // backdrop dim

    /* ===== qlink 확장: 그라데이션 ===== */
    gradPrimary:
      "linear-gradient(135deg, hsl(338 100% 71%) 0%, hsl(282 65% 73%) 50%, hsl(225 100% 78%) 100%)",
    gradSoft:
      "linear-gradient(135deg, hsl(348 100% 95%) 0%, hsl(280 100% 95%) 100%)",

    /* ===== qlink 확장: 아이콘 필터 ===== */
    iconTint: "brightness(1)",

    /* ===== qlink 확장: 그림자 ===== */
    shadowSm: "0 1px 3px hsla(338 100% 71% / 0.08)",
    shadowMd: "0 4px 16px hsla(338 100% 71% / 0.15)",
    shadowLg: "0 12px 32px hsla(338 100% 71% / 0.25)",
    shadowGlow: "0 0 20px hsla(338 100% 71% / 0.35)",
    shadowCard: "0 2px 8px hsla(338 100% 71% / 0.08)",
  },

  dark: {
    /* ===== shadcn base ===== */
    background: "hsl(285 38% 9%)",              // #1A0E1F
    foreground: "hsl(343 100% 95%)",            // #FFE5EC
    card: "hsl(283 33% 15%)",                   // #2A1A33
    cardForeground: "hsl(343 100% 95%)",
    popover: "hsl(283 33% 15%)",
    popoverForeground: "hsl(343 100% 95%)",
    primary: "hsl(351 100% 78%)",               // #FF8FA3
    primaryForeground: "hsl(326 39% 17%)",
    secondary: "hsl(284 31% 19%)",              // #36213F
    secondaryForeground: "hsl(343 100% 95%)",
    muted: "hsl(284 31% 19%)",
    mutedForeground: "hsl(331 36% 78%)",        // #D8B5C7
    accent: "hsl(284 31% 19%)",
    accentForeground: "hsl(351 100% 78%)",
    destructive: "hsl(0 70% 59%)",
    destructiveForeground: "hsl(0 0% 100%)",
    border: "hsl(326 24% 23%)",                 // #4A2D3F (web variant)
    input: "hsl(309 25% 18%)",                  // #382237 (web variant)
    ring: "hsl(351 100% 78%)",
    radius: "0.875rem",
    chart1: "hsl(351 100% 78%)",
    chart2: "hsl(270 100% 82%)",
    chart3: "hsl(225 100% 78%)",
    chart4: "hsl(50 100% 70%)",
    chart5: "hsl(160 60% 55%)",

    /* ===== shadcn sidebar ===== */
    sidebar: "hsl(290 30% 11%)",                // #221426
    sidebarForeground: "hsl(343 100% 95%)",
    sidebarPrimary: "hsl(351 100% 78%)",
    sidebarPrimaryForeground: "hsl(326 39% 17%)",
    sidebarAccent: "hsl(283 33% 15%)",
    sidebarAccentForeground: "hsl(351 100% 78%)",
    sidebarBorder: "hsl(309 25% 18%)",
    sidebarRing: "hsl(351 100% 78%)",

    /* ===== qlink 확장 ===== */
    primary2: "hsl(270 100% 82%)",              // #D4A5FF
    glowRgb: "255, 143, 163",
    success: "hsl(160 60% 55%)",
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(38 92% 60%)",
    warningForeground: "hsl(285 38% 9%)",
    accentYellow: "hsl(50 100% 70%)",           // #FFE066
    borderSoft: "hsl(309 25% 18%)",
    surface: "hsl(283 33% 15%)",
    surfaceElevated: "hsl(284 31% 19%)",
    overlay: "hsla(0 0% 0% / 0.5)",

    gradPrimary:
      "linear-gradient(135deg, hsl(351 100% 78%) 0%, hsl(270 100% 82%) 50%, hsl(225 100% 80%) 100%)",
    gradSoft:
      "linear-gradient(135deg, hsl(283 33% 15%) 0%, hsl(284 31% 19%) 100%)",

    iconTint: "brightness(1.1)",

    shadowSm: "0 1px 3px hsla(351 100% 78% / 0.15)",
    shadowMd: "0 4px 16px hsla(351 100% 78% / 0.25)",
    shadowLg: "0 12px 32px hsla(351 100% 78% / 0.40)",
    shadowGlow: "0 0 24px hsla(351 100% 78% / 0.55)",
    shadowCard: "0 2px 8px hsla(351 100% 78% / 0.15)",
  },
} as const;

/**
 * 액센트별 오버라이드 — 사용 시 THEME[mode]에 spread하여 적용.
 *  적용 예) const tokens = { ...THEME.light, ...THEME_ACCENTS.blue.light }
 */
export const THEME_ACCENTS = {
  pink: {
    light: {},  // THEME.light가 이미 pink 기준
    dark: {},
  },
  blue: {
    light: {
      background: "hsl(214 100% 98%)",          // #F5FAFF
      foreground: "hsl(218 49% 20%)",           // #1A2D4D
      muted: "hsl(218 100% 96%)",               // #EAF1FF (bg-sidebar)
      mutedForeground: "hsl(218 19% 51%)",      // #6B7E9B
      secondary: "hsl(220 100% 93%)",           // #DCE7FF (surface-2)
      accent: "hsl(220 100% 93%)",
      border: "hsl(220 100% 88%)",              // #C4D6FF
      input: "hsl(220 100% 88%)",
      borderSoft: "hsl(217 56% 92%)",           // #E0EAF8
      primary: "hsl(218 100% 65%)",             // #4F8FFF
      primaryForeground: "hsl(0 0% 100%)",
      primary2: "hsl(220 95% 78%)",             // #93B5FC
      ring: "hsl(218 100% 65%)",
      glowRgb: "79, 143, 255",
      sidebar: "hsl(218 100% 96%)",
      sidebarBorder: "hsl(217 56% 92%)",
      gradPrimary:
        "linear-gradient(135deg, hsl(218 100% 65%) 0%, hsl(220 95% 78%) 50%, hsl(282 65% 73%) 100%)",
      gradSoft:
        "linear-gradient(135deg, hsl(215 100% 95%) 0%, hsl(240 100% 96%) 100%)",
      iconTint: "hue-rotate(-55deg) saturate(0.95)",
      shadowSm: "0 1px 3px hsla(218 100% 65% / 0.08)",
      shadowMd: "0 4px 16px hsla(218 100% 65% / 0.15)",
      shadowLg: "0 12px 32px hsla(218 100% 65% / 0.25)",
      shadowGlow: "0 0 20px hsla(218 100% 65% / 0.35)",
      shadowCard: "0 2px 8px hsla(218 100% 65% / 0.08)",
    },
    dark: {
      background: "hsl(222 43% 9%)",            // #0E1422
      foreground: "hsl(225 100% 95%)",          // #E5EDFF
      muted: "hsl(222 36% 21%)",                // #243049 (surface-2)
      mutedForeground: "hsl(218 39% 74%)",      // #A0B5D8
      secondary: "hsl(220 28% 15%)",            // #1A2235 (surface)
      accent: "hsl(222 36% 21%)",
      card: "hsl(220 28% 15%)",
      popover: "hsl(220 28% 15%)",
      border: "hsl(222 32% 27%)",               // #2E3D5A
      input: "hsl(222 32% 19%)",                // #1F2A40
      borderSoft: "hsl(222 32% 19%)",
      primary: "hsl(220 100% 78%)",             // #8FB3FF
      primaryForeground: "hsl(218 49% 20%)",
      primary2: "hsl(225 100% 85%)",            // #B5C8FF
      ring: "hsl(220 100% 78%)",
      glowRgb: "143, 179, 255",
      sidebar: "hsl(220 36% 12%)",              // #131A2A
      sidebarBorder: "hsl(222 32% 19%)",
      gradPrimary:
        "linear-gradient(135deg, hsl(220 100% 78%) 0%, hsl(225 100% 85%) 50%, hsl(270 100% 82%) 100%)",
      gradSoft:
        "linear-gradient(135deg, hsl(220 28% 15%) 0%, hsl(222 36% 21%) 100%)",
      iconTint: "hue-rotate(-55deg) saturate(0.95) brightness(1.12)",
    },
  },
  gray: {
    light: {
      background: "hsl(240 6% 98%)",            // #FAFAFB
      foreground: "hsl(217 33% 17%)",           // #1F2937
      muted: "hsl(225 14% 95%)",                // #F1F2F5 (bg-sidebar)
      mutedForeground: "hsl(220 9% 46%)",       // #6B7280
      secondary: "hsl(220 14% 91%)",            // #E5E7EB (surface-2)
      accent: "hsl(220 14% 91%)",
      border: "hsl(220 13% 84%)",               // #D1D5DB
      input: "hsl(220 13% 84%)",
      borderSoft: "hsl(220 9% 91%)",            // #E8EAED
      primary: "hsl(220 9% 46%)",               // #6B7280
      primaryForeground: "hsl(0 0% 100%)",
      primary2: "hsl(220 9% 64%)",              // #9CA3AF
      ring: "hsl(220 9% 46%)",
      glowRgb: "107, 114, 128",
      sidebar: "hsl(225 14% 95%)",
      sidebarBorder: "hsl(220 9% 91%)",
      gradPrimary:
        "linear-gradient(135deg, hsl(220 9% 46%) 0%, hsl(220 9% 64%) 50%, hsl(220 13% 84%) 100%)",
      gradSoft:
        "linear-gradient(135deg, hsl(220 14% 96%) 0%, hsl(220 14% 91%) 100%)",
      iconTint: "grayscale(0.92) brightness(1.05)",
    },
    dark: {
      background: "hsl(225 17% 10%)",           // #14171F
      foreground: "hsl(220 14% 91%)",           // #E5E7EB
      muted: "hsl(222 14% 20%)",                // #2A2F3A (surface-2)
      mutedForeground: "hsl(215 19% 65%)",      // #94A3B8
      secondary: "hsl(220 16% 15%)",            // #1F232E (surface)
      accent: "hsl(222 14% 20%)",
      card: "hsl(220 16% 15%)",
      popover: "hsl(220 16% 15%)",
      border: "hsl(222 14% 25%)",               // #353B49
      input: "hsl(220 14% 18%)",                // #252A35
      borderSoft: "hsl(220 14% 18%)",
      primary: "hsl(218 16% 79%)",              // #C0C8D5
      primaryForeground: "hsl(217 33% 17%)",
      primary2: "hsl(215 19% 65%)",
      ring: "hsl(218 16% 79%)",
      glowRgb: "192, 200, 213",
      sidebar: "hsl(222 16% 13%)",              // #1A1E28
      sidebarBorder: "hsl(220 14% 18%)",
      gradPrimary:
        "linear-gradient(135deg, hsl(218 16% 79%) 0%, hsl(215 19% 65%) 50%, hsl(220 9% 46%) 100%)",
      gradSoft:
        "linear-gradient(135deg, hsl(220 16% 15%) 0%, hsl(222 14% 20%) 100%)",
      iconTint: "grayscale(0.92) brightness(1.2)",
    },
  },
} as const;

export type ThemeTokens = typeof THEME.light;
