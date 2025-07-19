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

// システム統計取得
export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const user = await getUserFromRequest(request, env);
    
    if (!user) {
      return createAuthError();
    }
    
    const adminError = requireAdmin(user);
    if (adminError) return adminError;
    
    // 並列でクエリ実行
    const [
      totalUsers,
      activeUsers,
      totalMemos,
      totalFolders,
      recentLogins,
      adminLogs
    ] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM users').first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM memos').first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM folders WHERE user_id IS NOT NULL').first(),
      env.DB.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE last_login >= datetime('now', '-7 days')
      `).first(),
      env.DB.prepare(`
        SELECT COUNT(*) as count FROM admin_logs 
        WHERE created_at >= datetime('now', '-24 hours')
      `).first()
    ]);
    
    // 日別新規登録数（過去30日）
    const dailyRegistrations = await env.DB.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();
    
    // 日別メモ作成数（過去30日）
    const dailyMemos = await env.DB.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM memos
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();
    
    // 最新の管理者ログ
    const recentAdminLogs = await env.DB.prepare(`
      SELECT al.*, u.email as admin_email, tu.email as target_email
      FROM admin_logs al
      JOIN users u ON al.admin_user_id = u.id
      LEFT JOIN users tu ON al.target_user_id = tu.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `).all();
    
    return new Response(JSON.stringify({
      summary: {
        totalUsers: totalUsers.count,
        activeUsers: activeUsers.count,
        totalMemos: totalMemos.count,
        totalFolders: totalFolders.count,
        recentLogins: recentLogins.count,
        adminActions24h: adminLogs.count
      },
      charts: {
        dailyRegistrations: dailyRegistrations.results,
        dailyMemos: dailyMemos.results
      },
      recentAdminLogs: recentAdminLogs.results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Get admin stats error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}