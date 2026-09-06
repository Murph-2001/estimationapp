import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AccountSettings({ currentUser, onSaved, onClose }) {
  const [newName, setNewName]         = useState(currentUser)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm]         = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [saving, setSaving]           = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword && newPassword !== confirm) {
      setError('Passwords do not match.')
      return
    }

    const nameChanged = newName.trim() && newName.trim() !== currentUser
    const passChanged = newPassword.length > 0

    if (!nameChanged && !passChanged) {
      setError('No changes to save.')
      return
    }

    setSaving(true)

    const updates = {}
    if (nameChanged) updates.name = newName.trim()
    if (passChanged) updates.password = newPassword

    const { error: dbErr } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('name', currentUser)

    if (dbErr) {
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }

    if (nameChanged) {
      await supabase
        .from('entries')
        .update({ user_name: newName.trim() })
        .eq('user_name', currentUser)
    }

    setSaving(false)
    setSuccess('Settings saved! You will be logged out to apply changes.')
    setTimeout(() => onSaved(nameChanged ? newName.trim() : null), 1500)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2>Account Settings</h2>
        <p className="modal-subtitle">Change your display name or password.</p>
        <form onSubmit={handleSave} className="login-form">
          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>New Password <span className="optional">(leave blank to keep current)</span></label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
            />
          </div>
          {newPassword && (
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
              />
            </div>
          )}
          {error   && <p className="login-error">{error}</p>}
          {success && <p className="login-success">{success}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
