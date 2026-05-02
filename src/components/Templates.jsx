import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { CATEGORIES, USERS } from '../constants'
import { normalizeProperty } from '../propertyUtils'

const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))

const DAYS = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 0, short: 'Sun' },
]

// ── Date helpers ──────────────────────────────────────────────
const parseLocal = (str) => {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const toLocalStr = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const todayStr  = () => toLocalStr(new Date())
const addDays   = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

const fmtDisplay = (str) =>
  parseLocal(str).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// Compute all scheduled dates from last-logged up to today
const getPendingDates = (tpl) => {
  if (!tpl.recurring || !tpl.recurringDays?.length) return []
  const today   = parseLocal(todayStr())
  const rawStart = tpl.lastLoggedDate
    ? addDays(parseLocal(tpl.lastLoggedDate), 1)
    : parseLocal(tpl.recurringStartDate || todayStr())
  if (rawStart > today) return []
  const dates = []
  let cursor = rawStart
  while (cursor <= today) {
    if (tpl.recurringDays.includes(cursor.getDay())) dates.push(toLocalStr(cursor))
    cursor = addDays(cursor, 1)
  }
  return dates
}

// Backward-compat: old templates had user_name (string)
const getUsers = (tpl) => tpl.users || (tpl.user_name ? [tpl.user_name] : [])

const emptyForm = () => ({
  name: '', users: [], category: '', property: '', description: '',
  recurring: false, recurringDays: [], recurringHours: '1', recurringStartDate: todayStr(),
})

export default function Templates({ templates, currentUser, onSave, onDelete, onUpdate, onSaved, year }) {
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState(emptyForm)
  const [formError, setFormError] = useState('')

  // Active panel state
  const [activeId,      setActiveId]      = useState(null)
  const [panelMode,     setPanelMode]     = useState(null) // 'quick' | 'pending'
  const [quickDate,     setQuickDate]     = useState(todayStr())
  const [quickHours,    setQuickHours]    = useState('')
  const [quickUsers,    setQuickUsers]    = useState([])
  const [pendingDates,  setPendingDates]  = useState([])
  const [selectedDates, setSelectedDates] = useState([])
  const [pendingUsers,  setPendingUsers]  = useState([])
  const [pendingHours,  setPendingHours]  = useState('')
  const [panelError,    setPanelError]    = useState('')
  const [saving,        setSaving]        = useState(false)
  const [confirmId,     setConfirmId]     = useState(null)

  // Pre-compute pending counts for all recurring templates
  const pendingCounts = useMemo(() => {
    const map = {}
    templates.forEach(t => { if (t.recurring) map[t.id] = getPendingDates(t).length })
    return map
  }, [templates])

  const totalPending = Object.values(pendingCounts).reduce((s, n) => s + n, 0)

  // ── Form helpers ──────────────────────────────────────────
  const setField = (f, v) => setForm(prev => ({ ...prev, [f]: v }))

  const toggleFormUser = (name) =>
    setForm(prev => ({
      ...prev,
      users: prev.users.includes(name) ? prev.users.filter(u => u !== name) : [...prev.users, name],
    }))

  const toggleFormDay = (val) =>
    setForm(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(val)
        ? prev.recurringDays.filter(d => d !== val)
        : [...prev.recurringDays, val],
    }))

  const handleSaveTemplate = () => {
    setFormError('')
    if (!form.name.trim())        return setFormError('Template name is required.')
    if (form.users.length === 0)  return setFormError('Select at least one person.')
    if (!form.category)           return setFormError('Please select a category.')
    if (!form.description.trim()) return setFormError('Description is required.')
    if (form.recurring) {
      if (form.recurringDays.length === 0) return setFormError('Select at least one day of the week.')
      if (!parseFloat(form.recurringHours) > 0) return setFormError('Hours per occurrence required.')
    }
    onSave({
      name:               form.name.trim(),
      users:              form.users,
      category:           form.category,
      property:           form.property.trim(),
      description:        form.description.trim(),
      recurring:          form.recurring,
      recurringDays:      form.recurring ? form.recurringDays : [],
      recurringHours:     form.recurring ? parseFloat(form.recurringHours) : null,
      recurringStartDate: form.recurring ? form.recurringStartDate : null,
    })
    setForm(emptyForm())
    setShowForm(false)
  }

  // ── Panel open/close ──────────────────────────────────────
  const openQuick = (tpl) => {
    setActiveId(tpl.id); setPanelMode('quick')
    setQuickDate(todayStr()); setQuickHours(''); setQuickUsers(getUsers(tpl)); setPanelError('')
  }

  const openPending = (tpl) => {
    const dates = getPendingDates(tpl)
    setActiveId(tpl.id); setPanelMode('pending')
    setPendingDates(dates); setSelectedDates(dates)
    setPendingUsers(getUsers(tpl))
    setPendingHours(String(tpl.recurringHours || 1))
    setPanelError('')
  }

  const closePanel = () => { setActiveId(null); setPanelMode(null); setPanelError('') }

  const toggleQuickUser   = (n) => setQuickUsers(p => p.includes(n) ? p.filter(u => u !== n) : [...p, n])
  const togglePendingUser = (n) => setPendingUsers(p => p.includes(n) ? p.filter(u => u !== n) : [...p, n])
  const toggleDate        = (d) => setSelectedDates(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])
  const allDatesChecked   = selectedDates.length === pendingDates.length
  const toggleAllDates    = () => setSelectedDates(allDatesChecked ? [] : pendingDates)

  // ── Submit: one-off quick log ─────────────────────────────
  const handleQuickLog = async (tpl) => {
    setPanelError('')
    const hrs = parseFloat(quickHours)
    if (!quickDate)              return setPanelError('Date is required.')
    if (!hrs || hrs <= 0)        return setPanelError('Hours must be a positive number.')
    if (quickUsers.length === 0) return setPanelError('Select at least one person.')
    setSaving(true)
    const rows = quickUsers.map(name => ({
      user_name: name, date: quickDate, category: tpl.category, hours: hrs,
      property: tpl.property ? normalizeProperty(tpl.property) : null,
      description: tpl.description, year,
    }))
    const { error } = await supabase.from('entries').insert(rows)
    setSaving(false)
    if (error) return setPanelError(`Failed: ${error.message}`)
    closePanel(); onSaved()
  }

  // ── Submit: log all pending recurring entries ─────────────
  const handleLogPending = async (tpl) => {
    setPanelError('')
    const hrs = parseFloat(pendingHours)
    if (!hrs || hrs <= 0)          return setPanelError('Hours per entry required.')
    if (selectedDates.length === 0) return setPanelError('Select at least one date.')
    if (pendingUsers.length === 0)  return setPanelError('Select at least one person.')
    setSaving(true)
    const rows = []
    selectedDates.forEach(date => {
      pendingUsers.forEach(name => {
        rows.push({
          user_name: name, date, category: tpl.category, hours: hrs,
          property: tpl.property ? normalizeProperty(tpl.property) : null,
          description: tpl.description,
          year: parseInt(date.split('-')[0]),
        })
      })
    })
    const { error } = await supabase.from('entries').insert(rows)
    setSaving(false)
    if (error) return setPanelError(`Failed: ${error.message}`)
    const latestDate = [...selectedDates].sort().pop()
    onUpdate(tpl.id, { lastLoggedDate: latestDate })
    closePanel(); onSaved()
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="templates-page">
      <div className="templates-header">
        <div>
          <h2>Templates</h2>
          <p className="templates-subtitle">
            Save recurring meetings &amp; tasks — log hours for multiple people at once.
            {totalPending > 0 && (
              <span className="pending-alert"> {totalPending} pending {totalPending === 1 ? 'entry' : 'entries'} ready to log.</span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(s => !s); setFormError('') }}>
          {showForm ? 'Cancel' : '+ New Template'}
        </button>
      </div>

      {/* ── New template form ── */}
      {showForm && (
        <div className="template-form-card">
          <h3>New Template</h3>

          <div className="form-group">
            <label>Template Name <span className="field-required">*</span></label>
            <input type="text" value={form.name} onChange={e => setField('name', e.target.value)}
              placeholder="e.g. Weekly Email Processing" />
          </div>

          <div className="form-group">
            <label>Attendees <span className="field-required">*</span></label>
            <div className="user-checkbox-grid">
              {USERS.map(u => (
                <label key={u.name} className={`user-checkbox ${form.users.includes(u.name) ? 'checked' : ''}`}>
                  <input type="checkbox" checked={form.users.includes(u.name)} onChange={() => toggleFormUser(u.name)} />
                  {u.name}
                </label>
              ))}
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Category <span className="field-required">*</span></label>
              <select value={form.category} onChange={e => setField('category', e.target.value)}>
                <option value="">— Select —</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Property <span className="field-optional">(optional)</span></label>
              <input type="text" value={form.property} onChange={e => setField('property', e.target.value)}
                placeholder="e.g. 123 Main St" />
            </div>
          </div>

          <div className="form-group">
            <label>Description <span className="field-required">*</span></label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)}
              placeholder="e.g. Review and respond to rental property emails" rows={2} />
          </div>

          {/* Recurring toggle */}
          <div className="recurring-toggle-row">
            <label className={`user-checkbox ${form.recurring ? 'checked' : ''}`} style={{borderRadius:'8px'}}>
              <input type="checkbox" checked={form.recurring} onChange={e => setField('recurring', e.target.checked)} />
              Repeating task (set a weekly schedule)
            </label>
          </div>

          {form.recurring && (
            <div className="recurring-fields">
              <div className="form-group">
                <label>Repeats on <span className="field-required">*</span></label>
                <div className="day-picker">
                  {DAYS.map(d => (
                    <label key={d.value} className={`day-chip ${form.recurringDays.includes(d.value) ? 'checked' : ''}`}>
                      <input type="checkbox" checked={form.recurringDays.includes(d.value)} onChange={() => toggleFormDay(d.value)} />
                      {d.short}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Hours per occurrence <span className="field-required">*</span></label>
                  <input type="number" value={form.recurringHours}
                    onChange={e => setField('recurringHours', e.target.value)}
                    placeholder="e.g. 1" step="0.25" min="0.25" max="24" />
                </div>
                <div className="form-group">
                  <label>Start tracking from</label>
                  <input type="date" value={form.recurringStartDate}
                    onChange={e => setField('recurringStartDate', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {formError && <p className="form-error">{formError}</p>}
          <button className="btn-primary" onClick={handleSaveTemplate}>Save Template</button>
        </div>
      )}

      {/* ── Template list ── */}
      {templates.length === 0 && !showForm ? (
        <div className="templates-empty">
          <p>No templates yet.</p>
          <p>Create one for recurring tasks like weekly email processing, monthly CPA meetings, property review sessions, etc.</p>
        </div>
      ) : (
        <div className="template-list">
          {templates.map(tpl => {
            const tplUsers  = getUsers(tpl)
            const isActive  = activeId === tpl.id
            const pending   = pendingCounts[tpl.id] || 0

            return (
              <div key={tpl.id} className={`template-card ${isActive ? 'template-card-active' : ''}`}>
                <div className="template-top">
                  <div>
                    <div className="template-name">
                      {tpl.name}
                      {tpl.recurring && (
                        <span className="recurring-badge">
                          {DAYS.filter(d => tpl.recurringDays?.includes(d.value)).map(d => d.short).join(', ')}
                          {tpl.recurringHours ? ` · ${tpl.recurringHours} hr` : ''}
                        </span>
                      )}
                    </div>
                    <div className="template-meta">
                      {tplUsers.map(name => (
                        <span key={name} className={`entry-user ${name.toLowerCase()}`}>{name}</span>
                      ))}
                      <span className="template-cat">{CAT_LABEL[tpl.category] || tpl.category}</span>
                      {tpl.property && <span className="entry-property">📍 {tpl.property}</span>}
                    </div>
                  </div>
                  <div className="template-actions">
                    {confirmId === tpl.id ? (
                      <>
                        <span className="confirm-text">Delete?</span>
                        <button className="btn-danger-sm" onClick={() => { onDelete(tpl.id); setConfirmId(null); closePanel() }}>Yes</button>
                        <button className="btn-ghost-sm" onClick={() => setConfirmId(null)}>No</button>
                      </>
                    ) : (
                      <button className="btn-ghost-sm" onClick={() => setConfirmId(tpl.id)}>✕</button>
                    )}
                  </div>
                </div>

                <p className="template-desc">{tpl.description}</p>

                {/* Pending badge */}
                {tpl.recurring && pending > 0 && !isActive && (
                  <div className="pending-badge">
                    {pending} unlogged {pending === 1 ? 'occurrence' : 'occurrences'} since last logged
                  </div>
                )}

                {/* Action panels */}
                {isActive && panelMode === 'quick' && (
                  <div className="quick-log-panel">
                    <div className="quick-log-title">Log hours — one-time</div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Date</label>
                        <input type="date" value={quickDate} onChange={e => setQuickDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Hours (each person)</label>
                        <input type="number" value={quickHours} onChange={e => setQuickHours(e.target.value)}
                          placeholder="e.g. 1.5" step="0.25" min="0.25" max="24" autoFocus />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Who attended?</label>
                      <div className="user-checkbox-grid">
                        {tplUsers.map(name => (
                          <label key={name} className={`user-checkbox ${quickUsers.includes(name) ? 'checked' : ''}`}>
                            <input type="checkbox" checked={quickUsers.includes(name)} onChange={() => toggleQuickUser(name)} />
                            {name}
                          </label>
                        ))}
                      </div>
                    </div>
                    {panelError && <p className="form-error">{panelError}</p>}
                    <div className="quick-log-actions">
                      <button className="btn-primary" onClick={() => handleQuickLog(tpl)} disabled={saving}>
                        {saving ? 'Saving…' : `Log ${quickUsers.length > 1 ? `for ${quickUsers.length} people` : 'Hours'}`}
                      </button>
                      <button className="btn-ghost-sm" onClick={closePanel}>Cancel</button>
                    </div>
                  </div>
                )}

                {isActive && panelMode === 'pending' && (
                  <div className="quick-log-panel">
                    <div className="quick-log-title">Log pending entries — {pendingDates.length} scheduled {pendingDates.length === 1 ? 'occurrence' : 'occurrences'}</div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Hours per entry</label>
                        <input type="number" value={pendingHours} onChange={e => setPendingHours(e.target.value)}
                          step="0.25" min="0.25" max="24" autoFocus />
                      </div>
                      <div className="form-group">
                        <label>Who attended?</label>
                        <div className="user-checkbox-grid">
                          {tplUsers.map(name => (
                            <label key={name} className={`user-checkbox ${pendingUsers.includes(name) ? 'checked' : ''}`}>
                              <input type="checkbox" checked={pendingUsers.includes(name)} onChange={() => togglePendingUser(name)} />
                              {name}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="pending-dates-header">
                        <label>Dates to log</label>
                        <button className="btn-ghost-sm" onClick={toggleAllDates}>
                          {allDatesChecked ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div className="pending-dates-list">
                        {pendingDates.map(d => (
                          <label key={d} className={`date-chip ${selectedDates.includes(d) ? 'checked' : ''}`}>
                            <input type="checkbox" checked={selectedDates.includes(d)} onChange={() => toggleDate(d)} />
                            {fmtDisplay(d)}
                          </label>
                        ))}
                      </div>
                      {selectedDates.length > 0 && pendingUsers.length > 0 && (
                        <p className="field-hint">
                          Will create {selectedDates.length * pendingUsers.length} {selectedDates.length * pendingUsers.length === 1 ? 'entry' : 'entries'}
                          {' '}({selectedDates.length} {selectedDates.length === 1 ? 'date' : 'dates'} × {pendingUsers.length} {pendingUsers.length === 1 ? 'person' : 'people'} × {pendingHours || '?'} hrs each)
                        </p>
                      )}
                    </div>

                    {panelError && <p className="form-error">{panelError}</p>}
                    <div className="quick-log-actions">
                      <button className="btn-primary" onClick={() => handleLogPending(tpl)} disabled={saving || selectedDates.length === 0}>
                        {saving ? 'Saving…' : `Log ${selectedDates.length} ${selectedDates.length === 1 ? 'Entry' : 'Entries'}`}
                      </button>
                      <button className="btn-ghost-sm" onClick={closePanel}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Buttons when panel is closed */}
                {!isActive && (
                  <div className="template-btn-row">
                    {tpl.recurring && pending > 0 && (
                      <button className="btn-log-pending" onClick={() => openPending(tpl)}>
                        Log {pending} Pending {pending === 1 ? 'Entry' : 'Entries'}
                      </button>
                    )}
                    <button className="btn-use-template" onClick={() => openQuick(tpl)}>
                      {tpl.recurring ? 'Log One-Off' : 'Use Template → Log Hours'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
