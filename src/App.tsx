import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Product = {
  id: string
  name: string
  sku: string
  hsnCode: string
  unit: string
  gstRate: number
  sellingPrice: number
  quantityAvailable: number
}

type Invoice = {
  id: string
  invoiceNumber: string
  customerName: string
  issueDate: string
  total: number
  status: string
}

type Customer = {
  id: string
  name: string
  phone: string
  stateCode: string
  outstanding: number
}

type InvoiceLine = {
  productId: string
  description: string
  hsnCode: string
  unit: string
  quantity: string
  rate: string
  discount: string
  gstRate: string
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const emptyLine = (): InvoiceLine => ({ productId: '', description: '', hsnCode: '', unit: 'piece', quantity: '1', rate: '', discount: '0', gstRate: '18' })
const initialInvoices: Invoice[] = [
  { id: 'seed-42', invoiceNumber: 'INV/26-27/00042', customerName: 'Apex Architects', issueDate: '05 Nov 2026', total: 18560, status: 'Issued' },
  { id: 'seed-41', invoiceNumber: 'INV/26-27/00041', customerName: 'Greenfield Events', issueDate: '04 Nov 2026', total: 9240, status: 'Issued' },
  { id: 'seed-40', invoiceNumber: 'INV/26-27/00040', customerName: 'Northstar Retail', issueDate: '03 Nov 2026', total: 4375, status: 'Issued' },
]
const customers: Customer[] = [
  { id: 'cust-1', name: 'Apex Architects', phone: '+91 98765 43210', stateCode: '27', outstanding: 18560 },
  { id: 'cust-2', name: 'Greenfield Events', phone: '+91 98200 11223', stateCode: '27', outstanding: 9240 },
  { id: 'cust-3', name: 'Northstar Retail', phone: '+91 98100 44556', stateCode: '29', outstanding: 4375 },
]

function App() {
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [invoices, setInvoices] = useState(initialInvoices)
  const [products, setProducts] = useState<Product[]>([])
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerStateCode, setCustomerStateCode] = useState('27')
  const [branchStateCode, setBranchStateCode] = useState('27')
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()])
  const [isSavingInvoice, setIsSavingInvoice] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')
  const [productResults, setProductResults] = useState<Record<number, Product[]>>({})

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/products`)
      .then((response) => response.ok ? response.json() as Promise<Product[]> : Promise.reject(new Error('Products could not be loaded.')))
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  const filteredInvoices = useMemo(
    () => invoices.filter((invoice) => `${invoice.invoiceNumber} ${invoice.customerName}`.toLowerCase().includes(query.toLowerCase())),
    [invoices, query],
  )

  function openInvoiceModal() {
    setInvoiceError('')
    setCustomerName('')
    setCustomerStateCode('27')
    setBranchStateCode('27')
    setLines([emptyLine()])
    setProductResults({})
    setIsInvoiceModalOpen(true)
  }

  function updateLine(index: number, field: keyof InvoiceLine, value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line))
  }

  function searchProducts(index: number, value: string) {
    updateLine(index, 'description', value)
    const matches = products.filter((product) => `${product.name} ${product.sku} ${product.hsnCode}`.toLowerCase().includes(value.toLowerCase()))
    setProductResults((current) => ({ ...current, [index]: value.trim() ? matches : products }))
  }

  function selectProduct(index: number, product: Product) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? {
      ...line,
      productId: product.id,
      description: product.name,
      hsnCode: product.hsnCode,
      unit: product.unit,
      rate: String(product.sellingPrice),
      gstRate: String(product.gstRate),
    } : line))
    setProductResults((current) => ({ ...current, [index]: [] }))
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
          customerName: customerName.trim(),
          customerStateCode,
          branchStateCode,
          lines: lines.map((line) => ({ ...line, quantity: Number(line.quantity), rate: Number(line.rate), discount: Number(line.discount), gstRate: Number(line.gstRate) })),
        }),
      })
      if (!response.ok) throw new Error(await response.text() || 'The invoice could not be saved.')
      setInvoices((current) => [{ id, invoiceNumber: 'Draft', customerName: customerName.trim(), issueDate: today, total: 0, status: 'Draft' }, ...current])
      setIsInvoiceModalOpen(false)
      setActive('Overview')
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'The invoice could not be saved.')
    } finally {
      setIsSavingInvoice(false)
    }
  }

  function renderTable() {
    if (active === 'Customers') return <DataTable headers={['Customer', 'Phone', 'State code', 'Outstanding']} rows={customers.map((customer) => [customer.name, customer.phone, customer.stateCode, `₹ ${customer.outstanding.toLocaleString('en-IN')}`])} />
    if (active === 'Products') return <DataTable headers={['Product', 'SKU', 'HSN code', 'Unit', 'Selling price']} rows={products.map((product) => [product.name, product.sku, product.hsnCode, product.unit, `₹ ${product.sellingPrice.toLocaleString('en-IN')}`])} />
    if (active === 'Inventory') return <DataTable headers={['Product', 'SKU', 'Unit', 'Quantity available', 'Stock status']} rows={products.map((product) => [product.name, product.sku, product.unit, String(product.quantityAvailable), product.quantityAvailable <= 12 ? 'Low stock' : 'In stock'])} />
    return <DataTable headers={['Reference', 'Customer', 'Date', 'Amount', 'Status']} rows={filteredInvoices.map((invoice) => [invoice.invoiceNumber, invoice.customerName, invoice.issueDate, `₹ ${invoice.total.toLocaleString('en-IN')}`, invoice.status])} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">B</span><span>Billwise</span></div>
        <div className="workspace"><span className="workspace-dot" /> Your business <span>⌄</span></div>
        <nav>{['Overview', 'Invoices', 'Customers', 'Products', 'Inventory'].map((item) => <button className={active === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setActive(item)}><span className="nav-icon">{item === 'Overview' ? '⌂' : item === 'Invoices' ? '▤' : item === 'Customers' ? '♙' : item === 'Products' ? '□' : '◫'}</span>{item}</button>)}</nav>
        <div className="sidebar-bottom"><button className="nav-item"><span className="nav-icon">⚙</span> Settings</button><div className="profile"><span className="avatar">AS</span><span><strong>Administrator</strong><small>Billing workspace</small></span><span>⋮</span></div></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {active}</div><div className="top-actions"><button className="icon-button">?</button><button className="icon-button">⌕</button><button className="notification">♢<i /></button></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">WEDNESDAY, 05 NOVEMBER 2026</p><h1>{active === 'Overview' ? 'Good morning' : active}</h1><p className="muted">{active === 'Overview' ? 'Here is what is happening with your business today.' : `Manage your ${active.toLowerCase()} in one place.`}</p></div><button className="primary-button" onClick={openInvoiceModal}>＋ Create invoice</button></div>
          {active === 'Overview' ? <><section className="metrics"><article className="metric-card"><div className="metric-label">Outstanding <span className="warning">● 3 due soon</span></div><strong>₹ 68,420</strong><small>Across 12 invoices</small><div className="sparkline orange" /></article><article className="metric-card"><div className="metric-label">Invoices issued</div><strong>42</strong><small>This month</small><div className="sparkline blue" /></article><article className="metric-card"><div className="metric-label">Low stock items <span className="warning">● 4 to review</span></div><strong>8</strong><small>Across your inventory</small><div className="sparkline purple" /></article></section><section className="panel invoice-table overview-table"><div className="panel-heading"><div><h2>Invoices</h2><p className="muted">Latest invoices across your business</p></div><button className="text-button" onClick={() => setActive('Invoices')}>View all</button></div>{renderTable()}</section></> : <section className="panel invoice-table"><div className="panel-heading"><div><h2>{active} list</h2><p className="muted">Keep your records accurate and up to date.</p></div><div className="table-actions"><input placeholder="Search..." value={query} onChange={(event) => setQuery(event.target.value)} /><button className="secondary-button">Filter</button></div></div>{renderTable()}</section>}
        </div>
      </main>
      {isInvoiceModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsInvoiceModalOpen(false)}><div className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="create-invoice-title"><div className="modal-heading"><div><p className="eyebrow">NEW BILLING DOCUMENT</p><h2 id="create-invoice-title">Create invoice</h2><p className="muted">Search products and add as many items as needed.</p></div><button className="close-button" type="button" onClick={() => setIsInvoiceModalOpen(false)} aria-label="Close">×</button></div><form onSubmit={createInvoice}><div className="form-section"><h3>Customer details</h3><div className="form-grid"><label>Customer name<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Apex Architects" /></label><label>Customer state code<input required pattern="[0-9]{2}" value={customerStateCode} onChange={(event) => setCustomerStateCode(event.target.value)} placeholder="27" /></label><label>Branch state code<input required pattern="[0-9]{2}" value={branchStateCode} onChange={(event) => setBranchStateCode(event.target.value)} placeholder="27" /></label></div></div><div className="form-section"><div className="line-items-heading"><h3>Items</h3><button className="text-button" type="button" onClick={() => setLines((current) => [...current, emptyLine()])}>＋ Add item</button></div>{lines.map((line, index) => <div className="line-item" key={index}><label className="product-search">Product<input required value={line.description} onChange={(event) => searchProducts(index, event.target.value)} placeholder="Search product by name, SKU or HSN" />{(productResults[index] ?? []).length > 0 && <div className="product-dropdown">{(productResults[index] ?? []).map((product) => <button type="button" key={product.id} onClick={() => selectProduct(index, product)}><strong>{product.name}</strong><small>{product.sku} · HSN {product.hsnCode} · ₹ {product.sellingPrice} / {product.unit}</small></button>)}</div>}</label><label>HSN<input required value={line.hsnCode} onChange={(event) => updateLine(index, 'hsnCode', event.target.value)} /></label><label>Unit<input required value={line.unit} onChange={(event) => updateLine(index, 'unit', event.target.value)} /></label><label>Qty<input required min="0.001" step="0.001" type="number" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} /></label><label>Rate (₹)<input required min="0" step="0.01" type="number" value={line.rate} onChange={(event) => updateLine(index, 'rate', event.target.value)} /></label><label>GST %<input required min="0" step="0.01" type="number" value={line.gstRate} onChange={(event) => updateLine(index, 'gstRate', event.target.value)} /></label>{lines.length > 1 && <button className="remove-line" type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove</button>}</div>)}</div>{invoiceError && <p className="form-error" role="alert">{invoiceError}</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={isSavingInvoice}>{isSavingInvoice ? 'Saving…' : 'Save draft'}</button></div></form></div></div>}
    </div>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}><strong className={cellIndex === 0 ? 'table-primary' : undefined}>{cell}</strong></td>)}</tr>) : <tr><td className="empty-table" colSpan={headers.length}>No records found.</td></tr>}</tbody></table>
}

export default App
