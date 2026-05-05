/* =========================================================
 * 큐링크 (QLink) — 프로토타입 mock app
 * - localStorage로 상태 저장
 * - AI 요약은 mock (URL 패턴 기반)
 * - QR 스캐너는 html5-qrcode 사용 (CDN)
 * ========================================================= */

const STORAGE_KEY = 'qlink:state:v1';

const DEFAULT_STATE = {
  user: null,  // { name, email, avatar, provider, joinedAt }
  links: [],
  folders: [
    // 신규 유저는 미분류 폴더 하나만으로 시작 (다른 폴더는 직접 생성)
    { id: 'f-default', name: '미분류', emoji: '📥', shared: false, createdAt: 0 },
  ],
  settings: {
    aiProvider: 'gemini-web',
    notifications: true,
    theme: 'light',  // 'light' | 'dark'
    accent: 'pink',  // 'pink' | 'blue' | 'gray'
    folderSort: 'recent',  // 'recent' | 'oldest' | 'alpha'
    linkSort: 'recent',    // 'recent' | 'oldest' | 'alpha' — 링크 리스트
  },
};

// 신규 유저는 0에서 시작 — 시드 링크 없음
const SEED_LINKS = [];

/* ============ State ============ */
let state = loadState();
let pendingFolderId = null;  // 추가 시트에서 선택된 폴더 (null = AI 자동 분류)
let selectionMode = false;
const selectedLinkIds = new Set();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = { ...DEFAULT_STATE, links: SEED_LINKS };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw);
    // 마이그레이션: shared 필드 + createdAt 보강
    const baseTime = Date.now() - 86400000 * 30; // 30일 전부터
    parsed.folders = (parsed.folders || []).map((f, idx) => ({
      ...f,
      shared: f.shared ?? false,
      createdAt: f.createdAt ?? (baseTime + idx * 60000),
    }));
    parsed.settings = parsed.settings || {};
    if (!parsed.settings.folderSort) parsed.settings.folderSort = 'recent';
    if (!parsed.settings.linkSort) parsed.settings.linkSort = 'recent';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch (e) {
    console.error('loadState failed', e);
    return { ...DEFAULT_STATE, links: SEED_LINKS };
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ============ 유틸 ============ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function uid(prefix = 'l') {
  // 클라우드 호환: 가능하면 UUID 사용
  return (crypto?.randomUUID && crypto.randomUUID()) ||
    `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ============ Cloud Sync 헬퍼 (Supabase) ============ */
function localToCloudFolderId(localId) {
  if (!localId || localId === 'f-default') return state.defaultFolderCloudId || null;
  return localId;
}
async function cloudSync(fn) {
  if (!window.QLink?.cloud || !state.user || state.user.isGuest) return;
  try { await fn(window.QLink.cloud); }
  catch (err) {
    console.error('[QLink] sync error', err);
    toast('동기화 실패: ' + (err.message || err));
  }
}
const cloudCreateFolder = (folder) => cloudSync(c => c.createFolder(folder));
const cloudUpdateFolder = (id, patch) => cloudSync(c => c.updateFolder(localToCloudFolderId(id), patch));
const cloudDeleteFolder = (id) => {
  if (id === 'f-default') return;
  return cloudSync(c => c.deleteFolder(localToCloudFolderId(id)));
};
const cloudCreateLink = (link) => cloudSync(c => c.createLink({ ...link, folderId: localToCloudFolderId(link.folderId) }));
const cloudUpdateLink = (id, patch) => {
  const p = { ...patch };
  if ('folderId' in patch) p.folderId = localToCloudFolderId(patch.folderId);
  return cloudSync(c => c.updateLink(id, p));
};
const cloudDeleteLink = (id) => cloudSync(c => c.deleteLink(id));
const cloudDeleteLinks = (ids) => cloudSync(c => c.deleteLinks(ids));

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function faviconFor(url) {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const safe = escapeHtml(text);
  const safeQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(safeQ, 'gi'), m => `<mark>${m}</mark>`);
}

/* ============ Mock AI 요약 ============ */
const MOCK_PATTERNS = [
  { match: /youtube\.com|youtu\.be/, oneLiner: '유튜브 영상 (요약)', summary: '동영상 컨텐츠의 핵심 메시지를 정리한 요약입니다. 주요 포인트와 시청 포인트를 안내합니다.', tags: ['youtube', 'video'] },
  { match: /github\.com/, oneLiner: '깃허브 저장소', summary: '오픈소스 프로젝트 저장소. README의 핵심 기능과 사용법을 요약합니다.', tags: ['github', 'opensource', 'dev'] },
  { match: /react\.dev|reactjs\.org/, oneLiner: '리액트 공식 문서', summary: 'React 공식 문서의 학습 가이드 및 API 레퍼런스 페이지.', tags: ['react', 'frontend', 'docs'] },
  { match: /medium\.com|brunch\.co\.kr|velog\.io/, oneLiner: '블로그 아티클', summary: '블로그 게시물의 핵심 인사이트를 한 줄로 요약합니다. 본문에서 다룬 핵심 주장을 요약했습니다.', tags: ['article', 'blog'] },
  { match: /twitter\.com|x\.com/, oneLiner: 'X (트위터) 게시물', summary: '소셜 미디어 게시물 — 발언자와 핵심 내용을 요약했습니다.', tags: ['social', 'x'] },
  { match: /news\.|naver\.com|daum\.net/, oneLiner: '뉴스 기사', summary: '뉴스 기사 — 헤드라인과 주요 사실을 정리했습니다.', tags: ['news', 'media'] },
  { match: /notion\.so|notion\.site/, oneLiner: '노션 페이지', summary: '공유된 노션 문서 — 내용 요약입니다.', tags: ['notion', 'doc'] },
  { match: /figma\.com/, oneLiner: 'Figma 디자인 파일', summary: '디자인 파일 — 화면 구성과 핵심 컴포넌트를 요약했습니다.', tags: ['figma', 'design'] },
];

/* ============ 폴더 자동 분류 (mock AI) ============ */
function autoClassifyFolder(tags) {
  if (!tags || tags.length === 0) return 'f-default';
  const lowerTags = tags.map(t => String(t).toLowerCase());

  // 1. 태그 ↔ 폴더 이름 직접 매칭
  for (const folder of state.folders) {
    if (folder.id === 'f-default') continue;
    const fname = folder.name.toLowerCase();
    if (lowerTags.some(t => fname.includes(t) || t.includes(fname))) {
      return folder.id;
    }
  }

  // 2. 시드 폴더용 키워드 매칭
  const categories = {
    'f-tech': ['react', 'github', 'frontend', 'backend', 'dev', 'code', 'tech',
               'typescript', 'javascript', 'opensource', 'docs', 'api', 'sdk',
               'ai-sdk', 'figma', 'notion', 'doc', 'web', 'programming'],
    'f-music': ['music', 'youtube', 'video', 'audio', 'sound', 'gear', 'guitar',
                'song', 'album', 'concert', 'mv'],
  };
  for (const [folderId, keywords] of Object.entries(categories)) {
    if (!state.folders.find(f => f.id === folderId)) continue;
    if (lowerTags.some(t => keywords.some(k => t.includes(k) || k.includes(t)))) {
      return folderId;
    }
  }
  return 'f-default';
}

function mockSummarize(url) {
  const domain = getDomain(url);
  const found = MOCK_PATTERNS.find(p => p.match.test(domain));
  if (found) {
    return {
      oneLiner: found.oneLiner,
      summary: `${found.summary} (출처: ${domain})`,
      tags: [...found.tags, ...domain.split('.').slice(0, 1)],
    };
  }
  return {
    oneLiner: `${domain} 페이지`,
    summary: `${domain} 의 페이지 — AI가 본문을 분석하여 요약을 생성합니다.`,
    tags: [domain.split('.')[0], 'web'],
  };
}

/* ============ 렌더 ============ */
let homeSearchQuery = '';

function renderHome(filter = 'recent', folderId = null) {
  // 동적 필터 칩 렌더 (사용자가 만든 폴더 기준)
  const filterBar = $('#home-filters');
  const prevActive = filterBar.querySelector('.filter-chip.active')?.dataset.folder ?? '';
  const myFolders = state.folders.filter(f => !f.shared && f.id !== 'f-default');
  const defaultFolder = state.folders.find(f => f.id === 'f-default');
  filterBar.innerHTML = `
    <button class="filter-chip${prevActive === '' ? ' active' : ''}" data-folder="">전체</button>
    ${myFolders.map(f => `<button class="filter-chip${prevActive === f.id ? ' active' : ''}" data-folder="${f.id}">${f.emoji} ${escapeHtml(f.name)}</button>`).join('')}
    ${defaultFolder ? `<button class="filter-chip${prevActive === 'f-default' ? ' active' : ''}" data-folder="f-default">${defaultFolder.emoji} ${defaultFolder.name}</button>` : ''}
  `;
  $$('#home-filters .filter-chip').forEach(chip => {
    chip.onclick = () => {
      $$('#home-filters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderHome();
    };
  });

  // 정렬 바 렌더 + 바인딩
  const sortContainer = $('#home-sort-bar');
  if (sortContainer) {
    sortContainer.innerHTML = sortBarHtml('link', true);
    bindSortPills('#home-sort-bar');
    bindSelectToggle('#home-sort-bar');
  }
  // 활성 필터 칩에서 folderId 읽기 (인자가 명시적이면 우선)
  if (folderId === null) {
    const activeChip = $('#home-filters .filter-chip.active');
    folderId = activeChip?.dataset.folder || null;
  }
  const list = $('#home-list');
  let links = sortLinks([...state.links]);
  if (folderId) links = links.filter(l => l.folderId === folderId);
  if (homeSearchQuery) {
    const q = homeSearchQuery.toLowerCase();
    links = links.filter(l =>
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.summary && l.summary.toLowerCase().includes(q)) ||
      (l.oneLiner && l.oneLiner.toLowerCase().includes(q)) ||
      (l.memo && l.memo.toLowerCase().includes(q)) ||
      l.tags.some(t => t.toLowerCase().includes(q)) ||
      l.url.toLowerCase().includes(q)
    );
  }

  if (links.length === 0) {
    const isFirstTime = state.user && state.user.joinedAt && (Date.now() - state.user.joinedAt < 7 * 24 * 3600000);
    list.innerHTML = `
      <div class="empty">
        <div class="emoji">📭</div>
        <h3>${isFirstTime ? `${escapeHtml(state.user.name)}님, 환영해요 💖` : '아직 저장된 링크가 없어요'}</h3>
        <p>${isFirstTime
          ? '오른쪽 아래 ➕ 버튼으로 첫 링크를 저장해보세요.<br/>AI가 요약하고 폴더로 자동 분류해줘요.'
          : '오른쪽 아래 + 버튼으로 첫 링크를 추가해보세요'}</p>
        ${isFirstTime ? `
        <div class="onboard-tips">
          <div class="onboard-tip"><span>🔗</span><span>URL 붙여넣기로 빠르게 저장</span></div>
          <div class="onboard-tip"><span>📷</span><span>QR 스캔으로 카페·전시·명함도</span></div>
          <div class="onboard-tip"><span>✨</span><span>AI가 한 줄 요약 + 태그 자동 분류</span></div>
          <div class="onboard-tip"><span>👥</span><span>공유 폴더로 친구와 함께 모으기</span></div>
        </div>
        ` : ''}
      </div>`;
    return;
  }

  list.innerHTML = links.map(l => linkCardHtml(l, homeSearchQuery)).join('');
  $$('#home-list .link-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const toggle = e.target.closest('.todo-done-toggle');
      if (toggle) { e.stopPropagation(); toggleTodoDone(toggle.dataset.todoToggle); return; }
      handleCardClick(card.dataset.id);
    });
  });
}

function linkCardHtml(link, query = '', opts = {}) {
  const tags = link.tags.slice(0, 3).map(t => `<span class="tag">#${t}</span>`).join('');
  const folder = state.folders.find(f => f.id === link.folderId);
  const folderTag = folder ? `<span class="tag muted">${folder.emoji} ${folder.name}</span>` : '';
  const isPending = link.summary === null;
  const displayText = link.oneLiner || link.title || link.url;
  // 할일 라인 (todo 또는 reminder 있을 때만 표시)
  const overdue = link.reminderAt && link.reminderAt < Date.now();
  let todoLine = '';
  if (link.todo || link.reminderAt) {
    const text = link.todo
      ? (query ? highlight(link.todo, query) : escapeHtml(link.todo))
      : '';
    const time = link.reminderAt
      ? `<span class="reminder-card-line${overdue && !link.todoDone ? ' overdue' : ''}" style="margin:0">⏰ ${fmtReminderTime(link.reminderAt)}${overdue && !link.todoDone ? ' (지남)' : ''}</span>`
      : '';
    const checkBtn = `<button class="todo-done-toggle${link.todoDone ? ' is-done' : ''}" data-todo-toggle="${link.id}" aria-label="${link.todoDone ? '미완료로 변경' : '완료'}">${link.todoDone ? '✓' : ''}</button>`;
    todoLine = `<div class="todo-card-line${link.todoDone ? ' is-done' : ''}">${checkBtn}<span class="todo-card-text">${text}</span>${time}</div>`;
  }
  const selectingClass = selectionMode ? ' select-mode' : '';
  const selectedClass = selectedLinkIds.has(link.id) ? ' is-selected' : '';
  const checkbox = selectionMode
    ? `<div class="select-checkbox${selectedLinkIds.has(link.id) ? ' checked' : ''}">${selectedLinkIds.has(link.id) ? '✓' : ''}</div>`
    : '';
  return `
    <article class="link-card${selectingClass}${selectedClass}${opts.todo ? ' todo-card' : ''}${opts.todo && overdue ? ' overdue' : ''}" data-id="${link.id}">
      ${checkbox}
      <div class="link-thumb">
        <img src="${faviconFor(link.url)}" alt="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2236%22 height=%2236%22><rect width=%2236%22 height=%2236%22 fill=%22%23E5E7EB%22 rx=%228%22/></svg>'"/>
      </div>
      <div class="link-body">
        <div class="link-title">${escapeHtml(link.domain)} · ${timeAgo(link.createdAt)}</div>
        <div class="link-summary ${isPending ? 'pending' : ''}">${query ? highlight(displayText, query) : escapeHtml(displayText)}</div>
        <div class="link-tags">${tags}${folderTag}</div>
        ${todoLine}
      </div>
    </article>
  `;
}

function folderCardHtml(f, count, options = {}) {
  // 미분류 폴더만 보호 (공유 폴더도 삭제 가능)
  const protectedFolder = f.id === 'f-default';
  let sharedFooter = '';
  if (f.shared) {
    const names = f.sharedWith || [];
    const avatars = names.slice(0, 3).map(n => `<span class="avatar">${escapeHtml(n[0])}</span>`).join('');
    const moreCount = names.length > 3 ? `<span class="avatar more">+${names.length - 3}</span>` : '';
    const namesText = names.length === 0
      ? '아직 함께하는 사람이 없어요'
      : (names.length <= 2 ? names.join(', ') : `${names.slice(0,2).join(', ')} 외 ${names.length - 2}명`);
    sharedFooter = `
      <div class="folder-shared-row">
        <div class="avatars">${avatars}${moreCount}</div>
        <div class="folder-shared-text">${escapeHtml(namesText)}</div>
        <button class="folder-invite" data-invite="${f.id}" aria-label="공유 초대">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    `;
  }
  return `
    <div class="folder-card${f.shared ? ' shared' : ''}" data-id="${f.id}" role="button" tabindex="0">
      ${protectedFolder ? '' : `<button class="folder-delete" data-del="${f.id}" aria-label="폴더 삭제">×</button>`}
      <div class="folder-card-head">
        <div class="emoji">${f.emoji}</div>
        <div class="folder-card-meta">
          <div class="name">${escapeHtml(f.name)}</div>
          <div class="count">${count}개</div>
        </div>
      </div>
      ${sharedFooter}
    </div>`;
}

function sortFolders(folders) {
  const mode = state.settings.folderSort || 'recent';
  const sorted = [...folders];
  if (mode === 'recent') sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  else if (mode === 'oldest') sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  else if (mode === 'alpha') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
  return sorted;
}

function sortLinks(links) {
  const mode = state.settings.linkSort || 'recent';
  const sorted = [...links];
  if (mode === 'recent') sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  else if (mode === 'oldest') sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  else if (mode === 'alpha') sorted.sort((a, b) => {
    const at = (a.oneLiner || a.title || a.url || '').toLowerCase();
    const bt = (b.oneLiner || b.title || b.url || '').toLowerCase();
    return at.localeCompare(bt, 'ko');
  });
  return sorted;
}

function sortBarHtml(target, includeSelect = false) {
  const cur = target === 'folder'
    ? (state.settings.folderSort || 'recent')
    : (state.settings.linkSort || 'recent');
  const arrowDown = '<svg viewBox="0 0 12 14" width="10" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 1v12M1.5 8.5L6 13l4.5-4.5"/></svg>';
  const arrowUp = '<svg viewBox="0 0 12 14" width="10" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13V1M1.5 5.5L6 1l4.5 4.5"/></svg>';
  const alphaIcon = '<span class="sort-glyph">가</span><svg viewBox="0 0 10 14" width="9" height="11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 1v12M1.5 9.5L5 13l3.5-3.5"/></svg>';
  const mk = (id, label, html) => `
    <button class="sort-pill${cur === id ? ' active' : ''}" data-sort="${id}" data-target="${target}" aria-label="${label}">${html}<span>${label}</span></button>`;
  const selectBtn = includeSelect
    ? `<button class="sort-pill select-toggle" data-action="enter-select" aria-label="선택 모드">
         <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="10" height="10" rx="2"/><path d="M5 7l1.5 1.5L9 5.5"/></svg>
         <span>선택</span>
       </button>`
    : '';
  return `
    <div class="sort-bar">
      ${mk('recent', '최신순', arrowDown)}
      ${mk('oldest', '오래된순', arrowUp)}
      ${mk('alpha', '가나다순', alphaIcon)}
      ${selectBtn}
    </div>`;
}

function bindSortPills(scope) {
  $$(scope + ' .sort-pill').forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.target;
      const key = target === 'folder' ? 'folderSort' : 'linkSort';
      state.settings[key] = btn.dataset.sort;
      saveState();
      if (target === 'folder') {
        renderFolders();
      } else {
        if ($('#screen-home').classList.contains('active')) renderHome();
        if ($('#screen-folder-detail').classList.contains('active') && currentFolderDetailId) {
          openFolderDetail(currentFolderDetailId);
        }
        // (검색은 홈에 통합되어 별도 화면 없음)
      }
    };
  });
}

let currentFolderDetailId = null;

function renderFolders() {
  const container = $('#folders-content');
  const counts = {};
  state.links.forEach(l => { counts[l.folderId] = (counts[l.folderId] || 0) + 1; });
  const myFolders = sortFolders(state.folders.filter(f => !f.shared));
  const sharedFolders = sortFolders(state.folders.filter(f => f.shared));

  const sortBar = sortBarHtml('folder');
  const myGrid = `
    <div class="folder-section">
      <h3 class="folder-section-title">내 폴더</h3>
      <div class="folder-grid">
        ${myFolders.map(f => folderCardHtml(f, counts[f.id] || 0)).join('')}
        <button class="folder-card add-folder" id="folder-add">＋ 새 폴더</button>
      </div>
    </div>
  `;
  const sharedGrid = `
    <div class="folder-section">
      <h3 class="folder-section-title">공유 폴더 <span class="folder-section-count">${sharedFolders.length}</span></h3>
      <div class="folder-grid shared-grid">
        ${sharedFolders.length === 0
          ? `<div class="empty-shared">아직 공유 폴더가 없어요</div>`
          : sharedFolders.map(f => folderCardHtml(f, counts[f.id] || 0)).join('')}
        <button class="folder-card add-folder" id="shared-folder-add">＋ 폴더 공유 시작</button>
      </div>
    </div>
  `;

  container.innerHTML = sortBar + myGrid + sharedGrid;

  bindSortPills('#folders-content');

  $$('#folders-content .folder-card[data-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.folder-delete') || e.target.closest('.folder-invite')) return;
      openFolderDetail(el.dataset.id);
    });
  });
  $$('#folders-content .folder-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFolder(btn.dataset.del);
    });
  });
  $$('#folders-content .folder-invite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openKakaoShare(btn.dataset.invite);
    });
  });
  $('#folder-add')?.addEventListener('click', () => addFolder(false));
  $('#shared-folder-add')?.addEventListener('click', () => addFolder(true));
}

/* ============ 초대 수락 시뮬레이션 (mock) ============ */
const MOCK_FRIENDS_POOL = ['민지', '서연', '지수', '하늘', '예준', '도윤', '서윤', '지호', '예린', '소율', '나린', '윤서', '하린', '도현'];

function simulateInviteAccept(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder || !folder.shared) return;
  const existing = folder.sharedWith || [];
  const available = MOCK_FRIENDS_POOL.filter(n => !existing.includes(n));
  if (available.length === 0) return;
  const newMember = available[Math.floor(Math.random() * available.length)];
  setTimeout(() => {
    const f = state.folders.find(x => x.id === folderId);
    if (!f) return;
    f.sharedWith = [...(f.sharedWith || []), newMember];
    saveState();
    if ($('#screen-folders').classList.contains('active')) renderFolders();
    if ($('#screen-folder-detail').classList.contains('active') &&
        $('#header-title').textContent === `${f.emoji} ${f.name}`) {
      openFolderDetail(folderId);
    }
    if ($('#edit-folder-sheet').classList.contains('open') && editingFolderId === folderId) {
      editFolderMembers = [...f.sharedWith];
      renderEditMembers();
    }
    toast(`💌 ${newMember}님이 폴더에 참여했어요`);
  }, 2400 + Math.random() * 1200);
}

function openKakaoShare(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder) return;
  $('#kakao-card-emoji').textContent = folder.emoji;
  $('#kakao-card-title').textContent = folder.name;
  const inviter = state.user?.name || '친구';
  const count = state.links.filter(l => l.folderId === folderId).length;
  $('#kakao-card-desc').textContent = `${inviter}님이 폴더를 공유했어요${count ? ` · 링크 ${count}개` : ''}. 큐링크에서 함께 정리해보세요.`;

  const sheet = $('#kakao-share-sheet');
  sheet.classList.add('open');
  sheet.dataset.folderId = folderId;
  $('.sheet-backdrop').classList.add('open');
}
function deleteFolder(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder || folder.id === 'f-default') return;
  const inFolder = state.links.filter(l => l.folderId === folderId).length;
  const action = folder.shared ? '나가기' : '삭제';
  const headline = folder.shared
    ? `${folder.emoji} ${folder.name} 공유 폴더에서 나갈까요?`
    : `${folder.emoji} ${folder.name} 폴더를 삭제할까요?`;
  const msg = inFolder > 0
    ? `${headline}\n안의 ${inFolder}개 링크는 '미분류'로 이동합니다.`
    : headline;
  if (!confirm(msg)) return;
  // 클라우드: 해당 폴더 링크들을 미분류로 옮긴 후 폴더 삭제
  const movedIds = state.links.filter(l => l.folderId === folderId).map(l => l.id);
  state.links.forEach(l => {
    if (l.folderId === folderId) l.folderId = 'f-default';
  });
  state.folders = state.folders.filter(f => f.id !== folderId);
  saveState();
  Promise.all(movedIds.map(id => cloudUpdateLink(id, { folderId: 'f-default' })))
    .then(() => cloudDeleteFolder(folderId));
  renderFolders();
  renderHome();
  toast(folder.shared ? '공유 폴더에서 나갔어요' : '폴더가 삭제되었습니다');
}

/* ============ 이모지 / 새 폴더 시트 ============ */
const EMOJI_OPTIONS = [
  // 폴더·문서
  '📁','📂','📚','📖','📝','📌','🔖','🏷️','🗂️','🗒️','📋','📓',
  // 기술·기기
  '💻','🖥️','📱','⌨️','🖱️','💾','📟','🎙️','🔋','🔌',
  // 음악·미디어
  '🎵','🎶','🎬','📷','📸','📹','🎥','🎤','🎧','🎼','🎸','🥁',
  // 아트·디자인
  '🎨','✏️','🖌️','🖍️','🖼️','✂️','📐','📏',
  // 자연·꽃
  '🌸','🌺','🌷','🌹','🌻','🌼','🌿','🍃','🌱','🌳','🌴','🌵',
  // 음식·음료
  '☕','🍰','🍕','🍔','🍣','🍱','🍪','🍩','🍫','🍦','🥐','🥗','🍷','🍵','🧋','🍺',
  // 여행·장소
  '✈️','🏖️','⛺','🚗','🚲','🏠','🏢','🌍','🗺️','🚀','🏔️',
  // 쇼핑·물건
  '🛒','🛍️','💼','💳','💰','🎁','👜','🎒',
  // 사람·하트
  '👥','💕','💖','💗','💞','❤️','🧡','💛','💚','💙','💜','🤍',
  // 별·매직
  '✨','⭐','🌟','💫','🪄','🔮','☄️','🌙','☀️','🌈','⚡',
  // 스포츠·취미
  '⚽','🏀','🎮','🎲','🎯','🎳','🎪','🏆',
  // 동물
  '🐶','🐱','🐰','🐻','🐼','🦊','🐯','🐨','🐸','🐹','🦋','🐝','🐢','🐳',
  // 기타
  '🔥','💡','🎉','🎈','🍀','💎','👑','🦄'
];

const AVATAR_OPTIONS = [
  '🐿️','🐶','🐱','🐰','🐻','🐼','🦊','🐯','🐨','🐸','🐹','🦄',
  '🌸','🌷','🌹','🌺','🍓','🍒','🍑','🍰','🧁','🍦','🌈','🔮',
  '🌟','✨','💖','💜','💎','🎀','🦋','🪄','💫','⭐','🌙','☀️',
  '😊','🥰','😎','🤩','😇','🥳','🤗','🥺','🌼','💕','💗','💝',
];
let newFolderShared = false;
let newFolderEmoji = '📁';

function addFolder(shared = false) {
  newFolderShared = shared;
  newFolderEmoji = shared ? '👥' : '📁';
  $('#new-folder-name').value = '';
  $('#new-folder-shared-hint').hidden = !shared;
  $('#new-folder-title').textContent = shared ? '공유 폴더 만들기' : '새 폴더';
  renderEmojiPicker();
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('#new-folder-sheet').classList.add('open');
  $('.sheet-backdrop').classList.add('open');
  if (!isMobile()) setTimeout(() => $('#new-folder-name').focus({ preventScroll: true }), 350);
}

function renderEmojiPicker() {
  const grid = $('#new-folder-emoji-grid');
  grid.innerHTML = EMOJI_OPTIONS.map(e =>
    `<button type="button" class="emoji-cell${e === newFolderEmoji ? ' selected' : ''}" data-e="${e}">${e}</button>`
  ).join('');
  $$('#new-folder-emoji-grid .emoji-cell').forEach(cell => {
    cell.onclick = () => {
      newFolderEmoji = cell.dataset.e;
      renderEmojiPicker();
    };
  });
}

/* ============ 폴더 편집 ============ */
let editingFolderId = null;
let editFolderEmoji = '📁';
let editFolderMembers = [];

function openEditFolder(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder || folder.id === 'f-default') return;
  editingFolderId = folderId;
  editFolderEmoji = folder.emoji;
  editFolderMembers = [...(folder.sharedWith || [])];
  $('#edit-folder-name').value = folder.name;
  $('#edit-folder-shared-section').hidden = !folder.shared;
  $('#btn-edit-folder-delete').textContent = folder.shared ? '공유 폴더 나가기' : '폴더 삭제';
  renderEditEmojiGrid();
  renderEditMembers();
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('#edit-folder-sheet').classList.add('open');
  $('.sheet-backdrop').classList.add('open');
}

function renderEditEmojiGrid() {
  const grid = $('#edit-folder-emoji-grid');
  grid.innerHTML = EMOJI_OPTIONS.map(e =>
    `<button type="button" class="emoji-cell${e === editFolderEmoji ? ' selected' : ''}" data-e="${e}">${e}</button>`
  ).join('');
  $$('#edit-folder-emoji-grid .emoji-cell').forEach(cell => {
    cell.onclick = () => {
      editFolderEmoji = cell.dataset.e;
      renderEditEmojiGrid();
    };
  });
}

function renderEditMembers() {
  const wrap = $('#edit-folder-members');
  if (editFolderMembers.length === 0) {
    wrap.innerHTML = '<div class="member-empty">아직 함께하는 사람이 없어요</div>';
    return;
  }
  wrap.innerHTML = editFolderMembers.map((m, i) => `
    <div class="member-chip">
      <span class="member-avatar">${escapeHtml(m[0] || '?')}</span>
      <span class="member-name">${escapeHtml(m)}</span>
      <button class="member-remove" data-idx="${i}" aria-label="제거">×</button>
    </div>
  `).join('');
  $$('#edit-folder-members .member-remove').forEach(btn => {
    btn.onclick = () => {
      editFolderMembers.splice(parseInt(btn.dataset.idx, 10), 1);
      renderEditMembers();
    };
  });
}

function saveEditFolder() {
  const folder = state.folders.find(f => f.id === editingFolderId);
  if (!folder) return;
  const name = $('#edit-folder-name').value.trim();
  if (!name) { toast('폴더 이름을 입력해주세요'); return; }
  folder.name = name;
  folder.emoji = editFolderEmoji;
  if (folder.shared) folder.sharedWith = [...editFolderMembers];
  saveState();
  cloudUpdateFolder(folder.id, { name, emoji: editFolderEmoji });
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('.sheet-backdrop').classList.remove('open');
  // 폴더 detail 헤더 갱신 (방금 수정한 폴더 화면일 때)
  openFolderDetail(folder.id);
  toast('폴더가 수정되었어요 ✨');
}

function saveNewFolder() {
  const name = $('#new-folder-name').value.trim();
  if (!name) { toast('폴더 이름을 입력해주세요'); return; }
  const newId = uid('f');
  const folder = {
    id: newId,
    name, emoji: newFolderEmoji,
    color: '#4F46E5',
    shared: newFolderShared,
    createdAt: Date.now(),
    ...(newFolderShared ? { sharedWith: [] } : {}),
  };
  state.folders.push(folder);
  saveState();
  cloudCreateFolder(folder);
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('.sheet-backdrop').classList.remove('open');
  renderFolders();
  if (newFolderShared) {
    toast('공유 폴더 생성됨 — 친구를 초대해보세요 💌');
    setTimeout(() => openKakaoShare(newId), 300);
  } else {
    toast('폴더가 추가되었습니다');
  }
}

function openFolderDetail(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder) return;
  currentFolderDetailId = folderId;
  const backToList = () => {
    currentFolderDetailId = null;
    setActiveTab('folders'); setHeader('inner', '폴더');
    showScreen('screen-folders'); renderFolders();
  };
  // 미분류는 편집 불가, 그 외 폴더는 편집 버튼 노출
  const editable = folder.id !== 'f-default';
  setHeader('inner', `${folder.emoji} ${folder.name}`, backToList, editable ? {
    label: '편집',
    html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    onClick: () => openEditFolder(folder.id),
  } : null);
  // 정렬 바
  const sortContainer = $('#folder-detail-sort-bar');
  if (sortContainer) {
    sortContainer.innerHTML = sortBarHtml('link', true);
    bindSortPills('#folder-detail-sort-bar');
    bindSelectToggle('#folder-detail-sort-bar');
  }
  const links = sortLinks(state.links.filter(l => l.folderId === folderId));
  const list = $('#folder-detail-list');
  if (links.length === 0) {
    list.innerHTML = `<div class="empty"><div class="emoji">📂</div><h3>이 폴더는 비어있어요</h3></div>`;
  } else {
    list.innerHTML = links.map(l => linkCardHtml(l)).join('');
    $$('#folder-detail-list .link-card').forEach(card => {
      card.addEventListener('click', (e) => {
      const toggle = e.target.closest('.todo-done-toggle');
      if (toggle) { e.stopPropagation(); toggleTodoDone(toggle.dataset.todoToggle); return; }
      handleCardClick(card.dataset.id);
    });
    });
  }
  showScreen('screen-folder-detail');
}

function handleCardClick(linkId) {
  if (selectionMode) {
    toggleSelection(linkId);
    return;
  }
  openLinkDetail(linkId);
}

function toggleTodoDone(linkId) {
  const link = state.links.find(l => l.id === linkId);
  if (!link) return;
  link.todoDone = !link.todoDone;
  saveState();
  cloudUpdateLink(link.id, { todoDone: link.todoDone });
  toast(link.todoDone ? '✓ 완료로 표시' : '미완료로 변경');
  if ($('#screen-todo').classList.contains('active')) renderTodo();
  if ($('#screen-home').classList.contains('active')) renderHome();
  if ($('#screen-folder-detail').classList.contains('active') && currentFolderDetailId) {
    openFolderDetail(currentFolderDetailId);
  }
  if ($('#screen-link-detail').classList.contains('active')) openLinkDetail(linkId);
}

function openLinkDetail(linkId) {
  const link = state.links.find(l => l.id === linkId);
  if (!link) return;
  setHeader('inner', '링크 상세');
  const folder = state.folders.find(f => f.id === link.folderId);
  const detail = $('#link-detail-content');
  detail.innerHTML = `
    <div class="detail-hero">
      <div class="url">${escapeHtml(link.url)}</div>
      <div class="title">${escapeHtml(link.title || link.domain)}</div>
      <div class="summary">${escapeHtml(link.summary || '요약 생성 중...')}</div>
    </div>
    <div class="detail-section">
      <h4>태그</h4>
      <div class="link-tags">${link.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>
    </div>
    <div class="detail-section">
      <h4>폴더</h4>
      <div class="link-tags">
        ${folder ? `<span class="tag muted">${folder.emoji} ${folder.name}</span>` : '<span class="tag muted">미분류</span>'}
      </div>
    </div>
    <div class="detail-section">
      <h4>저장 정보</h4>
      <div style="font-size:12px;color:var(--qlink-text-muted)">
        ${link.sourceType === 'qr' ? '📷 QR 스캔' : '🔗 URL 입력'} · ${timeAgo(link.createdAt)}
      </div>
    </div>
    <div class="detail-section">
      <h4>✅ 할일</h4>
      ${link.todo || link.reminderAt
        ? `<div class="todo-display-wrap${link.todoDone ? ' is-done' : ''}">
            <button class="todo-done-toggle big${link.todoDone ? ' is-done' : ''}" data-todo-toggle="${link.id}" aria-label="${link.todoDone ? '미완료로' : '완료'}">${link.todoDone ? '✓' : ''}</button>
            <div class="todo-display-body">
              ${link.todo ? `<div class="todo-display">${escapeHtml(link.todo)}</div>` : ''}
              ${link.reminderAt ? `<div class="reminder-card-line${link.reminderAt < Date.now() && !link.todoDone ? ' overdue' : ''}" style="margin-top:8px">⏰ ${fmtReminderTime(link.reminderAt)}${link.reminderAt < Date.now() && !link.todoDone ? ' (지남)' : ''}</div>` : ''}
            </div>
          </div>
          <button class="btn btn-secondary" id="btn-edit-todo" style="margin-top:8px">할일 수정</button>`
        : `<button class="btn btn-secondary" id="btn-edit-todo">＋ 할일 추가</button>`}
    </div>
    <div class="detail-section">
      <h4>📝 메모</h4>
      ${link.memo
        ? `<div class="memo-display">${escapeHtml(link.memo)}</div>
           <button class="btn btn-secondary" id="btn-edit-memo" style="margin-top:8px">메모 수정</button>`
        : `<button class="btn btn-secondary" id="btn-edit-memo">＋ 메모 추가</button>`}
    </div>
    <div class="detail-section">
      <div class="row">
        <a class="btn btn-primary" href="${link.url}" target="_blank" rel="noopener">원본 열기</a>
        <button class="btn btn-secondary" id="btn-share">공유</button>
      </div>
      <div class="row" style="margin-top:8px">
        <button class="btn btn-secondary" id="btn-move">폴더 이동</button>
      </div>
      <button class="btn btn-ghost" id="btn-delete" style="margin-top:8px;color:var(--qlink-error)">삭제</button>
    </div>
  `;
  $('#btn-share').onclick = () => shareLink(link);
  $('#btn-move').onclick = () => moveLink(link);
  $('#btn-edit-todo')?.addEventListener('click', () => openTodoEditor(link.id));
  $('#btn-edit-memo')?.addEventListener('click', () => openMemoEditor(link.id));
  $('#link-detail-content .todo-done-toggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTodoDone(link.id);
  });
  $('#btn-delete').onclick = () => {
    if (confirm('이 링크를 삭제할까요?')) {
      state.links = state.links.filter(l => l.id !== link.id);
      saveState();
      cloudDeleteLink(link.id);
      toast('삭제되었습니다');
      goHome();
    }
  };
  showScreen('screen-link-detail');
}

async function shareLink(link) {
  const data = {
    title: link.title || '큐링크에서 공유',
    text: link.oneLiner || link.summary || '',
    url: link.url,
  };
  if (navigator.share) {
    try { await navigator.share(data); }
    catch {}
  } else {
    await navigator.clipboard.writeText(link.url).catch(() => {});
    toast('링크가 클립보드에 복사되었습니다');
  }
}

function moveLink(link) {
  const folderName = prompt(
    '이동할 폴더 번호를 선택하세요:\n' +
    state.folders.map((f, i) => `${i + 1}. ${f.emoji} ${f.name}`).join('\n')
  );
  const idx = parseInt(folderName, 10) - 1;
  if (Number.isNaN(idx) || !state.folders[idx]) return;
  link.folderId = state.folders[idx].id;
  saveState();
  cloudUpdateLink(link.id, { folderId: link.folderId });
  toast(`${state.folders[idx].name}(으)로 이동`);
  openLinkDetail(link.id);
}

const REMINDER_OPTIONS = [
  { mins: 60, emoji: '⏰', label: '1시간 뒤' },
  { mins: 60 * 3, emoji: '☕', label: '3시간 뒤' },
  { mins: 60 * 24, emoji: '🌙', label: '내일 이 시간' },
  { mins: 60 * 24 * 3, emoji: '✨', label: '3일 뒤' },
  { mins: 60 * 24 * 7, emoji: '📅', label: '일주일 뒤' },
  { mins: 60 * 24 * 30, emoji: '🗓️', label: '한 달 뒤' },
];

function fmtReminderTime(ts) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${h}:${min}`;
}

// 알림은 이제 할일 시트에 통합됨 (별도 setReminder 없음)

/* ============ 할일 (메모·리마인더) 화면 ============ */
function renderTodo() {
  // 선택 토글 바 (필터 칩 아래)
  let toggleBar = $('#todo-select-bar');
  if (!toggleBar) {
    toggleBar = document.createElement('div');
    toggleBar.id = 'todo-select-bar';
    toggleBar.className = 'sort-bar';
    $('#screen-todo').insertBefore(toggleBar, $('#todo-list'));
  }
  toggleBar.innerHTML = `
    <button class="sort-pill select-toggle" data-action="enter-select">
      <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="10" height="10" rx="2"/><path d="M5 7l1.5 1.5L9 5.5"/></svg>
      <span>선택</span>
    </button>`;
  bindSelectToggle('#todo-select-bar');

  const list = $('#todo-list');
  const filter = $('#todo-filters .filter-chip.active')?.dataset.todoFilter || 'all';

  const now = Date.now();
  let items = state.links.filter(l => {
    const hasTodo = !!l.todo || !!l.reminderAt;
    if (!hasTodo) return false;
    if (filter === 'done') return !!l.todoDone;
    if (filter === 'undone') return !l.todoDone;
    if (filter === 'upcoming') return !l.todoDone && l.reminderAt && l.reminderAt >= now;
    if (filter === 'overdue') return !l.todoDone && l.reminderAt && l.reminderAt < now;
    return true;
  });

  // 정렬: 미완료 우선 → 알림 빠른 순 → 최신 추가 순; 완료된 건 맨 아래
  items.sort((a, b) => {
    if (!!a.todoDone !== !!b.todoDone) return a.todoDone ? 1 : -1;
    const ar = a.reminderAt ?? Infinity;
    const br = b.reminderAt ?? Infinity;
    if (ar !== br) return ar - br;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  if (items.length === 0) {
    const msg = filter === 'reminder' ? '알림 있는 할일' : filter === 'overdue' ? '지난 할일' : '할일';
    list.innerHTML = `
      <div class="empty">
        <div class="emoji">${filter === 'overdue' ? '🔥' : filter === 'reminder' ? '⏰' : '✨'}</div>
        <h3>${msg}이 없어요</h3>
        <p>링크 상세에서 ✅ 할일을 추가해보세요.<br/>알림 시각도 함께 정할 수 있어요.</p>
      </div>`;
    return;
  }

  list.innerHTML = items.map(l => linkCardHtml(l, '', { todo: true })).join('');
  $$('#todo-list .link-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const toggle = e.target.closest('.todo-done-toggle');
      if (toggle) { e.stopPropagation(); toggleTodoDone(toggle.dataset.todoToggle); return; }
      handleCardClick(card.dataset.id);
    });
  });
}

function bindSelectToggle(scope) {
  $$(scope + ' [data-action="enter-select"]').forEach(btn => {
    btn.onclick = () => enterSelectionMode();
  });
}

function enterSelectionMode() {
  selectionMode = true;
  selectedLinkIds.clear();
  $('#selection-bar').hidden = false;
  $('#fab').style.display = 'none';
  updateSelectionBar();
  rerenderActiveLinkScreen();
}

function exitSelectionMode() {
  selectionMode = false;
  selectedLinkIds.clear();
  $('#selection-bar').hidden = true;
  $('#fab').style.display = '';
  rerenderActiveLinkScreen();
}

function rerenderActiveLinkScreen() {
  if ($('#screen-home').classList.contains('active')) renderHome();
  else if ($('#screen-todo').classList.contains('active')) renderTodo();
  else if ($('#screen-folder-detail').classList.contains('active') && currentFolderDetailId) {
    openFolderDetail(currentFolderDetailId);
  }
}

function selectAllVisible() {
  // 현재 화면의 모든 카드 선택
  $$('.screen.active .link-card').forEach(card => {
    selectedLinkIds.add(card.dataset.id);
  });
  rerenderActiveLinkScreen();
  updateSelectionBar();
}

function deleteSelected() {
  if (selectedLinkIds.size === 0) {
    toast('선택된 링크가 없어요');
    return;
  }
  if (!confirm(`${selectedLinkIds.size}개의 링크를 삭제할까요?`)) return;
  const idsToDelete = Array.from(selectedLinkIds);
  state.links = state.links.filter(l => !selectedLinkIds.has(l.id));
  saveState();
  cloudDeleteLinks(idsToDelete);
  toast(`${selectedLinkIds.size}개 삭제됨`);
  exitSelectionMode();
}

async function shareSelected() {
  if (selectedLinkIds.size === 0) {
    toast('선택된 링크가 없어요');
    return;
  }
  const items = state.links.filter(l => selectedLinkIds.has(l.id));
  const text = items.map(l => `• ${l.oneLiner || l.title || l.domain}\n  ${l.url}`).join('\n\n');
  const shareData = {
    title: `큐링크 ${items.length}개`,
    text: `📚 큐링크에서 모은 링크 ${items.length}개\n\n${text}`,
  };
  try {
    if (navigator.share) await navigator.share(shareData);
    else throw new Error('no share api');
  } catch (err) {
    if (err.name === 'AbortError') return;
    // 폴백: 클립보드
    try { await navigator.clipboard.writeText(shareData.text); }
    catch {}
    toast('링크들이 클립보드에 복사됐어요');
  }
  exitSelectionMode();
}

function toggleSelection(linkId) {
  if (selectedLinkIds.has(linkId)) selectedLinkIds.delete(linkId);
  else selectedLinkIds.add(linkId);
  // 현재 활성 화면 다시 렌더
  if ($('#screen-home').classList.contains('active')) renderHome();
  else if ($('#screen-todo').classList.contains('active')) renderTodo();
  else if ($('#screen-folder-detail').classList.contains('active') && currentFolderDetailId) {
    openFolderDetail(currentFolderDetailId);
  }
  updateSelectionBar();
}

function updateSelectionBar() {
  const bar = $('#selection-bar');
  if (!bar) return;
  bar.querySelector('.sel-count').textContent = `${selectedLinkIds.size}개 선택`;
}

/* ============ 할일 편집 (리마인더 통합) ============ */
let todoEditingLinkId = null;
let todoPendingReminder = null; // 타임스탬프 또는 null

function openTodoEditor(linkId) {
  const link = state.links.find(l => l.id === linkId);
  if (!link) return;
  todoEditingLinkId = linkId;
  $('#todo-textarea').value = link.todo || '';
  todoPendingReminder = link.reminderAt || null;
  $('#btn-todo-delete').hidden = !link.todo;
  renderTodoReminderGrid();
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('#todo-sheet').classList.add('open');
  $('.sheet-backdrop').classList.add('open');
  if (!isMobile()) setTimeout(() => $('#todo-textarea').focus({ preventScroll: true }), 350);
}

function renderTodoReminderGrid() {
  const grid = $('#todo-reminder-grid');
  const noneSelected = !todoPendingReminder;
  const noneItem = `
    <button type="button" class="reminder-option${noneSelected ? ' selected' : ''}" data-mins="0">
      <div class="reminder-emoji">🚫</div>
      <div class="reminder-label">없음</div>
      <div class="reminder-sub">알림 안 함</div>
    </button>`;
  const opts = REMINDER_OPTIONS.map(o => {
    const targetTs = Date.now() + o.mins * 60000;
    const isSelected = todoPendingReminder &&
      Math.abs(todoPendingReminder - targetTs) < 90 * 1000; // ~1.5분 tolerance
    return `
      <button type="button" class="reminder-option${isSelected ? ' selected' : ''}" data-mins="${o.mins}">
        <div class="reminder-emoji">${o.emoji}</div>
        <div class="reminder-label">${o.label}</div>
        <div class="reminder-sub">${fmtReminderTime(targetTs)}</div>
      </button>`;
  }).join('');
  grid.innerHTML = noneItem + opts;
  $$('#todo-reminder-grid .reminder-option').forEach(btn => {
    btn.onclick = () => {
      const mins = parseInt(btn.dataset.mins, 10);
      todoPendingReminder = mins === 0 ? null : Date.now() + mins * 60000;
      renderTodoReminderGrid();
    };
  });
}

function saveTodo() {
  const link = state.links.find(l => l.id === todoEditingLinkId);
  if (!link) return;
  const text = $('#todo-textarea').value.trim();
  if (!text && !todoPendingReminder) {
    toast('할일 내용이나 알림을 설정해주세요');
    return;
  }
  if (text) link.todo = text; else delete link.todo;
  if (todoPendingReminder) link.reminderAt = todoPendingReminder;
  else delete link.reminderAt;
  saveState();
  cloudUpdateLink(link.id, {
    todo: link.todo || null,
    reminderAt: link.reminderAt || null,
  });
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('.sheet-backdrop').classList.remove('open');
  toast('할일이 저장되었어요 ✨');
  if ($('#screen-link-detail').classList.contains('active')) openLinkDetail(link.id);
  if ($('#screen-todo').classList.contains('active')) renderTodo();
  if ($('#screen-home').classList.contains('active')) renderHome();
}

function deleteTodo() {
  const link = state.links.find(l => l.id === todoEditingLinkId);
  if (!link) return;
  delete link.todo;
  delete link.reminderAt;
  delete link.todoDone;
  saveState();
  cloudUpdateLink(link.id, { todo: null, reminderAt: null, todoDone: false });
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('.sheet-backdrop').classList.remove('open');
  toast('할일이 삭제되었어요');
  if ($('#screen-link-detail').classList.contains('active')) openLinkDetail(link.id);
  if ($('#screen-todo').classList.contains('active')) renderTodo();
}

/* ============ 메모 편집 (할일과 별개의 단순 노트) ============ */
let memoEditingLinkId = null;

function openMemoEditor(linkId) {
  const link = state.links.find(l => l.id === linkId);
  if (!link) return;
  memoEditingLinkId = linkId;
  $('#memo-textarea').value = link.memo || '';
  $('#btn-memo-delete').hidden = !link.memo;
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('#memo-sheet').classList.add('open');
  $('.sheet-backdrop').classList.add('open');
  if (!isMobile()) setTimeout(() => $('#memo-textarea').focus({ preventScroll: true }), 350);
}

function saveMemo() {
  const link = state.links.find(l => l.id === memoEditingLinkId);
  if (!link) return;
  const memo = $('#memo-textarea').value.trim();
  if (memo) link.memo = memo;
  else delete link.memo;
  saveState();
  cloudUpdateLink(link.id, { memo: link.memo || null });
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('.sheet-backdrop').classList.remove('open');
  toast(memo ? '메모가 저장되었어요' : '메모가 삭제되었어요');
  if ($('#screen-link-detail').classList.contains('active')) openLinkDetail(link.id);
  if ($('#screen-todo').classList.contains('active')) renderTodo();
  if ($('#screen-home').classList.contains('active')) renderHome();
}

function deleteMemo() {
  const link = state.links.find(l => l.id === memoEditingLinkId);
  if (!link) return;
  delete link.memo;
  saveState();
  cloudUpdateLink(link.id, { memo: null });
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('.sheet-backdrop').classList.remove('open');
  toast('메모가 삭제되었어요');
  if ($('#screen-link-detail').classList.contains('active')) openLinkDetail(link.id);
  if ($('#screen-todo').classList.contains('active')) renderTodo();
}

/* ============ 검색 ============ */
function renderSearch(q) {
  const list = $('#search-results');
  if (!q) {
    list.innerHTML = `
      <div class="empty">
        <div class="emoji">🔎</div>
        <h3>키워드를 입력해보세요</h3>
        <p>제목·요약·태그를 함께 검색합니다</p>
      </div>`;
    return;
  }
  const lower = q.toLowerCase();
  const results = sortLinks(state.links.filter(l =>
    (l.title && l.title.toLowerCase().includes(lower)) ||
    (l.summary && l.summary.toLowerCase().includes(lower)) ||
    (l.oneLiner && l.oneLiner.toLowerCase().includes(lower)) ||
    l.tags.some(t => t.toLowerCase().includes(lower)) ||
    l.url.toLowerCase().includes(lower)
  ));
  if (results.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <div class="emoji">😶‍🌫️</div>
        <h3>"${escapeHtml(q)}" 검색 결과가 없어요</h3>
        <p>다른 키워드를 시도해보세요</p>
      </div>`;
    return;
  }
  list.innerHTML = results.map(l => linkCardHtml(l, q)).join('');
  $$('#search-results .link-card').forEach(card => {
    card.addEventListener('click', () => openLinkDetail(card.dataset.id));
  });
}

/* ============ 추가 시트 ============ */
function openAddSheet() {
  // 안전장치: 다른 시트가 떠 있으면 모두 닫고 시작
  $$('.sheet').forEach(s => {
    if (s.id !== 'add-sheet') s.classList.remove('open');
    delete s.dataset.returnTo;
  });
  pendingFolderId = null; // 새로 열 때마다 자동 분류로 리셋
  const sheet = $('#add-sheet');
  sheet.classList.add('open');
  $('.sheet-backdrop').classList.add('open');
  updateAddProviderInfo();
  updateAddFolderInfo();
  // 클립보드 자동 인식 (포커스 없이도 동작)
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(text => {
      if (/^https?:\/\//.test(text) && !$('#input-url').value) {
        $('#input-url').value = text;
      }
    }).catch(() => {});
  }
  // 시트 슬라이드업 완료 후 포커스 (viewport 점프 방지)
  if (!isMobile()) {
    setTimeout(() => $('#input-url').focus({ preventScroll: true }), 350);
  }
}

function isMobile() {
  return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
}

function updateAddProviderInfo() {
  const el = $('#add-provider-current');
  if (el) el.textContent = providerName(state.settings.aiProvider);
}

function updateAddFolderInfo() {
  const el = $('#add-folder-current');
  if (!el) return;
  if (!pendingFolderId) {
    el.textContent = '✨ AI 자동 분류';
    return;
  }
  const f = state.folders.find(x => x.id === pendingFolderId);
  el.textContent = f ? `${f.emoji} ${f.name}` : '✨ AI 자동 분류';
}

function openFolderPicker() {
  $('#add-sheet').classList.remove('open');
  const sheet = $('#folder-picker-sheet');
  sheet.classList.add('open');
  sheet.dataset.returnTo = 'add';
  $('.sheet-backdrop').classList.add('open');

  const list = $('#folder-picker-list');
  const autoItem = `
    <div class="radio-item" data-folder-id="">
      <div>
        <div class="name">✨ AI 자동 분류</div>
        <div class="desc">태그를 분석해 가장 어울리는 폴더로</div>
      </div>
      <span>›</span>
    </div>`;
  const folderItems = state.folders.map(f => `
    <div class="radio-item" data-folder-id="${f.id}">
      <div>
        <div class="name">${f.emoji} ${escapeHtml(f.name)}</div>
        <div class="desc">${f.id === 'f-default' ? '미분류 폴더' : '직접 지정'}</div>
      </div>
      <span>›</span>
    </div>`).join('');
  list.innerHTML = autoItem + folderItems;

  $$('#folder-picker-list .radio-item').forEach(item => {
    const id = item.dataset.folderId || null;
    item.classList.toggle('selected', id === pendingFolderId);
    item.onclick = () => {
      pendingFolderId = id;
      sheet.classList.remove('open');
      delete sheet.dataset.returnTo;
      $('#add-sheet').classList.add('open');
      updateAddFolderInfo();
      const label = id
        ? (state.folders.find(f => f.id === id)?.name || '폴더')
        : 'AI 자동 분류';
      toast(`폴더: ${label}`);
    };
  });
}

function closeAllSheets() {
  $$('.sheet').forEach(s => {
    s.classList.remove('open');
    delete s.dataset.returnTo;
    s.style.transform = '';  // 드래그 중 잔여 transform 제거
  });
  $('.sheet-backdrop').classList.remove('open');
  pendingFolderId = null;
  syncBodyLock();
}

function syncBodyLock() {
  const anyOpen = $$('.sheet').some(s => s.classList.contains('open'));
  document.body.classList.toggle('sheet-open', anyOpen);
}

function closeSheets() {
  // 어떤 sub-sheet든 returnTo='add'면 추가 시트로 복귀
  const sub = $$('.sheet').find(s =>
    s.classList.contains('open') && s.dataset.returnTo === 'add'
  );
  if (sub) {
    sub.classList.remove('open');
    delete sub.dataset.returnTo;
    $('#add-sheet').classList.add('open');
    syncBodyLock();
    return;
  }
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('.sheet-backdrop').classList.remove('open');
  syncBodyLock();
}

async function saveLinkFromInput(source = 'url') {
  const url = $('#input-url').value.trim();
  if (!/^https?:\/\//.test(url)) {
    toast('올바른 URL을 입력해주세요');
    return;
  }
  // 중복 검사
  if (state.links.some(l => l.url === url)) {
    toast('이미 저장된 링크입니다');
    return;
  }
  const domain = getDomain(url);
  const useAutoFolder = !pendingFolderId;
  const link = {
    id: uid('l'),
    url,
    domain,
    title: domain,
    summary: null, // pending
    oneLiner: null,
    tags: [],
    folderId: pendingFolderId || 'f-default', // auto면 분류 후 갱신
    sourceType: source,
    createdAt: Date.now(),
    pendingAutoFolder: useAutoFolder,
  };
  state.links.unshift(link);
  saveState();
  cloudCreateLink(link);
  $('#input-url').value = '';
  closeSheets();
  toast('저장 중... AI 요약 생성');
  showScreen('screen-home');
  setActiveTab('home');
  // '전체' 필터 활성화 (다른 폴더 필터가 켜져 있으면 새 링크가 안 보일 수 있음)
  $$('#home-filters .filter-chip').forEach(c => c.classList.remove('active'));
  const allChip = $('#home-filters .filter-chip[data-folder=""]');
  if (allChip) allChip.classList.add('active');
  renderHome();
  // 홈을 맨 위로 스크롤 → 새 카드가 보이도록
  $('#screen-home').scrollTop = 0;

  // mock 비동기 요약 (+ 폴더 자동분류)
  setTimeout(() => {
    const r = mockSummarize(url);
    link.summary = r.summary;
    link.oneLiner = r.oneLiner;
    link.tags = r.tags;
    link.title = r.oneLiner;
    const patch = {
      summary: r.summary,
      oneLiner: r.oneLiner,
      tags: r.tags,
      title: r.oneLiner,
    };
    if (link.pendingAutoFolder) {
      link.folderId = autoClassifyFolder(r.tags);
      patch.folderId = link.folderId;
      delete link.pendingAutoFolder;
      const f = state.folders.find(x => x.id === link.folderId);
      toast(`자동 분류: ${f ? f.emoji + ' ' + f.name : '미분류'} ✨`);
    } else {
      toast('요약이 생성되었어요 ✨');
    }
    saveState();
    cloudUpdateLink(link.id, patch);
    renderHome();
  }, 1400);

  pendingFolderId = null; // 다음 추가를 위해 리셋
}

/* ============ QR 스캐너 ============ */
let qrScanner = null;
async function startQR() {
  setHeader('inner', 'QR 스캔');
  showScreen('screen-qr');
  setActiveTab(null);
  if (typeof Html5Qrcode === 'undefined') {
    $('#qr-region').innerHTML = '<div style="color:white;padding:32px;text-align:center">QR 라이브러리 로드 실패. CDN 차단 가능성.</div>';
    return;
  }
  try {
    qrScanner = new Html5Qrcode('qr-region');
    await qrScanner.start(
      { facingMode: { ideal: 'environment' } },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decoded) => {
        stopQR();
        $('#input-url').value = decoded;
        openAddSheet();
        toast('QR 인식: ' + decoded.slice(0, 40));
      },
      () => {}
    );
  } catch (e) {
    $('#qr-region').innerHTML = `<div style="color:white;padding:32px;text-align:center">카메라 사용 불가<br><small>${e.message || e}</small></div>`;
  }
}
async function stopQR() {
  if (qrScanner) {
    try { await qrScanner.stop(); } catch {}
    qrScanner = null;
  }
}

/* ============ 화면 전환 ============ */
function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
  if (id !== 'screen-qr') stopQR();
  updateFabVisibility();
}

function updateFabVisibility() {
  const fab = $('#fab');
  if (!fab) return;
  const hideOn = ['screen-settings', 'screen-login', 'screen-link-detail', 'screen-qr'];
  const hide = hideOn.some(id => $('#' + id)?.classList.contains('active')) || selectionMode;
  fab.style.display = hide ? 'none' : '';
}

function handleFabClick() {
  if (selectionMode) return;
  if ($('#screen-folders').classList.contains('active')) {
    openFabMenu();
  } else {
    openAddSheet();
  }
}

function openFabMenu() {
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('#fab-menu-sheet').classList.add('open');
  $('.sheet-backdrop').classList.add('open');
}
function goHome() { setHeader('home'); showScreen('screen-home'); setActiveTab('home'); renderHome(); }
function setActiveTab(tab) {
  $$('.tab-item').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
}

/* ============ 인증 (Supabase 연동) ============ */
let pendingLogin = null;   // { provider, email, defaultName, password }
let pendingAvatar = '🐿️';

const SUPABASE_AVAILABLE = !!window.QLink?.auth;

/* ============ 게스트 모드 (시드 데이터로 둘러보기) ============ */
function enterGuestMode() {
  const now = Date.now();
  const day = 86400000;
  state.user = {
    id: 'guest',
    name: '게스트',
    email: null,
    avatar: '👋',
    provider: 'guest',
    joinedAt: now,
    isGuest: true,
  };
  state.defaultFolderCloudId = null;
  state.defaultFolderId = 'f-default';

  state.folders = [
    { id: 'f-default', name: '미분류', emoji: '📥', shared: false, createdAt: 0 },
    { id: 'g-work', name: '업무', emoji: '💼', shared: false, createdAt: now - day * 6 },
    { id: 'g-study', name: '스터디', emoji: '📚', shared: false, createdAt: now - day * 5 },
    { id: 'g-music', name: '음악', emoji: '🎵', shared: false, createdAt: now - day * 4 },
    { id: 'g-content', name: '콘텐츠', emoji: '🎬', shared: false, createdAt: now - day * 3 },
    { id: 'g-team', name: '팀 자료', emoji: '👥', shared: true, sharedWith: ['민지', '서연'], createdAt: now - day * 7 },
    { id: 'g-cafe', name: '카페 투어', emoji: '☕', shared: true, sharedWith: ['지수', '하늘', '예준'], createdAt: now - day * 2 },
  ];

  const mk = (overrides) => ({
    id: uid('l'),
    sourceType: 'url',
    tags: [],
    todoDone: false,
    ...overrides,
  });
  state.links = [
    // 업무 (3)
    mk({ url: 'https://notion.so/team', domain: 'notion.so', title: 'Notion 팀 워크스페이스', oneLiner: '팀 노션 워크스페이스', summary: '팀 문서 + 프로젝트 관리 메인 페이지.', tags: ['notion', 'work', 'team'], folderId: 'g-work', createdAt: now - day * 5 }),
    mk({ url: 'https://slack.com/app', domain: 'slack.com', title: 'Slack 워크스페이스', oneLiner: '슬랙 채널 정리', summary: '주요 채널 + 파트너 채널 모음.', tags: ['slack', 'work'], folderId: 'g-work', todo: '오늘 회의록 정리', reminderAt: now + 3600000 * 3, createdAt: now - day * 4 }),
    mk({ url: 'https://docs.google.com/q3-okr', domain: 'docs.google.com', title: 'Q3 OKR 문서', oneLiner: 'Q3 분기 목표', summary: '이번 분기 핵심 결과 정리.', tags: ['okr', 'planning'], folderId: 'g-work', createdAt: now - day * 2 }),

    // 스터디 (3)
    mk({ url: 'https://react.dev/learn', domain: 'react.dev', title: 'React 공식 가이드', oneLiner: '리액트 빠른 시작', summary: 'React 19 기준 학습 가이드.', tags: ['react', 'frontend', 'docs'], folderId: 'g-study', memo: '이번 주말까지 1~5장 완독', createdAt: now - day * 6 }),
    mk({ url: 'https://www.typescriptlang.org/docs/handbook', domain: 'typescriptlang.org', title: 'TypeScript Handbook', oneLiner: 'TS 공식 핸드북', summary: '타입스크립트 기초~고급.', tags: ['typescript', 'docs'], folderId: 'g-study', createdAt: now - day * 3 }),
    mk({ url: 'https://leetcode.com', domain: 'leetcode.com', title: 'LeetCode', oneLiner: '알고리즘 문제 모음', summary: '코딩 인터뷰 준비.', tags: ['algorithm', 'interview'], folderId: 'g-study', todo: '하루 1문제씩', reminderAt: now + day, createdAt: now - day * 1 }),

    // 음악 (2)
    mk({ url: 'https://www.youtube.com/watch?v=rlZAaIKqpKw', domain: 'youtube.com', title: 'Steve Lacy — Bad Habit', oneLiner: '스티브 레이시 - Bad Habit', summary: '인디 R&B 명곡.', tags: ['music', 'youtube', 'rnb'], folderId: 'g-music', createdAt: now - day * 4 }),
    mk({ url: 'https://music.youtube.com/playlist?list=focus', domain: 'music.youtube.com', title: '집중 작업용 플레이리스트', oneLiner: '평일 작업 BGM', summary: '집중에 좋은 LoFi/인디 모음.', tags: ['music', 'playlist'], folderId: 'g-music', memo: '카페 갈 때 듣기 좋음', createdAt: now - 3600000 * 8 }),

    // 콘텐츠 (3)
    mk({ url: 'https://www.youtube.com/watch?v=design-talk', domain: 'youtube.com', title: '디자이너 인터뷰 영상', oneLiner: '갤러리데일 인터뷰', summary: '국내 디자이너 인터뷰.', tags: ['youtube', 'design'], folderId: 'g-content', createdAt: now - day * 6 }),
    mk({ url: 'https://www.youtube.com/watch?v=spring-style', domain: 'youtube.com', title: '봄 스타일링 가이드', oneLiner: '봄 코디 영상', summary: '계절 스타일링 추천.', tags: ['youtube', 'fashion'], folderId: 'g-content', createdAt: now - day * 3 }),
    mk({ url: 'https://www.instagram.com/p/cafe-interior', domain: 'instagram.com', title: '카페 인테리어 모음', oneLiner: '인스타 카페 인테리어', summary: '예쁜 카페 모음 게시물.', tags: ['instagram', 'interior'], folderId: 'g-content', sourceType: 'qr', createdAt: now - 3600000 * 12 }),

    // 팀 자료 (shared, 2)
    mk({ url: 'https://notion.so/team-wiki', domain: 'notion.so', title: 'Notion 팀 위키', oneLiner: '팀 노션 위키', summary: '온보딩·문서·정책 모음.', tags: ['notion', 'team', 'wiki'], folderId: 'g-team', createdAt: now - day * 7 }),
    mk({ url: 'https://drive.google.com/drive/team-shared', domain: 'drive.google.com', title: '공유 드라이브', oneLiner: '팀 공유 드라이브', summary: '디자인 자산 + 자료 폴더.', tags: ['drive', 'team'], folderId: 'g-team', createdAt: now - day * 5 }),

    // 카페 투어 (shared, 3)
    mk({ url: 'https://map.naver.com/anguk-cafes', domain: 'map.naver.com', title: '안국 카페 모음', oneLiner: '안국역 카페 추천', summary: '주말에 다녀온 카페들.', tags: ['cafe', 'anguk'], folderId: 'g-cafe', createdAt: now - day * 2 }),
    mk({ url: 'https://blog.naver.com/seongsu-cafes', domain: 'blog.naver.com', title: '성수동 카페 리스트', oneLiner: '성수동 카페 순례기', summary: '주말에 가볼 곳들.', tags: ['cafe', 'seongsu'], folderId: 'g-cafe', todo: '이번 주말 한 곳 다녀오기', reminderAt: now + day * 2, createdAt: now - day * 1 }),
    mk({ url: 'https://www.instagram.com/explore/cafe-hotplace', domain: 'instagram.com', title: '인스타 핫플 카페', oneLiner: 'IG 핫플 카페', summary: '요즘 떠오르는 카페 인스타.', tags: ['instagram', 'cafe', 'hotplace'], folderId: 'g-cafe', sourceType: 'qr', createdAt: now - 3600000 * 8 }),
  ];

  saveState();
  $('.app-header').style.display = '';
  $('.tab-bar').style.display = '';
  $('#fab').style.display = '';
  goHome();
  toast('게스트 모드 시작 ✨ 자유롭게 둘러보세요');
}

async function tryRestoreSession() {
  if (!SUPABASE_AVAILABLE) return false;
  try {
    const session = await window.QLink.auth.getSession();
    if (!session) return false;
    const data = await window.QLink.auth.getProfile();
    if (!data) return false;
    state.user = profileToUser(data.user, data.profile);
    await loadCloudData();
    saveState();
    return true;
  } catch (e) {
    console.warn('[QLink] 세션 복원 실패', e);
    return false;
  }
}

async function loadCloudData() {
  if (!window.QLink?.cloud) return;
  try {
    const { folders, links } = await window.QLink.cloud.loadAll();
    // 미분류 폴더 보장
    let defaultFolder = folders.find(f => !f.shared && f.name === '미분류');
    if (!defaultFolder) {
      const id = await window.QLink.cloud.ensureDefaultFolder();
      defaultFolder = { id, name: '미분류', emoji: '📥', shared: false, sharedWith: [], createdAt: Date.now() };
      folders.unshift(defaultFolder);
    }
    // 미분류의 클라우드 UUID는 state.defaultFolderCloudId 에 별도 저장
    // 앱 코드는 'f-default' 라는 로컬 sentinel ID 로 다룸
    state.defaultFolderCloudId = defaultFolder.id;
    defaultFolder.id = 'f-default';
    // 링크들 중 default 폴더에 속한 건 'f-default' 로 매핑
    links.forEach(l => {
      if (l.folderId === state.defaultFolderCloudId) l.folderId = 'f-default';
      if (!l.folderId) l.folderId = 'f-default'; // null도 미분류로
    });
    state.folders = folders;
    state.links = links;
    saveState();
    console.log('[QLink] cloud data loaded —', folders.length, 'folders,', links.length, 'links');
  } catch (err) {
    console.error('[QLink] cloud data load failed', err);
    toast('클라우드 데이터 불러오기 실패: ' + (err.message || ''));
  }
}

function profileToUser(authUser, profile) {
  return {
    id: authUser.id,
    name: profile.display_name,
    email: authUser.email,
    avatar: profile.avatar || '🌸',
    provider: profile.provider || 'email',
    joinedAt: new Date(profile.created_at).getTime(),
  };
}

let pendingEmailVerify = null; // { email }

function showEmailWaitModal(email) {
  pendingEmailVerify = { email };
  $('#email-wait-address').textContent = email;
  $('#email-wait-status').classList.remove('success');
  $('#email-wait-status .email-wait-status-text').textContent = '인증 대기 중...';
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('#email-wait-sheet').classList.add('open');
  $('.sheet-backdrop').classList.add('open');
}

function closeEmailWaitModal() {
  pendingEmailVerify = null;
  $('#email-wait-sheet').classList.remove('open');
  $('.sheet-backdrop').classList.remove('open');
}

async function handleEmailConfirmedSession() {
  if (!pendingEmailVerify) return;
  const email = pendingEmailVerify.email;
  // UI: 성공 표시
  $('#email-wait-status').classList.add('success');
  $('#email-wait-status .email-wait-status-text').textContent = '인증 완료 ✓';
  setTimeout(() => {
    closeEmailWaitModal();
    // 세션은 이미 잡혀있음 — 프로필 설정 단계로 직행
    showLoginStep2({
      provider: 'email',
      email,
      defaultName: email.split('@')[0],
      avatar: '🌸',
    });
  }, 800);
}

// Supabase Auth 상태 변화 리스너 (이메일 인증 자동 감지)
if (window.QLink?.sb) {
  window.QLink.sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user && pendingEmailVerify) {
      handleEmailConfirmedSession();
    }
  });
}

function avatarHtml(content) {
  if (!content) return '🙂';
  if (typeof content === 'string' && content.startsWith('data:')) {
    return `<img src="${content}" alt="" />`;
  }
  return content;
}

// 모듈 스코프 — showLogin에서도 접근 가능
let loginMode = 'signin';
function setLoginMode(mode) {
  loginMode = mode;
  const isSignup = mode === 'signup';
  const pw = $('#login-password');
  if (pw) {
    pw.placeholder = isSignup ? '비밀번호 (6자 이상)' : '비밀번호';
    pw.autocomplete = isSignup ? 'new-password' : 'current-password';
  }
  const pw2 = $('#login-password2-wrap');
  if (pw2) pw2.hidden = !isSignup;
  if (!isSignup) { const pw2i = $('#login-password2'); if (pw2i) pw2i.value = ''; }
  const sub = $('#btn-login-submit'); if (sub) sub.textContent = isSignup ? '회원가입' : '로그인';
  const tt = $('#login-toggle-text'); if (tt) tt.textContent = isSignup ? '이미 계정이 있으신가요?' : '계정이 없으신가요?';
  const tl = $('#login-toggle-link'); if (tl) tl.textContent = isSignup ? '로그인하기 →' : '회원가입하기 →';
}

function showLogin() {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#screen-login').classList.add('active');
  // 헤더·탭바 숨김
  $('.app-header').style.display = 'none';
  $('.tab-bar').style.display = 'none';
  $('#fab').style.display = 'none';
  // 입력 초기화 + 스텝 1로
  $('#login-email').value = '';
  $('#login-password').value = '';
  $('#login-password2').value = '';
  $('#login-nickname').value = '';
  $('#login-step-1').hidden = false;
  $('#login-step-2').hidden = true;
  // 로그인/회원가입 모드 리셋 (지난 상태 흔적 제거)
  setLoginMode('signin');
  pendingLogin = null;
}

function showLoginStep2(login) {
  pendingLogin = login;
  pendingAvatar = login.avatar || '🐿️';
  $('#login-nickname').value = login.defaultName || '';
  $('#login-step-1').hidden = true;
  $('#login-step-2').hidden = false;
  renderAvatarPicker('login-avatar-grid', () => {
    $('#login-avatar-preview').innerHTML = avatarHtml(pendingAvatar);
    renderAvatarPicker('login-avatar-grid');
  });
  $('#login-avatar-preview').innerHTML = avatarHtml(pendingAvatar);
  if (!isMobile()) setTimeout(() => $('#login-nickname').focus({ preventScroll: true }), 100);
}

function renderAvatarPicker(gridId, onChange) {
  const grid = $('#' + gridId);
  if (!grid) return;
  grid.innerHTML = AVATAR_OPTIONS.map(e =>
    `<button type="button" class="emoji-cell${e === pendingAvatar ? ' selected' : ''}" data-e="${e}">${e}</button>`
  ).join('');
  $$('#' + gridId + ' .emoji-cell').forEach(cell => {
    cell.onclick = () => {
      pendingAvatar = cell.dataset.e;
      if (onChange) onChange();
    };
  });
}

function handleAvatarUpload(fileInput, previewId, gridId) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  if (file.size > 1.5 * 1024 * 1024) { toast('1.5MB 이하 이미지만 가능해요'); return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingAvatar = ev.target.result;
    $('#' + previewId).innerHTML = avatarHtml(pendingAvatar);
    renderAvatarPicker(gridId);
  };
  reader.readAsDataURL(file);
}

async function finishLogin() {
  const nickname = $('#login-nickname').value.trim();
  if (!nickname) { toast('닉네임을 입력해주세요'); return; }
  if (!pendingLogin) return;

  if (SUPABASE_AVAILABLE) {
    const btn = $('#btn-login-finish');
    btn.disabled = true; btn.textContent = '저장 중...';
    try {
      await window.QLink.auth.updateProfile({
        display_name: nickname,
        avatar: pendingAvatar,
        provider: pendingLogin.provider,
      });
      await tryRestoreSession();
      pendingLogin = null;
      $('.app-header').style.display = '';
      $('.tab-bar').style.display = '';
      $('#fab').style.display = '';
      goHome();
      toast(`${nickname}님, 환영해요 ✨`);
    } catch (err) {
      toast('프로필 저장 실패 — ' + (err.message || ''));
    } finally {
      btn.disabled = false; btn.textContent = '시작하기';
    }
    return;
  }

  // Supabase 미사용 폴백
  loginAs({
    name: nickname,
    email: pendingLogin.email,
    avatar: pendingAvatar,
    provider: pendingLogin.provider,
  });
  pendingLogin = null;
}

function loginAs(user) {
  state.user = { ...user, joinedAt: user.joinedAt || Date.now() };
  saveState();
  // 헤더·탭바·FAB 복원
  $('.app-header').style.display = '';
  $('.tab-bar').style.display = '';
  $('#fab').style.display = '';
  goHome();
  toast(`${user.name}님, 환영해요 ✨`);
}

function openEditProfile() {
  if (!state.user) return;
  pendingAvatar = state.user.avatar || '🐿️';
  $('#edit-profile-nickname').value = state.user.name;
  $('#edit-profile-preview').innerHTML = avatarHtml(pendingAvatar);
  renderAvatarPicker('edit-profile-avatar-grid', () => {
    $('#edit-profile-preview').innerHTML = avatarHtml(pendingAvatar);
    renderAvatarPicker('edit-profile-avatar-grid');
  });
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('#edit-profile-sheet').classList.add('open');
  $('.sheet-backdrop').classList.add('open');
}

function saveEditProfile() {
  const name = $('#edit-profile-nickname').value.trim();
  if (!name) { toast('닉네임을 입력해주세요'); return; }
  state.user.name = name;
  state.user.avatar = pendingAvatar;
  saveState();
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('.sheet-backdrop').classList.remove('open');
  renderSettings();
  toast('프로필이 수정되었어요 ✨');
}

async function logout() {
  const wasGuest = state.user?.isGuest;
  if (!confirm(wasGuest ? '게스트 모드를 종료할까요?' : '로그아웃하시겠어요?')) return;
  if (SUPABASE_AVAILABLE && !wasGuest) {
    try { await window.QLink.auth.signOut(); }
    catch (e) { console.warn('signOut error', e); }
  }
  // 게스트는 데이터까지 같이 정리
  if (wasGuest) {
    state.user = null;
    state.folders = [{ id: 'f-default', name: '미분류', emoji: '📥', shared: false, createdAt: 0 }];
    state.links = [];
  } else {
    state.user = null;
  }
  saveState();
  showLogin();
}

function userProviderLabel(p, email) {
  const map = {
    email: '이메일 계정',
    google: 'Google 계정',
    kakao: '카카오톡 계정',
  };
  const label = map[p] || (p ? p : '계정');
  return email ? `${label} · ${email}` : label;
}

function openAccountSheet() {
  console.log('[QLink] openAccountSheet — user:', state.user);
  if (!state.user) {
    toast('로그인이 필요합니다');
    return;
  }
  try {
    $('#account-row-nickname-value').textContent = state.user.name || '닉네임 없음';
    $('#account-row-email-value').textContent = state.user.email || '—';
    $('#account-row-provider-value').textContent = userProviderLabel(state.user.provider);
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('#account-sheet').classList.add('open');
    $('.sheet-backdrop').classList.add('open');
  } catch (err) {
    console.error('[QLink] openAccountSheet failed', err);
    toast('오류: ' + err.message);
  }
}

function openEmailChangeSheet() {
  if (!state.user) return;
  if (state.user.isGuest) { toast('게스트 모드에서는 사용할 수 없어요. 회원가입 후 이용해주세요.'); return; }
  $('#current-email-display').value = state.user.email;
  $('#new-email-input').value = '';
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('#email-change-sheet').classList.add('open');
  $('.sheet-backdrop').classList.add('open');
}

async function changeEmail() {
  const newEmail = $('#new-email-input').value.trim();
  if (!/^.+@.+\..+$/.test(newEmail)) { toast('이메일을 확인해주세요'); return; }
  if (newEmail === state.user.email) { toast('현재 이메일과 동일해요'); return; }
  if (!window.QLink?.sb) { toast('Supabase 미설정'); return; }
  const btn = $('#btn-email-change-save');
  btn.disabled = true; btn.textContent = '발송 중...';
  try {
    const { error } = await window.QLink.sb.auth.updateUser({ email: newEmail });
    if (error) {
      toast(/rate|too many/i.test(error.message) ? '잠시 후 다시 시도해주세요' : '변경 실패: ' + error.message);
      return;
    }
    toast(`📨 ${newEmail} 으로 확인 메일 발송`);
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  } finally {
    btn.disabled = false; btn.textContent = '변경 메일 보내기';
  }
}

function openPasswordChangeSheet() {
  if (state.user?.isGuest) { toast('게스트 모드에서는 사용할 수 없어요. 회원가입 후 이용해주세요.'); return; }
  $('#new-password-input').value = '';
  $('#new-password-confirm').value = '';
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('#password-change-sheet').classList.add('open');
  $('.sheet-backdrop').classList.add('open');
}

async function changePassword() {
  const pw1 = $('#new-password-input').value;
  const pw2 = $('#new-password-confirm').value;
  if (pw1.length < 6) { toast('비밀번호는 6자 이상이어야 해요'); return; }
  if (pw1 !== pw2) { toast('비밀번호가 일치하지 않아요'); return; }
  if (!window.QLink?.sb) { toast('Supabase 미설정'); return; }
  const btn = $('#btn-password-change-save');
  btn.disabled = true; btn.textContent = '변경 중...';
  try {
    const { error } = await window.QLink.sb.auth.updateUser({ password: pw1 });
    if (error) {
      toast('변경 실패: ' + error.message);
      return;
    }
    toast('🔐 비밀번호가 변경되었어요');
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  } finally {
    btn.disabled = false; btn.textContent = '비밀번호 변경';
  }
}

async function deleteAccount() {
  if (!state.user) return;
  if (state.user.isGuest) {
    // 게스트는 그냥 로그아웃과 동일
    state.user = null;
    state.folders = [{ id: 'f-default', name: '미분류', emoji: '📥', shared: false, createdAt: 0 }];
    state.links = [];
    saveState();
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
    showLogin();
    setTimeout(() => toast('게스트 데이터가 정리되었어요'), 200);
    return;
  }
  if (!window.QLink?.sb) return;
  // profile 삭제 → cascade 로 folders, links, folder_members 모두 정리됨
  try {
    const { error } = await window.QLink.sb.from('profiles').delete().eq('id', state.user.id);
    if (error) {
      toast('탈퇴 실패: ' + error.message);
      console.error('delete profile failed', error);
      return;
    }
  } catch (err) {
    toast('탈퇴 실패: ' + err.message);
    return;
  }
  // 로그아웃
  try { await window.QLink.sb.auth.signOut(); } catch {}
  // 로컬 상태 클린업
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  state.user = null;
  saveState();
  $$('.sheet').forEach(s => s.classList.remove('open'));
  $('.sheet-backdrop').classList.remove('open');
  showLogin();
  setTimeout(() => toast('탈퇴가 완료되었어요. 안녕히 가세요 👋'), 200);
}

function setHeader(mode, title, backHandler, rightAction) {
  const logo = $('#header-logo');
  const back = $('#header-back');
  const titleEl = $('#header-title');
  const actions = $('#header-actions');
  const defaults = $('#header-default-actions');
  const ctxBtn = $('#btn-header-action');
  if (mode === 'home') {
    logo.hidden = false;
    back.hidden = true;
    titleEl.textContent = '';
    actions.hidden = false;
    defaults.hidden = false;
    ctxBtn.hidden = true;
  } else {
    logo.hidden = true;
    back.hidden = false;
    titleEl.textContent = title || '';
    back.onclick = backHandler || goHome;
    if (rightAction) {
      actions.hidden = false;
      defaults.hidden = true;
      ctxBtn.hidden = false;
      ctxBtn.innerHTML = rightAction.html || '';
      ctxBtn.setAttribute('aria-label', rightAction.label || '');
      ctxBtn.onclick = rightAction.onClick || (() => {});
    } else {
      actions.hidden = true;
    }
  }
}

/* ============ 토스트 ============ */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============ 설정 ============ */
function renderSettings() {
  $('#setting-provider').textContent = providerName(state.settings.aiProvider);
  $('#toggle-notif').classList.toggle('on', state.settings.notifications);
  $('#toggle-theme').classList.toggle('on', state.settings.theme === 'dark');
  $$('#accent-picker .accent-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.accent === (state.settings.accent || 'pink'));
  });
  // 계정 카드
  const card = $('#account-card');
  if (state.user) {
    const providerLabel = ({email:'이메일', google:'GOOGLE', kakao:'KAKAO'})[state.user.provider] || state.user.provider;
    card.innerHTML = `
      <button class="account-avatar account-avatar-btn" id="btn-edit-avatar" aria-label="프로필 편집">
        ${avatarHtml(state.user.avatar)}
        <span class="avatar-edit-icon">✏️</span>
      </button>
      <div class="account-info">
        <div class="account-name">${escapeHtml(state.user.name)}</div>
        <div class="account-email">${escapeHtml(state.user.email)}</div>
        <div class="account-provider">${escapeHtml(providerLabel)} 계정</div>
      </div>
      <button class="btn-logout" id="btn-logout">로그아웃</button>
    `;
    $('#btn-logout').onclick = logout;
    $('#btn-edit-avatar').onclick = openEditProfile;
  } else {
    card.innerHTML = '';
  }
  // 매 settings 렌더마다 row-account 재바인딩 (안전장치)
  const rowAccount = $('#row-account');
  if (rowAccount) {
    rowAccount.onclick = () => {
      console.log('[QLink] 계정관리 row 클릭됨');
      openAccountSheet();
    };
  }
  applyTheme();
}
function providerName(id) {
  return ({
    'gemini-web': '🟦 Gemini (웹 로그인)',
    'chatgpt-web': '🟢 ChatGPT (웹 로그인)',
    'claude-web': '🟧 Claude (웹 로그인)',
    'gemini-api': 'Gemini API',
    'openai-api': 'OpenAI API',
    'anthropic-api': 'Anthropic API',
  })[id] || id;
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme);
  document.documentElement.setAttribute('data-accent', state.settings.accent || 'pink');
}

function openProviderSheet(returnTo = null) {
  // 추가 시트에서 진입 시 → add-sheet 잠시 닫고 provider 띄움
  if (returnTo === 'add') {
    $('#add-sheet').classList.remove('open');
  }
  const sheet = $('#provider-sheet');
  sheet.classList.add('open');
  if (returnTo) sheet.dataset.returnTo = returnTo;
  else delete sheet.dataset.returnTo;
  $('.sheet-backdrop').classList.add('open');
  $$('#provider-sheet .radio-item').forEach(r => {
    r.classList.toggle('selected', r.dataset.id === state.settings.aiProvider);
    r.onclick = () => {
      state.settings.aiProvider = r.dataset.id;
      saveState();
      renderSettings();
      const back = sheet.dataset.returnTo;
      sheet.classList.remove('open');
      delete sheet.dataset.returnTo;
      if (back === 'add') {
        $('#add-sheet').classList.add('open');
        updateAddProviderInfo();
      } else {
        $('.sheet-backdrop').classList.remove('open');
      }
      toast('AI 제공자: ' + providerName(r.dataset.id));
    };
  });
}

/* ============ 초기화 ============ */
/* ============ 시트 드래그-다운 닫기 (모바일 제스처) ============ */
function bindSheetDragToDismiss() {
  $$('.sheet').forEach(sheet => {
    const handle = sheet.querySelector('.sheet-handle');
    if (!handle) return;
    let startY = 0;
    let dragging = false;
    let delta = 0;
    const dragArea = sheet; // 시트 전체에서 위쪽 영역을 드래그 영역으로

    const onStart = (e) => {
      // 시트가 안 열렸으면 무시
      if (!sheet.classList.contains('open')) return;
      // 시트가 스크롤 가능한 위치에 있으면(스크롤 내려간 상태) 드래그 안 함
      if (sheet.scrollTop > 5) return;
      const point = e.touches ? e.touches[0] : e;
      // 핸들 또는 시트 상단 80px 이내에서만 시작 가능
      const rect = sheet.getBoundingClientRect();
      if (point.clientY - rect.top > 80) return;
      startY = point.clientY;
      dragging = true;
      delta = 0;
      sheet.style.transition = 'none';
    };
    const onMove = (e) => {
      if (!dragging) return;
      const point = e.touches ? e.touches[0] : e;
      const d = point.clientY - startY;
      if (d < 0) { delta = 0; sheet.style.transform = ''; return; }
      delta = d;
      sheet.style.transform = `translateY(${d}px)`;
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      if (delta > 100) {
        // 닫기 — backdrop 클릭과 동일한 동작
        sheet.style.transform = '';
        closeSheets();
      } else {
        sheet.style.transform = '';
      }
    };

    dragArea.addEventListener('touchstart', onStart, { passive: true });
    dragArea.addEventListener('touchmove', onMove, { passive: false });
    dragArea.addEventListener('touchend', onEnd);
    dragArea.addEventListener('touchcancel', onEnd);
    // 마우스(데스크톱)
    handle.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  });
}

function registerServiceWorker() {
  // 로컬 개발 시엔 등록하지 않음 (캐시 충돌 방지)
  if (!('serviceWorker' in navigator)) return;
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (isLocal) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

function init() {
  registerServiceWorker();
  // 페이지 로드 시 모든 시트가 닫혀 있도록 보장 (안전장치)
  $$('.sheet').forEach(s => {
    s.classList.remove('open');
    delete s.dataset.returnTo;
  });
  $('.sheet-backdrop').classList.remove('open');

  // 상단 바 / 탭 바인딩
  $('#btn-search-top').onclick = () => {
    closeAllSheets();
    setHeader('home'); setActiveTab('home');
    showScreen('screen-home'); renderHome();
    setTimeout(() => $('#home-search-input')?.focus(), 50);
  };
  $('#btn-settings-top').onclick = () => {
    closeAllSheets();
    setActiveTab('settings'); setHeader('inner', '설정');
    showScreen('screen-settings'); renderSettings();
  };

  $$('.tab-item').forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.dataset.tab;
      // 탭 이동 시 떠있는 시트 자동 닫기
      if (tab !== 'add') closeAllSheets();
      setActiveTab(tab);
      if (tab === 'home') { setHeader('home'); showScreen('screen-home'); renderHome(); }
      if (tab === 'add') openAddSheet();
      if (tab === 'folders') { setHeader('inner', '폴더'); showScreen('screen-folders'); renderFolders(); }
      if (tab === 'todo') { setHeader('inner', '할일'); showScreen('screen-todo'); renderTodo(); }
      if (tab === 'settings') { setHeader('inner', '설정'); showScreen('screen-settings'); renderSettings(); }
    });
  });

  $('#fab').onclick = handleFabClick;
  $('#fab-menu-folder-personal').onclick = () => {
    $('#fab-menu-sheet').classList.remove('open');
    $('.sheet-backdrop').classList.remove('open');
    addFolder(false);
  };
  $('#fab-menu-folder-shared').onclick = () => {
    $('#fab-menu-sheet').classList.remove('open');
    $('.sheet-backdrop').classList.remove('open');
    addFolder(true);
  };
  $('#fab-menu-link').onclick = () => {
    $('#fab-menu-sheet').classList.remove('open');
    openAddSheet();
  };
  $('#fab-menu-cancel').onclick = () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  };
  $('#btn-save-link').onclick = () => saveLinkFromInput('url');
  $('#btn-open-qr').onclick = () => { closeSheets(); startQR(); };
  $('#btn-cancel-add').onclick = () => {
    // 명시적 취소: 모든 시트 닫기
    pendingFolderId = null;
    $$('.sheet').forEach(s => {
      s.classList.remove('open');
      delete s.dataset.returnTo;
    });
    $('.sheet-backdrop').classList.remove('open');
  };
  $('#btn-change-provider').onclick = () => openProviderSheet('add');
  $('#btn-change-folder').onclick = openFolderPicker;
  $('#btn-new-folder-save').onclick = saveNewFolder;
  $('#btn-new-folder-cancel').onclick = () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  };
  $('#btn-edit-folder-save').onclick = saveEditFolder;
  $('#btn-edit-folder-delete').onclick = () => {
    if (!editingFolderId) return;
    const folder = state.folders.find(f => f.id === editingFolderId);
    if (!folder) return;
    // 시트 닫기 후 deleteFolder 호출 (자체 confirm 사용)
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
    deleteFolder(editingFolderId);
    // 폴더 삭제 후 목록으로 복귀
    setActiveTab('folders'); setHeader('inner', '폴더');
    showScreen('screen-folders'); renderFolders();
  };
  $('#btn-edit-folder-cancel').onclick = () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  };
  $('#btn-edit-profile-save').onclick = saveEditProfile;
  $('#btn-edit-profile-cancel').onclick = () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  };
  $('#edit-profile-upload').addEventListener('change', (e) =>
    handleAvatarUpload(e.target, 'edit-profile-preview', 'edit-profile-avatar-grid')
  );
  $('#btn-edit-invite').onclick = () => {
    if (!editingFolderId) return;
    // 편집 시트 닫고 카카오 공유 시트 오픈
    $('#edit-folder-sheet').classList.remove('open');
    openKakaoShare(editingFolderId);
  };
  $('#btn-kakao-send').onclick = () => {
    const folderId = $('#kakao-share-sheet').dataset.folderId;
    const folder = state.folders.find(f => f.id === folderId);
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
    toast(`💌 ${folder?.name || '폴더'} 초대를 카톡으로 보냈어요`);
    simulateInviteAccept(folderId);
  };
  $('#btn-kakao-copy').onclick = async () => {
    const folderId = $('#kakao-share-sheet').dataset.folderId;
    const url = `https://qlink.app/share/${folderId}`;
    try { await navigator.clipboard.writeText(url); }
    catch {}
    toast(`🔗 초대 링크 복사됨`);
    simulateInviteAccept(folderId);
  };
  $('#btn-kakao-cancel').onclick = () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  };
  $('.sheet-backdrop').onclick = closeSheets;
  $('#btn-cancel-qr').onclick = () => { stopQR(); goHome(); };
  $('#btn-mock-qr').onclick = () => {
    stopQR();
    $('#input-url').value = 'https://github.com/anthropics/claude-code';
    openAddSheet();
    toast('Mock QR 인식: github.com/anthropics/claude-code');
  };

  // 홈 검색 디바운스 + Enter 즉시 검색
  let searchTimer;
  $('#home-search-input').addEventListener('input', e => {
    clearTimeout(searchTimer);
    const v = e.target.value;
    searchTimer = setTimeout(() => {
      homeSearchQuery = v.trim();
      renderHome();
    }, 250);
  });
  $('#home-search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(searchTimer);
      homeSearchQuery = e.target.value.trim();
      renderHome();
      e.target.blur();
    }
  });

  // 할일 필터 칩
  $$('#todo-filters .filter-chip').forEach(chip => {
    chip.onclick = () => {
      $$('#todo-filters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderTodo();
    };
  });

  // 뒤로 가기 버튼
  $$('.btn-back').forEach(b => b.onclick = () => goHome());

  // 필터 chips는 renderHome 내부에서 동적으로 렌더 + 바인딩됨

  // 설정
  $('#row-provider').onclick = () => openProviderSheet();
  $$('#accent-picker .accent-swatch').forEach(sw => {
    sw.onclick = () => {
      state.settings.accent = sw.dataset.accent;
      saveState();
      renderSettings();
      toast(`하이라이트: ${({pink:'핑크',blue:'블루',gray:'그레이'})[sw.dataset.accent]}`);
    };
  });
  $('#toggle-notif').onclick = () => {
    state.settings.notifications = !state.settings.notifications;
    saveState(); renderSettings();
    toast(state.settings.notifications ? '알림 켜짐' : '알림 꺼짐');
  };
  $('#toggle-theme').onclick = () => {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    saveState(); renderSettings();
  };
  $('#row-account').onclick = openAccountSheet;
  $('#btn-account-close').onclick = () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  };
  $('#btn-todo-save').onclick = saveTodo;
  $('#btn-todo-delete').onclick = deleteTodo;
  $('#btn-todo-cancel').onclick = () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  };
  $('#btn-memo-save').onclick = saveMemo;
  $('#btn-memo-delete').onclick = deleteMemo;
  $('#btn-memo-cancel').onclick = () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  };
  // 선택 모드 액션 바
  $('#sel-cancel').onclick = exitSelectionMode;
  $('#sel-all').onclick = selectAllVisible;
  $('#sel-share').onclick = shareSelected;
  $('#sel-delete').onclick = deleteSelected;
  $('#account-row-nickname')?.addEventListener('click', () => {
    $('#account-sheet').classList.remove('open');
    openEditProfile();
  });
  $('#account-row-email')?.addEventListener('click', openEmailChangeSheet);
  $('#account-row-password')?.addEventListener('click', openPasswordChangeSheet);
  $('#account-row-logout')?.addEventListener('click', () => {
    $('#account-sheet').classList.remove('open');
    $('.sheet-backdrop').classList.remove('open');
    logout();
  });
  $('#account-row-leave')?.addEventListener('click', async () => {
    if (!confirm('정말 탈퇴하시겠어요?\n\n저장한 모든 링크·폴더가 삭제되고 계정은 비활성화됩니다.')) return;
    const ok = prompt('확인을 위해 "탈퇴" 라고 입력해주세요');
    if (ok?.trim() !== '탈퇴') { toast('탈퇴가 취소되었습니다'); return; }
    await deleteAccount();
  });
  $('#btn-email-change-save')?.addEventListener('click', changeEmail);
  $('#btn-email-change-cancel')?.addEventListener('click', () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  });
  $('#btn-password-change-save')?.addEventListener('click', changePassword);
  $('#btn-password-change-cancel')?.addEventListener('click', () => {
    $$('.sheet').forEach(s => s.classList.remove('open'));
    $('.sheet-backdrop').classList.remove('open');
  });

  // 로그인 모드 토글 (하단 링크)
  $('#login-toggle-link').onclick = () => {
    setLoginMode(loginMode === 'signin' ? 'signup' : 'signin');
  };

  // Enter 키로 로그인/회원가입 제출
  ['login-email', 'login-password', 'login-password2'].forEach(id => {
    $('#' + id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#btn-login-submit').click();
      }
    });
  });

  // 이메일 로그인 / 회원가입
  $('#btn-login-submit').onclick = async () => {
    const email = $('#login-email').value.trim();
    const pw = $('#login-password').value;
    if (!/^.+@.+\..+$/.test(email)) { toast('이메일을 확인해주세요'); return; }
    if (pw.length < 6) { toast('비밀번호는 6자 이상이어야 해요'); return; }
    if (loginMode === 'signup') {
      const pw2 = $('#login-password2').value;
      if (pw !== pw2) { toast('비밀번호가 일치하지 않아요'); return; }
    }
    if (!SUPABASE_AVAILABLE) {
      showLoginStep2({ provider: 'email', email, defaultName: email.split('@')[0], avatar: '🌸' });
      return;
    }
    const btn = $('#btn-login-submit');
    const sb = window.QLink.sb;
    btn.disabled = true; btn.textContent = loginMode === 'signin' ? '로그인 중...' : '가입 중...';
    try {
      if (loginMode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email, password: pw,
          options: {
            emailRedirectTo: window.location.origin + window.location.pathname,
          },
        });
        if (error) {
          const msg = error.message || '';
          if (/already|registered/i.test(msg)) {
            toast('이미 가입된 이메일이에요 — 로그인 탭으로 전환합니다');
            setLoginMode('signin');
          } else if (/rate limit|too many/i.test(msg)) {
            toast('잠시 후 다시 시도해주세요 (메일 발송 한도 초과)');
          } else {
            toast('가입 실패: ' + msg);
          }
          return;
        }
        // 이메일 인증 OFF → 즉시 세션 발급, 프로필 설정 단계
        if (data.session) {
          showLoginStep2({ provider: 'email', email, defaultName: email.split('@')[0], avatar: '🌸' });
          return;
        }
        // 이메일 인증 ON → 메일 발송됨, 대기 모달
        showEmailWaitModal(email);
      } else {
        // 로그인
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) {
          const msg = error.message || '';
          if (/invalid|credentials/i.test(msg)) {
            toast('이메일 또는 비밀번호가 맞지 않아요');
          } else if (/email not confirmed/i.test(msg)) {
            toast('이메일 인증이 필요해요 (Supabase 대시보드에서 메일 확인)');
          } else {
            toast('로그인 실패: ' + msg);
          }
          return;
        }
        const ok = await tryRestoreSession();
        if (!ok || !state.user) {
          toast('프로필 로드에 실패했어요. 잠시 후 다시 시도해주세요.');
          return;
        }
        $('.app-header').style.display = '';
        $('.tab-bar').style.display = '';
        $('#fab').style.display = '';
        goHome();
        toast(`${state.user.name}님, 다시 만나서 반가워요 ✨`);
      }
    } catch (err) {
      toast(err.message || '오류 발생');
    } finally {
      btn.disabled = false;
      btn.textContent = loginMode === 'signin' ? '로그인' : '회원가입';
    }
  };

  // 간편 로그인 (Google / Kakao OAuth)
  async function loginWithOAuth(provider) {
    if (!SUPABASE_AVAILABLE) { toast('Supabase 미설정'); return; }
    try {
      const { error } = await window.QLink.sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) {
        if (/provider.*not enabled|not configured/i.test(error.message)) {
          toast(`${provider === 'google' ? 'Google' : '카카오'} 로그인이 아직 설정 안 됐어요 — Supabase 대시보드에서 활성화 필요`);
        } else {
          toast(error.message);
        }
      }
      // 성공 시 외부 도메인으로 리다이렉트되었다가 돌아옴 (자동)
    } catch (err) {
      toast(err.message);
    }
  }
  // 이메일 인증 대기 모달 버튼들
  $('#btn-email-resend').onclick = async () => {
    if (!pendingEmailVerify) return;
    const btn = $('#btn-email-resend');
    btn.disabled = true; btn.textContent = '발송 중...';
    try {
      const { error } = await window.QLink.sb.auth.resend({
        type: 'signup',
        email: pendingEmailVerify.email,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) {
        toast(/rate limit|too many/i.test(error.message) ? '잠시 후 다시 시도해주세요' : error.message);
      } else {
        toast('인증 메일을 다시 보냈어요 📨');
      }
    } finally {
      btn.disabled = false; btn.textContent = '메일 다시 보내기';
    }
  };
  $('#btn-email-cancel').onclick = () => {
    closeEmailWaitModal();
    // 입력값 그대로 두고 회원가입 모드 유지
  };

  // 간편 로그인 — 현재 비활성, 클릭 시 안내
  const oauthSoonMsg = '해당 기능은 준비중입니다. 이메일로 회원가입/로그인해주시기 바랍니다';
  $('#btn-login-google')?.addEventListener('click', () => toast(oauthSoonMsg));
  $('#btn-login-kakao')?.addEventListener('click', () => toast(oauthSoonMsg));
  // 로그인 화면 — 스텝 2
  $('#btn-login-finish').onclick = finishLogin;
  $('#btn-login-back').onclick = () => {
    $('#login-step-2').hidden = true;
    $('#login-step-1').hidden = false;
    pendingLogin = null;
  };
  $('#login-avatar-upload').addEventListener('change', (e) =>
    handleAvatarUpload(e.target, 'login-avatar-preview', 'login-avatar-grid')
  );
  $('#login-nickname').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finishLogin(); }
  });

  // 비밀번호 input 눈 토글
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.input-eye');
    if (!btn) return;
    const id = btn.dataset.toggle;
    const input = document.getElementById(id);
    if (!input) return;
    const willShow = input.type === 'password';
    input.type = willShow ? 'text' : 'password';
    btn.setAttribute('aria-pressed', willShow ? 'true' : 'false');
  });

  bindSheetDragToDismiss();
  // 모든 시트의 .open 토글을 자동 감지해 body 스크롤 락 동기화
  $$('.sheet').forEach(sheet => {
    new MutationObserver(syncBodyLock)
      .observe(sheet, { attributes: true, attributeFilter: ['class'] });
  });
  applyTheme();
  // 게스트 버튼
  $('#btn-login-guest')?.addEventListener('click', enterGuestMode);

  // 부팅 라우팅: 게스트 → 홈 / 세션 복원 → 홈 / 그 외 → 로그인
  (async () => {
    if (state.user?.isGuest) {
      $('.app-header').style.display = '';
      $('.tab-bar').style.display = '';
      $('#fab').style.display = '';
      goHome();
      renderFolders();
      return;
    }
    const restored = await tryRestoreSession();
    if (restored) {
      goHome();
    } else {
      state.user = null;
      saveState();
      showLogin();
    }
    renderFolders();
  })();
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    init();
    console.log('[QLink] init 완료');
  } catch (err) {
    console.error('[QLink] init 실패!', err);
    alert('초기화 오류: ' + err.message);
  }
});
