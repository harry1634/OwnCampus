'use client'

import { Search } from 'lucide-react'

/**
 * Toolbar — Universal search + filter + action bar.
 *
 * Props:
 *  search        — current search value
 *  onSearch      — onChange handler
 *  placeholder   — search placeholder text
 *  filters       — React node for dropdowns / selects
 *  actions       — React node for right-side action buttons
 *  count         — { current, total, label } — shows "N / M label" on the right
 *  noBorder      — omit the bottom border
 *  style         — extra style on wrapper
 */
export default function Toolbar({
  search,
  onSearch,
  placeholder = 'Search…',
  filters,
  actions,
  count,
  noBorder = false,
  style,
}) {
  return (
    <div
      className="ds-toolbar"
      style={{ borderBottom: noBorder ? 'none' : undefined, ...style }}>

      {/* Search input */}
      {onSearch !== undefined && (
        <div className="ds-toolbar-search">
          <Search size={13} className="ds-toolbar-search-icon" />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder={placeholder}
            className="input-premium"
            style={{ paddingLeft: 34, fontSize: 13 }}
          />
        </div>
      )}

      {/* Filters (selects / dropdowns) */}
      {filters && (
        <div className="ds-toolbar-filters">{filters}</div>
      )}

      {/* Count label */}
      {count && (
        <span style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', whiteSpace: 'nowrap' }}>
          {count.current} / {count.total} {count.label}
        </span>
      )}

      {/* Right-side actions */}
      {actions && (
        <div className="ds-toolbar-actions">{actions}</div>
      )}
    </div>
  )
}
