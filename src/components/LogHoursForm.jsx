import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { CATEGORIES, USERS } from '../constants'
import { normalizeProperty, dedupeProperties } from '../propertyUtils'

const today = () => new Date().toISOString().split('T')[0]

export default function LogHoursForm({ currentUser, year, onSaved }) {
  const [form, setForm] = useState({
    user_name:   currentUser,
    date:        today(),
    category:    '',
    hours:       '',
    property:    '',
    description: '',
  })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
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
  }, [])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.category)    return setError('Please select a category.')
    if (!form.description) return setError('Description is required.')
    const hrs = parseFloat(form.hours)
    if (!hrs || hrs <= 0)  return setError('Hours must be a positive number.')

    setSaving(true)
    const { error: err } = await supabase.from('entries').insert([{
      user_name:   form.user_name,
      date:        form.date,
      category:    form.category,
      hours:       hrs,
      property:    form.property ? normalizeProperty(form.property) : null,
      description: form.description,
      year,
    }])
    setSaving(false)

    if (err) {
      setError(`Failed to save: ${err.message}`)
    } else {
      onSaved()
    }
  }

  const selectedCat = CATEGORIES.find(c => c.id === form.category)

  return (
    <div className="log-form-wrap">
      <div className="log-form-card">
        <h2>Log Hours</h2>
        <form onSubmit={handleSubmit} className="log-form">

          <div className="form-row-2">
            <div className="form-group">
              <label>Person</label>
              <select value={form.user_name} onChange={e => set('user_name', e.target.value)}>
                {USERS.map(u => (
                  <option key={u.name} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                required
              >
                <option value="">— Select category —</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              {selectedCat && !selectedCat.countsForMaterial && (
                <p className="field-hint warning-hint">
                  ⚠️ Construction &amp; Development counts toward REPS total hours but NOT toward rental material participation.
                </p>
              )}
            </div>
            <div className="form-group">
              <label>Hours</label>
              <input
                type="number"
                value={form.hours}
                onChange={e => set('hours', e.target.value)}
                placeholder="e.g. 2.5"
                step="0.25"
                min="0.25"
                max="24"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Property <span className="field-optional">(optional)</span></label>
            <input
              type="text"
              list="property-list"
              value={form.property}
              onChange={e => set('property', e.target.value)}
              placeholder="e.g. 123 Main St"
              autoComplete="off"
            />
            <datalist id="property-list">
              {properties.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>

          <div className="form-group">
            <label>Description <span className="field-required">*</span></label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What did you do? Be specific for IRS documentation purposes."
              rows={3}
              required
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary btn-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </form>
      </div>
    </div>
  )
}
