import { useState } from 'react';
import { useStore } from '../../lib/store';
import { faviconFor, timeAgo } from '../../lib/utils';
import type { Link } from '../../lib/types';

const sortLinks = (links: Link[], mode: string): Link[] => {
  const sorted = [...links];
  if (mode === 'recent') sorted.sort((a, b) => b.createdAt - a.createdAt);
  else if (mode === 'oldest') sorted.sort((a, b) => a.createdAt - b.createdAt);
  else if (mode === 'alpha') sorted.sort((a, b) => {
    const at = (a.oneLiner || a.title || a.url).toLowerCase();
    const bt = (b.oneLiner || b.title || b.url).toLowerCase();
    return at.localeCompare(bt, 'ko');
  });
  return sorted;
};

export default function HomeScreen() {
  const links = useStore(s => s.links);
  const folders = useStore(s => s.folders);
  const linkSort = useStore(s => s.settings.linkSort);
  const setSort = useStore(s => s.setSort);
  const openLink = useStore(s => s.openLink);
  const [filter, setFilter] = useState<string>('');

  const filtered = filter ? links.filter(l => l.folderId === filter) : links;
  const list = sortLinks(filtered, linkSort);

  return (
    <main className="screen active" id="screen-home">
      <div className="filter-bar">
        <button className={`filter-chip${!filter ? ' active' : ''}`} onClick={() => setFilter('')}>전체</button>
        {folders.filter(f => !f.shared).map(f => (
          <button key={f.id} className={`filter-chip${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.emoji} {f.name}
          </button>
        ))}
      </div>

      <div className="sort-bar">
        {(['recent', 'oldest', 'alpha'] as const).map(m => (
          <button key={m}
            className={`sort-pill${linkSort === m ? ' active' : ''}`}
            onClick={() => setSort('link', m)}>
            {m === 'recent' && '↓ 최신순'}
            {m === 'oldest' && '↑ 오래된순'}
            {m === 'alpha' && '가↓ 가나다순'}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="emoji">📭</div>
          <h3>아직 저장된 링크가 없어요</h3>
          <p>오른쪽 아래 + 버튼으로 첫 링크를 추가해보세요</p>
        </div>
      ) : (
        <div>
          {list.map(link => {
            const folder = folders.find(f => f.id === link.folderId);
            return (
              <article key={link.id} className="link-card" onClick={() => openLink(link.id)}>
                <div className="link-thumb">
                  <img src={faviconFor(link.url)} alt="" />
                </div>
                <div className="link-body">
                  <div className="link-title">{link.domain} · {timeAgo(link.createdAt)}</div>
                  <div className={`link-summary${link.summary === null ? ' pending' : ''}`}>
                    {link.oneLiner || link.title || link.url}
                  </div>
                  <div className="link-tags">
                    {link.tags.slice(0, 3).map(t => <span key={t} className="tag">#{t}</span>)}
                    {folder && <span className="tag muted">{folder.emoji} {folder.name}</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
