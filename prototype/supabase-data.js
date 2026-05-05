/* QLINK — Supabase 데이터 CRUD + 직렬화 레이어 */
(function () {
  if (!window.QLink?.sb) return;
  const sb = window.QLink.sb;

  function getDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
  }

  // ===== DB row ↔ 앱 객체 변환 =====
  function linkFromDb(row) {
    return {
      id: row.id,
      url: row.url,
      domain: getDomain(row.url),
      title: row.title || getDomain(row.url),
      summary: row.summary,
      oneLiner: row.one_liner,
      tags: row.tags || [],
      thumbnailUrl: row.thumbnail_url || undefined,
      folderId: row.folder_id || null,
      sourceType: row.source_type || 'url',
      reminderAt: row.reminder_at ? new Date(row.reminder_at).getTime() : undefined,
      todo: row.todo || undefined,
      todoDone: !!row.todo_done,
      memo: row.memo || undefined,
      createdAt: new Date(row.created_at).getTime(),
    };
  }

  function linkToDb(link) {
    const out = {
      id: link.id,
      url: link.url,
      title: link.title,
      summary: link.summary ?? null,
      one_liner: link.oneLiner ?? null,
      tags: link.tags || [],
      thumbnail_url: link.thumbnailUrl ?? null,
      folder_id: link.folderId || null,
      source_type: link.sourceType || 'url',
      reminder_at: link.reminderAt ? new Date(link.reminderAt).toISOString() : null,
      todo: link.todo ?? null,
      todo_done: !!link.todoDone,
      memo: link.memo ?? null,
    };
    return out;
  }

  function folderFromDb(row, members = []) {
    return {
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      shared: !!row.shared,
      sharedWith: members.filter(Boolean).map(m => m.display_name).filter(Boolean),
      createdAt: new Date(row.created_at).getTime(),
    };
  }

  function folderToDb(folder) {
    return {
      id: folder.id,
      name: folder.name,
      emoji: folder.emoji,
      shared: !!folder.shared,
    };
  }

  async function getCurrentUserId() {
    const { data: { user } } = await sb.auth.getUser();
    return user?.id;
  }

  // ===== Cloud CRUD =====
  window.QLink.cloud = {
    async loadAll() {
      const userId = await getCurrentUserId();
      if (!userId) return { folders: [], links: [], defaultFolderId: null };

      // 1. 폴더 (소유 + 공유 폴더 멤버십)
      const folderRes = await sb.from('folders').select('*').order('created_at', { ascending: true });
      if (folderRes.error) throw folderRes.error;

      // 2. 공유 폴더 멤버 (RLS가 알아서 같은 폴더 멤버만 노출)
      const sharedIds = folderRes.data.filter(f => f.shared).map(f => f.id);
      const membersByFolder = {};
      if (sharedIds.length > 0) {
        const memRes = await sb.from('folder_members')
          .select('folder_id, profile:profiles!folder_members_user_id_fkey (display_name)')
          .in('folder_id', sharedIds);
        if (!memRes.error && memRes.data) {
          memRes.data.forEach(m => {
            if (!membersByFolder[m.folder_id]) membersByFolder[m.folder_id] = [];
            if (m.profile) membersByFolder[m.folder_id].push(m.profile);
          });
        }
      }

      const folders = folderRes.data.map(row =>
        folderFromDb(row, membersByFolder[row.id] || [])
      );

      // 3. 링크 (RLS: 본인 + 공유 폴더 멤버는 그 폴더 링크 읽기 가능)
      const linkRes = await sb.from('links').select('*').order('created_at', { ascending: false });
      if (linkRes.error) throw linkRes.error;
      const links = linkRes.data.map(linkFromDb);

      return { folders, links };
    },

    async ensureDefaultFolder() {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('not logged in');
      // 미분류 폴더 조회
      const exist = await sb.from('folders')
        .select('id')
        .eq('owner_id', userId)
        .eq('shared', false)
        .eq('name', '미분류')
        .limit(1).maybeSingle();
      if (exist.data) return exist.data.id;
      // 없으면 생성
      const ins = await sb.from('folders').insert({
        owner_id: userId, name: '미분류', emoji: '📥', shared: false,
      }).select('id').single();
      if (ins.error) throw ins.error;
      return ins.data.id;
    },

    async createFolder(folder) {
      const userId = await getCurrentUserId();
      const { data, error } = await sb.from('folders').insert({
        ...folderToDb(folder), owner_id: userId,
      }).select().single();
      if (error) throw error;
      return folderFromDb(data);
    },

    async updateFolder(id, patch) {
      const dbPatch = {};
      if ('name' in patch) dbPatch.name = patch.name;
      if ('emoji' in patch) dbPatch.emoji = patch.emoji;
      if ('shared' in patch) dbPatch.shared = !!patch.shared;
      const { error } = await sb.from('folders').update(dbPatch).eq('id', id);
      if (error) throw error;
    },

    async deleteFolder(id) {
      const { error } = await sb.from('folders').delete().eq('id', id);
      if (error) throw error;
    },

    async createLink(link) {
      const userId = await getCurrentUserId();
      const { data, error } = await sb.from('links').insert({
        ...linkToDb(link), owner_id: userId,
      }).select().single();
      if (error) throw error;
      return linkFromDb(data);
    },

    async updateLink(id, patch) {
      const dbPatch = linkToDb({ id, ...patch });
      delete dbPatch.id;
      // 부분 업데이트: patch에 명시적으로 들어온 필드만 보냄
      const partial = {};
      const keyMap = {
        url: 'url', title: 'title', summary: 'summary', oneLiner: 'one_liner',
        tags: 'tags', thumbnailUrl: 'thumbnail_url', folderId: 'folder_id',
        sourceType: 'source_type', reminderAt: 'reminder_at',
        todo: 'todo', todoDone: 'todo_done', memo: 'memo',
      };
      Object.keys(patch).forEach(k => {
        if (k in keyMap) partial[keyMap[k]] = dbPatch[keyMap[k]];
      });
      if (Object.keys(partial).length === 0) return;
      const { error } = await sb.from('links').update(partial).eq('id', id);
      if (error) throw error;
    },

    async deleteLink(id) {
      const { error } = await sb.from('links').delete().eq('id', id);
      if (error) throw error;
    },

    async deleteLinks(ids) {
      const { error } = await sb.from('links').delete().in('id', ids);
      if (error) throw error;
    },
  };

  console.log('[QLink] cloud data layer ready');
})();
