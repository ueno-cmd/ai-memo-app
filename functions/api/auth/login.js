import { sign } from '../../utils/jwt.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { email, password } = await request.json();
    
    // Input validation
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'メールアドレスとパスワードを入力してください' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Find user
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
      .bind(email)
      .first();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'メールアドレスまたはパスワードが正しくありません' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify password using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (passwordHash !== user.password_hash) {
      return new Response(JSON.stringify({ error: 'メールアドレスまたはパスワードが正しくありません' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update last login
    await env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?')
      .bind(new Date().toISOString(), user.id)
      .run();

    // Generate JWT
    const token = await sign(
      { 
        userId: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role || 'user',
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      env.JWT_SECRET
    );
    
    return new Response(JSON.stringify({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'サーバーエラーが発生しました。しばらく時間をおいて再度お試しください' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}