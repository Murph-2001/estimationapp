import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { CATEGORIES, USERS, REPS_THRESHOLD, RENTAL_THRESHOLD } from '../constants'
import { normalizeProperty, dedupeProperties } from '../propertyUtils'

const CAT_LABEL    = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))
const CAT_MATERIAL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.countsForMaterial]))
const MATERIAL_IDS = new Set(CATEGORIES.filter(c => c.countsForMaterial).map(c => c.id))

const BLANK_EDIT = { date: '', category: '', hours: '', property: '', description: '' }

const formatDate = (d) => {
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

export default function History({ entries, onRefresh, currentUser, onLogAgain, year }) {
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
        const unique = dedupeProperties((data || []).map(e => e.property))
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

  // Per-person summary for print header (always uses all entries, not filtered)
  const personSummary = useMemo(() => {
    const usersToShow = filterUser === 'All' ? USERS.map(u => u.name) : [filterUser]
    return usersToShow.map(name => {
      const mine = entries.filter(e => e.user_name === name)
      const total  = mine.reduce((s, e) => s + Number(e.hours), 0)
      const rental = mine.filter(e => MATERIAL_IDS.has(e.category)).reduce((s, e) => s + Number(e.hours), 0)
      return { name, total, rental, qualifies: total >= REPS_THRESHOLD && rental >= RENTAL_THRESHOLD }
    })
  }, [entries, filterUser])

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
      property:    editForm.property ? normalizeProperty(editForm.property) : null,
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

  const printDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="history">

      {/* ── Print-only header ── */}
      <div className="print-only print-report-header">
        <div className="print-title">REPS Hour Tracker — {year} Annual Log</div>
        <div className="print-meta">
          IRS Real Estate Professional Status Documentation &nbsp;|&nbsp; Printed {printDate}
        </div>
        {(filterUser !== 'All' || filterCat !== 'All') && (
          <div className="print-filter-note">
            Filtered by:{' '}
            {filterUser !== 'All' ? `Person: ${filterUser}` : ''}
            {filterUser !== 'All' && filterCat !== 'All' ? ', ' : ''}
            {filterCat  !== 'All' ? `Category: ${CAT_LABEL[filterCat]}` : ''}
          </div>
        )}

        <table className="print-summary-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Total Hours</th>
              <th>Rental Hours</th>
              <th>750 hr Threshold</th>
              <th>500 hr Threshold</th>
              <th>REPS Status</th>
            </tr>
          </thead>
          <tbody>
            {personSummary.map(p => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.total.toFixed(1)}</td>
                <td>{p.rental.toFixed(1)}</td>
                <td>{p.total >= REPS_THRESHOLD ? 'MET' : `${(REPS_THRESHOLD - p.total).toFixed(1)} hrs remaining`}</td>
                <td>{p.rental >= RENTAL_THRESHOLD ? 'MET' : `${(RENTAL_THRESHOLD - p.rental).toFixed(1)} hrs remaining`}</td>
                <td>{p.qualifies ? 'QUALIFIED' : 'In Progress'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-entries-title">
          Activity Log — {filtered.length} entries, {totalFiltered.toFixed(1)} total hours
        </div>
      </div>

      {/* ── Print-only entry table ── */}
      <table className="print-only print-entry-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Person</th>
            <th>Category</th>
            <th>Hours</th>
            <th>Property</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {[...filtered].sort((a, b) => a.date < b.date ? -1 : 1).map(entry => (
            <tr key={entry.id}>
              <td style={{whiteSpace:'nowrap'}}>{formatDate(entry.date)}</td>
              <td>{entry.user_name}</td>
              <td>{CAT_LABEL[entry.category] || entry.category}</td>
              <td style={{textAlign:'right'}}>{Number(entry.hours).toFixed(1)}</td>
              <td>{entry.property || ''}</td>
              <td>{entry.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Screen UI (hidden when printing) ── */}
      <div className="no-print">
        <div className="history-header">
          <h2>Entry History</h2>
          <div className="history-right">
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
            <button className="btn-print" onClick={() => window.print()}>Print / Save PDF</button>
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
                            <button className="btn-danger-sm" disabled={deletingId === entry.id} onClick={() => handleDelete(entry.id)}>
                              {deletingId === entry.id ? '…' : 'Yes'}
                            </button>
                            <button className="btn-ghost-sm" onClick={() => setConfirmId(null)}>No</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-ghost-sm" onClick={() => onLogAgain(entry)} title="Log again with same details">↺ Again</button>
                            <button className="btn-ghost-sm" onClick={() => startEdit(entry)}>Edit</button>
                            <button className="btn-ghost-sm" onClick={() => setConfirmId(entry.id)} title="Delete entry">✕</button>
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
    </div>
  )
}
