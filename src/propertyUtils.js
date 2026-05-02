// Normalize property addresses so minor variations (casing, extra spaces)
// don't create duplicate entries in the dropdown.
export const normalizeProperty = (s) =>
  s.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// Deduplicate a list of property strings case-insensitively, keeping the
// first occurrence after sorting.
export const dedupeProperties = (list) => {
  const seen = new Set()
  return list
    .map(p => (p || '').trim())
    .filter(Boolean)
    .sort()
    .filter(p => {
      const key = p.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
