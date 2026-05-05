import { useStore } from '../../lib/store';
import type { Folder } from '../../lib/types';

const sortFolders = (folders: Folder[], mode: string): Folder[] => {
  const sorted = [...folders];
  if (mode === 'recent') sorted.sort((a, b) => b.createdAt - a.createdAt);
  else if (mode === 'oldest') sorted.sort((a, b) => a.createdAt - b.createdAt);
  else if (mode === 'alpha') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return sorted;
};

export default function FoldersScreen() {
  const folders = useStore(s => s.folders);
  const links = useStore(s => s.links);
  const folderSort = useStore(s => s.settings.folderSort);
  const setSort = useStore(s => s.setSort);
  const openFolder = useStore(s => s.openFolder);

  const counts: Record<string, number> = {};
  links.forEach(l => { counts[l.folderId] = (counts[l.folderId] || 0) + 1; });

  const my = sortFolders(folders.filter(f => !f.shared), folderSort);
  const shared = sortFolders(folders.filter(f => f.shared), folderSort);

  const renderCard = (f: Folder) => (
    <div key={f.id} className={`folder-card${f.shared ? ' shared' : ''}`} role="button" tabIndex={0} onClick={() => openFolder(f.id)}>
      <div className="folder-card-head">
        <div className="emoji">{f.emoji}</div>
        <div className="folder-card-meta">
          <div className="name">{f.name}</div>
          <div className="count">{counts[f.id] || 0}개</div>
        </div>
      </div>
      {f.shared && (f.sharedWith?.length ? (
        <div className="folder-shared-row">
          <div className="avatars">
            {f.sharedWith.slice(0, 3).map((n, i) => <span key={i} className="avatar">{n[0]}</span>)}
            {f.sharedWith.length > 3 && <span className="avatar more">+{f.sharedWith.length - 3}</span>}
          </div>
          <div className="folder-shared-text">
            {f.sharedWith.length <= 2 ? f.sharedWith.join(', ') : `${f.sharedWith.slice(0,2).join(', ')} 외 ${f.sharedWith.length - 2}명`}
          </div>
        </div>
      ) : (
        <div className="folder-shared-row"><div className="folder-shared-text">아직 함께하는 사람이 없어요</div></div>
      ))}
    </div>
  );

  return (
    <main className="screen active" id="screen-folders">
      <div className="sort-bar">
        {(['recent', 'oldest', 'alpha'] as const).map(m => (
          <button key={m}
            className={`sort-pill${folderSort === m ? ' active' : ''}`}
            onClick={() => setSort('folder', m)}>
            {m === 'recent' && '↓ 최신순'}
            {m === 'oldest' && '↑ 오래된순'}
            {m === 'alpha' && '가↓ 가나다순'}
          </button>
        ))}
      </div>
      <div className="folder-section">
        <h3 className="folder-section-title">내 폴더</h3>
        <div className="folder-grid">
          {my.map(renderCard)}
          <button className="folder-card add-folder">＋ 새 폴더</button>
        </div>
      </div>
      <div className="folder-section">
        <h3 className="folder-section-title">공유 폴더 <span className="folder-section-count">{shared.length}</span></h3>
        <div className="folder-grid">
          {shared.length === 0
            ? <div className="empty-shared">아직 공유 폴더가 없어요</div>
            : shared.map(renderCard)
          }
          <button className="folder-card add-folder">＋ 폴더 공유 시작</button>
        </div>
      </div>
    </main>
  );
}
