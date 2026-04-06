import { useState } from 'react'
import { USERS } from '../constants'

export default function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const match = USERS.find(
      u => u.name.toLowerCase() === name.toLowerCase() && u.password === password
    )
    if (match) {
      onLogin(match.name)
    } else {
      setError('Invalid username or password.')
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
              placeholder="patrick or samantha"
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
          <button type="submit" className="btn-primary btn-full">Sign In</button>
        </form>
      </div>
    </div>
  )
}
