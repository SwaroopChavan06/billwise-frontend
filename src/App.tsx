import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
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

type Customer = {
  id: string
  name: string
  gstin?: string
  phone: string
  email: string
  address: string
  stateCode: string
}

type Invoice = {
  id: string
  customerId?: string
  invoiceNumber: string
  customerName: string
  issueDate: string
  subtotal: number
  cgst: number
  sgst: number
  igst: number
  total: number
  status: 'DRAFT' | 'ISSUED'
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

type CustomerForm = {
  name: string
  phone: string
  email: string
  address: string
  stateCode: string
  gstin: string
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const emptyLine = (): InvoiceLine => ({ productId: '', description: '', hsnCode: '', unit: '', quantity: '1', rate: '', discount: '0', gstRate: '' })
const emptyCustomerForm: CustomerForm = { name: '', phone: '', email: '', address: '', stateCode: '27', gstin: '' }
const navigation = ['Overview', 'Invoices', 'Customers', 'Products', 'Inventory']

function App() {
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [todayLabel] = useState(() => new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).toUpperCase())
  const [loadError, setLoadError] = useState('')
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm)
  const [customerError, setCustomerError] = useState('')
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [selectedInvoiceCustomer, setSelectedInvoiceCustomer] = useState<Customer | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [branchStateCode, setBranchStateCode] = useState('27')
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()])
  const [productResults, setProductResults] = useState<Record<number, Product[]>>({})
  const [isSavingInvoice, setIsSavingInvoice] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')

  async function loadResource<T>(path: string): Promise<T> {
    const response = await fetch(`${apiUrl}${path}`)
    if (!response.ok) throw new Error(`Could not load ${path}. (${response.status})`)
    return response.json() as Promise<T>
  }

  async function refreshInvoices() {
    setInvoices(await loadResource<Invoice[]>('/api/v1/invoices'))
  }

  useEffect(() => {
    Promise.all([
      loadResource<Invoice[]>('/api/v1/invoices'),
      loadResource<Customer[]>('/api/v1/customers'),
      loadResource<Product[]>('/api/v1/products'),
    ]).then(([invoiceData, customerData, productData]) => {
      setInvoices(invoiceData)
      setCustomers(customerData)
      setProducts(productData)
      setLoadError('')
    }).catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Could not load billing data.')
    })
  }, [])

  const filteredInvoices = useMemo(
    () => invoices.filter((invoice) =>
      (!selectedInvoiceCustomer || invoice.customerId === selectedInvoiceCustomer.id) &&
      `${invoice.invoiceNumber} ${invoice.customerName}`.toLowerCase().includes(query.toLowerCase())),
    [invoices, query, selectedInvoiceCustomer],
  )

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query.toLowerCase())),
    [customers, query],
  )

  const filteredProducts = useMemo(
    () => products.filter((product) => `${product.name} ${product.sku} ${product.hsnCode}`.toLowerCase().includes(query.toLowerCase())),
    [products, query],
  )

  function openInvoiceModal() {
    setInvoiceError('')
    setCustomerQuery('')
    setSelectedCustomer(null)
    setBranchStateCode('27')
    setLines([emptyLine()])
    setProductResults({})
    setIsInvoiceModalOpen(true)
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCustomerError('')
    setIsSavingCustomer(true)
    try {
      const response = await fetch(`${apiUrl}/api/v1/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customerForm,
          name: customerForm.name.trim(),
          phone: customerForm.phone.trim(),
          email: customerForm.email.trim(),
          address: customerForm.address.trim(),
          gstin: customerForm.gstin.trim() || undefined,
        }),
      })
      if (!response.ok) throw new Error(await response.text() || `Customer could not be created (${response.status}).`)
      const createdCustomer = await response.json() as Customer
      setCustomers((current) => [...current, createdCustomer])
      setCustomerForm(emptyCustomerForm)
      setIsCustomerModalOpen(false)
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : 'The customer could not be created.')
    } finally {
      setIsSavingCustomer(false)
    }
  }

  function showCustomerInvoices(customer: Customer) {
    setSelectedInvoiceCustomer(customer)
    setQuery('')
    setActive('Invoices')
  }

  function showAllInvoices() {
    setSelectedInvoiceCustomer(null)
    setQuery('')
  }

  function updateLine(index: number, field: keyof InvoiceLine, value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index
      ? { ...line, [field]: value, ...(field === 'description' ? { productId: '', hsnCode: '', unit: '', rate: '', gstRate: '' } : {}) }
      : line))
  }

  function searchProducts(index: number, value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index
      ? { ...line, description: value, productId: '', hsnCode: '', unit: '', rate: '', gstRate: '' }
      : line))
    const normalized = value.trim().toLowerCase()
    const matches = products.filter((product) => `${product.name} ${product.sku} ${product.hsnCode}`.toLowerCase().includes(normalized))
    setProductResults((current) => ({ ...current, [index]: normalized ? matches : products }))
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

  const invoicePreview = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity)
    const rate = Number(line.rate)
    const discount = Number(line.discount)
    const gstRate = Number(line.gstRate)
    const taxable = Math.max(0, quantity * rate - discount)
    const tax = taxable * gstRate / 100
    return {
      subtotal: sum.subtotal + quantity * rate,
      tax: sum.tax + tax,
      total: sum.total + taxable + tax,
    }
  }, { subtotal: 0, tax: 0, total: 0 })

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInvoiceError('')
    if (!selectedCustomer) {
      setInvoiceError('Select a customer from the suggestions so their billing details can be included.')
      return
    }
    if (lines.some((line) => !line.productId)) {
      setInvoiceError('Select a product from the suggestions for every invoice item.')
      return
    }

    setIsSavingInvoice(true)
    const id = `invoice-${crypto.randomUUID()}`
    try {
      const response = await fetch(`${apiUrl}/api/v1/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phone,
          customerEmail: selectedCustomer.email,
          customerAddress: selectedCustomer.address,
          customerGstin: selectedCustomer.gstin,
          customerStateCode: selectedCustomer.stateCode,
          branchStateCode,
          lines: lines.map((line) => ({
            productId: line.productId,
            description: line.description,
            hsnCode: line.hsnCode,
            unit: line.unit,
            quantity: Number(line.quantity),
            rate: Number(line.rate),
            discount: Number(line.discount),
            gstRate: Number(line.gstRate),
          })),
        }),
      })
      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(errorBody || `Invoice could not be created (${response.status}).`)
      }
      const createdInvoice = await response.json() as Invoice
      setInvoices((current) => [createdInvoice, ...current])
      setIsInvoiceModalOpen(false)
      setActive('Invoices')
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'The invoice could not be created.')
    } finally {
      setIsSavingInvoice(false)
    }
  }

  function renderInvoiceTable(records: Invoice[]) {
    return <DataTable
      headers={['Invoice number', 'Customer', 'Date', 'Subtotal', 'Total', 'Status', 'PDF']}
      rows={records.map((invoice) => [
        invoice.invoiceNumber || 'Draft',
        invoice.customerName,
        new Date(invoice.issueDate).toLocaleDateString('en-IN'),
        currency(invoice.subtotal),
        currency(invoice.total),
        invoice.status,
        <a className="download-button" href={`${apiUrl}/api/v1/invoices/${encodeURIComponent(invoice.id)}/print`} key={invoice.id} target="_blank" rel="noreferrer">Print / Save PDF</a>,
      ])}
    />
  }

  function renderTable() {
    if (active === 'Customers') return <DataTable
      headers={['Customer', 'Phone', 'Address', 'Invoices']}
      rows={filteredCustomers.map((customer) => [
        customer.name,
        customer.phone,
        customer.address,
        <button className="text-button customer-invoices-button" key={customer.id} onClick={() => showCustomerInvoices(customer)}>View invoices</button>,
      ])}
    />
    if (active === 'Products') return <DataTable
      headers={['Product', 'SKU', 'HSN code', 'Unit', 'Selling price']}
      rows={filteredProducts.map((product) => [product.name, product.sku, product.hsnCode, product.unit, currency(product.sellingPrice)])}
    />
    if (active === 'Inventory') return <DataTable
      headers={['Product', 'SKU', 'Unit', 'Quantity available', 'Stock status']}
      rows={filteredProducts.map((product) => [product.name, product.sku, product.unit, String(product.quantityAvailable), product.quantityAvailable <= 12 ? 'Low stock' : 'In stock'])}
    />
    return renderInvoiceTable(filteredInvoices)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">B</span><span>Billwise</span></div>
        <div className="workspace"><span className="workspace-dot" /> Your business <span>⌄</span></div>
        <nav>{navigation.map((item) => <button className={active === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setActive(item)}><span className="nav-icon">{navigationIcon(item)}</span>{item}</button>)}</nav>
        <div className="sidebar-bottom"><button className="nav-item"><span className="nav-icon">⚙</span> Settings</button><div className="profile"><span className="avatar">AS</span><span><strong>Administrator</strong><small>Billing workspace</small></span><span>⋮</span></div></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {active}</div><div className="top-actions"><button className="icon-button">?</button><button className="icon-button">⌕</button><button className="notification">♢<i /></button></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">{todayLabel}</p><h1>{active === 'Overview' ? 'Good morning' : active}</h1><p className="muted">{active === 'Overview' ? 'Here is what is happening with your business today.' : selectedInvoiceCustomer && active === 'Invoices' ? `Invoices for ${selectedInvoiceCustomer.name}` : `Manage your ${active.toLowerCase()} in one place.`}</p></div>{active === 'Customers' ? <button className="primary-button" onClick={() => { setCustomerError(''); setCustomerForm(emptyCustomerForm); setIsCustomerModalOpen(true) }}>＋ Create customer</button> : <button className="primary-button" onClick={openInvoiceModal}>＋ Create invoice</button>}</div>
          {loadError && <p className="form-error" role="alert">Could not connect to the billing API: {loadError}</p>}
          {active === 'Overview' ? <><section className="metrics"><article className="metric-card"><div className="metric-label">Invoiced total</div><strong>{currency(invoices.filter((invoice) => invoice.status === 'ISSUED').reduce((total, invoice) => total + invoice.total, 0))}</strong><small>Issued invoices total</small><div className="sparkline orange" /></article><article className="metric-card"><div className="metric-label">Invoices created</div><strong>{invoices.length}</strong><small>In this workspace</small><div className="sparkline blue" /></article><article className="metric-card"><div className="metric-label">Low stock products</div><strong>{products.filter((product) => product.quantityAvailable <= 12).length}</strong><small>Items to review</small><div className="sparkline purple" /></article></section><section className="panel invoice-table overview-table"><div className="panel-heading"><div><h2>Invoices</h2><p className="muted">Latest invoices across your business</p></div><button className="text-button" onClick={() => { setSelectedInvoiceCustomer(null); setActive('Invoices') }}>View all</button></div>{renderInvoiceTable(invoices)}</section></> : <section className="panel invoice-table"><div className="panel-heading"><div><h2>{selectedInvoiceCustomer && active === 'Invoices' ? `Invoices — ${selectedInvoiceCustomer.name}` : `${active} list`}</h2><p className="muted">{selectedInvoiceCustomer && active === 'Invoices' ? 'Invoices linked to this customer.' : 'Keep your records accurate and up to date.'}</p></div><div className="table-actions">{active === 'Invoices' && selectedInvoiceCustomer && <button className="secondary-button" onClick={showAllInvoices}>All invoices</button>}<input placeholder={`Search ${active.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} /><button className="secondary-button" onClick={() => void refreshInvoices()} disabled={active !== 'Invoices'}>Refresh</button></div></div>{selectedInvoiceCustomer && active === 'Invoices' && filteredInvoices.length === 0 ? <p className="empty-table customer-empty">No invoices found for {selectedInvoiceCustomer.name}.</p> : renderTable()}</section>}
        </div>
      </main>
      {isInvoiceModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsInvoiceModalOpen(false)}><div className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="create-invoice-title"><div className="modal-heading"><div><p className="eyebrow">NEW BILLING DOCUMENT</p><h2 id="create-invoice-title">Create invoice</h2><p className="muted">Add up to 15 products. Prices and taxes are calculated by the API.</p></div><button className="close-button" type="button" onClick={() => setIsInvoiceModalOpen(false)} aria-label="Close">×</button></div><form onSubmit={createInvoice}>
        <div className="form-section"><h3>Customer details</h3><div className="form-grid"><label className="customer-search">Search customer<input required value={customerQuery} onChange={(event) => { setCustomerQuery(event.target.value); setSelectedCustomer(null) }} placeholder="Name, phone or email" />{!selectedCustomer && customerQuery && <div className="product-dropdown">{customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(customerQuery.toLowerCase())).map((customer) => <button type="button" key={customer.id} onClick={() => { setSelectedCustomer(customer); setCustomerQuery(customer.name) }}><strong>{customer.name}</strong><small>{customer.phone} · {customer.email}</small></button>)}</div>}</label><label>Branch state code<input required pattern="[0-9]{2}" value={branchStateCode} onChange={(event) => setBranchStateCode(event.target.value)} placeholder="27" /></label></div>{selectedCustomer && <div className="customer-summary"><strong>{selectedCustomer.name}</strong><span>{selectedCustomer.address}</span><span>{selectedCustomer.phone} · {selectedCustomer.email}</span>{selectedCustomer.gstin && <span>GSTIN: {selectedCustomer.gstin}</span>}<span>State code: {selectedCustomer.stateCode}</span></div>}</div>
        <div className="form-section">
          <div className="line-items-heading"><h3>Items ({lines.length}/15)</h3></div>
          <div className="invoice-items-scroll">
            <table className="invoice-items">
              <thead><tr><th>Product / description</th><th>HSN</th><th>Unit</th><th>Quantity</th><th>Rate (₹)</th><th>GST %</th><th>Discount (₹)</th><th>Line total (₹)</th><th></th></tr></thead>
              <tbody>
                {lines.map((line, index) => {
                  const taxable = Math.max(0, Number(line.quantity) * Number(line.rate) - Number(line.discount))
                  const lineTotal = taxable * Number(line.gstRate) / 100 + taxable
                  return <tr key={index}>
                    <td><label className="product-search"><span className="visually-hidden">Product</span><input required value={line.description} onChange={(event) => searchProducts(index, event.target.value)} placeholder="Search product" />{(productResults[index] ?? []).length > 0 && <div className="product-dropdown">{(productResults[index] ?? []).slice(0, 8).map((product) => <button type="button" key={product.id} onClick={() => selectProduct(index, product)}><strong>{product.name}</strong><small>{product.sku} · HSN {product.hsnCode} · {currency(product.sellingPrice)} / {product.unit}</small></button>)}</div>}</label></td>
                    <td><input aria-label={`HSN for item ${index + 1}`} required readOnly value={line.hsnCode} /></td>
                    <td><input aria-label={`Unit for item ${index + 1}`} required readOnly value={line.unit} /></td>
                    <td><input aria-label={`Quantity for item ${index + 1}`} required min="1" step="1" type="number" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} /></td>
                    <td><input aria-label={`Rate for item ${index + 1}`} required readOnly value={line.rate ? Number(line.rate).toFixed(2) : ''} /></td>
                    <td><input aria-label={`GST rate for item ${index + 1}`} required readOnly value={line.gstRate} /></td>
                    <td><input aria-label={`Discount for item ${index + 1}`} min="0" step="0.01" type="number" value={line.discount} onChange={(event) => updateLine(index, 'discount', event.target.value)} /></td>
                    <td className="line-total">{currency(lineTotal)}</td>
                    <td>{lines.length > 1 && <button className="remove-line" aria-label={`Remove item ${index + 1}`} type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>×</button>}</td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
          <button className="add-item-button" type="button" disabled={lines.length >= 15} onClick={() => setLines((current) => [...current, emptyLine()])}>＋ Add item ({lines.length}/15)</button>
        </div>
        <div className="invoice-preview"><span>Subtotal <strong>{currency(invoicePreview.subtotal)}</strong></span><span>Estimated tax <strong>{currency(invoicePreview.tax)}</strong></span><span>Total <strong>{currency(invoicePreview.total)}</strong></span></div>
        {invoiceError && <p className="form-error" role="alert">{invoiceError}</p>}
        <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={isSavingInvoice || !products.length || !customers.length}>{isSavingInvoice ? 'Creating…' : 'Create invoice'}</button></div>
      </form></div></div>}
      {isCustomerModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsCustomerModalOpen(false)}><div className="invoice-modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="create-customer-title"><div className="modal-heading"><div><p className="eyebrow">CUSTOMER DIRECTORY</p><h2 id="create-customer-title">Create customer</h2><p className="muted">Add customer contact and billing details.</p></div><button className="close-button" type="button" onClick={() => setIsCustomerModalOpen(false)} aria-label="Close">×</button></div><form onSubmit={createCustomer}><div className="form-section"><div className="form-grid"><label>Customer name<input required value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Phone number<input required type="tel" value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} /></label><label>Email address<input type="email" value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} /></label><label className="customer-address-field">Address<input required value={customerForm.address} onChange={(event) => setCustomerForm((current) => ({ ...current, address: event.target.value }))} /></label><label>State code<input required pattern="[0-9]{2}" title="Enter the two-digit GST state code" value={customerForm.stateCode} onChange={(event) => setCustomerForm((current) => ({ ...current, stateCode: event.target.value }))} /></label><label>GSTIN (optional)<input value={customerForm.gstin} onChange={(event) => setCustomerForm((current) => ({ ...current, gstin: event.target.value }))} /></label></div></div>{customerError && <p className="form-error" role="alert">{customerError}</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsCustomerModalOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={isSavingCustomer}>{isSavingCustomer ? 'Saving…' : 'Save customer'}</button></div></form></div></div>}
    </div>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cellIndex === 0 && typeof cell === 'string' ? <strong>{cell}</strong> : cell}</td>)}</tr>) : <tr><td className="empty-table" colSpan={headers.length}>No records found.</td></tr>}</tbody></table>
}

function currency(amount: number): string {
  return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function navigationIcon(item: string): string {
  if (item === 'Overview') return '⌂'
  if (item === 'Invoices') return '▤'
  if (item === 'Customers') return '♙'
  if (item === 'Products') return '□'
  return '◫'
}

export default App
