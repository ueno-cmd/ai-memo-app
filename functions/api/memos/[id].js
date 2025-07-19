import { getUserFromRequest, createAuthError } from '../../utils/auth.js';

export async function onRequestGet(context) {
  const { params, env } = context;
  
  try {
    const user = await getUserFromRequest(context.request, env);
    
    if (!user) {
      return createAuthError();
    }
    const memoId = params.id;
    
    const memo = await env.DB.prepare(`
      SELECT m.*, f.name as folder_name, f.color as folder_color 
      FROM memos m 
      LEFT JOIN folders f ON m.folder_id = f.id 
      WHERE m.id = ? AND m.user_id = ?
    `).bind(memoId, user.userId).first();
    
    if (!memo) {
      return new Response(JSON.stringify({ error: 'Memo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const formattedMemo = {
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
    };
    
    return new Response(JSON.stringify({ memo: formattedMemo }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Get memo error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPut(context) {
  const { params, request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    const memoId = params.id;
    const { title, content, folder_id, tags } = await request.json();
    
    const existingMemo = await env.DB.prepare('SELECT id FROM memos WHERE id = ? AND user_id = ?')
      .bind(memoId, user.userId)
      .first();
    
    if (!existingMemo) {
      return new Response(JSON.stringify({ error: 'Memo not found' }), {
        status: 404,
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
      UPDATE memos 
      SET title = ?, content = ?, folder_id = ?, tags = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(title, content, folder_id || null, tagsString, now, memoId, user.userId).run();
    
    if (!result.success) {
      throw new Error('Failed to update memo');
    }
    
    const updatedMemo = await env.DB.prepare(`
      SELECT m.*, f.name as folder_name, f.color as folder_color 
      FROM memos m 
      LEFT JOIN folders f ON m.folder_id = f.id 
      WHERE m.id = ?
    `).bind(memoId).first();
    
    const memo = {
      id: updatedMemo.id,
      title: updatedMemo.title,
      content: updatedMemo.content,
      folder: updatedMemo.folder_id ? {
        id: updatedMemo.folder_id,
        name: updatedMemo.folder_name,
        color: updatedMemo.folder_color
      } : null,
      tags: updatedMemo.tags ? updatedMemo.tags.split(',').map(tag => tag.trim()) : [],
      created_at: updatedMemo.created_at,
      updated_at: updatedMemo.updated_at
    };
    
    return new Response(JSON.stringify({ memo }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Update memo error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestDelete(context) {
  const { params, env } = context;
  
  try {
    const user = await getUserFromRequest(context.request, env);
    
    if (!user) {
      return createAuthError();
    }
    const memoId = params.id;
    
    const existingMemo = await env.DB.prepare('SELECT id FROM memos WHERE id = ? AND user_id = ?')
      .bind(memoId, user.userId)
      .first();
    
    if (!existingMemo) {
      return new Response(JSON.stringify({ error: 'Memo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await env.DB.prepare('DELETE FROM memos WHERE id = ? AND user_id = ?')
      .bind(memoId, user.userId)
      .run();
    
    if (!result.success) {
      throw new Error('Failed to delete memo');
    }
    
    return new Response(JSON.stringify({ message: 'Memo deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Delete memo error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}