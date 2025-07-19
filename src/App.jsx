import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MemoList from './components/MemoList'
import MemoEditor from './components/MemoEditor'
import AISidebar from './components/AISidebar'
import AdminPanel from './components/AdminPanel'
import AuthForm from './components/AuthForm'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [selectedMemo, setSelectedMemo] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [pendingFolderChange, setPendingFolderChange] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveAndMoveFlag, setSaveAndMoveFlag] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // ページロード時の認証状態確認
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setIsCheckingAuth(false)
        return
      }

      try {
        // トークンの有効性をテスト（フォルダ一覧取得で確認）
        const response = await fetch('/api/folders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          // トークンが有効な場合、JWTペイロードからユーザー情報を復元
          const payload = JSON.parse(atob(token.split('.')[1]))
          setUser({
            id: payload.userId,
            email: payload.email,
            name: payload.name,
            role: payload.role || 'user'
          })
          setIsAuthenticated(true)
        } else {
          // トークンが無効な場合、削除
          localStorage.removeItem('token')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        localStorage.removeItem('token')
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuthStatus()
  }, [])

  // 認証チェック中はローディング表示
  if (isCheckingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        読み込み中...
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <AuthForm 
        onAuthSuccess={(userData) => {
          setIsAuthenticated(true)
          setUser(userData)
        }}
      />
    )
  }

  // フォルダ変更時の処理
  const handleFolderChange = (newFolder) => {
    if (showEditor && hasUnsavedChanges) {
      setPendingFolderChange(newFolder)
    } else {
      setSelectedFolder(newFolder)
    }
  }

  // 保存して移動
  const handleSaveAndMove = () => {
    // 保存処理を親から直接呼び出す代わりに、
    // 保存フラグを設定してMemoEditorに処理を委ねる
    setSaveAndMoveFlag(true)
  }

  // 保存せずに移動
  const handleMoveWithoutSave = () => {
    setHasUnsavedChanges(false)
    setSelectedFolder(pendingFolderChange)
    setShowEditor(false)
    setSelectedMemo(null)
    setPendingFolderChange(null)
  }

  // キャンセル
  const handleCancelMove = () => {
    setPendingFolderChange(null)
  }

  return (
    <div className="app">
      <Header 
        user={user}
        onLogout={() => {
          localStorage.removeItem('token')
          setIsAuthenticated(false)
          setUser(null)
        }}
        onShowAdmin={() => setShowAdminPanel(true)}
      />
      <div className="app-body">
        <Sidebar 
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderChange}
        />
        <div className="main-content">
          <div className="content-area">
          {showEditor ? (
            <MemoEditor 
              memo={selectedMemo}
              defaultFolder={selectedFolder}
              onClose={() => {
                setShowEditor(false)
                setSelectedMemo(null)
                setHasUnsavedChanges(false)
              }}
              onSave={(savedMemo) => {
                setShowEditor(false)
                setSelectedMemo(null)
                setHasUnsavedChanges(false)
                
                if (saveAndMoveFlag) {
                  setSelectedFolder(pendingFolderChange)
                  setPendingFolderChange(null)
                  setSaveAndMoveFlag(false)
                }
              }}
              onUnsavedChange={setHasUnsavedChanges}
              saveAndMoveFlag={saveAndMoveFlag}
              onSaveAndMoveComplete={() => {
                setSaveAndMoveFlag(false)
              }}
            />
          ) : (
            <MemoList 
              folder={selectedFolder}
              onMemoSelect={(memo) => {
                setSelectedMemo(memo)
                setShowEditor(true)
              }}
              onNewMemo={() => {
                setSelectedMemo(null)
                setShowEditor(true)
              }}
            />
          )}
          </div>
          
          {/* AI Sidebar */}
          <AISidebar currentMemo={selectedMemo} />
        </div>
      </div>
      
      {showAdminPanel && (
        <AdminPanel 
          user={user}
          onClose={() => setShowAdminPanel(false)}
        />
      )}
      
      {pendingFolderChange && (
        <div className="modal-overlay">
          <div className="save-confirmation-modal">
            <h3>変更を保存しますか？</h3>
            <p>編集中のメモに未保存の変更があります。</p>
            <div className="modal-buttons">
              <button className="save-btn" onClick={handleSaveAndMove}>
                保存して移動
              </button>
              <button className="discard-btn" onClick={handleMoveWithoutSave}>
                保存せずに移動
              </button>
              <button className="cancel-btn" onClick={handleCancelMove}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
