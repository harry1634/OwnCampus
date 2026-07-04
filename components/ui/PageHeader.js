'use client'

/**
 * PageHeader — Standard page header for the DS sprint.
 * Renders the .page-header zone with title, subtitle, and an actions slot.
 *
 * Props:
 *  title     — page title string
 *  subtitle  — optional subtitle string
 *  actions   — React node(s) for the right-side action buttons
 *  className — extra class on the wrapper
 */
export default function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`page-header ${className}`}>
      <div>
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-sub">{subtitle}</p>}
      </div>
      {actions && (
        <div className="page-actions">{actions}</div>
      )}
    </div>
  )
}
