'use client'

import { Component } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { title = 'Something went wrong', minimal = false } = this.props

    if (minimal) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
          <AlertTriangle size={20} style={{ marginBottom: 8, color: '#EF4444' }} />
          <p style={{ margin: 0 }}>Failed to load this section.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 8, fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', color: '#475569' }}>
            Retry
          </button>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', padding: 32 }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertTriangle size={24} color="#EF4444" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>{title}</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 24px', lineHeight: 1.6 }}>
            An unexpected error occurred in this section. You can retry or reload the page.
          </p>
          {this.state.error?.message && (
            <pre style={{ fontSize: 11, color: '#94A3B8', background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', marginBottom: 20, overflow: 'auto', textAlign: 'left', maxHeight: 100 }}>
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <RefreshCw size={14} /> Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFF', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }
}
