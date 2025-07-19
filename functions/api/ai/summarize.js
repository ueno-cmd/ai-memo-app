// AI Memo Summarization endpoint
import { getUserFromRequest, createAuthError } from '../../utils/auth.js';

export async function onRequestPost({ request, env }) {
  try {
    // Authentication check
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return createAuthError();
    }

    const { content } = await request.json()
    
    if (!content || typeof content !== 'string') {
      return Response.json(
        { error: 'メモ内容が必要です' },
        { status: 400 }
      )
    }

    if (content.length < 50) {
      return Response.json(
        { error: 'メモが短すぎます。要約には最低50文字必要です。' },
        { status: 400 }
      )
    }

    // 要約用のプロンプト（日本語強制）
    const systemPrompt = `あなたは優秀な日本語専用要約アシスタントです。

重要な指示:
- 必ず日本語で要約してください
- 英語での回答は絶対に禁止です
- Japanese language only, no English responses allowed

要約の指示:
1. 重要なポイントを3つ以内で箇条書きにする
2. 各ポイントは簡潔で分かりやすく日本語で記述
3. 専門用語は分かりやすく説明する
4. 結論や次のアクションがあれば含める

メモ内容:
${content}

上記のメモを日本語で要約してください：`

    const messages = [
      { role: "user", content: systemPrompt }
    ]

    // Cloudflare Workers AIで要約実行
    const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: messages,
      max_tokens: 256,
      temperature: 0.5
    })

    return Response.json({
      success: true,
      summary: response.response,
      originalLength: content.length,
      model: '@cf/meta/llama-2-7b-chat-int8'
    })

  } catch (error) {
    console.error('AI Summarize error:', error)
    return Response.json(
      { error: '要約処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}