export type AccentColor = 'pink' | 'blue' | 'gray';
export type Theme = 'light' | 'dark';
export type SortMode = 'recent' | 'oldest' | 'alpha';
export type AIProvider =
  | 'gemini-web' | 'chatgpt-web' | 'claude-web'
  | 'gemini-api' | 'openai-api' | 'anthropic-api';

export interface User {
  name: string;
  email: string;
  avatar: string;
  provider: 'email' | 'google' | 'kakao';
  joinedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  emoji: string;
  shared: boolean;
  sharedWith?: string[];
  color?: string;
  createdAt: number;
}

export interface Link {
  id: string;
  url: string;
  domain: string;
  title: string;
  summary: string | null;
  oneLiner: string | null;
  tags: string[];
  folderId: string;
  sourceType: 'url' | 'qr';
  createdAt: number;
  reminderAt?: number;
  pendingAutoFolder?: boolean;
}

export interface Settings {
  aiProvider: AIProvider;
  notifications: boolean;
  theme: Theme;
  accent: AccentColor;
  folderSort: SortMode;
  linkSort: SortMode;
}

export type Screen =
  | 'login' | 'home' | 'folders' | 'folder-detail'
  | 'link-detail' | 'search' | 'qr' | 'settings';
