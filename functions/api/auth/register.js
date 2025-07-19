import { sign } from '../../utils/jwt.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { email, password, name } = await request.json();
    
    // Input validation
    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'メールアドレス、パスワード、お名前を入力してください' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Password strength check (minimum 6 characters)
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'パスワードは6文字以上で入力してください' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check for existing user
    const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();
    
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'このメールアドレスは既に登録されています' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Password hashing using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create user
    const result = await env.DB.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    )
      .bind(email, passwordHash, name)
      .run();
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'ユーザー作成に失敗しました。しばらく時間をおいて再度お試しください' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate JWT
    const token = await sign(
      { 
        userId: result.meta.last_row_id, 
        email, 
        name,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      env.JWT_SECRET
    );
    
    return new Response(JSON.stringify({
      token,
      user: {
        id: result.meta.last_row_id,
        email,
        name
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ error: 'サーバーエラーが発生しました。しばらく時間をおいて再度お試しください' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}