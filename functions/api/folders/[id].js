import { getUserFromRequest, createAuthError } from '../../utils/auth.js';

export async function onRequestPut(context) {
  const { params, request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    const folderId = params.id;
    const { name, color } = await request.json();
    
    if (!name) {
      return new Response(JSON.stringify({ error: 'Folder name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const existingFolder = await env.DB.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?')
      .bind(folderId, user.userId)
      .first();
    
    if (!existingFolder) {
      return new Response(JSON.stringify({ error: 'Folder not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const duplicateFolder = await env.DB.prepare('SELECT id FROM folders WHERE name = ? AND user_id = ? AND id != ?')
      .bind(name, user.userId, folderId)
      .first();
    
    if (duplicateFolder) {
      return new Response(JSON.stringify({ error: 'Folder with this name already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const folderColor = color || '#3B82F6';
    
    const result = await env.DB.prepare(`
      UPDATE folders 
      SET name = ?, color = ?
      WHERE id = ? AND user_id = ?
    `).bind(name, folderColor, folderId, user.userId).run();
    
    if (!result.success) {
      throw new Error('Failed to update folder');
    }
    
    const updatedFolder = await env.DB.prepare('SELECT * FROM folders WHERE id = ?')
      .bind(folderId)
      .first();
    
    return new Response(JSON.stringify({ folder: updatedFolder }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Update folder error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestDelete(context) {
  const { params, request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    const folderId = params.id;
    
    const existingFolder = await env.DB.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?')
      .bind(folderId, user.userId)
      .first();
    
    if (!existingFolder) {
      return new Response(JSON.stringify({ error: 'Folder not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const memosInFolder = await env.DB.prepare('SELECT COUNT(*) as count FROM memos WHERE folder_id = ?')
      .bind(folderId)
      .first();
    
    if (memosInFolder.count > 0) {
      return new Response(JSON.stringify({ 
        error: `このフォルダには${memosInFolder.count}件のメモがあるため削除できません。先にメモを移動または削除してください。` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await env.DB.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?')
      .bind(folderId, user.userId)
      .run();
    
    if (!result.success) {
      throw new Error('Failed to delete folder');
    }
    
    return new Response(JSON.stringify({ message: 'Folder deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Delete folder error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}