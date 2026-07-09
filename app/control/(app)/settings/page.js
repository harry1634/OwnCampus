'use client'

import { useEffect, useState } from 'react'
import { Settings, Save, Eye, EyeOff, Check } from 'lucide-react'
import { toast } from 'sonner'

const SECTIONS = [
  {
    title:  'Company Info',
    fields: [
      { key: 'company_name',  label: 'Company Name',    type: 'text' },
      { key: 'company_email', label: 'Company Email',   type: 'email' },
      { key: 'support_email', label: 'Support Email',   type: 'email' },
    ],
  },
  {
    title:  'GST & Billing',
    fields: [
      { key: 'gst_number',     label: 'GST Number',      type: 'text' },
      { key: 'gst_percent',    label: 'GST %',           type: 'number' },
      { key: 'invoice_prefix', label: 'Invoice Prefix',  type: 'text', hint: 'e.g. OC → OC-20260704-00001' },
      { key: 'currency',       label: 'Currency',        type: 'text', hint: 'e.g. INR' },
    ],
  },
  {
    title:  'SMTP / Email',
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text' },
      { key: 'smtp_port', label: 'SMTP Port', type: 'number' },
      { key: 'smtp_user', label: 'SMTP User', type: 'email' },
      { key: 'smtp_pass', label: 'SMTP Password', type: 'password' },
    ],
  },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState({})
  const [loading,  setLoading ] = useState(true)
  const [saving,   setSaving  ] = useState(false)
  const [showPwd,  setShowPwd ] = useState(false)
  const [saved,    setSaved   ] = useState(false)

  useEffect(() => {
    fetch('/api/control/settings')
      .then(r => r.json())
      .then(d => {
        // Unwrap JSONB string values
        const flat = {}
        Object.entries(d.settings || {}).forEach(([k, v]) => {
          flat[k] = typeof v === 'string' ? v : String(v ?? '')
        })
        setSettings(flat)
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/control/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Settings saved.')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  const inputStyle = {
    width: '100%', height: 42, boxSizing: 'border-box', padding: '0 12px',
    border: '1px solid #C0D5E9', borderRadius: 9, fontSize: 13.5, color: '#0F172A',
    fontFamily: 'inherit', outline: 'none', background: '#FAFCFF',
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
      <div style={{ width: 26, height: 26, border: '2.5px solid #C0D5E9', borderTop: '2.5px solid #3B82F6', borderRadius: '50%' }} className="animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 4px' }}>System Settings</h1>
          <p style={{ fontSize: 13.5, color: '#64748B', margin: 0 }}>Configure company-wide settings for the platform</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 120 }}>
          {saved
            ? <><Check size={14} /> Saved</>
            : saving
              ? 'Saving…'
              : <><Save size={14} /> Save All</>
          }
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {SECTIONS.map(section => (
          <div key={section.title} style={{
            background: '#FFFFFF', border: '1px solid #C0D5E9', borderRadius: 16, padding: 28,
            boxShadow: '0 1px 4px rgba(26,58,96,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={15} color="#1D4ED8" />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{section.title}</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {section.fields.map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>
                    {field.label}
                    {field.hint && <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 4 }}>— {field.hint}</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={field.type === 'password' && !showPwd ? 'password' : field.type === 'password' ? 'text' : field.type}
                      value={settings[field.key] ?? ''}
                      onChange={e => setSettings(p => ({ ...p, [field.key]: e.target.value }))}
                      style={{ ...inputStyle, paddingRight: field.type === 'password' ? 40 : 12 }}
                    />
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Danger zone placeholder */}
        <div style={{
          background: '#FFFBFB', border: '1px solid #FECACA', borderRadius: 16, padding: 24,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#B91C1C', margin: '0 0 8px' }}>Data & Security</h3>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
            Company user management, password resets, and session cleanup are handled directly in the Supabase dashboard.
          </p>
          <div style={{ fontSize: 12.5, color: '#94A3B8', padding: '10px 14px', background: '#FEF2F2', borderRadius: 9, border: '1px solid #FECACA' }}>
            All control center API routes are protected by RLS deny-all policies. Only the service role key can access these tables.
          </div>
        </div>
      </div>
    </div>
  )
}
