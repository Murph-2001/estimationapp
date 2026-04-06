import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { CATEGORIES } from '../constants'

const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))
const CAT_MATERIAL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.countsForMaterial]))

export default function History({ entries, onRefresh, currentUser }) {
  const [filterUser, setFilterUser]     = useState('All')
  const [filterCat,  setFilterCat]      = useState('All')
  const [deletingId, setDeletingId]     = useState(null)
  const [confirmId,  setConfirmId]      = useState(null)

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterUser !== 'All' && e.user_name !== filterUser) return false
      if (filterCat  !== 'All' && e.category   !== filterCat)  return false
      return true
    })
  }, [entries, filterUser, filterCat])

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.hours), 0)

  const handleDelete = async (id) => {
    setDeletingId(id)
    const { error } = await supabase.from('entries').delete().eq('id', id)
    setDeletingId(null)
    setConfirmId(null)
    if (!error) onRefresh()
  }

  const formatDate = (d) => {
    const [y, m, day] = d.split('-')
    return `${m}/${day}/${y}`
  }

  return (
    <div className="history">
      <div className="history-header">
        <h2>Entry History</h2>
        <div className="history-filters">
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="All">All People</option>
            <option value="Patrick">Patrick</option>
            <option value="Samantha">Samantha</option>
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="history-summary">
        {filtered.length} entries &mdash; {totalFiltered.toFixed(1)} total hours
      </div>

      {filtered.length === 0 ? (
        <p className="no-entries-msg">No entries found.</p>
      ) : (
        <div className="entry-list">
          {filtered.map(entry => (
            <div key={entry.id} className="entry-card">
              <div className="entry-top">
                <div className="entry-meta">
                  <span className={`entry-user ${entry.user_name.toLowerCase()}`}>
                    {entry.user_name}
                  </span>
                  <span className="entry-date">{formatDate(entry.date)}</span>
                  <span className="entry-hours">{Number(entry.hours).toFixed(1)} hrs</span>
                </div>
                <div className="entry-actions">
                  {confirmId === entry.id ? (
                    <>
                      <span className="confirm-text">Delete?</span>
                      <button
                        className="btn-danger-sm"
                        disabled={deletingId === entry.id}
                        onClick={() => handleDelete(entry.id)}
                      >
                        {deletingId === entry.id ? '…' : 'Yes'}
                      </button>
                      <button className="btn-ghost-sm" onClick={() => setConfirmId(null)}>No</button>
                    </>
                  ) : (
                    <button
                      className="btn-ghost-sm"
                      onClick={() => setConfirmId(entry.id)}
                      title="Delete entry"
                    >✕</button>
                  )}
                </div>
              </div>
              <div className="entry-body">
                <div className="entry-cat-row">
                  <span className="entry-cat">{CAT_LABEL[entry.category] || entry.category}</span>
                  {!CAT_MATERIAL[entry.category] && (
                    <span className="cat-badge-no-rental">REPS only</span>
                  )}
                  {entry.property && (
                    <span className="entry-property">📍 {entry.property}</span>
                  )}
                </div>
                <p className="entry-desc">{entry.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
