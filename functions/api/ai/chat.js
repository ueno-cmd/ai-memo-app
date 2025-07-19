// AI Chat endpoint using Cloudflare Workers AI
import { getUserFromRequest, createAuthError } from '../../utils/auth.js';

export async function onRequestPost({ request, env }) {
  try {
    // Authentication check
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return createAuthError();
    }

    const { message, memoContent } = await request.json()
    
    if (!message || typeof message !== 'string') {
      return Response.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      )
    }

    // システムプロンプト（日本語強制）
    const systemPrompt = `あなたは日本語専用のメモアシスタントです。

重要な指示:
- 必ず日本語で回答してください
- 英語での回答は絶対に禁止です
- ユーザーのメモに関する質問に、簡潔で有用な回答をしてください
- 回答は丁寧で分かりやすい日本語を使用してください

${memoContent ? `現在のメモ内容:
${memoContent}

上記のメモ内容を参考にして、日本語で回答してください。` : '日本語で回答してください。'}`

    // Messages配列を構築
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ]

    // Cloudflare Workers AIで推論実行
    const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: messages,
      max_tokens: 512,
      temperature: 0.7
    })

    return Response.json({
      success: true,
      response: response.response,
      model: '@cf/meta/llama-2-7b-chat-int8'
    })

  } catch (error) {
    console.error('AI Chat error:', error)
    return Response.json(
      { error: 'AI処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}