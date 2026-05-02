import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { CATEGORIES, USERS } from '../constants'
import { normalizeProperty } from '../propertyUtils'

const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))
const today     = () => new Date().toISOString().split('T')[0]

// Backward-compat: old templates had user_name (string), new ones have users (array)
const getUsers = (tpl) => tpl.users || (tpl.user_name ? [tpl.user_name] : [])

const emptyForm = () => ({
  name:        '',
  users:       [],
  category:    '',
  property:    '',
  description: '',
})

export default function Templates({ templates, currentUser, onSave, onDelete, onSaved, year }) {
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState(emptyForm)
  const [formError,  setFormError]  = useState('')

  const [activeId,   setActiveId]   = useState(null)
  const [quickDate,  setQuickDate]  = useState(today())
  const [quickHours, setQuickHours] = useState('')
  const [quickUsers, setQuickUsers] = useState([])
  const [quickError, setQuickError] = useState('')
  const [saving,     setSaving]     = useState(false)

  const [confirmId,  setConfirmId]  = useState(null)

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const toggleFormUser = (name) => {
    setForm(f => ({
      ...f,
      users: f.users.includes(name) ? f.users.filter(u => u !== name) : [...f.users, name],
    }))
  }

  const handleSaveTemplate = () => {
    setFormError('')
    if (!form.name.trim())        return setFormError('Template name is required.')
    if (form.users.length === 0)  return setFormError('Select at least one person.')
    if (!form.category)           return setFormError('Please select a category.')
    if (!form.description.trim()) return setFormError('Description is required.')
    onSave({
      name:        form.name.trim(),
      users:       form.users,
      category:    form.category,
      property:    form.property.trim(),
      description: form.description.trim(),
    })
    setForm(emptyForm())
    setShowForm(false)
  }

  const openQuickLog = (tpl) => {
    setActiveId(tpl.id)
    setQuickDate(today())
    setQuickHours('')
    setQuickUsers(getUsers(tpl))
    setQuickError('')
  }

  const closeQuickLog = () => { setActiveId(null); setQuickError('') }

  const toggleQuickUser = (name) => {
    setQuickUsers(prev =>
      prev.includes(name) ? prev.filter(u => u !== name) : [...prev, name]
    )
  }

  const handleQuickLog = async (tpl) => {
    setQuickError('')
    const hrs = parseFloat(quickHours)
    if (!quickDate)              return setQuickError('Date is required.')
    if (!hrs || hrs <= 0)        return setQuickError('Hours must be a positive number.')
    if (quickUsers.length === 0) return setQuickError('Select at least one person.')

    setSaving(true)
    const rows = quickUsers.map(name => ({
      user_name:   name,
      date:        quickDate,
      category:    tpl.category,
      hours:       hrs,
      property:    tpl.property ? normalizeProperty(tpl.property) : null,
      description: tpl.description,
      year,
    }))

    const { error } = await supabase.from('entries').insert(rows)
    setSaving(false)

    if (error) {
      setQuickError(`Failed to save: ${error.message}`)
    } else {
      closeQuickLog()
      onSaved()
    }
  }

  return (
    <div className="templates-page">
      <div className="templates-header">
        <div>
          <h2>Templates</h2>
          <p className="templates-subtitle">Save recurring meetings — log hours for multiple people at once.</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(s => !s); setFormError('') }}>
          {showForm ? 'Cancel' : '+ New Template'}
        </button>
      </div>

      {showForm && (
        <div className="template-form-card">
          <h3>New Template</h3>
          <div className="form-group">
            <label>Template Name <span className="field-required">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. Monthly Property Review Meeting"
            />
          </div>

          <div className="form-group">
            <label>Attendees <span className="field-required">*</span></label>
            <div className="user-checkbox-grid">
              {USERS.map(u => (
                <label key={u.name} className={`user-checkbox ${form.users.includes(u.name) ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.users.includes(u.name)}
                    onChange={() => toggleFormUser(u.name)}
                  />
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
              <input
                type="text"
                value={form.property}
                onChange={e => setField('property', e.target.value)}
                placeholder="e.g. 123 Main St"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description <span className="field-required">*</span></label>
            <textarea
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="e.g. Monthly meeting with CPA to review rental property income and expenses"
              rows={3}
            />
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <button className="btn-primary" onClick={handleSaveTemplate}>Save Template</button>
        </div>
      )}

      {templates.length === 0 && !showForm ? (
        <div className="templates-empty">
          <p>No templates yet.</p>
          <p>Create one for recurring meetings — monthly CPA reviews, estate planner check-ins, property review sessions, etc. Log everyone's hours at once.</p>
        </div>
      ) : (
        <div className="template-list">
          {templates.map(tpl => {
            const tplUsers = getUsers(tpl)
            const isActive = activeId === tpl.id
            return (
              <div key={tpl.id} className={`template-card ${isActive ? 'template-card-active' : ''}`}>
                <div className="template-top">
                  <div>
                    <div className="template-name">{tpl.name}</div>
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
                        <button className="btn-danger-sm" onClick={() => { onDelete(tpl.id); setConfirmId(null); closeQuickLog() }}>Yes</button>
                        <button className="btn-ghost-sm" onClick={() => setConfirmId(null)}>No</button>
                      </>
                    ) : (
                      <button className="btn-ghost-sm" onClick={() => setConfirmId(tpl.id)}>✕</button>
                    )}
                  </div>
                </div>

                <p className="template-desc">{tpl.description}</p>

                {isActive ? (
                  <div className="quick-log-panel">
                    <div className="quick-log-title">Log hours for this meeting</div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Date</label>
                        <input type="date" value={quickDate} onChange={e => setQuickDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Hours (each person)</label>
                        <input
                          type="number"
                          value={quickHours}
                          onChange={e => setQuickHours(e.target.value)}
                          placeholder="e.g. 1.5"
                          step="0.25"
                          min="0.25"
                          max="24"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Who attended?</label>
                      <div className="user-checkbox-grid">
                        {tplUsers.map(name => (
                          <label key={name} className={`user-checkbox ${quickUsers.includes(name) ? 'checked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={quickUsers.includes(name)}
                              onChange={() => toggleQuickUser(name)}
                            />
                            {name}
                          </label>
                        ))}
                      </div>
                      {quickUsers.length > 1 && (
                        <p className="field-hint">Will create {quickUsers.length} entries — one per person.</p>
                      )}
                    </div>
                    {quickError && <p className="form-error">{quickError}</p>}
                    <div className="quick-log-actions">
                      <button className="btn-primary" onClick={() => handleQuickLog(tpl)} disabled={saving}>
                        {saving ? 'Saving…' : `Log ${quickUsers.length > 1 ? `for ${quickUsers.length} people` : 'Hours'}`}
                      </button>
                      <button className="btn-ghost-sm" onClick={closeQuickLog}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn-use-template" onClick={() => openQuickLog(tpl)}>
                    Use Template → Log Hours
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
