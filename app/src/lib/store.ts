import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Folder, Link, Settings, Screen, SortMode, AccentColor, Theme } from './types';
import { uid, getDomain } from './utils';
import { mockSummarize, autoClassifyFolder } from './mockAi';

const seedFolders = (): Folder[] => [
  { id: 'f-default', name: '미분류', emoji: '📥', shared: false, createdAt: 0 },
  { id: 'f-tech', name: '기술', emoji: '💻', shared: false, createdAt: Date.now() - 86400000 * 10 },
  { id: 'f-music', name: '음악/영상', emoji: '🎵', shared: false, createdAt: Date.now() - 86400000 * 7 },
  { id: 'f-team', name: '스터디 자료', emoji: '📚', shared: true, sharedWith: ['민지', '서연'], createdAt: Date.now() - 86400000 * 5 },
  { id: 'f-cafe', name: '카페 투어', emoji: '☕', shared: true, sharedWith: ['지수', '하늘', '예준'], createdAt: Date.now() - 86400000 * 2 },
];

const defaultSettings: Settings = {
  aiProvider: 'gemini-web',
  notifications: true,
  theme: 'light',
  accent: 'pink',
  folderSort: 'recent',
  linkSort: 'recent',
};

interface State {
  user: User | null;
  folders: Folder[];
  links: Link[];
  settings: Settings;
  screen: Screen;
  currentFolderId: string | null;
  currentLinkId: string | null;

  // navigation
  goTo: (screen: Screen) => void;
  openFolder: (id: string) => void;
  openLink: (id: string) => void;

  // auth
  login: (u: User) => void;
  logout: () => void;
  updateProfile: (patch: Partial<User>) => void;

  // links
  addLink: (url: string, source?: 'url' | 'qr', folderId?: string | null) => string;
  updateLink: (id: string, patch: Partial<Link>) => void;
  deleteLink: (id: string) => void;

  // folders
  addFolder: (name: string, emoji: string, shared: boolean) => string;
  updateFolder: (id: string, patch: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;

  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  setSort: (target: 'folder' | 'link', mode: SortMode) => void;
  setAccent: (a: AccentColor) => void;
  setTheme: (t: Theme) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      folders: seedFolders(),
      links: [],
      settings: defaultSettings,
      screen: 'home',
      currentFolderId: null,
      currentLinkId: null,

      goTo: (screen) => set({ screen }),
      openFolder: (id) => set({ currentFolderId: id, screen: 'folder-detail' }),
      openLink: (id) => set({ currentLinkId: id, screen: 'link-detail' }),

      login: (user) => set({ user, screen: 'home' }),
      logout: () => set({ user: null, screen: 'login' }),
      updateProfile: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : null })),

      addLink: (url, source = 'url', folderId = null) => {
        const id = uid('l');
        const useAuto = !folderId;
        const link: Link = {
          id, url,
          domain: getDomain(url),
          title: getDomain(url),
          summary: null, oneLiner: null, tags: [],
          folderId: folderId || 'f-default',
          sourceType: source,
          createdAt: Date.now(),
          pendingAutoFolder: useAuto,
        };
        set((s) => ({ links: [link, ...s.links] }));

        // mock 비동기 요약·분류
        setTimeout(() => {
          const r = mockSummarize(url);
          const folders = get().folders;
          set((s) => ({
            links: s.links.map(l =>
              l.id !== id ? l : {
                ...l,
                summary: r.summary,
                oneLiner: r.oneLiner,
                tags: r.tags,
                title: r.oneLiner,
                folderId: l.pendingAutoFolder ? autoClassifyFolder(r.tags, folders) : l.folderId,
                pendingAutoFolder: false,
              }
            ),
          }));
        }, 1400);
        return id;
      },
      updateLink: (id, patch) =>
        set((s) => ({ links: s.links.map(l => l.id === id ? { ...l, ...patch } : l) })),
      deleteLink: (id) =>
        set((s) => ({ links: s.links.filter(l => l.id !== id) })),

      addFolder: (name, emoji, shared) => {
        const id = uid('f');
        const folder: Folder = {
          id, name, emoji, shared, createdAt: Date.now(),
          ...(shared ? { sharedWith: [] } : {}),
        };
        set((s) => ({ folders: [...s.folders, folder] }));
        return id;
      },
      updateFolder: (id, patch) =>
        set((s) => ({ folders: s.folders.map(f => f.id === id ? { ...f, ...patch } : f) })),
      deleteFolder: (id) => {
        if (id === 'f-default') return;
        set((s) => ({
          folders: s.folders.filter(f => f.id !== id),
          links: s.links.map(l => l.folderId === id ? { ...l, folderId: 'f-default' } : l),
        }));
      },

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      setSort: (target, mode) =>
        set((s) => ({
          settings: { ...s.settings, [target === 'folder' ? 'folderSort' : 'linkSort']: mode },
        })),
      setAccent: (accent) =>
        set((s) => ({ settings: { ...s.settings, accent } })),
      setTheme: (theme) =>
        set((s) => ({ settings: { ...s.settings, theme } })),
    }),
    { name: 'qlink-state-v2' },
  ),
);
