import { useEffect, useState } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

async function readResponse(response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Something went wrong. Please try again.')
  }
  return response.status === 204 ? null : response.json()
}

export default function App() {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState({ description: '', amount: '', kind: 'expense' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadEntries() {
    try {
      setEntries(await readResponse(await fetch(`${API_URL}/transactions`)))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const income = entries
    .filter((entry) => entry.kind === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const expenses = entries
    .filter((entry) => entry.kind === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await readResponse(
        await fetch(`${API_URL}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }),
      )
      setForm({ description: '', amount: '', kind: form.kind })
      await loadEntries()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setError('')
    try {
      await readResponse(await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' }))
      setEntries((current) => current.filter((entry) => entry.id !== id))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Daybook home">
          <span className="brand-mark">D</span>
          <span>daybook</span>
        </a>
        <span className="top-note">PERSONAL FINANCE</span>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">YOUR MONEY, IN FOCUS</p>
          <h1>Keep the little things<br />in view.</h1>
        </div>
        <p className="intro-copy">A clear record of what comes in<br className="desktop-break" /> and what goes out.</p>
      </section>

      <section className="summary" aria-label="Money summary">
        <div className="balance">
          <span className="metric-label">CURRENT BALANCE</span>
          <strong>{money.format(income - expenses)}</strong>
          <span className="balance-caption">Across all entries</span>
        </div>
        <div className="metric metric-income">
          <span className="metric-label">INCOME</span>
          <strong>{money.format(income)}</strong>
        </div>
        <div className="metric metric-expense">
          <span className="metric-label">SPENDING</span>
          <strong>{money.format(expenses)}</strong>
        </div>
      </section>

      <section className="workspace">
        <form className="entry-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="section-index">01</span>
            <h2>New entry</h2>
          </div>
          <label className="field-label" htmlFor="description">What was it for?</label>
          <input
            id="description"
            name="description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="e.g. Weekly groceries"
            maxLength="120"
            required
          />
          <div className="form-row">
            <label className="amount-field">
              <span className="field-label">Amount</span>
              <span className="amount-input">
                <span>$</span>
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  placeholder="0.00"
                  required
                />
              </span>
            </label>
            <label className="kind-field">
              <span className="field-label">Type</span>
              <select
                name="kind"
                value={form.kind}
                onChange={(event) => setForm({ ...form, kind: event.target.value })}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
          </div>
          <button className="submit-button" type="submit" disabled={saving}>
            {saving ? 'Adding entry...' : 'Add entry'} <span aria-hidden="true">+</span>
          </button>
        </form>

        <section className="activity" aria-labelledby="activity-title">
          <div className="section-heading activity-heading">
            <span className="section-index">02</span>
            <h2 id="activity-title">Recent activity</h2>
            <span className="entry-count">{entries.length} {entries.length === 1 ? 'ENTRY' : 'ENTRIES'}</span>
          </div>
          {error && <p className="notice" role="alert">{error}</p>}
          {loading ? (
            <p className="empty-state">Loading your entries...</p>
          ) : entries.length === 0 ? (
            <p className="empty-state">Nothing here yet. Add your first entry to get started.</p>
          ) : (
            <ul className="entry-list">
              {entries.map((entry) => (
                <li className="entry" key={entry.id}>
                  <span className={`entry-symbol ${entry.kind}`} aria-hidden="true">
                    {entry.kind === 'income' ? '+' : '-'}
                  </span>
                  <div className="entry-description">
                    <strong>{entry.description}</strong>
                    <span>{new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}</span>
                  </div>
                  <strong className={`entry-amount ${entry.kind}`}>
                    {entry.kind === 'income' ? '+' : '-'}{money.format(entry.amount)}
                  </strong>
                  <button
                    className="remove-button"
                    type="button"
                    aria-label={`Remove ${entry.description}`}
                    onClick={() => handleDelete(entry.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
      <footer>DAYBOOK <span>·</span> A SMALL TOOL FOR EVERYDAY MONEY</footer>
    </main>
  )
}