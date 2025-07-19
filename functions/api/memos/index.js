import { getUserFromRequest, createAuthError } from '../../utils/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    const url = new URL(request.url);
    const folderId = url.searchParams.get('folder_id');
    const tags = url.searchParams.get('tags');
    
    let query = 'SELECT m.*, f.name as folder_name, f.color as folder_color FROM memos m LEFT JOIN folders f ON m.folder_id = f.id WHERE m.user_id = ?';
    const params = [user.userId];
    
    if (folderId) {
      query += ' AND m.folder_id = ?';
      params.push(folderId);
    }
    
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim());
      const tagConditions = tagList.map(() => 'm.tags LIKE ?').join(' OR ');
      query += ` AND (${tagConditions})`;
      tagList.forEach(tag => params.push(`%${tag}%`));
    }
    
    query += ' ORDER BY m.updated_at DESC';
    
    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...params).all();
    
    const memos = result.results.map(memo => ({
      id: memo.id,
      title: memo.title,
      content: memo.content,
      folder: memo.folder_id ? {
        id: memo.folder_id,
        name: memo.folder_name,
        color: memo.folder_color
      } : null,
      tags: memo.tags ? memo.tags.split(',').map(tag => tag.trim()) : [],
      created_at: memo.created_at,
      updated_at: memo.updated_at
    }));
    
    return new Response(JSON.stringify({ memos }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Get memos error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}