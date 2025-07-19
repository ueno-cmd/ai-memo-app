import { useState } from 'react'

function AISidebar({ currentMemo }) {
  const [aiMessage, setAiMessage] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  // AI機能
  const handleAIChat = async () => {
    if (!aiMessage.trim()) return

    try {
      setAiLoading(true)
      setAiError(null)

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: aiMessage,
          memoContent: currentMemo?.content || ''
        })
      })

      if (!response.ok) {
        throw new Error('AI処理に失敗しました')
      }

      const data = await response.json()
      setAiResponse(data.response)
      setAiMessage('')
    } catch (err) {
      setAiError(err.message)
      console.error('AI Chat error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSummarize = async () => {
    if (!currentMemo?.content?.trim()) {
      setAiError('要約するメモが選択されていません')
      return
    }

    try {
      setAiLoading(true)
      setAiError(null)

      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: currentMemo.content
        })
      })

      if (!response.ok) {
        throw new Error('要約処理に失敗しました')
      }

      const data = await response.json()
      setAiResponse(data.summary)
    } catch (err) {
      setAiError(err.message)
      console.error('AI Summarize error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="ai-sidebar">
      <div className="ai-sidebar-header">
        <h3>🤖 AIアシスタント</h3>
      </div>
      
      <div className="ai-sidebar-content">
        {/* AI操作ボタン */}
        <div className="ai-controls">
          <button 
            className="ai-btn"
            onClick={handleSummarize}
            disabled={aiLoading || !currentMemo?.content}
          >
            📝 要約
          </button>
        </div>

        {/* エラー表示 */}
        {aiError && (
          <div className="ai-error">
            {aiError}
          </div>
        )}

        {/* AI回答表示 */}
        {aiResponse && (
          <div className="ai-response">
            <div className="ai-response-header">AI回答:</div>
            <div className="ai-response-content">
              {aiResponse}
            </div>
          </div>
        )}

        {/* AI入力エリア */}
        <div className="ai-input-area">
          <input
            type="text"
            placeholder={currentMemo ? "AIに質問や依頼を入力..." : "メモを選択してください"}
            value={aiMessage}
            onChange={(e) => setAiMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIChat()}
            className="ai-input"
            disabled={aiLoading || !currentMemo}
          />
          <button
            onClick={handleAIChat}
            disabled={aiLoading || !aiMessage.trim() || !currentMemo}
            className="ai-send-btn"
          >
            {aiLoading ? '処理中...' : '送信'}
          </button>
        </div>

        {/* 現在のメモ情報 */}
        <div className="current-memo-info">
          {currentMemo ? (
            <p>📄 {currentMemo.title}</p>
          ) : (
            <p>メモを選択してAI機能を使用してください</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AISidebar