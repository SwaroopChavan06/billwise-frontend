import { useMemo, useState } from 'react'
import './App.css'

type Invoice = {
  invoiceNumber: string
  customerName: string
  issueDate: string
  total: number
  status: string
}

const initialInvoices: Invoice[] = [
  { invoiceNumber: 'INV/26-27/00042', customerName: 'Apex Architects', issueDate: '05 Nov 2026', total: 18560, status: 'Issued' },
  { invoiceNumber: 'INV/26-27/00041', customerName: 'Greenfield Events', issueDate: '04 Nov 2026', total: 9240, status: 'Issued' },
  { invoiceNumber: 'INV/26-27/00040', customerName: 'Northstar Retail', issueDate: '03 Nov 2026', total: 4375, status: 'Issued' },
]

function App() {
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [invoices, setInvoices] = useState(initialInvoices)
  const filteredInvoices = useMemo(
    () => invoices.filter((invoice) => `${invoice.invoiceNumber} ${invoice.customerName}`.toLowerCase().includes(query.toLowerCase())),
    [invoices, query],
  )

  function createInvoice() {
    const number = `INV/26-27/${String(invoices.length + 43).padStart(5, '0')}`
    setInvoices([{ invoiceNumber: number, customerName: 'New customer', issueDate: '05 Nov 2026', total: 0, status: 'Draft' }, ...invoices])
    setActive('Invoices')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">B</span><span>Billwise</span></div>
        <div className="workspace"><span className="workspace-dot" /> Brightline Studio <span>⌄</span></div>
        <nav>
          {['Overview', 'Invoices', 'Customers', 'Products', 'Inventory'].map((item) => (
            <button className={active === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setActive(item)}>
              <span className="nav-icon">{item === 'Overview' ? '⌂' : item === 'Invoices' ? '▤' : item === 'Customers' ? '♙' : item === 'Products' ? '□' : item === 'Inventory' ? '◫' : '◒'}</span>
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><span className="nav-icon">⚙</span> Settings</button>
          <div className="profile"><span className="avatar">AS</span><span><strong>Arjun Shah</strong><small>Administrator</small></span><span>⋮</span></div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {active}</div><div className="top-actions"><button className="icon-button">?</button><button className="icon-button">⌕</button><button className="notification">♢<i /></button></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">WEDNESDAY, 05 NOVEMBER 2026</p><h1>{active === 'Overview' ? 'Good morning, Arjun' : active}</h1><p className="muted">{active === 'Overview' ? 'Here is what is happening with your business today.' : `Manage your ${active.toLowerCase()} in one place.`}</p></div><button className="primary-button" onClick={createInvoice}>＋ Create invoice</button></div>
          {active === 'Overview' ? (
            <>
              <section className="metrics">
                <article className="metric-card"><div className="metric-label">Outstanding <span className="warning">● 3 due soon</span></div><strong>₹ 68,420</strong><small>Across 12 invoices</small><div className="sparkline orange" /></article>
                <article className="metric-card"><div className="metric-label">Invoices issued</div><strong>42</strong><small>This month</small><div className="sparkline blue" /></article>
                <article className="metric-card"><div className="metric-label">Low stock items <span className="warning">● 4 to review</span></div><strong>8</strong><small>Across your inventory</small><div className="sparkline purple" /></article>
              </section>
              <section className="dashboard-grid">
                <article className="panel"><div className="panel-heading"><div><h2>Recent invoices</h2><p className="muted">Latest billing activity</p></div><button className="text-button" onClick={() => setActive('Invoices')}>View all</button></div><div className="activity-list"><div><span className="activity-icon green">✓</span><span><strong>Invoice #00042 paid</strong><small>Apex Architects · 2 hours ago</small></span><b>₹ 18,560</b></div><div><span className="activity-icon purple">＋</span><span><strong>New invoice created</strong><small>Greenfield Events · 5 hours ago</small></span><b>₹ 9,240</b></div><div><span className="activity-icon orange">!</span><span><strong>Payment overdue</strong><small>Northstar Retail · Yesterday</small></span><b>₹ 4,375</b></div></div></article>
                <article className="panel"><div className="panel-heading"><div><h2>Inventory alerts</h2><p className="muted">Items that need attention</p></div><button className="text-button" onClick={() => setActive('Inventory')}>View inventory</button></div><div className="activity-list"><div><span className="activity-icon orange">!</span><span><strong>Premium matte paper</strong><small>Only 12 sheets remaining</small></span><b>Restock</b></div><div><span className="activity-icon orange">!</span><span><strong>Black toner cartridge</strong><small>Only 1 unit remaining</small></span><b>Restock</b></div><div><span className="activity-icon blue">✓</span><span><strong>Glossy photo paper</strong><small>Stock level is healthy</small></span><b>120</b></div></div></article>
              </section>
            </>
          ) : (
            <section className="panel invoice-table"><div className="panel-heading"><div><h2>{active} list</h2><p className="muted">Keep your records accurate and up to date.</p></div><div className="table-actions"><input placeholder="Search..." value={query} onChange={(event) => setQuery(event.target.value)} /><button className="secondary-button">Filter</button></div></div><table><thead><tr><th>Reference</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{filteredInvoices.map((invoice) => <tr key={invoice.invoiceNumber}><td><strong>{invoice.invoiceNumber}</strong></td><td>{invoice.customerName}</td><td>{invoice.issueDate}</td><td>₹ {invoice.total.toLocaleString('en-IN')}</td><td><span className={invoice.status === 'Issued' ? 'status issued' : 'status draft'}>{invoice.status}</span></td></tr>)}</tbody></table></section>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
