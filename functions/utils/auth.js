import { verify } from './jwt.js';

export async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = await verify(token, env.JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export function createAuthError(message = 'Authentication required') {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}