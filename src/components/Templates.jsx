import { useState } from 'react'
import { CATEGORIES, USERS } from '../constants'

const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))

const emptyForm = (user) => ({ name: '', user_name: user, category: '', property: '', description: '' })

export default function Templates({ templates, currentUser, onUse, onSave, onDelete }) {
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(() => emptyForm(currentUser))
  const [error, setError]         = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = () => {
    setError('')
    if (!form.name.trim())        return setError('Template name is required.')
    if (!form.category)           return setError('Please select a category.')
    if (!form.description.trim()) return setError('Description is required.')
    onSave({ ...form, name: form.name.trim(), description: form.description.trim() })
    setForm(emptyForm(currentUser))
    setShowForm(false)
  }

  return (
    <div className="templates-page">
      <div className="templates-header">
        <div>
          <h2>Templates</h2>
          <p className="templates-subtitle">Save recurring meetings or activities so you can log them in one tap.</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(s => !s); setError('') }}>
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
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Monthly CPA Meeting"
            />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label>Person</label>
              <select value={form.user_name} onChange={e => set('user_name', e.target.value)}>
                {USERS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Category <span className="field-required">*</span></label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">— Select —</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Property <span className="field-optional">(optional)</span></label>
            <input
              type="text"
              value={form.property}
              onChange={e => set('property', e.target.value)}
              placeholder="e.g. 123 Main St, or leave blank for general meetings"
            />
          </div>
          <div className="form-group">
            <label>Description <span className="field-required">*</span></label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Monthly meeting with CPA to review rental property income and expenses"
              rows={3}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" onClick={handleSave}>Save Template</button>
        </div>
      )}

      {templates.length === 0 && !showForm ? (
        <div className="templates-empty">
          <p>No templates yet.</p>
          <p>Create one for your recurring meetings — monthly CPA reviews, estate planner check-ins, financial planning sessions, etc.</p>
        </div>
      ) : (
        <div className="template-list">
          {templates.map(tpl => (
            <div key={tpl.id} className="template-card">
              <div className="template-top">
                <div>
                  <div className="template-name">{tpl.name}</div>
                  <div className="template-meta">
                    <span className={`entry-user ${tpl.user_name.toLowerCase()}`}>{tpl.user_name}</span>
                    <span className="template-cat">{CAT_LABEL[tpl.category] || tpl.category}</span>
                    {tpl.property && <span className="entry-property">📍 {tpl.property}</span>}
                  </div>
                </div>
                <div className="template-actions">
                  {confirmId === tpl.id ? (
                    <>
                      <span className="confirm-text">Delete?</span>
                      <button className="btn-danger-sm" onClick={() => { onDelete(tpl.id); setConfirmId(null) }}>Yes</button>
                      <button className="btn-ghost-sm" onClick={() => setConfirmId(null)}>No</button>
                    </>
                  ) : (
                    <button className="btn-ghost-sm" onClick={() => setConfirmId(tpl.id)}>✕</button>
                  )}
                </div>
              </div>
              <p className="template-desc">{tpl.description}</p>
              <button className="btn-use-template" onClick={() => onUse(tpl)}>
                Use Template → Log Hours
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
