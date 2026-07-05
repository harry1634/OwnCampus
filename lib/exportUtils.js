export function downloadCSV(filename, headers, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function openPrintWindow(title, bodyHTML, extraCSS = '') {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; color: #0f172a; } @media print { body { background: #fff; } .no-print { display: none !important; } } ${extraCSS}</style></head><body>${bodyHTML}</body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) { URL.revokeObjectURL(url); return false }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return true
}
