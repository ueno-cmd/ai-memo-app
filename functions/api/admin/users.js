import { getUserFromRequest, createAuthError } from '../../utils/auth.js';

// 管理者権限チェック
function requireAdmin(user) {
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null;
}

// ユーザー一覧取得
export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    
    const adminError = requireAdmin(user);
    if (adminError) return adminError;
    
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, email, name, role, is_active, created_at, last_login,
             (SELECT COUNT(*) FROM memos WHERE user_id = users.id) as memo_count
      FROM users
    `;
    let params = [];
    
    if (search) {
      query += ' WHERE email LIKE ? OR name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    // 総ユーザー数取得
    const countQuery = search ? 
      'SELECT COUNT(*) as total FROM users WHERE email LIKE ? OR name LIKE ?' :
      'SELECT COUNT(*) as total FROM users';
    const countParams = search ? [`%${search}%`, `%${search}%`] : [];
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();
    
    // 管理者ログ記録
    await env.DB.prepare(`
      INSERT INTO admin_logs (admin_user_id, action, details)
      VALUES (?, ?, ?)
    `).bind(user.userId, 'view_users', `Page ${page}, Search: ${search || 'none'}`).run();
    
    return new Response(JSON.stringify({
      users: result.results.map(user => ({
        ...user,
        is_active: Boolean(user.is_active)
      })),
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Admin get users error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ユーザー状態更新（有効/無効）
export async function onRequestPut(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    
    const adminError = requireAdmin(user);
    if (adminError) return adminError;
    
    const { userId, isActive } = await request.json();
    
    if (!userId || typeof isActive !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 自分自身を無効化することを防ぐ
    if (userId === user.userId && !isActive) {
      return new Response(JSON.stringify({ error: 'Cannot deactivate yourself' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await env.DB.prepare('UPDATE users SET is_active = ? WHERE id = ?')
      .bind(isActive ? 1 : 0, userId)
      .run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 管理者ログ記録
    await env.DB.prepare(`
      INSERT INTO admin_logs (admin_user_id, action, target_user_id, details)
      VALUES (?, ?, ?, ?)
    `).bind(user.userId, isActive ? 'activate_user' : 'deactivate_user', userId, 
            `User ${isActive ? 'activated' : 'deactivated'}`).run();
    
    return new Response(JSON.stringify({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Admin update user error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ユーザー削除
export async function onRequestDelete(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    
    const adminError = requireAdmin(user);
    if (adminError) return adminError;
    
    const url = new URL(request.url);
    const userId = parseInt(url.searchParams.get('userId'));
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 自分自身を削除することを防ぐ
    if (userId === user.userId) {
      return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // ユーザーの存在確認
    const targetUser = await env.DB.prepare('SELECT email FROM users WHERE id = ?')
      .bind(userId)
      .first();
    
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 外部キー制約を一時的に無効化
    await env.DB.prepare('PRAGMA foreign_keys = OFF').run();
    
    try {
      // 先に管理者ログ記録
      await env.DB.prepare(`
        INSERT INTO admin_logs (admin_user_id, action, target_user_id, details)
        VALUES (?, ?, ?, ?)
      `).bind(user.userId, 'delete_user', userId, `Deleted user and all related data: ${targetUser.email}`).run();
      
      // 関連データを順番に削除
      // 1. AI会話削除
      await env.DB.prepare('DELETE FROM ai_conversations WHERE user_id = ?')
        .bind(userId)
        .run();
      
      // 2. メモ削除
      await env.DB.prepare('DELETE FROM memos WHERE user_id = ?')
        .bind(userId)
        .run();
      
      // 3. ユーザー作成フォルダ削除
      await env.DB.prepare('DELETE FROM folders WHERE user_id = ?')
        .bind(userId)
        .run();
      
      // 4. パスワードリセット記録削除
      await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?')
        .bind(userId)
        .run();
      
      // 5. 管理者ログの target_user_id 参照を削除（NULLに設定）
      await env.DB.prepare('UPDATE admin_logs SET target_user_id = NULL WHERE target_user_id = ?')
        .bind(userId)
        .run();
      
      // 6. このユーザーが管理者として行った操作ログの admin_user_id もNULLに設定
      await env.DB.prepare('UPDATE admin_logs SET admin_user_id = NULL WHERE admin_user_id = ?')
        .bind(userId)
        .run();
      
      // 7. 最後にユーザー削除
      const result = await env.DB.prepare('DELETE FROM users WHERE id = ?')
        .bind(userId)
        .run();
        
    } finally {
      // 外部キー制約を再有効化
      await env.DB.prepare('PRAGMA foreign_keys = ON').run();
    }
    
    return new Response(JSON.stringify({ 
      message: 'User deleted successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Admin delete user error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}