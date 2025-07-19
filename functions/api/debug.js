// デバッグ用エンドポイント
export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      hasDB: !!env.DB,
      hasAI: !!env.AI, 
      hasJWT: !!env.JWT_SECRET,
      dbType: env.DB ? typeof env.DB : 'undefined'
    };

    // D1接続テスト
    if (env.DB) {
      try {
        // 全テーブル一覧
        const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
        debugInfo.dbConnection = 'success';
        debugInfo.allTables = tables.results.map(t => t.name);
        
        // ユーザーテーブル確認
        const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
        debugInfo.userCount = userCount?.count || 0;
        
        // フォルダテーブル確認  
        const folderCount = await env.DB.prepare("SELECT COUNT(*) as count FROM folders").first();
        debugInfo.folderCount = folderCount?.count || 0;
        
      } catch (error) {
        debugInfo.dbConnection = 'failed';
        debugInfo.dbError = error.message;
      }
    }

    return new Response(JSON.stringify(debugInfo, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Debug endpoint failed',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}