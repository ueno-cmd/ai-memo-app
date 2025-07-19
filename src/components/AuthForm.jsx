import { useState } from 'react'

function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('メールアドレスとパスワードを入力してください')
      return false
    }

    if (!isLogin) {
      if (!formData.name) {
        setError('名前を入力してください')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        setError('パスワードが一致しません')
        return false
      }
      if (formData.password.length < 6) {
        setError('パスワードは6文字以上で入力してください')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password, name: formData.name }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        // JWTトークンをlocalStorageに保存
        localStorage.setItem('token', data.token)
        
        onAuthSuccess({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role || 'user'
        })
      } else {
        setError(data.error || `${isLogin ? 'ログイン' : '登録'}に失敗しました`)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setError('サーバーエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    })
    setError('')
  }

  return (
    <div className="auth-container">
      <div className="auth-form">
        <div className="auth-header">
          <h1>AI Memo App</h1>
          <h2>{isLogin ? 'ログイン' : 'ユーザー登録'}</h2>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">名前</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="お名前を入力"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="メールアドレスを入力"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={isLogin ? "パスワードを入力" : "6文字以上のパスワード"}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">パスワード確認</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="パスワードを再入力"
                  required={!isLogin}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? '処理中...' : (isLogin ? 'ログイン' : 'アカウント作成')}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isLogin ? 'アカウントをお持ちでない方は ' : '既にアカウントをお持ちの方は '}
          </span>
          <button 
            type="button" 
            className="switch-button"
            onClick={switchMode}
          >
            {isLogin ? 'ユーザー登録' : 'ログイン'}
          </button>
        </div>

        {/* テスト用ログインボタン（開発環境のみ） */}
        {import.meta.env.DEV && (
          <div className="test-login">
            <hr />
            <p>開発・テスト用</p>
            <button 
              type="button"
              className="test-button"
              onClick={() => {
                setFormData({
                  ...formData,
                  email: 'test@example.com',
                  password: 'password123'
                })
              }}
            >
              テストアカウント情報を入力
            </button>
          </div>
        )}

        {/* 問い合わせリンク */}
        <div className="support-links">
          <hr />
          <p>
            <span>お困りの際は </span>
            <a 
              href="#" 
              className="support-link"
              onClick={(e) => {
                e.preventDefault();
                window.open('https://forms.gle/wdCyzGRwyfmJDWMm8', '_blank');
              }}
            >
              📧 お問い合わせ
            </a>
            <span> までご連絡ください</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthForm