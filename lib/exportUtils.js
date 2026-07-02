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
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; color: #0f172a; }
    @media print { body { background: #fff; } .no-print { display: none !important; } }
    ${extraCSS}
  </style></head><body>${bodyHTML}</body></html>`)
  win.document.close()
  // Use timeout — load event may have already fired synchronously after document.close()
  setTimeout(() => { try { win.print() } catch(e) {} }, 250)
}
