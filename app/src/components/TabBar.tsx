import { useStore } from '../lib/store';
import type { Screen } from '../lib/types';

const TABS: { id: Screen; label: string; icon: string }[] = [
  { id: 'home', label: '홈', icon: '/icon-home.png' },
  { id: 'folders', label: '폴더', icon: '/icon-folder.png' },
  { id: 'search', label: '검색', icon: '/icon-search.png' },
  { id: 'settings', label: '설정', icon: '/icon-settings.png' },
];

export default function TabBar() {
  const screen = useStore(s => s.screen);
  const goTo = useStore(s => s.goTo);

  return (
    <nav className="tab-bar">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`tab-item${screen === t.id ? ' active' : ''}`}
          onClick={() => goTo(t.id)}
        >
          <span className="tab-icon-wrap"><img src={t.icon} alt="" /></span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
