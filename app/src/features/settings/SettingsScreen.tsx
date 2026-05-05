import { useStore } from '../../lib/store';
import { isImageDataUrl } from '../../lib/utils';

const PROVIDER_LABEL: Record<string, string> = {
  email: '이메일', google: 'GOOGLE', kakao: 'KAKAO',
};

export default function SettingsScreen() {
  const user = useStore(s => s.user);
  const settings = useStore(s => s.settings);
  const setTheme = useStore(s => s.setTheme);
  const setAccent = useStore(s => s.setAccent);
  const updateSettings = useStore(s => s.updateSettings);
  const logout = useStore(s => s.logout);

  if (!user) return null;

  return (
    <main className="screen active" id="screen-settings">
      <div className="account-card">
        <button className="account-avatar account-avatar-btn">
          {isImageDataUrl(user.avatar) ? <img src={user.avatar} alt="" /> : user.avatar}
          <span className="avatar-edit-icon">✏️</span>
        </button>
        <div className="account-info">
          <div className="account-name">{user.name}</div>
          <div className="account-email">{user.email}</div>
          <div className="account-provider">{PROVIDER_LABEL[user.provider]} 계정</div>
        </div>
        <button className="btn-logout" onClick={logout}>로그아웃</button>
      </div>

      <div className="list">
        <div className="list-item">
          <div>
            <div className="label">AI 제공자</div>
            <div className="value">웹 세션 또는 API 선택</div>
          </div>
          <div className="value">{settings.aiProvider}</div>
        </div>
        <div className="list-item">
          <div>
            <div className="label">알림</div>
            <div className="value">링크 리마인더 푸시</div>
          </div>
          <div className={`toggle${settings.notifications ? ' on' : ''}`}
               onClick={() => updateSettings({ notifications: !settings.notifications })} />
        </div>
        <div className="list-item">
          <div>
            <div className="label">다크 모드</div>
            <div className="value">라이트 / 다크</div>
          </div>
          <div className={`toggle${settings.theme === 'dark' ? ' on' : ''}`}
               onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')} />
        </div>
        <div className="list-item">
          <div>
            <div className="label">하이라이트 컬러</div>
            <div className="value">핑크 / 블루 / 그레이</div>
          </div>
          <div className="accent-picker">
            {(['pink', 'blue', 'gray'] as const).map(a => (
              <button key={a}
                      className={`accent-swatch${settings.accent === a ? ' selected' : ''}`}
                      data-accent={a}
                      aria-label={a}
                      onClick={() => setAccent(a)} />
            ))}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: 'var(--qlink-text-muted)', textAlign: 'center' }}>
        QLINK v0.1 · React + Vite + PWA<br />
        전체 기능 포팅 진행 중
      </p>
    </main>
  );
}
