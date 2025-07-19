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

// パスワードリセットトークン生成
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    
    const adminError = requireAdmin(user);
    if (adminError) return adminError;
    
    const { userId } = await request.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 対象ユーザーの存在確認
    const targetUser = await env.DB.prepare('SELECT id, email, name FROM users WHERE id = ?')
      .bind(userId)
      .first();
    
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // ランダムトークン生成
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 有効期限（24時間後）
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // 既存の未使用トークンを無効化
    await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0')
      .bind(userId)
      .run();
    
    // 新しいトークンを保存
    await env.DB.prepare(`
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).bind(userId, token, expiresAt).run();
    
    // 管理者ログ記録
    await env.DB.prepare(`
      INSERT INTO admin_logs (admin_user_id, action, target_user_id, details)
      VALUES (?, ?, ?, ?)
    `).bind(user.userId, 'generate_password_reset', userId, 
            `Generated password reset token for ${targetUser.email}`).run();
    
    return new Response(JSON.stringify({
      message: 'Password reset token generated',
      token,
      expiresAt,
      resetUrl: `/reset-password?token=${token}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Generate password reset error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// パスワードリセット履歴取得
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
    const userId = url.searchParams.get('userId');
    
    let query = `
      SELECT pr.*, u.email, u.name
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
    `;
    let params = [];
    
    if (userId) {
      query += ' WHERE pr.user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY pr.created_at DESC LIMIT 100';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify({
      passwordResets: result.results.map(reset => ({
        ...reset,
        used: Boolean(reset.used)
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Get password reset history error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}