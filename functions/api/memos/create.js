import { getUserFromRequest, createAuthError } from '../../utils/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    const { title, content, folder_id, tags } = await request.json();
    
    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'Title and content are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (folder_id) {
      const folder = await env.DB.prepare('SELECT id FROM folders WHERE id = ? AND (user_id = ? OR user_id IS NULL)')
        .bind(folder_id, user.userId)
        .first();
      
      if (!folder) {
        return new Response(JSON.stringify({ error: 'Invalid folder' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    const tagsString = Array.isArray(tags) ? tags.join(', ') : (tags || '');
    const now = new Date().toISOString();
    
    const result = await env.DB.prepare(`
      INSERT INTO memos (title, content, folder_id, user_id, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(title, content, folder_id || null, user.userId, tagsString, now, now).run();
    
    if (!result.success) {
      throw new Error('Failed to create memo');
    }
    
    const newMemo = await env.DB.prepare(`
      SELECT m.*, f.name as folder_name, f.color as folder_color 
      FROM memos m 
      LEFT JOIN folders f ON m.folder_id = f.id 
      WHERE m.id = ?
    `).bind(result.meta.last_row_id).first();
    
    const memo = {
      id: newMemo.id,
      title: newMemo.title,
      content: newMemo.content,
      folder: newMemo.folder_id ? {
        id: newMemo.folder_id,
        name: newMemo.folder_name,
        color: newMemo.folder_color
      } : null,
      tags: newMemo.tags ? newMemo.tags.split(',').map(tag => tag.trim()) : [],
      created_at: newMemo.created_at,
      updated_at: newMemo.updated_at
    };
    
    return new Response(JSON.stringify({ memo }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Create memo error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}