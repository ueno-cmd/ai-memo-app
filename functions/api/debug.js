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
        const result = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1").first();
        debugInfo.dbConnection = 'success';
        debugInfo.firstTable = result?.name || 'no tables';
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