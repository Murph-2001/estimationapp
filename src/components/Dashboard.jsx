import { useMemo } from 'react'
import { CATEGORIES, USERS, REPS_THRESHOLD, RENTAL_THRESHOLD } from '../constants'
import ProgressBar from './ProgressBar'

const MATERIAL_IDS = new Set(
  CATEGORIES.filter(c => c.countsForMaterial).map(c => c.id)
)

function calcStats(entries) {
  const totalHours  = entries.reduce((s, e) => s + Number(e.hours), 0)
  const rentalHours = entries
    .filter(e => MATERIAL_IDS.has(e.category))
    .reduce((s, e) => s + Number(e.hours), 0)
  return { totalHours, rentalHours }
}

function UserCard({ name, entries, isCurrentUser }) {
  const { totalHours, rentalHours } = useMemo(() => calcStats(entries), [entries])
  const repsMet   = totalHours  >= REPS_THRESHOLD
  const rentalMet = rentalHours >= RENTAL_THRESHOLD
  const qualifies = repsMet && rentalMet

  const byCat = useMemo(() => {
    const map = {}
    CATEGORIES.forEach(c => { map[c.id] = 0 })
    entries.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.hours) })
    return map
  }, [entries])

  return (
    <div className={`user-card ${isCurrentUser ? 'user-card-current' : ''}`}>
      <div className="user-card-header">
        <h2>{name}</h2>
        <span className={`status-badge ${qualifies ? 'status-qualified' : 'status-pending'}`}>
          {qualifies ? 'REPS Qualified' : 'In Progress'}
        </span>
      </div>

      <div className="progress-group">
        <ProgressBar
          value={totalHours}
          max={REPS_THRESHOLD}
          label="Total REPS Hours"
          sublabel="Requirement: 500+ hours in real estate"
          color="#6366f1"
        />
        <ProgressBar
          value={rentalHours}
          max={RENTAL_THRESHOLD}
          label="Rental Material Participation Hours"
          sublabel="Requirement: 500+ hours in rental activities"
          color="#f59e0b"
        />
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-value">{totalHours.toFixed(1)}</div>
          <div className="stat-label">Total Hours</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{rentalHours.toFixed(1)}</div>
          <div className="stat-label">Rental Hours</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{entries.length}</div>
          <div className="stat-label">Entries</div>
        </div>
      </div>

      <div className="cat-breakdown">
        <h3>Hours by Category</h3>
        <div className="cat-list">
          {CATEGORIES.map(cat => (
            byCat[cat.id] > 0 && (
              <div key={cat.id} className="cat-row">
                <span className="cat-name">
                  {cat.label}
                  {!cat.countsForMaterial && (
                    <span className="cat-badge-no-rental" title="Does not count toward rental material participation">
                      REPS only
                    </span>
                  )}
                </span>
                <span className="cat-hours">{byCat[cat.id].toFixed(1)} hrs</span>
              </div>
            )
          ))}
          {Object.values(byCat).every(v => v === 0) && (
            <p className="no-entries-msg">No hours logged yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ entries, year, currentUser }) {
  const byUser = useMemo(() => {
    const map = {}
    USERS.forEach(u => { map[u.name] = [] })
    entries.forEach(e => {
      if (map[e.user_name]) map[e.user_name].push(e)
    })
    return map
  }, [entries])

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <h2>{year} REPS Progress</h2>
        <p>IRS Real Estate Professional Status — 500 total hours &amp; 500 rental hours required per person</p>
      </div>
      <div className="user-cards">
        {USERS.map(u => (
          <UserCard
            key={u.name}
            name={u.name}
            entries={byUser[u.name] || []}
            isCurrentUser={currentUser === u.name}
          />
        ))}
      </div>
    </div>
  )
}
