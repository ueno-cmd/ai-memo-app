import { verify } from './utils/jwt.js';

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  
  // Public endpoints that don't require authentication
  const publicEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/',
    '/assets/',
    '/vite.svg'
  ];
  
  // Skip authentication for static files and public endpoints
  if (publicEndpoints.some(endpoint => url.pathname.startsWith(endpoint))) {
    return next();
  }
  
  // Check authentication only for API endpoints
  if (url.pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const payload = await verify(token, env.JWT_SECRET);
      
      if (!payload) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Add user information to context
      context.user = payload;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return next();
}