import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { CATEGORIES, USERS } from '../constants'

const CAT_LABEL    = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))
const CAT_MATERIAL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.countsForMaterial]))

const BLANK_EDIT = { date: '', category: '', hours: '', property: '', description: '' }

export default function History({ entries, onRefresh, currentUser }) {
  const [filterUser, setFilterUser] = useState('All')
  const [filterCat,  setFilterCat]  = useState('All')
  const [deletingId, setDeletingId] = useState(null)
  const [confirmId,  setConfirmId]  = useState(null)
  const [editingId,  setEditingId]  = useState(null)
  const [editForm,   setEditForm]   = useState(BLANK_EDIT)
  const [saving,     setSaving]     = useState(false)
  const [editError,  setEditError]  = useState('')
  const [properties, setProperties] = useState([])

  useEffect(() => {
    supabase
      .from('entries')
      .select('property')
      .not('property', 'is', null)
      .then(({ data }) => {
        const unique = [...new Set((data || []).map(e => e.property).filter(Boolean))].sort()
        setProperties(unique)
      })
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterUser !== 'All' && e.user_name !== filterUser) return false
      if (filterCat  !== 'All' && e.category   !== filterCat) return false
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

  const startEdit = (entry) => {
    setEditingId(entry.id)
    setEditError('')
    setConfirmId(null)
    setEditForm({
      date:        entry.date,
      category:    entry.category,
      hours:       String(entry.hours),
      property:    entry.property || '',
      description: entry.description,
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditForm(BLANK_EDIT); setEditError('') }

  const handleSaveEdit = async (id) => {
    setEditError('')
    if (!editForm.category)    return setEditError('Please select a category.')
    if (!editForm.description) return setEditError('Description is required.')
    const hrs = parseFloat(editForm.hours)
    if (!hrs || hrs <= 0)      return setEditError('Hours must be a positive number.')

    setSaving(true)
    const { error } = await supabase.from('entries').update({
      date:        editForm.date,
      category:    editForm.category,
      hours:       hrs,
      property:    editForm.property || null,
      description: editForm.description,
    }).eq('id', id)
    setSaving(false)

    if (error) {
      setEditError(`Failed to save: ${error.message}`)
    } else {
      cancelEdit()
      onRefresh()
    }
  }

  const setEdit = (field, value) => setEditForm(f => ({ ...f, [field]: value }))

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
            {USERS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
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

              {editingId === entry.id ? (
                <div className="edit-form">
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Date</label>
                      <input type="date" value={editForm.date} onChange={e => setEdit('date', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Hours</label>
                      <input type="number" value={editForm.hours} onChange={e => setEdit('hours', e.target.value)} step="0.25" min="0.25" max="24" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={editForm.category} onChange={e => setEdit('category', e.target.value)}>
                      <option value="">— Select —</option>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Property</label>
                    <input
                      type="text"
                      list="edit-property-list"
                      value={editForm.property}
                      onChange={e => setEdit('property', e.target.value)}
                      placeholder="Optional"
                      autoComplete="off"
                    />
                    <datalist id="edit-property-list">
                      {properties.map(p => <option key={p} value={p} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={editForm.description} onChange={e => setEdit('description', e.target.value)} rows={2} />
                  </div>
                  {editError && <p className="form-error">{editError}</p>}
                  <div className="edit-actions">
                    <button className="btn-primary" disabled={saving} onClick={() => handleSaveEdit(entry.id)}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button className="btn-ghost-sm" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
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
                        <>
                          <button className="btn-ghost-sm" onClick={() => startEdit(entry)}>Edit</button>
                          <button
                            className="btn-ghost-sm"
                            onClick={() => setConfirmId(entry.id)}
                            title="Delete entry"
                          >✕</button>
                        </>
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
                </>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
