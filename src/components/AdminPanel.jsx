import { useState, useEffect } from 'react'

function AdminPanel({ user, onClose }) {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // APIから統計データを取得
  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // APIからユーザー一覧を取得
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      setUsers(data.users)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('JWT Token:', localStorage.getItem('token'))
    
    if (activeTab === 'stats') {
      fetchStats()
    } else if (activeTab === 'users') {
      fetchUsers()
    }
  }, [activeTab])

  const handleUserToggle = async (userId, isActive) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: userId,
          isActive: !isActive
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update user')
      }
      
      // ユーザー一覧を再取得
      fetchUsers()
    } catch (err) {
      setError(err.message)
      console.error('Error updating user:', err)
    }
  }

  const handlePasswordChange = async (userId) => {
    const newPassword = prompt('新しいパスワードを入力してください（6文字以上）:')
    
    if (!newPassword) {
      return
    }
    
    if (newPassword.length < 6) {
      alert('パスワードは6文字以上で入力してください')
      return
    }
    
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId, newPassword })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to change password')
      }
      
      const data = await response.json()
      alert(`パスワードが正常に変更されました。\nユーザー: ${data.user.email}\n新しいパスワード: ${newPassword}`)
    } catch (err) {
      setError(err.message)
      console.error('Error changing password:', err)
      alert(`パスワード変更エラー: ${err.message}`)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('本当にこのユーザーを削除しますか？')) return
    
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete user')
      }
      
      // ユーザー一覧を再取得
      fetchUsers()
    } catch (err) {
      setError(err.message)
      console.error('Error deleting user:', err)
    }
  }

  if (user.role !== 'admin') {
    return (
      <div className="admin-panel">
        <div className="admin-header">
          <h2>🔒 アクセス拒否</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <p>管理者権限が必要です。</p>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-container">
        <div className="admin-header">
          <h2>🛠️ 管理者パネル</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 統計
          </button>
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 ユーザー管理
          </button>
        </div>

        <div className="admin-content">
        {error && (
          <div className="error-message">
            エラー: {error}
          </div>
        )}
        
        {loading && (
          <div className="loading">
            読み込み中...
          </div>
        )}
        
        {activeTab === 'stats' && (
          <div className="stats-panel">
            <h3>システム統計</h3>
            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>総ユーザー数</h4>
                  <div className="stat-value">{stats.summary.totalUsers}</div>
                </div>
                <div className="stat-card">
                  <h4>アクティブユーザー</h4>
                  <div className="stat-value">{stats.summary.activeUsers}</div>
                </div>
                <div className="stat-card">
                  <h4>総メモ数</h4>
                  <div className="stat-value">{stats.summary.totalMemos}</div>
                </div>
                <div className="stat-card">
                  <h4>総フォルダ数</h4>
                  <div className="stat-value">{stats.summary.totalFolders}</div>
                </div>
                <div className="stat-card">
                  <h4>7日以内ログイン</h4>
                  <div className="stat-value">{stats.summary.recentLogins}</div>
                </div>
                <div className="stat-card">
                  <h4>24時間以内の管理者操作</h4>
                  <div className="stat-value">{stats.summary.adminActions24h}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-panel">
            <h3>ユーザー管理</h3>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>メール</th>
                    <th>名前</th>
                    <th>権限</th>
                    <th>状態</th>
                    <th>メモ数</th>
                    <th>最終ログイン</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(userItem => (
                    <tr key={userItem.id}>
                      <td>{userItem.id}</td>
                      <td>{userItem.email}</td>
                      <td>{userItem.name}</td>
                      <td>
                        <span className={`role-badge ${userItem.role}`}>
                          {userItem.role === 'admin' ? '👑 管理者' : '👤 一般'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${userItem.is_active ? 'active' : 'inactive'}`}>
                          {userItem.is_active ? '✅ 有効' : '❌ 無効'}
                        </span>
                      </td>
                      <td>{userItem.memo_count}</td>
                      <td>
                        {userItem.last_login ? 
                          new Date(userItem.last_login).toLocaleDateString('ja-JP') : 
                          'なし'
                        }
                      </td>
                      <td>
                        <div className="user-actions">
                          <button 
                            className="action-btn toggle"
                            onClick={() => handleUserToggle(userItem.id, userItem.is_active)}
                            disabled={userItem.id === user.userId}
                          >
                            {userItem.is_active ? '無効化' : '有効化'}
                          </button>
                          <button 
                            className="action-btn reset"
                            onClick={() => handlePasswordChange(userItem.id)}
                          >
                            PW再設定
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDeleteUser(userItem.id)}
                            disabled={userItem.id === user.userId}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel