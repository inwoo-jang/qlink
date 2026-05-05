import { useStore } from '../lib/store';

const TITLES: Record<string, string> = {
  folders: '폴더',
  search: '검색',
  settings: '설정',
  qr: 'QR 스캔',
  'link-detail': '링크 상세',
};

export default function Header() {
  const screen = useStore(s => s.screen);
  const goTo = useStore(s => s.goTo);
  const isHome = screen === 'home';

  return (
    <header className="app-header">
      <div className="header-left">
        {isHome
          ? <div className="logo">QLINK</div>
          : <button className="icon-btn header-back" aria-label="뒤로" onClick={() => goTo('home')}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
        }
      </div>
      <div className="header-center">
        {!isHome && <span className="header-title">{TITLES[screen] || ''}</span>}
      </div>
      <div className="header-right">
        {isHome && (
          <div className="header-default-actions">
            <button className="icon-btn" aria-label="검색" onClick={() => goTo('search')}>
              <img src="/icon-search.png" alt="" />
            </button>
            <button className="icon-btn" aria-label="설정" onClick={() => goTo('settings')}>
              <img src="/icon-settings.png" alt="" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
