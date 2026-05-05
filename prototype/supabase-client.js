/* QLINK — Supabase 클라이언트 + 인증 래퍼 */
(function () {
  const cfg = window.QLINK_CONFIG;
  if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_KEY) {
    console.warn('[QLink] Supabase 설정 누락 — localStorage 모드로 동작');
    return;
  }
  if (!window.supabase?.createClient) {
    console.error('[QLink] Supabase JS SDK 로드 실패');
    return;
  }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: {
      autoRefreshToken: true,        // access token 자동 갱신
      persistSession: true,          // 브라우저 재시작·새로고침 후에도 세션 유지
      detectSessionInUrl: true,      // OAuth 콜백 처리
      storage: window.localStorage,  // 명시 (기본값과 동일, 브라우저 종료에도 살아있음)
      storageKey: 'qlink-auth',
      flowType: 'pkce',              // PKCE 흐름 (보안 강화)
    },
  });

  window.QLink = window.QLink || {};
  window.QLink.sb = sb;

  // ===== Auth =====
  window.QLink.auth = {
    /** 이메일로 로그인 시도, 없으면 가입 */
    async signInOrUp(email, password) {
      const sign = await sb.auth.signInWithPassword({ email, password });
      if (!sign.error) return { user: sign.data.user, isNew: false };

      const msg = sign.error.message || '';
      // 계정 없음 → 가입
      if (/invalid login|email not confirmed|user not found/i.test(msg)) {
        const up = await sb.auth.signUp({ email, password });
        if (up.error) throw up.error;
        return { user: up.data.user, isNew: true };
      }
      throw sign.error;
    },

    async signOut() { await sb.auth.signOut(); },
    async getSession() {
      const { data } = await sb.auth.getSession();
      return data.session || null;
    },
    async getCurrentUser() {
      const { data: { user } } = await sb.auth.getUser();
      return user;
    },
    async getProfile() {
      const u = await this.getCurrentUser();
      if (!u) return null;
      const { data, error } = await sb.from('profiles').select('*').eq('id', u.id).single();
      if (error) {
        // 트리거가 늦게 동작했을 가능성 → 1초 대기 후 1회 재시도
        await new Promise(r => setTimeout(r, 1000));
        const retry = await sb.from('profiles').select('*').eq('id', u.id).single();
        if (retry.error) throw retry.error;
        return { user: u, profile: retry.data };
      }
      return { user: u, profile: data };
    },
    async updateProfile(patch) {
      const u = await this.getCurrentUser();
      if (!u) throw new Error('로그인이 필요합니다');
      const { data, error } = await sb.from('profiles')
        .update(patch).eq('id', u.id).select().single();
      if (error) throw error;
      return data;
    },
    onAuthStateChange(cb) {
      return sb.auth.onAuthStateChange(cb);
    },
  };

  console.log('[QLink] Supabase ready —', cfg.SUPABASE_URL);
})();
