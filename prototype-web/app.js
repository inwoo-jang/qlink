/* QLINK 데스크톱 웹 프로토타입 — 정적 목업
   상태는 페이지 로드 시 메모리. localStorage·서버 동기화 없음.
   prototype/와 데이터 모델 호환 (todos[], visibility, completions[]). */

const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const escapeHtml = (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WEEKDAY_LABELS = ['일','월','화','수','목','금','토'];
const ALL_WEEKDAYS = [0,1,2,3,4,5,6];

const now = Date.now();
const day = 86400000;
const hour = 3600000;
const fmtTime = ts => {
  const d = new Date(ts), pad = n => String(n).padStart(2,'0');
  return `${d.getMonth()+1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const todayDateStr = () => {
  const d = new Date(), pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

/* ===== 시드 데이터 ===== */
const state = {
  currentScreen: 'home',
  currentFolderId: null,
  selectedLinkId: null,
  expandedHistory: new Set(),
  user: { name: '지훈', avatar: '🌸' },
  folders: [
    { id: 'f-default', name: '미분류', emoji: '📥', shared: false, system: true },
    { id: 'f-research', name: '리서치', emoji: '📚', shared: false },
    { id: 'f-study', name: '알고리즘 학습', emoji: '⚡', shared: false },
    { id: 'f-cafe', name: '카페 모음', emoji: '☕', shared: false },
    { id: 'f-video', name: '영상', emoji: '🎬', shared: false },
    { id: 'f-family', name: '가족여행', emoji: '👨‍👩‍👧', shared: true, members: [
      { name: '엄마', avatar: '🌷', role: 'owner' },
      { name: '아빠', avatar: '🌳', role: 'member' },
      { name: '누나', avatar: '🌹', role: 'member' },
      { name: '나', avatar: '🌸', role: 'member' },
    ]},
    { id: 'f-friends', name: '친구 스터디', emoji: '👯', shared: true, members: [
      { name: '나', avatar: '🌸', role: 'owner' },
      { name: '민호', avatar: '🌿', role: 'member' },
      { name: '서연', avatar: '🌺', role: 'member' },
      { name: '재현', avatar: '🌻', role: 'member' },
      { name: '지영', avatar: '🌼', role: 'member' },
      { name: '준', avatar: '🌾', role: 'member' },
    ]},
  ],
  links: [
    {
      id: 'l1', url: 'https://www.leetcode.com/problems/two-sum', domain: 'leetcode.com',
      title: 'LeetCode — Two Sum', summary: '코딩 인터뷰 대비 알고리즘 문제 풀이. 매주 토요일 모의면접까지 시뮬레이션.',
      tags: ['algo', 'interview'], folderId: 'f-study', author: null, createdAt: now - day*14,
      memo: null,
      todos: [
        { id: 't1a', title: '평일 21:00 1문제 풀기', notifyMode: 'recurring', weekdays: [1,2,3,4,5], notifyTime: '21:00', endDate: null, completed: false, visibility: 'private',
          completions: [
            { date: todayDateStr().slice(0,8)+ '06', completedAt: now - day*2 },
            { date: todayDateStr().slice(0,8)+ '05', completedAt: now - day*3 },
            { date: todayDateStr().slice(0,8)+ '03', completedAt: now - day*5 },
          ]
        },
        { id: 't1b', title: '주말 모의면접 1회', notifyMode: 'recurring', weekdays: [0,6], notifyTime: '10:00', endDate: null, completed: false, visibility: 'private', completions: [] },
        { id: 't1c', title: '오답 노트 정리', notifyMode: 'once', notifyAt: now + day*7, completed: false, visibility: 'private', completions: [] },
      ]
    },
    {
      id: 'l2', url: 'https://saramin.co.kr/zf_user/jobs/relay/view?rec_idx=12345', domain: 'saramin.co.kr',
      title: '데이터 마케팅 인턴 — 5/14 마감', summary: '주 4일, 강남, 마케팅 데이터 분석 인턴. 마감일: 2026-05-14',
      tags: ['채용', '인턴', '마케팅'], folderId: 'f-research', author: null, createdAt: now - day*1,
      todos: [
        { id: 't2a', title: '자기소개서 초안 작성', notifyMode: 'once', notifyAt: now - hour*8, completed: false, visibility: 'private', completions: [] },
        { id: 't2b', title: '포트폴리오 PDF 첨부', notifyMode: 'once', notifyAt: now + day*2 + hour*9, completed: false, visibility: 'private', completions: [] },
        { id: 't2c', title: '지원 완료', notifyMode: 'once', notifyAt: now + day*3 + hour*22, completed: false, visibility: 'private', completions: [] },
      ]
    },
    {
      id: 'l3', url: 'https://notion.so/q3-marketing-strategy', domain: 'notion.so',
      title: 'Q3 마케팅 전략 — KPI·예산·실행 일정', summary: 'Q3 마케팅 캠페인 전략 문서. 6월 첫 주 회의 준비용.',
      tags: ['marketing', 'team'], folderId: 'f-research', author: null, createdAt: now - day*0.5,
      todos: [
        { id: 't3a', title: '수요일 9시 회의 전 1차 검토', notifyMode: 'once', notifyAt: now + day*2 + hour*0, completed: false, visibility: 'private', completions: [] },
        { id: 't3b', title: '요약 메모 작성', notifyMode: 'once', notifyAt: now + day*3 + hour*9, completed: false, visibility: 'private', completions: [] },
        { id: 't3c', title: '다음 회의 의견 정리', notifyMode: 'once', notifyAt: now + day*4 + hour*5, completed: false, visibility: 'private', completions: [] },
      ]
    },
    {
      id: 'l4', url: 'https://www.inflearn.com/course/algorithm-master', domain: 'inflearn.com',
      title: '정보처리기사 알고리즘 마스터', summary: '35편 강의. 시험 2개월 전부터 매일 한 편씩 진도.',
      tags: ['cert', 'algo'], folderId: 'f-study', author: null, createdAt: now - day*4,
      todos: [
        { id: 't4a', title: '오늘 1편 듣기', notifyMode: 'recurring', weekdays: [1,2,3,4,5], notifyTime: '20:00', endDate: '2026-07-15', completed: false, visibility: 'private',
          completions: [
            { date: todayDateStr().slice(0,8)+ '07', completedAt: now - day*1 },
            { date: todayDateStr().slice(0,8)+ '06', completedAt: now - day*2 },
          ]},
      ]
    },
    {
      id: 'l5', url: 'https://velog.io/@some-dev/react-19-deep-dive', domain: 'velog.io',
      title: 'React 19 변경점 한눈에 보기', summary: 'React 19의 컴파일러·use·Actions·Server Components 변경점 정리.',
      tags: ['react', 'frontend'], folderId: 'f-research', author: null, createdAt: now - day*3, todos: []
    },
    {
      id: 'l6', url: 'https://blog.naver.com/cafe-list/seongsu', domain: 'blog.naver.com',
      title: '성수동 카페 순례기', summary: '주말에 가볼 만한 성수동 카페 10곳.',
      tags: ['cafe', 'seongsu'], folderId: 'f-cafe', author: null, createdAt: now - day*5,
      todos: [
        { id: 't6a', title: '이번 주말 한 곳 다녀오기', notifyMode: 'once', notifyAt: now + day*3, completed: false, visibility: 'private', completions: [] }
      ]
    },
    {
      id: 'l7', url: 'https://www.youtube.com/watch?v=react-tutorial', domain: 'youtube.com',
      title: '리액트 19 30분 정리', summary: '리액트 19 핵심만 30분으로 정리한 영상.',
      tags: ['react', 'video'], folderId: 'f-video', author: null, createdAt: now - day*2, todos: []
    },
    {
      id: 'l8', url: 'https://airbnb.com/rooms/jeju-villa', domain: 'airbnb.com',
      title: '제주 함덕 풀빌라 - 6/14 체크인', summary: '가족 4인 2박. 6/14 ~ 6/16. 함덕 해변 도보 3분.',
      tags: ['airbnb', 'jeju'], folderId: 'f-family', author: { name: '엄마', avatar: '🌷' }, createdAt: now - day*7,
      todos: [
        { id: 't8a', title: '체크인 D-1 짐 싸기', notifyMode: 'once', notifyAt: now + day*5 + hour*20, completed: false, visibility: 'public', acceptances: ['나', '아빠', '누나'], completions: [] },
        { id: 't8b', title: '예약 영수증 인쇄', notifyMode: 'once', notifyAt: now + day*4, completed: false, visibility: 'public', acceptances: ['나'], completions: [] },
      ]
    },
    {
      id: 'l9', url: 'https://map.kakao.com/jeju-restaurants', domain: 'map.kakao.com',
      title: '제주 맛집 리스트', summary: '함덕·애월·서귀포 맛집 모음.',
      tags: ['food', 'jeju'], folderId: 'f-family', author: { name: '누나', avatar: '🌹' }, createdAt: now - day*3,
      todos: [
        { id: 't9a', title: '갈치조림 집 예약 (당일 12시)', notifyMode: 'once', notifyAt: now + day*6 + hour*4, completed: false, visibility: 'public', acceptances: [], completions: [] },
      ]
    },
    {
      id: 'l10', url: 'https://www.wanted.co.kr/wd/123456', domain: 'wanted.co.kr',
      title: '마케팅 인턴 - 면접 D-3', summary: '5/14 면접 예정. 자기소개·포트폴리오 준비.',
      tags: ['채용', '면접'], folderId: 'f-research', author: null, createdAt: now - day*8,
      todos: [
        { id: 't10a', title: '면접 D-day 매일 9시 복습', notifyMode: 'recurring', weekdays: [0,1,2,3,4,5,6], notifyTime: '09:00', endDate: '2026-05-14', completed: false, visibility: 'private',
          completions: [
            { date: todayDateStr().slice(0,8)+ '08', completedAt: now - day*1 },
            { date: todayDateStr().slice(0,8)+ '07', completedAt: now - day*2 },
          ]},
      ]
    },
    {
      id: 'l11', url: 'https://github.com/sample/sqld-questions', domain: 'github.com',
      title: 'SQLD 기출 모음', summary: '2020~2025 SQLD 기출 정리 레포.',
      tags: ['sqld', 'cert'], folderId: 'f-study', author: null, createdAt: now - day*6,
      todos: [
        { id: 't11a', title: '주말마다 50문제 풀기', notifyMode: 'recurring', weekdays: [0,6], notifyTime: '14:00', endDate: null, completed: false, visibility: 'private', completions: [] },
      ]
    },
    {
      id: 'l12', url: 'https://twitter.com/some-user/status/123', domain: 'twitter.com',
      title: '디자인 시스템 모범 사례 스레드', summary: '디자인 토큰·컴포넌트 구조 트윗 모음.',
      tags: ['design', 'system'], folderId: 'f-research', author: null, createdAt: now - day*1.5, todos: []
    },
    {
      id: 'l13', url: 'https://figma.com/community/file/123', domain: 'figma.com',
      title: 'iOS 18 디자인 가이드', summary: 'Apple HIG 정리 + 컴포넌트 라이브러리.',
      tags: ['design', 'ios'], folderId: 'f-default', author: null, createdAt: now - hour*3, todos: []
    },
    {
      id: 'l14', url: 'https://news.hada.io/topic?id=23872', domain: 'news.hada.io',
      title: '북마크 큐레이션 서비스 비교', summary: 'Raindrop, Stashby, mymind 비교 분석 글.',
      tags: ['research', 'competitor'], folderId: 'f-friends', author: { name: '민호', avatar: '🌿' }, createdAt: now - day*0.3,
      todos: [
        { id: 't14a', title: '주말까지 다 읽기', notifyMode: 'once', notifyAt: now + day*3, completed: false, visibility: 'public', acceptances: [], completions: [] },
      ]
    },
  ],
};

/* ===== 헬퍼 ===== */
function getFolder(id) { return state.folders.find(f => f.id === id); }
function getLink(id) { return state.links.find(l => l.id === id); }
function isOccCompleted(todo, date) { return (todo.completions||[]).some(c => c.date === date); }
function isTodoActiveCompleted(todo) {
  if (todo.notifyMode === 'recurring') return isOccCompleted(todo, todayDateStr());
  return !!todo.completed;
}
function isTodoOverdue(todo) {
  if (todo.completed) return false;
  if (todo.notifyMode === 'once') return todo.notifyAt && todo.notifyAt < now;
  if (todo.notifyMode === 'recurring') {
    const todayWd = new Date().getDay();
    if (!(todo.weekdays||[]).includes(todayWd)) return false;
    if (isOccCompleted(todo, todayDateStr())) return false;
    const [h,m] = (todo.notifyTime||'09:00').split(':').map(Number);
    const targetTs = new Date(); targetTs.setHours(h, m, 0, 0);
    return targetTs.getTime() < now;
  }
  return false;
}
function fmtRecurringPreview(weekdays, time) {
  if (!weekdays || !weekdays.length) return '요일 미정';
  const set = new Set(weekdays);
  let label;
  if (set.size === 7) label = '매일';
  else if (set.size === 5 && [1,2,3,4,5].every(d => set.has(d))) label = '평일';
  else if (set.size === 2 && set.has(0) && set.has(6)) label = '주말';
  else label = [1,2,3,4,5,6,0].filter(d => set.has(d)).map(d => WEEKDAY_LABELS[d]).join('·');
  return `${label} ${time}`;
}
function fmtTodoBadge(todo) {
  if (todo.notifyMode === 'none') return '';
  if (todo.notifyMode === 'once') return todo.notifyAt ? '⏰ ' + fmtTime(todo.notifyAt) : '';
  if (todo.notifyMode === 'recurring') return '🔁 ' + fmtRecurringPreview(todo.weekdays, todo.notifyTime);
  return '';
}
function faviconFor(url) {
  try { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=128`; }
  catch { return ''; }
}

/* ===== 사이드바 렌더 ===== */
function renderSidebar() {
  const myFolders = state.folders.filter(f => !f.shared);
  const sharedFolders = state.folders.filter(f => f.shared);
  $('#count-myfolders').textContent = myFolders.length;
  $('#count-sharedfolders').textContent = sharedFolders.length;

  $('#my-folders').innerHTML = myFolders.map(f => folderItemHtml(f)).join('');
  $('#shared-folders').innerHTML = sharedFolders.map(f => folderItemHtml(f)).join('');

  const totalLinks = state.links.length;
  const totalTodos = state.links.reduce((sum, l) => sum + (l.todos||[]).filter(t => !isTodoActiveCompleted(t)).length, 0);
  $('#count-home').textContent = totalLinks;
  $('#count-todos').textContent = totalTodos;

  // 현재 화면 sb 활성
  $$('.sb-item').forEach(b => b.classList.remove('active'));
  if (state.currentScreen === 'home') $('.sb-item[data-screen="home"]').classList.add('active');
  if (state.currentScreen === 'todos') $('.sb-item[data-screen="todos"]').classList.add('active');
  if (state.currentScreen === 'folder' && state.currentFolderId) {
    const el = $$(`.sb-item[data-folder-id="${state.currentFolderId}"]`)[0];
    if (el) el.classList.add('active');
  }

  bindSidebarEvents();
}

function folderItemHtml(f) {
  const count = state.links.filter(l => l.folderId === f.id).length;
  const memberInfo = f.shared && f.members ? `<span class="sb-shared-meta"><strong>${f.members.length}명</strong>·${count}</span>` : `<span class="count">${count}</span>`;
  return `<button class="sb-item" data-folder-id="${f.id}">
    <span class="icon">${f.emoji}</span>
    <span class="label">${escapeHtml(f.name)}</span>
    ${memberInfo}
  </button>`;
}

function bindSidebarEvents() {
  $$('.sb-item[data-screen]').forEach(b => {
    b.onclick = () => { state.currentScreen = b.dataset.screen; state.currentFolderId = null; renderAll(); };
  });
  $$('.sb-item[data-folder-id]').forEach(b => {
    b.onclick = () => {
      state.currentScreen = 'folder'; state.currentFolderId = b.dataset.folderId;
      renderAll();
    };
  });
}

/* ===== 카드 ===== */
function cardHtml(link) {
  const folder = getFolder(link.folderId);
  const todos = link.todos || [];
  const visibleTodos = todos.slice(0, 2);
  const morecount = todos.length - visibleTodos.length;
  const isFolderShared = folder?.shared;

  const tags = link.tags.slice(0, 3).map(t => `<span class="tag">#${t}</span>`).join('');
  const folderTag = folder ? `<span class="tag folder-tag">${folder.emoji} ${folder.name}</span>` : '';

  const todoLines = visibleTodos.map(t => {
    const isDone = isTodoActiveCompleted(t);
    const isOver = isTodoOverdue(t);
    const badge = fmtTodoBadge(t);
    return `<div class="card-todo-line ${isDone ? 'is-done' : ''}">
      <span class="check">${isDone ? '✓' : ''}</span>
      <span class="text">${escapeHtml(t.title)}</span>
      ${badge ? `<span class="card-todo-badge ${isOver && !isDone ? 'overdue' : ''}">${badge}</span>` : ''}
    </div>`;
  }).join('');

  const authorAvatar = link.author ? `<span class="author-avatar" title="${link.author.name}">${link.author.avatar}</span>` : '';
  const visBadge = isFolderShared && todos.some(t => t.visibility === 'public')
    ? `<span class="card-vis-badge public">👥 공유 할일</span>`
    : isFolderShared && todos.length > 0
      ? `<span class="card-vis-badge">🔒 나만</span>`
      : '';

  return `<article class="card ${state.selectedLinkId === link.id ? 'active' : ''}" data-id="${link.id}">
    ${visBadge}
    <div class="card-actions">
      <button class="card-act" title="원본 열기" data-act="open">↗</button>
      <button class="card-act" title="폴더 이동" data-act="move">📁</button>
      <button class="card-act" title="삭제" data-act="delete">🗑</button>
    </div>
    <div class="card-header">
      <div class="card-favicon"><img src="${faviconFor(link.url)}" alt="" style="width:20px;height:20px" onerror="this.style.display='none';this.parentElement.textContent='🔗'"></div>
      <div class="card-meta">
        <div class="card-domain">${escapeHtml(link.domain)}${authorAvatar}</div>
        <div class="card-title">${escapeHtml(link.title)}</div>
      </div>
    </div>
    <div class="card-summary">${escapeHtml(link.summary || '')}</div>
    <div class="card-tags">${tags}${folderTag}</div>
    ${todos.length > 0 ? `<div class="card-todo">${todoLines}${morecount > 0 ? `<div class="card-todo-more">＋${morecount}개 더</div>` : ''}</div>` : ''}
  </article>`;
}

/* ===== 화면 렌더 ===== */
function renderScreen() {
  if (state.currentScreen === 'home') renderHome();
  else if (state.currentScreen === 'todos') renderTodos();
  else if (state.currentScreen === 'folder') renderFolder();
}

function renderHome() {
  const links = [...state.links].sort((a,b) => b.createdAt - a.createdAt);
  $('#content').innerHTML = `
    <div class="page-header">
      <span class="page-emoji">🏠</span>
      <span class="page-title">홈</span>
      <span class="page-meta">${links.length}개 링크</span>
    </div>
    <div class="filter-bar">
      <button class="chip active">전체 <span class="count">${links.length}</span></button>
      <button class="chip">미분류 <span class="count">${state.links.filter(l => l.folderId === 'f-default').length}</span></button>
      <button class="chip">할일 있음 <span class="count">${state.links.filter(l => (l.todos||[]).length > 0).length}</span></button>
      <button class="chip">🔁 반복 알림 <span class="count">${state.links.filter(l => (l.todos||[]).some(t => t.notifyMode === 'recurring')).length}</span></button>
    </div>
    <div class="card-grid">${links.map(cardHtml).join('')}</div>
  `;
  bindCardEvents();
}

function renderFolder() {
  const folder = getFolder(state.currentFolderId);
  if (!folder) return renderHome();
  const links = state.links.filter(l => l.folderId === folder.id).sort((a,b) => b.createdAt - a.createdAt);

  const sharedBar = folder.shared ? `
    <div class="shared-meta-bar">
      <div class="shared-meta-avatars">
        ${folder.members.slice(0,5).map(m => `<span class="shared-meta-avatar" title="${m.name}${m.role === 'owner' ? ' (owner)' : ''}">${m.avatar}</span>`).join('')}
      </div>
      <span class="shared-meta-text"><strong>${folder.members.length}명</strong> 함께 큐레이션</span>
      <div class="shared-meta-actions">
        <button class="btn-sm">멤버 관리</button>
        <button class="btn-sm primary">＋ 초대</button>
      </div>
    </div>` : '';

  const empty = links.length === 0 ? `
    <div class="empty">
      <div class="emoji">${folder.emoji}</div>
      <h3>아직 링크가 없어요</h3>
      <p>＋ 새 링크 버튼이나 시스템 공유로 이 폴더에 저장해보세요.</p>
    </div>` : '';

  $('#content').innerHTML = `
    <div class="page-header">
      <span class="page-emoji">${folder.emoji}</span>
      <span class="page-title">${escapeHtml(folder.name)}</span>
      <span class="page-meta">${links.length}개 링크${folder.shared ? ` · 멤버 ${folder.members.length}명` : ''}</span>
    </div>
    ${sharedBar}
    ${links.length > 0 ? `
      <div class="filter-bar">
        <button class="chip active">전체 <span class="count">${links.length}</span></button>
        ${folder.shared ? `
          <button class="chip">내가 추가 <span class="count">${links.filter(l => !l.author).length}</span></button>
          <button class="chip">👥 공유 할일 <span class="count">${links.filter(l => (l.todos||[]).some(t => t.visibility === 'public')).length}</span></button>
        ` : `<button class="chip">할일 있음 <span class="count">${links.filter(l => (l.todos||[]).length > 0).length}</span></button>`}
      </div>
      <div class="card-grid">${links.map(cardHtml).join('')}</div>
    ` : empty}
  `;
  bindCardEvents();
}

function renderTodos() {
  // 모든 todo 평탄화
  const allTodos = [];
  state.links.forEach(link => (link.todos||[]).forEach(todo => allTodos.push({ link, todo })));
  const groups = {
    overdue: allTodos.filter(({todo}) => isTodoOverdue(todo)),
    upcoming: allTodos.filter(({todo}) => !isTodoOverdue(todo) && !isTodoActiveCompleted(todo)),
    done: allTodos.filter(({todo}) => isTodoActiveCompleted(todo)),
  };
  const sortByTime = (a,b) => (a.todo.notifyAt || Infinity) - (b.todo.notifyAt || Infinity);
  Object.values(groups).forEach(g => g.sort(sortByTime));

  const groupHtml = (title, emoji, items, expand=true) => items.length === 0 ? '' : `
    <div class="todo-section">
      <div class="todo-section-title">${emoji} ${title} <span class="count">${items.length}</span></div>
      ${items.map(({link, todo}) => todoRowHtml(link, todo)).join('')}
    </div>`;

  $('#content').innerHTML = `
    <div class="page-header">
      <span class="page-emoji">✅</span>
      <span class="page-title">할일</span>
      <span class="page-meta">${allTodos.length}개</span>
    </div>
    <div class="filter-bar">
      <button class="chip active">전체 <span class="count">${allTodos.length}</span></button>
      <button class="chip">미완료 <span class="count">${groups.overdue.length + groups.upcoming.length}</span></button>
      <button class="chip">⏰ 알림예정 <span class="count">${groups.upcoming.filter(({todo}) => todo.notifyMode !== 'none').length}</span></button>
      <button class="chip">🔥 기간지남 <span class="count">${groups.overdue.length}</span></button>
      <button class="chip">✓ 완료 <span class="count">${groups.done.length}</span></button>
    </div>
    ${groupHtml('기간지남', '🔥', groups.overdue)}
    ${groupHtml('알림예정', '⏰', groups.upcoming)}
    ${groupHtml('완료', '✓', groups.done)}
  `;
  bindTodoRowEvents();
}

function todoRowHtml(link, todo) {
  const isDone = isTodoActiveCompleted(todo);
  const isOver = isTodoOverdue(todo);
  const badge = fmtTodoBadge(todo);
  const completions = todo.completions || [];
  const expanded = state.expandedHistory.has(todo.id);
  const folder = getFolder(link.folderId);
  const isShared = folder?.shared;

  const historyHtml = (todo.notifyMode === 'recurring' && completions.length > 0) ? `
    <button class="todo-history-toggle" data-history="${todo.id}" data-link-id="${link.id}">
      ✓ 완료한 ${completions.length}회 ${expanded ? '▲' : '▼'}
    </button>
    ${expanded ? `<div class="todo-history-list">
      ${completions.slice().sort((a,b) => b.date.localeCompare(a.date)).map(c => {
        const d = new Date(c.date);
        return `<div class="todo-history-row"><span class="d">${d.getMonth()+1}/${String(d.getDate()).padStart(2,'0')} (${WEEKDAY_LABELS[d.getDay()]})</span><span class="t">${new Date(c.completedAt).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'})}</span></div>`;
      }).join('')}
    </div>` : ''}
  ` : '';

  return `<div class="todo-row ${isOver ? 'overdue' : ''}" data-link-id="${link.id}">
    <div class="todo-row-favicon"><img src="${faviconFor(link.url)}" style="width:14px;height:14px" onerror="this.style.display='none';this.parentElement.textContent='🔗'"></div>
    <div class="todo-row-main">
      <div class="todo-row-title ${isDone ? 'is-done' : ''}">${escapeHtml(todo.title)}${isShared && todo.visibility === 'public' ? '<span class="todo-vis-badge">👥 공유</span>' : ''}</div>
      <div class="todo-row-source">${link.domain} · ${escapeHtml(link.title)}</div>
      ${badge ? `<div class="todo-row-badge ${isOver ? 'overdue' : ''}">${badge}${isOver ? ' (지남)' : ''}</div>` : ''}
      ${historyHtml}
    </div>
    <button class="todo-check ${isDone ? 'checked' : ''}" data-todo-id="${todo.id}" data-link-id="${link.id}" title="완료 체크">${isDone ? '✓' : ''}</button>
  </div>`;
}

/* ===== 카드 이벤트 ===== */
function bindCardEvents() {
  $$('.card').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('.card-act')) return;
      state.selectedLinkId = card.dataset.id;
      renderDetail();
      $$('.card').forEach(c => c.classList.toggle('active', c.dataset.id === card.dataset.id));
    };
  });
}

function bindTodoRowEvents() {
  $$('.todo-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.closest('.todo-check') || e.target.closest('.todo-history-toggle')) return;
      state.selectedLinkId = row.dataset.linkId;
      renderDetail();
    };
  });
  $$('.todo-check').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      toggleTodoComplete(btn.dataset.linkId, btn.dataset.todoId);
    };
  });
  $$('.todo-history-toggle').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.history;
      if (state.expandedHistory.has(id)) state.expandedHistory.delete(id);
      else state.expandedHistory.add(id);
      renderTodos();
    };
  });
}

function toggleTodoComplete(linkId, todoId) {
  const link = getLink(linkId);
  const todo = link.todos.find(t => t.id === todoId);
  if (!todo) return;
  if (todo.notifyMode === 'recurring') {
    const tStr = todayDateStr();
    const idx = todo.completions.findIndex(c => c.date === tStr);
    if (idx >= 0) todo.completions.splice(idx, 1);
    else todo.completions.push({ date: tStr, completedAt: Date.now() });
  } else {
    todo.completed = !todo.completed;
  }
  renderAll();
}

/* ===== 상세 패널 ===== */
function renderDetail() {
  const panel = $('#detail-panel');
  const link = state.selectedLinkId ? getLink(state.selectedLinkId) : null;
  if (!link) {
    panel.hidden = true;
    $('#app').classList.remove('has-panel');
    return;
  }
  panel.hidden = false;
  $('#app').classList.add('has-panel');
  const folder = getFolder(link.folderId);
  const isShared = folder?.shared;

  const todos = link.todos || [];
  const todoHtml = todos.length === 0 ? `<button class="btn-add-todo">＋ 할 일 추가</button>` :
    todos.map(t => {
      const isDone = isTodoActiveCompleted(t);
      const isOver = isTodoOverdue(t);
      const badge = fmtTodoBadge(t);
      const completions = t.completions || [];
      const expanded = state.expandedHistory.has(t.id);
      const visBadge = isShared
        ? (t.visibility === 'public'
            ? `<span class="todo-vis-badge">👥 공유 ${(t.acceptances||[]).length > 0 ? `· ${(t.acceptances||[]).length}명 수락` : ''}</span>`
            : `<span class="todo-vis-badge" style="background:var(--qlink-surface-2);color:var(--qlink-text-muted)">🔒 나만</span>`)
        : '';
      const historyBlock = (t.notifyMode === 'recurring' && completions.length > 0) ? `
        <button class="todo-history-toggle" data-detail-history="${t.id}">
          ✓ 완료한 ${completions.length}회 ${expanded ? '▲' : '▼'}
        </button>
        ${expanded ? `<div class="todo-history-list">
          ${completions.slice().sort((a,b) => b.date.localeCompare(a.date)).map(c => {
            const d = new Date(c.date);
            return `<div class="todo-history-row"><span class="d">${d.getMonth()+1}/${String(d.getDate()).padStart(2,'0')} (${WEEKDAY_LABELS[d.getDay()]})</span><span class="t">${new Date(c.completedAt).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'})}</span></div>`;
          }).join('')}
        </div>` : ''}
      ` : '';
      return `<div class="todo-display ${isDone ? 'is-done' : ''}">
        <div class="todo-check ${isDone ? 'checked' : ''}" data-detail-todo="${t.id}" data-detail-link="${link.id}">${isDone ? '✓' : ''}</div>
        <div class="todo-display-body">
          <div class="todo-display-text">${escapeHtml(t.title)}${visBadge}</div>
          ${badge ? `<div class="todo-display-badge ${isOver ? 'overdue' : ''}">${badge}${isOver ? ' (지남)' : ''}</div>` : ''}
          ${historyBlock}
        </div>
      </div>`;
    }).join('') + `<button class="btn-add-todo" style="margin-top:8px">＋ 할 일 추가 / 수정</button>`;

  panel.innerHTML = `
    <div class="detail-panel-header">
      <div class="detail-panel-header-text">
        <div class="detail-url">${escapeHtml(link.url)}</div>
        <div class="detail-title">${escapeHtml(link.title)}</div>
      </div>
      <button class="icon-btn" id="btn-close-detail">✕</button>
    </div>
    <div class="detail-section">
      <h4>한 줄 요약</h4>
      <div class="detail-summary">${escapeHtml(link.summary || '')}</div>
    </div>
    <div class="detail-section">
      <h4>태그</h4>
      <div class="detail-tags">${link.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>
    </div>
    <div class="detail-section">
      <h4>폴더</h4>
      <div class="detail-tags">${folder ? `<span class="tag folder-tag">${folder.emoji} ${folder.name}</span>` : ''}${isShared ? ' <span class="tag" style="background:rgba(var(--qlink-glow-rgb),0.1);color:var(--qlink-primary)">👥 공유 폴더</span>' : ''}</div>
    </div>
    <div class="detail-section">
      <h4>✅ 할 일 ${todos.length > 0 ? `<span style="color:var(--qlink-text);font-weight:600;font-size:13px">${todos.length}개</span>` : ''}</h4>
      ${todoHtml}
    </div>
    <div class="detail-section">
      <h4>📝 메모</h4>
      ${isShared ? `<div class="memo-privacy-note">🔒 나만 볼 수 있는 내용입니다. 공유자에게는 보이지 않아요.</div>` : ''}
      ${link.memo ? `<div class="memo-display">${escapeHtml(link.memo)}</div>` : `<button class="btn-add-todo">＋ 메모 추가</button>`}
    </div>
    <div class="detail-actions">
      <button class="btn primary"><span>↗</span> 원본 열기</button>
      <button class="btn"><span>📤</span> 공유</button>
      <button class="btn"><span>📁</span> 폴더 이동</button>
      <button class="btn"><span>⏰</span> 알림 설정</button>
      <button class="btn danger full">🗑 링크 삭제</button>
    </div>
  `;
  // 이벤트
  $('#btn-close-detail').onclick = () => {
    state.selectedLinkId = null; renderDetail(); $$('.card').forEach(c => c.classList.remove('active'));
  };
  $$('.todo-display .todo-check').forEach(btn => {
    btn.onclick = () => toggleTodoComplete(btn.dataset.detailLink, btn.dataset.detailTodo);
  });
  $$('[data-detail-history]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.detailHistory;
      if (state.expandedHistory.has(id)) state.expandedHistory.delete(id);
      else state.expandedHistory.add(id);
      renderDetail();
    };
  });
}

/* ===== 검색 모달 ===== */
function openSearchModal() {
  $('#search-modal').hidden = false;
  $('#search-input').value = '';
  $('#search-input').focus();
  renderSearchResults('');
}
function closeSearchModal() { $('#search-modal').hidden = true; }
function renderSearchResults(q) {
  const query = q.trim().toLowerCase();
  if (!query) {
    $('#search-results').innerHTML = `<div class="search-group">
      <div class="search-group-title">최근 검색어</div>
      <div class="search-item"><span>🕐</span><span class="text">알고리즘</span></div>
      <div class="search-item"><span>🕐</span><span class="text">면접</span></div>
      <div class="search-item"><span>🕐</span><span class="text">React</span></div>
    </div>`;
    return;
  }
  const highlight = (text) => escapeHtml(text).replace(new RegExp(query, 'gi'), m => `<mark>${m}</mark>`);
  const linksMatch = state.links.filter(l =>
    l.title.toLowerCase().includes(query) || l.summary.toLowerCase().includes(query)
    || l.tags.some(t => t.toLowerCase().includes(query)));
  const foldersMatch = state.folders.filter(f => f.name.toLowerCase().includes(query));
  const tagsMatch = [...new Set(state.links.flatMap(l => l.tags))].filter(t => t.toLowerCase().includes(query));

  let html = '';
  if (linksMatch.length) html += `<div class="search-group"><div class="search-group-title">📌 링크 (${linksMatch.length})</div>`
    + linksMatch.map(l => `<div class="search-item" data-link-id="${l.id}"><span>◎</span><span class="text">${l.domain} — ${highlight(l.title)}</span></div>`).join('') + `</div>`;
  if (foldersMatch.length) html += `<div class="search-group"><div class="search-group-title">📁 폴더 (${foldersMatch.length})</div>`
    + foldersMatch.map(f => `<div class="search-item" data-folder-id="${f.id}"><span>${f.emoji}</span><span class="text">${highlight(f.name)}</span></div>`).join('') + `</div>`;
  if (tagsMatch.length) html += `<div class="search-group"><div class="search-group-title">🏷 태그 (${tagsMatch.length})</div>`
    + tagsMatch.map(t => `<div class="search-item"><span>🏷</span><span class="text">${highlight('#' + t)}</span></div>`).join('') + `</div>`;
  if (!html) html = `<div class="empty" style="padding:30px 24px"><h3>"${escapeHtml(query)}" 결과가 없어요</h3></div>`;
  $('#search-results').innerHTML = html;

  $$('.search-item[data-link-id]').forEach(el => {
    el.onclick = () => {
      state.selectedLinkId = el.dataset.linkId;
      closeSearchModal();
      renderDetail();
    };
  });
  $$('.search-item[data-folder-id]').forEach(el => {
    el.onclick = () => {
      state.currentScreen = 'folder';
      state.currentFolderId = el.dataset.folderId;
      closeSearchModal();
      renderAll();
    };
  });
}

/* ===== 링크 추가 모달 ===== */
let addModalTodos = [];
function openAddModal() {
  $('#add-modal').hidden = false;
  // 폴더 옵션
  $('#add-folder').innerHTML = state.folders.map(f => `<option value="${f.id}">${f.emoji} ${f.name}${f.shared ? ' (공유)' : ''}</option>`).join('');
  // 기본 todo 1개
  addModalTodos = [createTodoDraft()];
  renderAddTodos();
}
function closeAddModal() { $('#add-modal').hidden = true; }
function createTodoDraft() {
  return { id: 'tm_' + Math.random().toString(36).slice(2), title: '', notifyMode: 'none', notifyAt: null, weekdays: ALL_WEEKDAYS.slice(), notifyTime: '09:00', endDate: null, visibility: 'private' };
}
function renderAddTodos() {
  const folderId = $('#add-folder').value;
  const folder = getFolder(folderId);
  const isShared = folder?.shared;

  $('#add-todos').innerHTML = addModalTodos.map((d, i) => `
    <div class="todo-edit-card" data-idx="${i}">
      <div class="todo-edit-header">
        <span class="todo-num">${i+1}</span>
        <input class="input" placeholder="할 일 제목" value="${escapeHtml(d.title)}" data-field="title" data-idx="${i}" style="flex:1" />
        ${addModalTodos.length > 1 ? `<button class="icon-btn" data-remove="${i}" style="width:28px;height:28px">✕</button>` : ''}
      </div>
      <div class="mode-chips">
        <button class="chip ${d.notifyMode==='none' ? 'active' : ''}" data-mode="none" data-idx="${i}">시간 없음</button>
        <button class="chip ${d.notifyMode==='once' ? 'active' : ''}" data-mode="once" data-idx="${i}">시간 선택</button>
        <button class="chip ${d.notifyMode==='recurring' ? 'active' : ''}" data-mode="recurring" data-idx="${i}">반복 알림</button>
      </div>
      ${d.notifyMode === 'once' ? `
        <input type="datetime-local" class="input" data-once="${i}" />
      ` : ''}
      ${d.notifyMode === 'recurring' ? `
        <div>
          <div style="font-size:11.5px;color:var(--qlink-text-muted);font-weight:600;margin-bottom:6px">반복 요일 (기본 매일, 해제 시 그 요일 제외)</div>
          <div class="weekday-row">
            ${[1,2,3,4,5,6,0].map(wd => `<button class="weekday-chip ${(d.weekdays||[]).includes(wd) ? 'selected' : ''}" data-wd="${wd}" data-idx="${i}">${WEEKDAY_LABELS[wd]}</button>`).join('')}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
            <input type="time" class="input" value="${d.notifyTime}" data-time="${i}" />
            <input type="date" class="input" placeholder="종료일 (선택)" data-end="${i}" />
          </div>
          <div class="recurring-preview" style="margin-top:8px">📌 ${fmtRecurringPreview(d.weekdays, d.notifyTime)}</div>
        </div>
      ` : ''}
      ${isShared ? `
        <div class="visibility-row">
          <div style="font-size:11.5px;color:var(--qlink-text-muted);font-weight:600">공유 폴더 가시성</div>
          <div class="visibility-chips">
            <button class="visibility-chip ${d.visibility==='private' ? 'selected' : ''}" data-vis="private" data-idx="${i}">🔒 나만 보기</button>
            <button class="visibility-chip ${d.visibility==='public' ? 'selected' : ''}" data-vis="public" data-idx="${i}">👥 공유자에게 공유</button>
          </div>
          <div class="visibility-hint">${d.visibility === 'public' ? '👥 공유자에게 보이고, 공유자가 수락해야 본인 알림으로 등록됩니다.' : '🔒 나만 볼 수 있어요.'}</div>
        </div>
      ` : ''}
    </div>
  `).join('');
  bindAddModalEvents();
}
function bindAddModalEvents() {
  $$('#add-todos [data-field="title"]').forEach(el => el.oninput = (e) => { addModalTodos[+e.target.dataset.idx].title = e.target.value; });
  $$('#add-todos [data-mode]').forEach(btn => btn.onclick = () => {
    addModalTodos[+btn.dataset.idx].notifyMode = btn.dataset.mode;
    renderAddTodos();
  });
  $$('#add-todos [data-wd]').forEach(btn => btn.onclick = () => {
    const d = addModalTodos[+btn.dataset.idx];
    const wd = +btn.dataset.wd;
    const set = new Set(d.weekdays || []);
    set.has(wd) ? set.delete(wd) : set.add(wd);
    d.weekdays = [...set].sort();
    renderAddTodos();
  });
  $$('#add-todos [data-time]').forEach(el => el.onchange = (e) => { addModalTodos[+e.target.dataset.time].notifyTime = e.target.value; renderAddTodos(); });
  $$('#add-todos [data-vis]').forEach(btn => btn.onclick = () => { addModalTodos[+btn.dataset.idx].visibility = btn.dataset.vis; renderAddTodos(); });
  $$('#add-todos [data-remove]').forEach(btn => btn.onclick = () => {
    addModalTodos.splice(+btn.dataset.remove, 1);
    if (addModalTodos.length === 0) addModalTodos.push(createTodoDraft());
    renderAddTodos();
  });
}

/* ===== 전역 이벤트 ===== */
function bindGlobalEvents() {
  $('#topbar-search').onclick = openSearchModal;
  $('#btn-search-open').onclick = openSearchModal;
  $('#btn-new-link').onclick = openAddModal;
  $$('[data-close]').forEach(btn => btn.onclick = () => $(`#${btn.dataset.close}`).hidden = true);
  $('#search-input').oninput = (e) => renderSearchResults(e.target.value);
  $('#btn-add-todo-row').onclick = () => { addModalTodos.push(createTodoDraft()); renderAddTodos(); };
  $('#add-folder').onchange = () => renderAddTodos();
  $$('.theme-swatch').forEach(sw => sw.onclick = () => {
    document.documentElement.setAttribute('data-accent', sw.dataset.accent);
    $$('.theme-swatch').forEach(s => s.classList.toggle('selected', s === sw));
  });
  $('#btn-theme-toggle').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    $('#btn-theme-toggle').textContent = next === 'dark' ? '☀️' : '🌙';
  };

  // 단축키
  document.addEventListener('keydown', (e) => {
    const isModalOpen = !$('#search-modal').hidden || !$('#add-modal').hidden;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); openSearchModal(); return;
    }
    if (e.key === 'Escape') {
      if (!$('#search-modal').hidden) closeSearchModal();
      else if (!$('#add-modal').hidden) closeAddModal();
      else if (state.selectedLinkId) { state.selectedLinkId = null; renderDetail(); $$('.card').forEach(c => c.classList.remove('active')); }
      return;
    }
    if (isModalOpen) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key.toLowerCase() === 'n') { e.preventDefault(); openAddModal(); return; }
  });
}

/* ===== 부트 ===== */
function renderAll() { renderSidebar(); renderScreen(); renderDetail(); }
renderAll();
bindGlobalEvents();

// 첫 진입 시 선택된 카드 (시연용)
setTimeout(() => {
  state.selectedLinkId = 'l1';
  renderAll();
}, 100);
