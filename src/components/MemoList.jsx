import { useState, useEffect } from 'react'

function MemoList({ folder, onMemoSelect, onNewMemo }) {
  const [memos, setMemos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // メモ一覧を取得
  const fetchMemos = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const url = new URL('/api/memos', window.location.origin)
      if (folder) {
        url.searchParams.set('folder_id', folder.id)
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch memos')
      }
      
      const data = await response.json()
      setMemos(data.memos)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching memos:', err)
    } finally {
      setLoading(false)
    }
  }

  // フォルダが変更されたときにメモを再取得
  useEffect(() => {
    fetchMemos()
  }, [folder])

  return (
    <div className="memo-list">
      <div className="memo-list-header">
        <h2>
          {folder ? `📁 ${folder.name}` : '📄 全てのメモ'}
        </h2>
        <button className="new-memo-btn" onClick={onNewMemo}>
          + 新しいメモ
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          エラー: {error}
        </div>
      )}
      
      {loading && (
        <div className="loading">
          メモを読み込み中...
        </div>
      )}
      
      <div className="memo-grid">
        {memos.length === 0 && !loading ? (
          <div className="empty-state">
            <p>メモがありません</p>
            <button className="new-memo-btn" onClick={onNewMemo}>
              最初のメモを作成
            </button>
          </div>
        ) : (
          memos.map(memo => (
            <div 
              key={memo.id}
              className="memo-card"
              onClick={() => onMemoSelect(memo)}
            >
              <h3>{memo.title}</h3>
              <p className="memo-preview">
                {memo.content.length > 100 ? `${memo.content.substring(0, 100)}...` : memo.content}
              </p>
              <div className="memo-meta">
                <div className="memo-tags">
                  {memo.tags.map(tag => (
                    <span key={tag} className="tag">#{tag}</span>
                  ))}
                </div>
                <div className="memo-date">
                  {new Date(memo.updated_at).toLocaleDateString('ja-JP')}
                </div>
              </div>
              {memo.folder && (
                <div className="memo-folder" style={{ color: memo.folder.color }}>
                  📁 {memo.folder.name}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MemoList