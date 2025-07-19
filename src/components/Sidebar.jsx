import { useState, useEffect } from 'react'

function Sidebar({ selectedFolder, onFolderSelect }) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)

  // フォルダ一覧を取得
  const fetchFolders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/folders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch folders')
      }
      
      const data = await response.json()
      setFolders(data.folders)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching folders:', err)
      // エラーの場合はデフォルト値を使用
      setFolders([
        { id: 1, name: '日常メモ', color: '#3B82F6' },
        { id: 2, name: '学習ノート', color: '#10B981' },
        { id: 3, name: 'アイデア', color: '#F59E0B' },
        { id: 4, name: 'プロジェクト', color: '#EF4444' },
        { id: 5, name: '参考資料', color: '#8B5CF6' }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [])

  // フォルダ作成
  const createFolder = async (name, color) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name, color })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create folder')
      }
      
      await fetchFolders()
      setShowFolderModal(false)
    } catch (err) {
      alert(`フォルダ作成エラー: ${err.message}`)
    }
  }

  // フォルダ編集
  const updateFolder = async (id, name, color) => {
    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name, color })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update folder')
      }
      
      await fetchFolders()
      setShowFolderModal(false)
      setEditingFolder(null)
    } catch (err) {
      alert(`フォルダ更新エラー: ${err.message}`)
    }
  }

  // フォルダ削除
  const deleteFolder = async (id) => {
    if (!confirm('このフォルダを削除しますか？フォルダ内にメモがある場合は削除できません。')) {
      return
    }
    
    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete folder')
      }
      
      await fetchFolders()
      setContextMenu(null)
      
      // 削除されたフォルダが選択されていた場合、選択を解除
      if (selectedFolder?.id === id) {
        onFolderSelect(null)
      }
    } catch (err) {
      alert(`フォルダ削除エラー: ${err.message}`)
    }
  }

  // 右クリックメニュー表示
  const handleFolderRightClick = (e, folder) => {
    e.preventDefault()
    e.stopPropagation()
    
    // デフォルトフォルダ（user_id が null）は編集・削除不可
    if (!folder.user_id) {
      return
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      folder
    })
  }

  // コンテキストメニューを閉じる
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // フォルダモーダルを開く
  const openFolderModal = (folder = null) => {
    setEditingFolder(folder)
    setShowFolderModal(true)
    setContextMenu(null)
  }

  // グローバルクリックでコンテキストメニューを閉じる
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null)
    }
    
    if (contextMenu) {
      document.addEventListener('click', handleGlobalClick)
      return () => document.removeEventListener('click', handleGlobalClick)
    }
  }, [contextMenu])

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3>フォルダ</h3>
        <div className="folder-list">
          <div 
            className={`folder-item ${!selectedFolder ? 'active' : ''}`}
            onClick={() => onFolderSelect(null)}
          >
            📄 全てのメモ
          </div>
          {folders.map(folder => (
            <div 
              key={folder.id}
              className={`folder-item ${selectedFolder?.id === folder.id ? 'active' : ''}`}
              onClick={() => onFolderSelect(folder)}
              onContextMenu={(e) => handleFolderRightClick(e, folder)}
              style={{ borderLeft: `4px solid ${folder.color}` }}
            >
              📁 {folder.name}
            </div>
          ))}
        </div>
        <button 
          className="new-folder-btn"
          onClick={() => openFolderModal()}
        >
          + 新しいフォルダ
        </button>
      </div>
      
      <div className="sidebar-section">
        <div className="search-box">
          <input type="text" placeholder="🔍 検索..." />
        </div>
      </div>

      {/* コンテキストメニュー */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ 
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
        >
          <div 
            className="context-menu-item"
            onClick={() => openFolderModal(contextMenu.folder)}
          >
            ✏️ 編集
          </div>
          <div 
            className="context-menu-item delete"
            onClick={() => deleteFolder(contextMenu.folder.id)}
          >
            🗑️ 削除
          </div>
        </div>
      )}

      {/* フォルダ作成・編集モーダル */}
      {showFolderModal && (
        <FolderModal
          folder={editingFolder}
          onSave={editingFolder ? updateFolder : createFolder}
          onClose={() => {
            setShowFolderModal(false)
            setEditingFolder(null)
          }}
        />
      )}
      
    </div>
  )
}

// フォルダモーダルコンポーネント
function FolderModal({ folder, onSave, onClose }) {
  const [name, setName] = useState(folder?.name || '')
  const [color, setColor] = useState(folder?.color || '#3B82F6')
  
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('フォルダ名を入力してください')
      return
    }
    
    if (folder) {
      onSave(folder.id, name.trim(), color)
    } else {
      onSave(name.trim(), color)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{folder ? 'フォルダを編集' : '新しいフォルダ'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>フォルダ名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="フォルダ名を入力"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>カラー</label>
            <div className="color-picker">
              {colors.map(colorOption => (
                <button
                  key={colorOption}
                  type="button"
                  className={`color-option ${color === colorOption ? 'selected' : ''}`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose}>キャンセル</button>
            <button type="submit">{folder ? '更新' : '作成'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Sidebar