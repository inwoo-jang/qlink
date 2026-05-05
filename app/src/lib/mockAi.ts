import type { Folder } from './types';
import { getDomain } from './utils';

const PATTERNS = [
  { match: /youtube\.com|youtu\.be/, oneLiner: '유튜브 영상 (요약)', summary: '동영상 컨텐츠의 핵심 메시지를 정리한 요약입니다.', tags: ['youtube', 'video'] },
  { match: /github\.com/, oneLiner: '깃허브 저장소', summary: '오픈소스 프로젝트 저장소.', tags: ['github', 'opensource', 'dev'] },
  { match: /react\.dev|reactjs\.org/, oneLiner: '리액트 공식 문서', summary: 'React 공식 문서.', tags: ['react', 'frontend', 'docs'] },
  { match: /medium\.com|brunch\.co\.kr|velog\.io/, oneLiner: '블로그 아티클', summary: '블로그 게시물.', tags: ['article', 'blog'] },
  { match: /twitter\.com|x\.com/, oneLiner: 'X 게시물', summary: '소셜 미디어.', tags: ['social', 'x'] },
  { match: /notion\.so|notion\.site/, oneLiner: '노션 페이지', summary: '공유 노션 문서.', tags: ['notion', 'doc'] },
  { match: /figma\.com/, oneLiner: 'Figma 디자인', summary: '디자인 파일.', tags: ['figma', 'design'] },
];

export interface SummarizeResult {
  oneLiner: string;
  summary: string;
  tags: string[];
}

export const mockSummarize = (url: string): SummarizeResult => {
  const domain = getDomain(url);
  const found = PATTERNS.find(p => p.match.test(domain));
  if (found) {
    return {
      oneLiner: found.oneLiner,
      summary: `${found.summary} (출처: ${domain})`,
      tags: [...found.tags, domain.split('.')[0]],
    };
  }
  return {
    oneLiner: `${domain} 페이지`,
    summary: `${domain} 의 페이지 — AI가 본문을 분석해 요약을 생성합니다.`,
    tags: [domain.split('.')[0], 'web'],
  };
};

const CATEGORIES: Record<string, string[]> = {
  'f-tech': ['react', 'github', 'frontend', 'backend', 'dev', 'code', 'tech',
    'typescript', 'javascript', 'opensource', 'docs', 'api', 'sdk', 'figma', 'notion', 'doc', 'web'],
  'f-music': ['music', 'youtube', 'video', 'audio', 'sound', 'gear', 'guitar', 'song', 'album'],
};

export const autoClassifyFolder = (tags: string[], folders: Folder[]): string => {
  if (!tags.length) return 'f-default';
  const lower = tags.map(t => t.toLowerCase());
  // 1. 폴더명 매칭
  for (const f of folders) {
    if (f.id === 'f-default') continue;
    const fname = f.name.toLowerCase();
    if (lower.some(t => fname.includes(t) || t.includes(fname))) return f.id;
  }
  // 2. 시드 카테고리
  for (const [fid, kws] of Object.entries(CATEGORIES)) {
    if (!folders.find(f => f.id === fid)) continue;
    if (lower.some(t => kws.some(k => t.includes(k) || k.includes(t)))) return fid;
  }
  return 'f-default';
};
