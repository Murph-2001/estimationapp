import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login({ onLogin }) {
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: dbError } = await supabase
      .from('user_settings')
      .select('name')
      .eq('name', name.trim())
      .eq('password', password)
      .single()
    setLoading(false)
    if (dbError || !data) {
      setError('Invalid username or password.')
    } else {
      onLogin(data.name)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🏠</div>
        <h1>REPS Hour Tracker</h1>
        <p className="login-subtitle">Real Estate Professional Status Documentation</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your username"
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
