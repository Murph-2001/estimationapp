import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import LogHoursForm from './components/LogHoursForm'
import History from './components/History'

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('reps_user') || null)
  const [tab, setTab] = useState('dashboard')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('year', year)
      .order('date', { ascending: false })
    if (!error) setEntries(data || [])
    setLoading(false)
  }, [year])

  useEffect(() => {
    if (user) fetchEntries()
  }, [user, fetchEntries])

  // Real-time subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('entries-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, () => {
        fetchEntries()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, fetchEntries])

  const handleLogin = (name) => {
    localStorage.setItem('reps_user', name)
    setUser(name)
  }

  const handleLogout = () => {
    localStorage.removeItem('reps_user')
    setUser(null)
    setEntries([])
    setTab('dashboard')
  }

  if (!user) return <Login onLogin={handleLogin} />

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-title">
            <span className="header-icon">🏠</span>
            <h1>REPS Hour Tracker</h1>
          </div>
          <div className="header-right">
            <select
              className="year-select"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {[2026, 2025, 2024, 2023].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="logged-in-as">👤 {user}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <nav className="tabs">
          <button
            className={tab === 'dashboard' ? 'tab active' : 'tab'}
            onClick={() => setTab('dashboard')}
          >Dashboard</button>
          <button
            className={tab === 'log' ? 'tab active' : 'tab'}
            onClick={() => setTab('log')}
          >Log Hours</button>
          <button
            className={tab === 'history' ? 'tab active' : 'tab'}
            onClick={() => setTab('history')}
          >History</button>
        </nav>
      </header>

      <main className="app-main">
        {loading && <div className="loading-bar" />}
        {tab === 'dashboard' && (
          <Dashboard entries={entries} year={year} currentUser={user} />
        )}
        {tab === 'log' && (
          <LogHoursForm
            currentUser={user}
            year={year}
            onSaved={() => { fetchEntries(); setTab('dashboard') }}
          />
        )}
        {tab === 'history' && (
          <History entries={entries} onRefresh={fetchEntries} currentUser={user} />
        )}
      </main>
    </div>
  )
}
