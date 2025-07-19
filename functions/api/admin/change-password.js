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

// 管理者による直接パスワード変更
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    
    const adminError = requireAdmin(user);
    if (adminError) return adminError;
    
    const { userId, newPassword } = await request.json();
    
    // バリデーション
    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ error: 'User ID and new password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
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
    
    // パスワードハッシュ化
    const encoder = new TextEncoder();
    const data = encoder.encode(newPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // パスワード更新
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE users 
      SET password_hash = ?, password_changed_at = ?
      WHERE id = ?
    `).bind(passwordHash, now, userId).run();
    
    // 管理者ログ記録
    await env.DB.prepare(`
      INSERT INTO admin_logs (admin_user_id, action, target_user_id, details)
      VALUES (?, ?, ?, ?)
    `).bind(user.userId, 'change_password', userId, 
            `Changed password for ${targetUser.email}`).run();
    
    return new Response(JSON.stringify({
      message: 'Password changed successfully',
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
    console.error('Change password error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}