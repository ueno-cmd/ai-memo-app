// 認証API専用テストエンドポイント
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    console.log('=== AUTH TEST START ===');
    
    // 1. 基本環境確認
    const hasDB = !!env.DB;
    const hasJWT = !!env.JWT_SECRET;
    console.log('Environment check:', { hasDB, hasJWT });
    
    // 2. リクエストボディ確認
    const body = await request.json();
    console.log('Request body:', body);
    
    // 3. データベース接続テスト
    if (env.DB) {
      const testUser = await env.DB.prepare('SELECT id, email FROM users LIMIT 1').first();
      console.log('Test user query:', testUser);
    }
    
    // 4. JWT SECRET確認（最初の10文字のみ）
    const jwtPreview = env.JWT_SECRET ? env.JWT_SECRET.substring(0, 10) + '...' : 'MISSING';
    console.log('JWT_SECRET preview:', jwtPreview);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Auth test endpoint working',
      checks: {
        hasDB,
        hasJWT,
        jwtPreview,
        requestBody: body
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Auth test error:', error);
    return new Response(JSON.stringify({
      error: 'Auth test failed',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}