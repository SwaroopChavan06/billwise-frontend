import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Invoice = {
  id: string
  invoiceNumber: string
  customerName: string
  issueDate: string
  total: number
  status: string
}

const initialInvoices: Invoice[] = [
  { id: 'seed-42', invoiceNumber: 'INV/26-27/00042', customerName: 'Apex Architects', issueDate: '05 Nov 2026', total: 18560, status: 'Issued' },
  { id: 'seed-41', invoiceNumber: 'INV/26-27/00041', customerName: 'Greenfield Events', issueDate: '04 Nov 2026', total: 9240, status: 'Issued' },
  { id: 'seed-40', invoiceNumber: 'INV/26-27/00040', customerName: 'Northstar Retail', issueDate: '03 Nov 2026', total: 4375, status: 'Issued' },
]

type InvoiceForm = {
  customerName: string
  customerStateCode: string
  branchStateCode: string
  description: string
  hsnCode: string
  unit: string
  quantity: string
  rate: string
  discount: string
  gstRate: string
}

const emptyInvoiceForm: InvoiceForm = {
  customerName: '',
  customerStateCode: '27',
  branchStateCode: '27',
  description: '',
  hsnCode: '',
  unit: 'piece',
  quantity: '1',
  rate: '',
  discount: '0',
  gstRate: '18',
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function App() {
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [invoices, setInvoices] = useState(initialInvoices)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm)
  const [isSavingInvoice, setIsSavingInvoice] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')
  const filteredInvoices = useMemo(
    () => invoices.filter((invoice) => `${invoice.invoiceNumber} ${invoice.customerName}`.toLowerCase().includes(query.toLowerCase())),
    [invoices, query],
  )

  function openInvoiceModal() {
    setInvoiceError('')
    setInvoiceForm(emptyInvoiceForm)
    setIsInvoiceModalOpen(true)
  }

  function updateInvoiceForm(field: keyof InvoiceForm, value: string) {
    setInvoiceForm((current) => ({ ...current, [field]: value }))
  }

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInvoiceError('')
    setIsSavingInvoice(true)
    const id = `draft-${crypto.randomUUID()}`

    try {
      const response = await fetch(`${apiUrl}/api/v1/invoices/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          customerName: invoiceForm.customerName.trim(),
          customerStateCode: invoiceForm.customerStateCode,
          branchStateCode: invoiceForm.branchStateCode,
          lines: [{
            description: invoiceForm.description.trim(),
            hsnCode: invoiceForm.hsnCode.trim(),
            unit: invoiceForm.unit.trim(),
            quantity: Number(invoiceForm.quantity),
            rate: Number(invoiceForm.rate),
            discount: Number(invoiceForm.discount),
            gstRate: Number(invoiceForm.gstRate),
          }],
        }),
      })
      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(errorBody || 'The invoice could not be saved.')
      }

      setInvoices((current) => [{
        id,
        invoiceNumber: 'Draft',
        customerName: invoiceForm.customerName.trim(),
        issueDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        total: 0,
        status: 'Draft',
      }, ...current])
      setIsInvoiceModalOpen(false)
      setActive('Invoices')
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'The invoice could not be saved.')
    } finally {
      setIsSavingInvoice(false)
    }
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
          <div className="page-heading"><div><p className="eyebrow">WEDNESDAY, 05 NOVEMBER 2026</p><h1>{active === 'Overview' ? 'Good morning, Arjun' : active}</h1><p className="muted">{active === 'Overview' ? 'Here is what is happening with your business today.' : `Manage your ${active.toLowerCase()} in one place.`}</p></div><button className="primary-button" onClick={openInvoiceModal}>＋ Create invoice</button></div>
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
            <section className="panel invoice-table"><div className="panel-heading"><div><h2>{active} list</h2><p className="muted">Keep your records accurate and up to date.</p></div><div className="table-actions"><input placeholder="Search..." value={query} onChange={(event) => setQuery(event.target.value)} /><button className="secondary-button">Filter</button></div></div><table><thead><tr><th>Reference</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{filteredInvoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.invoiceNumber}</strong></td><td>{invoice.customerName}</td><td>{invoice.issueDate}</td><td>₹ {invoice.total.toLocaleString('en-IN')}</td><td><span className={invoice.status === 'Issued' ? 'status issued' : 'status draft'}>{invoice.status}</span></td></tr>)}</tbody></table></section>
          )}
        </div>
      </main>
      {isInvoiceModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsInvoiceModalOpen(false)}>
          <div className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="create-invoice-title">
            <div className="modal-heading"><div><p className="eyebrow">NEW BILLING DOCUMENT</p><h2 id="create-invoice-title">Create invoice</h2><p className="muted">Save a draft to the billing API. You can issue it after review.</p></div><button className="close-button" type="button" onClick={() => setIsInvoiceModalOpen(false)} aria-label="Close">×</button></div>
            <form onSubmit={createInvoice}>
              <div className="form-section"><h3>Customer details</h3><div className="form-grid"><label>Customer name<input required value={invoiceForm.customerName} onChange={(event) => updateInvoiceForm('customerName', event.target.value)} placeholder="Apex Architects" /></label><label>Customer state code<input required pattern="[0-9]{2}" title="Enter the two-digit GST state code" value={invoiceForm.customerStateCode} onChange={(event) => updateInvoiceForm('customerStateCode', event.target.value)} placeholder="27" /></label><label>Branch state code<input required pattern="[0-9]{2}" title="Enter the two-digit GST state code" value={invoiceForm.branchStateCode} onChange={(event) => updateInvoiceForm('branchStateCode', event.target.value)} placeholder="27" /></label></div></div>
              <div className="form-section"><h3>Line item</h3><div className="form-grid"><label className="wide-field">Description<input required value={invoiceForm.description} onChange={(event) => updateInvoiceForm('description', event.target.value)} placeholder="Business cards" /></label><label>HSN code<input required value={invoiceForm.hsnCode} onChange={(event) => updateInvoiceForm('hsnCode', event.target.value)} placeholder="4911" /></label><label>Unit<input required value={invoiceForm.unit} onChange={(event) => updateInvoiceForm('unit', event.target.value)} placeholder="piece" /></label><label>Quantity<input required min="0.001" step="0.001" type="number" value={invoiceForm.quantity} onChange={(event) => updateInvoiceForm('quantity', event.target.value)} /></label><label>Rate (₹)<input required min="0" step="0.01" type="number" value={invoiceForm.rate} onChange={(event) => updateInvoiceForm('rate', event.target.value)} placeholder="1000" /></label><label>Discount (₹)<input min="0" step="0.01" type="number" value={invoiceForm.discount} onChange={(event) => updateInvoiceForm('discount', event.target.value)} /></label><label>GST rate (%)<input required min="0" step="0.01" type="number" value={invoiceForm.gstRate} onChange={(event) => updateInvoiceForm('gstRate', event.target.value)} /></label></div></div>
              {invoiceError && <p className="form-error" role="alert">{invoiceError}</p>}
              <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={isSavingInvoice}>{isSavingInvoice ? 'Saving…' : 'Save draft'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
