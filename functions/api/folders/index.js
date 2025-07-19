import { getUserFromRequest, createAuthError } from '../../utils/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    
    const result = await env.DB.prepare(`
      SELECT * FROM folders 
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY created_at ASC
    `).bind(user.userId).all();
    
    const folders = result.results || [];
    
    return new Response(JSON.stringify({ folders }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Get folders error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    const { name, color } = await request.json();
    
    if (!name) {
      return new Response(JSON.stringify({ error: 'Folder name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const existingFolder = await env.DB.prepare('SELECT id FROM folders WHERE name = ? AND user_id = ?')
      .bind(name, user.userId)
      .first();
    
    if (existingFolder) {
      return new Response(JSON.stringify({ error: 'Folder with this name already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const now = new Date().toISOString();
    const folderColor = color || '#3B82F6';
    
    const result = await env.DB.prepare(`
      INSERT INTO folders (name, color, user_id, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(name, folderColor, user.userId, now).run();
    
    if (!result.success) {
      throw new Error('Failed to create folder');
    }
    
    const newFolder = await env.DB.prepare('SELECT * FROM folders WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();
    
    return new Response(JSON.stringify({ folder: newFolder }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Create folder error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}