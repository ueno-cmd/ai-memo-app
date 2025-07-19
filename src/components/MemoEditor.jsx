import { useState, useEffect, useRef } from 'react'

function MemoEditor({ memo, onClose, onSave, defaultFolder, onUnsavedChange, saveAndMoveFlag, onSaveAndMoveComplete }) {
  const [title, setTitle] = useState(memo?.title || '')
  const [content, setContent] = useState(memo?.content || '')
  const [tags, setTags] = useState(memo?.tags?.join(', ') || '')
  const [selectedFolder, setSelectedFolder] = useState(memo?.folder?.id || defaultFolder?.id || 1)
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const textareaRef = useRef(null)
  
  // 初期値を保存
  const initialValues = {
    title: memo?.title || '',
    content: memo?.content || '',
    tags: memo?.tags?.join(', ') || '',
    folder: memo?.folder?.id || defaultFolder?.id || 1
  }

  // フォルダ一覧を取得
  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFolders(data.folders)
      }
    } catch (err) {
      console.error('Error fetching folders:', err)
      // フォルダ取得に失敗した場合はデフォルト値を使用
      setFolders([
        { id: 1, name: '日常メモ', color: '#3B82F6' },
        { id: 2, name: '学習ノート', color: '#10B981' },
        { id: 3, name: 'アイデア', color: '#F59E0B' },
        { id: 4, name: 'プロジェクト', color: '#EF4444' },
        { id: 5, name: '参考資料', color: '#8B5CF6' }
      ])
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [])

  // 未保存変更を検知
  useEffect(() => {
    const hasChanges = 
      title !== initialValues.title ||
      content !== initialValues.content ||
      tags !== initialValues.tags ||
      selectedFolder !== initialValues.folder
    
    if (onUnsavedChange) {
      onUnsavedChange(hasChanges)
    }
  }, [title, content, tags, selectedFolder, initialValues.title, initialValues.content, initialValues.tags, initialValues.folder])

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('タイトルと内容は必須です')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      const memoData = {
        title: title.trim(),
        content: content.trim(),
        folder_id: selectedFolder,
        tags: tagArray
      }
      
      let response
      if (memo) {
        // 既存メモの更新
        response = await fetch(`/api/memos/${memo.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(memoData)
        })
      } else {
        // 新規メモの作成
        response = await fetch('/api/memos/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(memoData)
        })
      }
      
      if (!response.ok) {
        throw new Error('メモの保存に失敗しました')
      }
      
      const data = await response.json()
      
      // 親コンポーネントに保存完了を通知
      if (onSave) {
        onSave(data.memo)
      }
      
      // 保存して移動の場合は完了を通知
      if (saveAndMoveFlag && onSaveAndMoveComplete) {
        onSaveAndMoveComplete()
      } else {
        onClose()
      }
    } catch (err) {
      setError(err.message)
      console.error('Error saving memo:', err)
      // 保存失敗時は完了を通知
      if (saveAndMoveFlag && onSaveAndMoveComplete) {
        onSaveAndMoveComplete()
      }
    } finally {
      setLoading(false)
    }
  }

  // 保存して移動のフラグを監視
  useEffect(() => {
    if (saveAndMoveFlag) {
      handleSave()
    }
  }, [saveAndMoveFlag])

  const handleDelete = async () => {
    if (!memo) return
    
    if (!confirm('本当にこのメモを削除しますか？')) return
    
    try {
      setLoading(true)
      
      const response = await fetch(`/api/memos/${memo.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('メモの削除に失敗しました')
      }
      
      // 親コンポーネントに削除完了を通知
      if (onSave) {
        onSave(null) // null を渡して削除を示す
      }
      
      onClose()
    } catch (err) {
      setError(err.message)
      console.error('Error deleting memo:', err)
    } finally {
      setLoading(false)
    }
  }

  // 書式設定機能
  const insertText = (before, after = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end)
    setContent(newText)
    
    // カーソル位置を調整
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + before.length + selectedText.length + after.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const insertHeading = (level) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    const lineEnd = content.indexOf('\n', start)
    const currentLine = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd)
    
    // 既存の見出し記号を削除
    const cleanLine = currentLine.replace(/^#+\s*/, '')
    const headingPrefix = '#'.repeat(level) + ' '
    
    const beforeLine = content.substring(0, lineStart)
    const afterLine = content.substring(lineEnd === -1 ? content.length : lineEnd)
    
    const newContent = beforeLine + headingPrefix + cleanLine + afterLine
    setContent(newContent)
    
    setTimeout(() => {
      textarea.focus()
      const newPosition = lineStart + headingPrefix.length + cleanLine.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const insertBulletPoint = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    
    if (lineStart === 0 || content[lineStart - 1] === '\n') {
      // 行の最初の場合
      insertText('• ')
    } else {
      // 行の途中の場合、改行してから箇条書き
      insertText('\n• ')
    }
  }

  const handleIndent = (increase = true) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    // 選択範囲の行を取得
    const beforeSelection = content.substring(0, start)
    const afterSelection = content.substring(end)
    const selectedText = content.substring(start, end)
    
    const lines = selectedText.split('\n')
    const modifiedLines = lines.map(line => {
      if (increase) {
        return '  ' + line // 2スペースでインデント
      } else {
        return line.replace(/^  /, '') // 先頭の2スペースを削除
      }
    })
    
    const newContent = beforeSelection + modifiedLines.join('\n') + afterSelection
    setContent(newContent)
    
    setTimeout(() => {
      textarea.focus()
      const adjustment = increase ? lines.length * 2 : -Math.min(lines.length * 2, selectedText.length)
      textarea.setSelectionRange(start, end + adjustment)
    }, 0)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      handleIndent(!e.shiftKey)
    }
  }

  // マークダウンプレビュー用の簡単な変換
  const renderPreview = (text) => {
    return text
      .replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
        const level = hashes.length
        return `<h${level} style="margin: 0.5em 0; font-weight: bold; font-size: ${2.5-level*0.3}em;">${title}</h${level}>`
      })
      .replace(/^•\s+(.+)$/gm, '<li style="margin-left: 1em;">$1</li>')
      .replace(/^  (.+)$/gm, '<div style="margin-left: 2em;">$1</div>')
      .replace(/\n/g, '<br/>')
  }


  // 戻るボタンの処理（未保存変更チェック付き）
  const handleBack = () => {
    const hasChanges = 
      title !== initialValues.title ||
      content !== initialValues.content ||
      tags !== initialValues.tags ||
      selectedFolder !== initialValues.folder

    if (hasChanges) {
      // 未保存変更がある場合は確認ダイアログを表示
      if (confirm('未保存の変更があります。破棄して戻りますか？')) {
        onClose()
      }
    } else {
      // 変更がない場合はそのまま戻る
      onClose()
    }
  }

  return (
    <div className="memo-editor">
      <div className="editor-header">
        <button className="back-btn" onClick={handleBack}>
          ← 戻る
        </button>
        <div className="editor-actions">
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? '保存中...' : '💾 保存'}
          </button>
          {memo && (
            <button 
              className="delete-btn"
              onClick={handleDelete}
              disabled={loading}
            >
              🗑️削除
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="editor-form">
        <input
          type="text"
          placeholder="メモのタイトル..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="title-input"
          disabled={loading}
        />

        <div className="editor-meta">
          <select 
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="folder-select"
            disabled={loading}
          >
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>
                📁 {folder.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="タグ (カンマ区切り)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="tags-input"
            disabled={loading}
          />
        </div>

        {/* 書式ツールバー */}
        <div className="format-toolbar">
          <button 
            type="button" 
            onClick={() => insertHeading(1)} 
            className="format-btn"
            title="見出し1"
          >
            H1
          </button>
          <button 
            type="button" 
            onClick={() => insertHeading(2)} 
            className="format-btn"
            title="見出し2"
          >
            H2
          </button>
          <button 
            type="button" 
            onClick={() => insertHeading(3)} 
            className="format-btn"
            title="見出し3"
          >
            H3
          </button>
          <button 
            type="button" 
            onClick={insertBulletPoint} 
            className="format-btn"
            title="箇条書き"
          >
            • リスト
          </button>
          <button 
            type="button" 
            onClick={() => handleIndent(true)} 
            className="format-btn"
            title="インデント"
          >
            →
          </button>
          <button 
            type="button" 
            onClick={() => handleIndent(false)} 
            className="format-btn"
            title="インデント解除"
          >
            ←
          </button>
          <button 
            type="button" 
            onClick={() => setIsPreviewMode(!isPreviewMode)} 
            className={`format-btn ${isPreviewMode ? 'active' : ''}`}
            title="プレビュー"
          >
            👁️ プレビュー
          </button>
        </div>

        <div className="content-area">
          {isPreviewMode ? (
            <div 
              className="content-preview"
              dangerouslySetInnerHTML={{ __html: renderPreview(content) }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              placeholder="メモの内容を入力...

使い方：
• Tab / Shift+Tab でインデント調整
• ツールバーで見出しや箇条書きを追加"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="content-textarea"
              disabled={loading}
            />
          )}
        </div>
      </div>

    </div>
  )
}

export default MemoEditor