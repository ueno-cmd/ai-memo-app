// Simple JWT implementation using Web Crypto API
function base64UrlEncode(str) {
  // UTF-8 文字列を Uint8Array に変換してから base64 エンコード
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  str += '='.repeat((4 - str.length % 4) % 4);
  const binary = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  // バイナリ文字列を Uint8Array に変換してから UTF-8 デコード
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

export async function sign(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const headerStr = base64UrlEncode(JSON.stringify(header));
  const payloadStr = base64UrlEncode(JSON.stringify(payload));
  
  const data = `${headerStr}.${payloadStr}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureStr = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${data}.${signatureStr}`;
}

export async function verify(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const [headerStr, payloadStr, signatureStr] = parts;
    const data = `${headerStr}.${payloadStr}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = new Uint8Array(
      Array.from(base64UrlDecode(signatureStr), c => c.charCodeAt(0))
    );
    
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
    
    if (!isValid) return false;
    
    const payload = JSON.parse(base64UrlDecode(payloadStr));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    
    return payload;
  } catch (error) {
    return false;
  }
}

export function decode(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [, payloadStr] = parts;
    return JSON.parse(base64UrlDecode(payloadStr));
  } catch (error) {
    return null;
  }
}