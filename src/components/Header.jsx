import { useState } from 'react'

function Header({ user, onLogout, onShowAdmin }) {
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="header">
      <div className="header-left">
        <h1>AI Memo App</h1>
      </div>
      <div className="header-right">
        <div className="user-menu-container">
          <button 
            className="user-menu"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {user?.role === 'admin' ? '👑' : '👤'} {user?.name || 'User'} ▼
          </button>
          {showUserMenu && (
            <div className="user-dropdown">
              {user?.role === 'admin' && (
                <button className="dropdown-item" onClick={onShowAdmin}>
                  🛠️ 管理者パネル
                </button>
              )}
              <button 
                className="dropdown-item" 
                onClick={(e) => {
                  e.preventDefault();
                  window.open('https://forms.gle/wdCyzGRwyfmJDWMm8', '_blank');
                }}
              >
                📧 お問い合わせ
              </button>
              <button className="dropdown-item" onClick={onLogout}>
                🚪 ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header