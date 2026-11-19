import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'
import { PaginationControls } from './components/PaginationControls'
import { useServerPagination } from './hooks/useServerPagination'

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

type ProductForm = {
  name: string
  sku: string
  hsnCode: string
  unit: string
  gstRate: string
  sellingPrice: string
  quantityAvailable: string
}

type Customer = {
  id: string
  name: string
  gstin?: string
  phone: string
  email: string
  address: string
  stateCode: string
  invoiceCount?: number
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
  roundOff: number
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

type AuthUser = {
  email: string
  name: string
  picture: string
}

type GoogleCredentialResponse = {
  credential: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
          }) => void
          renderButton: (element: HTMLElement, options: {
            theme: 'outline'
            size: 'large'
            shape: 'rectangular'
            width: number
            text: 'continue_with'
          }) => void
        }
      }
    }
  }
}

const apiUrl = import.meta.env.PROD
  ? window.location.origin
  : import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const getApiRequestError = (error: unknown, fallback: string) => {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return `Cannot reach the billing API at ${apiUrl}. Start the API and make sure WEB_ORIGINS includes this frontend's exact address.`
  }
  return error instanceof Error ? error.message : fallback
}
const startsWithSearch = (query: string, values: string[]) => {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return normalizedQuery.length > 0 && values.some((value) => value.toLocaleLowerCase().startsWith(normalizedQuery))
}
const emptyLine = (): InvoiceLine => ({ productId: '', description: '', hsnCode: '', unit: '', quantity: '1', rate: '', discount: '0', gstRate: '' })
const MAX_INVOICE_ITEMS = 50
const isBlankInvoiceLine = (line: InvoiceLine) =>
  !line.productId && !line.description.trim() && !line.hsnCode.trim() && !line.unit.trim() &&
  !line.rate.trim() && !line.gstRate.trim() && line.quantity === '1' && line.discount === '0'
const emptyCustomerForm: CustomerForm = { name: '', phone: '', email: '', address: '', stateCode: '27', gstin: '' }
const navigation = ['Overview', 'Invoices', 'Customers', 'Products']
const emptyProductForm: ProductForm = {
  name: '',
  sku: '',
  hsnCode: '',
  unit: '',
  gstRate: '18',
  sellingPrice: '',
  quantityAvailable: '0',
}

function App() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authError, setAuthError] = useState('')
  const [active, setActive] = useState('Overview')
  const [todayLabel] = useState(() => new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).toUpperCase())
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productError, setProductError] = useState('')
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm)
  const [customerError, setCustomerError] = useState('')
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [selectedInvoiceCustomer, setSelectedInvoiceCustomer] = useState<Customer | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([])
  const [customerSuggestionsLoading, setCustomerSuggestionsLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isAddingInvoiceCustomer, setIsAddingInvoiceCustomer] = useState(false)
  const [invoiceCustomerForm, setInvoiceCustomerForm] = useState<CustomerForm>(emptyCustomerForm)
  const [branchStateCode, setBranchStateCode] = useState('27')
  const [includeDateTime, setIncludeDateTime] = useState(true)
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()])
  const [productResults, setProductResults] = useState<Record<number, Product[]>>({})
  const [productSearchIndex, setProductSearchIndex] = useState<number | null>(null)
  const [isSavingInvoice, setIsSavingInvoice] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')
  const handleUnauthorized = useCallback(() => {
    setAuthUser(null)
    setAuthStatus('unauthenticated')
    setAuthError('Your session has expired. Sign in again to continue.')
  }, [])
  const invoiceTable = useServerPagination<Invoice>({
    apiUrl,
    endpoint: '/api/v1/invoices',
    enabled: authStatus === 'authenticated' && (active === 'Overview' || active === 'Invoices'),
    filters: active === 'Invoices' && selectedInvoiceCustomer ? { customerId: selectedInvoiceCustomer.id } : undefined,
    onUnauthorized: handleUnauthorized,
  })
  const customerTable = useServerPagination<Customer>({
    apiUrl,
    endpoint: '/api/v1/customers',
    enabled: authStatus === 'authenticated' && active === 'Customers',
    onUnauthorized: handleUnauthorized,
  })
  const productTable = useServerPagination<Product>({
    apiUrl,
    endpoint: '/api/v1/products',
    enabled: authStatus === 'authenticated' && active === 'Products',
    onUnauthorized: handleUnauthorized,
  })
  const invoices = invoiceTable.data
  const customers = customerTable.data
  const products = productTable.data

  const apiFetch = useCallback(async (path: string, options: RequestInit = {}): Promise<Response> => {
    const response = await fetch(`${apiUrl}${path}`, { ...options, credentials: 'include' })
    if (response.status === 401 && !path.endsWith('/auth/google')) {
      setAuthUser(null)
      setAuthStatus('unauthenticated')
      setAuthError('Your session has expired. Sign in again to continue.')
    }
    return response
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await apiFetch('/api/v1/auth/session')
        if (!response.ok) throw new Error(`Could not check the login session. (${response.status})`)
        const session = await response.json() as { user: AuthUser | null }
        if (!active) return
        if (!session.user) {
          setAuthStatus('unauthenticated')
          return
        }
        setAuthUser(session.user)
        if (active) setAuthStatus('authenticated')
      } catch (error) {
        if (!active) return
        setAuthError(getApiRequestError(error, 'Could not check the login session.'))
        setAuthStatus('unauthenticated')
      }
    })()
    return () => { active = false }
  }, [apiFetch])

  useEffect(() => {
    if (authStatus !== 'unauthenticated') return
    if (!googleClientId) return

    let cancelled = false
    let script: HTMLScriptElement | null = null
    const renderGoogleButton = () => {
      const google = window.google
      const button = document.getElementById('google-signin-button')
      if (!google || !button || cancelled) return

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          void (async () => {
            setAuthError('')
            try {
              const loginResponse = await apiFetch('/api/v1/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
              })
              if (!loginResponse.ok) throw new Error(await loginResponse.text() || 'Google sign-in was denied.')
              const result = await loginResponse.json() as { user: AuthUser }
              setAuthUser(result.user)
              setAuthStatus('authenticated')
            } catch (error) {
              setAuthError(getApiRequestError(error, 'Google sign-in failed.'))
            }
          })()
        },
      })
      google.accounts.id.renderButton(button, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        width: 320,
        text: 'continue_with',
      })
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (window.google) {
      renderGoogleButton()
    } else if (existingScript) {
      existingScript.addEventListener('load', renderGoogleButton)
    } else {
      script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = renderGoogleButton
      script.onerror = () => setAuthError('Could not load Google sign-in. Check your internet connection and try again.')
      document.head.appendChild(script)
    }
    return () => {
      cancelled = true
      if (existingScript) existingScript.removeEventListener('load', renderGoogleButton)
      if (script) script.remove()
    }
  }, [apiFetch, authStatus])

  useEffect(() => {
    if (!isInvoiceModalOpen || authStatus !== 'authenticated' || !customerQuery.trim()) {
      let active = true
      queueMicrotask(() => {
        if (active) {
          setCustomerSuggestions([])
          setCustomerSuggestionsLoading(false)
        }
      })
      return () => { active = false }
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setCustomerSuggestionsLoading(true)
      const params = new URLSearchParams({ page: '1', limit: '20', search: customerQuery.trim() })
      void apiFetch(`/api/v1/customers?${params}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Could not search customers. (${response.status})`)
          const result = await response.json() as { data: Customer[] }
          if (!controller.signal.aborted) setCustomerSuggestions(result.data)
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setInvoiceError(error instanceof Error ? error.message : 'Could not search customers.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setCustomerSuggestionsLoading(false)
        })
    }, 200)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [apiFetch, authStatus, customerQuery, isInvoiceModalOpen])

  useEffect(() => {
    if (!isInvoiceModalOpen || authStatus !== 'authenticated') return
    const searches = lines
      .map((line, index) => ({ index, search: line.description.trim(), productId: line.productId }))
      .filter((line) => !line.productId && line.search)
    if (searches.length === 0) return

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      for (const { index, search } of searches) {
        const params = new URLSearchParams({ page: '1', limit: '20', search })
        void apiFetch(`/api/v1/products?${params}`, { signal: controller.signal })
          .then(async (response) => {
            if (!response.ok) throw new Error(`Could not search products. (${response.status})`)
            const result = await response.json() as { data: Product[] }
            if (!controller.signal.aborted) setProductResults((current) => ({ ...current, [index]: result.data }))
          })
          .catch((error: unknown) => {
            if (!controller.signal.aborted) setInvoiceError(error instanceof Error ? error.message : 'Could not search products.')
          })
      }
    }, 200)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [apiFetch, authStatus, isInvoiceModalOpen, lines])

  const activeTable = active === 'Customers'
    ? customerTable
    : active === 'Products'
      ? productTable
      : invoiceTable

  function openInvoiceModal() {
    setInvoiceError('')
    setCustomerQuery('')
    setSelectedCustomer(null)
    setIsAddingInvoiceCustomer(false)
    setInvoiceCustomerForm({ ...emptyCustomerForm, stateCode: '27' })
    setBranchStateCode('27')
    setIncludeDateTime(true)
    setLines([emptyLine()])
    setProductResults({})
    setIsInvoiceModalOpen(true)
  }

  function openProductModal(product?: Product) {
    setProductError('')
    setEditingProductId(product?.id ?? null)
    setProductForm(product ? {
      name: product.name,
      sku: product.sku,
      hsnCode: product.hsnCode,
      unit: product.unit,
      gstRate: String(product.gstRate),
      sellingPrice: String(product.sellingPrice),
      quantityAvailable: String(product.quantityAvailable),
    } : emptyProductForm)
    setIsProductModalOpen(true)
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProductError('')
    setIsSavingProduct(true)
    try {
      const response = await apiFetch(`/api/v1/products${editingProductId ? `/${encodeURIComponent(editingProductId)}` : ''}`, {
        method: editingProductId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name.trim(),
          sku: productForm.sku.trim(),
          hsnCode: productForm.hsnCode.trim(),
          unit: productForm.unit.trim(),
          gstRate: Number(productForm.gstRate),
          sellingPrice: Number(productForm.sellingPrice),
          quantityAvailable: Number(productForm.quantityAvailable),
        }),
      })
      if (!response.ok) throw new Error(await response.text() || `Product could not be saved (${response.status}).`)
      await response.json() as Product
      productTable.refresh()
      setIsProductModalOpen(false)
    } catch (error) {
      setProductError(error instanceof Error ? error.message : 'The product could not be saved.')
    } finally {
      setIsSavingProduct(false)
    }
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCustomerError('')
    setIsSavingCustomer(true)
    try {
      const response = await apiFetch('/api/v1/customers', {
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
      await response.json() as Customer
      customerTable.refresh()
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
    invoiceTable.setSearch('')
    invoiceTable.setPage(1)
    setActive('Invoices')
  }

  function showAllInvoices() {
    setSelectedInvoiceCustomer(null)
    invoiceTable.setSearch('')
    invoiceTable.setPage(1)
  }

  function updateLine(index: number, field: keyof InvoiceLine, value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index
      ? { ...line, [field]: value, ...(field === 'description' ? { productId: '', hsnCode: '', unit: '', rate: '', gstRate: '' } : {}) }
      : line))
  }

  function searchProducts(index: number, value: string) {
    setInvoiceError('')
    setLines((current) => current.map((line, lineIndex) => lineIndex === index
      ? { ...line, description: value, productId: '', hsnCode: '', unit: '', rate: '', gstRate: '' }
      : line))
    setProductSearchIndex(index)
    setProductResults((current) => ({ ...current, [index]: [] }))
  }

  function selectProduct(index: number, product: Product) {
    if (lines.some((line, lineIndex) => lineIndex !== index && line.productId === product.id)) {
      setInvoiceError(`${product.name} is already included in this invoice.`)
      return
    }
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
    setProductSearchIndex(null)
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
    const invoiceLines = lines.filter((line) => !isBlankInvoiceLine(line))
    if (!selectedCustomer && !isAddingInvoiceCustomer) {
      setInvoiceError('Select a customer or add their billing details to continue.')
      return
    }
    if (invoiceLines.length === 0) {
      setInvoiceError('Add at least one product from the product catalogue.')
      return
    }
    if (invoiceLines.some((line) => !line.productId)) {
      setInvoiceError('Select a product from the suggestions for every non-empty item row.')
      return
    }
    if (new Set(invoiceLines.map((line) => line.productId)).size !== invoiceLines.length) {
      setInvoiceError('Each product can only be added once to an invoice.')
      return
    }

    setIsSavingInvoice(true)
    const id = `invoice-${crypto.randomUUID()}`
    try {
      let invoiceCustomer = selectedCustomer
      if (!invoiceCustomer) {
        const customerResponse = await apiFetch('/api/v1/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...invoiceCustomerForm,
            name: invoiceCustomerForm.name.trim(),
            phone: invoiceCustomerForm.phone.trim(),
            email: invoiceCustomerForm.email.trim(),
            address: invoiceCustomerForm.address.trim(),
            gstin: invoiceCustomerForm.gstin.trim() || undefined,
          }),
        })
        if (!customerResponse.ok) {
          const errorBody = await customerResponse.text()
          throw new Error(errorBody || `Customer could not be saved (${customerResponse.status}).`)
        }
        const newCustomer = await customerResponse.json() as Customer
        invoiceCustomer = newCustomer
        setSelectedCustomer(newCustomer)
        setCustomerQuery(newCustomer.name)
        setIsAddingInvoiceCustomer(false)
      }

      const response = await apiFetch('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          customerId: invoiceCustomer.id,
          customerName: invoiceCustomer.name,
          customerPhone: invoiceCustomer.phone,
          customerEmail: invoiceCustomer.email,
          customerAddress: invoiceCustomer.address,
          customerGstin: invoiceCustomer.gstin,
          includeDateTime,
          customerStateCode: invoiceCustomer.stateCode,
          branchStateCode,
          lines: invoiceLines.map((line) => ({
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
      void createdInvoice
      setSelectedInvoiceCustomer(null)
      invoiceTable.setSearch('')
      invoiceTable.setPage(1)
      invoiceTable.refresh()
      setIsInvoiceModalOpen(false)
      setActive('Invoices')
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'The invoice could not be created.')
    } finally {
      setIsSavingInvoice(false)
    }
  }

  function renderInvoiceTable() {
    return <>
      {invoiceTable.error && <p className="form-error table-error" role="alert">{invoiceTable.error}</p>}
      {invoiceTable.loading && invoices.length === 0
        ? <p className="table-state">Loading invoices…</p>
        : <DataTable
          headers={['Invoice number', 'Customer', 'Date', 'Subtotal', 'Total', 'Status', 'PDF']}
          rows={invoices.map((invoice) => [
        invoice.invoiceNumber || 'Draft',
        invoice.customerName,
        new Date(invoice.issueDate).toLocaleDateString('en-IN'),
        currency(invoice.subtotal),
        currencyWhole(invoice.total),
        invoice.status,
        <a className="download-button" href={`${apiUrl}/api/v1/invoices/${encodeURIComponent(invoice.id)}/print`} key={invoice.id} target="_blank" rel="noreferrer">Print / Save PDF</a>,
          ])}
        />}
      <PaginationControls pagination={invoiceTable.pagination} onPageChange={invoiceTable.setPage} onPageSizeChange={invoiceTable.setPageSize} disabled={invoiceTable.loading} />
    </>
  }

  function renderTable() {
    if (active === 'Customers') {
      return <>
        {customerTable.error && <p className="form-error table-error" role="alert">{customerTable.error}</p>}
        {customerTable.loading && customers.length === 0 ? <p className="table-state">Loading customers…</p> : <DataTable
          headers={['Customer', 'Phone', 'Address', 'Invoices']}
          rows={customers.map((customer) => [
            customer.name,
            customer.phone,
            customer.address,
            <button className="text-button customer-invoices-button" key={customer.id} onClick={() => showCustomerInvoices(customer)}>View invoices ({customer.invoiceCount ?? 0})</button>,
          ])}
        />}
        <PaginationControls pagination={customerTable.pagination} onPageChange={customerTable.setPage} onPageSizeChange={customerTable.setPageSize} disabled={customerTable.loading} />
      </>
    }
    if (active === 'Products' && showInventory) {
      return <>
        {productTable.error && <p className="form-error table-error" role="alert">{productTable.error}</p>}
        {productTable.loading && products.length === 0 ? <p className="table-state">Loading inventory…</p> : <DataTable
          headers={['Product', 'SKU', 'Unit', 'Quantity available', 'Stock status']}
          rows={products.map((product) => [
            product.name,
            product.sku,
            product.unit,
            <span key={`${product.id}-quantity`} className={product.quantityAvailable < 5 ? 'stock-quantity low' : 'stock-quantity'}>{product.quantityAvailable}</span>,
            <span key={`${product.id}-status`} className={product.quantityAvailable < 5 ? 'stock-status low' : 'stock-status'}>{product.quantityAvailable < 5 ? 'Low stock' : 'In stock'}</span>,
          ])}
        />}
        <PaginationControls pagination={productTable.pagination} onPageChange={productTable.setPage} onPageSizeChange={productTable.setPageSize} disabled={productTable.loading} />
      </>
    }
    if (active === 'Products') {
      return <>
        {productTable.error && <p className="form-error table-error" role="alert">{productTable.error}</p>}
        {productTable.loading && products.length === 0 ? <p className="table-state">Loading products…</p> : <DataTable
          headers={['#', 'Product', 'SKU', 'HSN code', 'Unit', 'Price', 'Actions']}
          rows={products.map((product, index) => [
            String((productTable.pagination.currentPage - 1) * productTable.pagination.pageSize + index + 1),
            product.name,
            product.sku,
            product.hsnCode,
            product.unit,
            currency(product.sellingPrice),
            <button className="secondary-button edit-product-button" key={product.id} onClick={() => openProductModal(product)}>Edit</button>,
          ])}
        />}
        <PaginationControls pagination={productTable.pagination} onPageChange={productTable.setPage} onPageSizeChange={productTable.setPageSize} disabled={productTable.loading} />
      </>
    }
    return renderInvoiceTable()
  }

  async function logout() {
    try {
      const response = await apiFetch('/api/v1/auth/logout', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Could not sign out. Please try again.')
      setAuthUser(null)
      setAuthStatus('unauthenticated')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign out.')
    }
  }

  if (authStatus === 'checking') {
    return <main className="auth-page"><section className="auth-card"><span className="brand-mark">B</span><h1>Billwise</h1><p>Checking your sign-in…</p></section></main>
  }

  if (authStatus === 'unauthenticated') {
    return <main className="auth-page">
      <section className="auth-card">
        <span className="brand-mark">B</span>
        <p className="eyebrow">BILLING WORKSPACE</p>
        <h1>Sign in to Billwise</h1>
        <p className="muted">Continue with an authorized Google account to manage your invoices and products.</p>
        <div className="google-signin-area">
          <div id="google-signin-button" />
          {!googleClientId && <p className="auth-setup-hint">Google sign-in needs a configured OAuth client ID.</p>}
        </div>
        {authError && <p className="form-error" role="alert">{authError}</p>}
        <p className="auth-allowlist-note">Access is limited to authorized accounts.</p>
      </section>
    </main>
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">B</span><span>Billwise</span></div>
        <nav>{navigation.map((item) => <button className={active === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => { setActive(item); if (item === 'Products') setShowInventory(false) }}><span className="nav-icon">{navigationIcon(item)}</span>{item}</button>)}</nav>
        <div className="sidebar-bottom"><div className="profile"><span className="avatar">{authUser?.picture && <img src={authUser.picture} alt="" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true }} />}<span>{authUser?.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'}</span></span><span className="profile-details"><strong>{authUser?.name ?? 'User'}</strong><small>{authUser?.email ?? ''}</small></span></div><button className="logout-button" type="button" onClick={() => void logout()}>↪ <span>Log out</span></button></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {active}</div><div className="top-actions"><button className="icon-button">?</button><button className="icon-button">⌕</button><button className="notification">♢<i /></button></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">{todayLabel}</p><h1>{active === 'Overview' ? 'Good morning' : active}</h1><p className="muted">{active === 'Overview' ? 'Here is what is happening with your business today.' : selectedInvoiceCustomer && active === 'Invoices' ? `Invoices for ${selectedInvoiceCustomer.name}` : `Manage your ${active.toLowerCase()} in one place.`}</p></div>{active === 'Customers' ? <button className="primary-button" onClick={() => { setCustomerError(''); setCustomerForm(emptyCustomerForm); setIsCustomerModalOpen(true) }}>＋ Create customer</button> : active === 'Products' ? <div className="heading-actions"><button className="secondary-button" onClick={() => setShowInventory((current) => !current)}>{showInventory ? 'Products' : 'Inventory'}</button>{!showInventory && <button className="primary-button" onClick={() => openProductModal()}>＋ Create product</button>}</div> : <button className="primary-button" onClick={openInvoiceModal}>＋ Create invoice</button>}</div>
          {active === 'Overview' ? <section className="panel invoice-table overview-table"><div className="panel-heading"><div><h2>Invoices</h2><p className="muted">Latest invoices across your business</p></div><button className="text-button" onClick={() => { setSelectedInvoiceCustomer(null); invoiceTable.setSearch(''); setActive('Invoices') }}>View all</button></div>{renderInvoiceTable()}</section> : <section className="panel invoice-table"><div className="panel-heading"><div><h2>{selectedInvoiceCustomer && active === 'Invoices' ? `Invoices — ${selectedInvoiceCustomer.name}` : active === 'Products' && showInventory ? 'Available inventory' : `${active} list`}</h2><p className="muted">{selectedInvoiceCustomer && active === 'Invoices' ? 'Invoices linked to this customer.' : active === 'Products' && showInventory ? 'Products with fewer than 5 units are highlighted.' : 'Keep your records accurate and up to date.'}</p></div><div className="table-actions">{active === 'Invoices' && selectedInvoiceCustomer && <button className="secondary-button" onClick={showAllInvoices}>All invoices</button>}<input placeholder={`Search ${active === 'Products' && showInventory ? 'inventory' : active.toLowerCase()}...`} value={activeTable.search} onChange={(event) => activeTable.setSearch(event.target.value)} /><button className="secondary-button" onClick={activeTable.refresh} disabled={activeTable.loading}>Refresh</button></div></div>{renderTable()}</section>}
        </div>
      </main>
      {isInvoiceModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsInvoiceModalOpen(false)}><div className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="create-invoice-title"><div className="modal-heading"><div><p className="eyebrow">NEW BILLING DOCUMENT</p><h2 id="create-invoice-title">Create invoice</h2><p className="muted">Add up to 50 products. Prices and taxes are calculated by the API.</p></div><button className="close-button" type="button" onClick={() => setIsInvoiceModalOpen(false)} aria-label="Close">×</button></div><form onSubmit={createInvoice}>
        <div className="form-section"><h3>Customer details</h3><div className="form-grid"><label className="customer-search">Search customer<input value={customerQuery} onChange={(event) => { setCustomerQuery(event.target.value); setSelectedCustomer(null); setIsAddingInvoiceCustomer(false) }} placeholder="Name, phone or email" />{!selectedCustomer && customerQuery && customerSuggestions.length > 0 && <div className="product-dropdown">{customerSuggestions.slice().sort((a, b) => Number(!startsWithSearch(customerQuery, [a.name, a.phone, a.email])) - Number(!startsWithSearch(customerQuery, [b.name, b.phone, b.email]))).map((customer) => <button type="button" key={customer.id} onClick={() => { setSelectedCustomer(customer); setCustomerQuery(customer.name); setCustomerSuggestions([]); setIsAddingInvoiceCustomer(false) }}><strong>{customer.name}</strong><small>{customer.phone} · {customer.email}</small></button>)}</div>}{customerSuggestionsLoading && <small className="suggestion-status">Searching customers…</small>}</label><label>Branch state code<input required pattern="[0-9]{2}" value={branchStateCode} onChange={(event) => setBranchStateCode(event.target.value)} placeholder="27" /></label></div>{selectedCustomer && <div className="customer-summary"><strong>{selectedCustomer.name}</strong><span>{selectedCustomer.address}</span><span>{selectedCustomer.phone} · {selectedCustomer.email}</span>{selectedCustomer.gstin && <span>GSTIN: {selectedCustomer.gstin}</span>}<span>State code: {selectedCustomer.stateCode}</span></div>}{!selectedCustomer && customerQuery && !customerSuggestionsLoading && customerSuggestions.length === 0 && <div className="customer-not-found"><span>No matching customer.</span><button className="text-button" type="button" onClick={() => { setInvoiceCustomerForm({ ...emptyCustomerForm, name: customerQuery.trim(), stateCode: branchStateCode }); setIsAddingInvoiceCustomer(true) }}>＋ Add as a new customer</button></div>}{isAddingInvoiceCustomer && <div className="new-customer-form"><h4>New customer billing details</h4><div className="form-grid"><label>Customer name<input required value={invoiceCustomerForm.name} onChange={(event) => setInvoiceCustomerForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Phone number<input required type="tel" value={invoiceCustomerForm.phone} onChange={(event) => setInvoiceCustomerForm((current) => ({ ...current, phone: event.target.value }))} /></label><label>Email address<input type="email" value={invoiceCustomerForm.email} onChange={(event) => setInvoiceCustomerForm((current) => ({ ...current, email: event.target.value }))} /></label><label className="customer-address-field">Address<input required value={invoiceCustomerForm.address} onChange={(event) => setInvoiceCustomerForm((current) => ({ ...current, address: event.target.value }))} /></label><label>State code<input required pattern="[0-9]{2}" title="Enter the two-digit GST state code" value={invoiceCustomerForm.stateCode} onChange={(event) => setInvoiceCustomerForm((current) => ({ ...current, stateCode: event.target.value }))} /></label><label>GSTIN (optional)<input value={invoiceCustomerForm.gstin} onChange={(event) => setInvoiceCustomerForm((current) => ({ ...current, gstin: event.target.value }))} /></label></div></div>}</div>
        <div className="form-section">
          <label className="date-time-option"><input type="checkbox" checked={includeDateTime} onChange={(event) => setIncludeDateTime(event.target.checked)} /> Include invoice date and time on the printed invoice</label>
          <div className="line-items-heading"><h3>Items ({lines.length}/{MAX_INVOICE_ITEMS})</h3></div>
          <div className="invoice-items-scroll">
            <table className="invoice-items">
              <thead><tr><th>Product / description</th><th>HSN</th><th>Unit</th><th>Quantity</th><th>Rate (₹)</th><th>GST %</th><th>Discount (₹)</th><th>Line total (₹)</th><th></th></tr></thead>
              <tbody>
                {lines.map((line, index) => {
                  const taxable = Math.max(0, Number(line.quantity) * Number(line.rate) - Number(line.discount))
                  const lineTotal = taxable * Number(line.gstRate) / 100 + taxable
                  return <tr key={index}>
                    <td><label className="product-search"><span className="visually-hidden">Product</span><input required={Boolean(line.productId)} value={line.description} onFocus={() => setProductSearchIndex(index)} onChange={(event) => searchProducts(index, event.target.value)} placeholder="Search product" />{productSearchIndex === index && (productResults[index] ?? []).filter((product) => !lines.some((selectedLine, selectedIndex) => selectedIndex !== index && selectedLine.productId === product.id)).length > 0 && <div className="product-dropdown">{(productResults[index] ?? []).filter((product) => !lines.some((selectedLine, selectedIndex) => selectedIndex !== index && selectedLine.productId === product.id)).slice(0, 8).sort((a, b) => Number(!startsWithSearch(line.description, [a.name, a.sku, a.hsnCode])) - Number(!startsWithSearch(line.description, [b.name, b.sku, b.hsnCode]))).map((product) => <button type="button" key={product.id} onClick={() => selectProduct(index, product)}><strong>{product.name}</strong><small>{product.sku} · HSN {product.hsnCode} · Unit: {product.unit} · {currency(product.sellingPrice)} per unit</small></button>)}</div>}</label></td>
                    <td><input aria-label={`HSN for item ${index + 1}`} required={Boolean(line.productId)} readOnly value={line.hsnCode} /></td>
                    <td><input aria-label={`Unit for item ${index + 1}`} required={Boolean(line.productId)} readOnly value={line.unit} /></td>
                    <td><input aria-label={`Quantity for item ${index + 1}`} required={Boolean(line.productId)} min="1" step="1" type="number" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} /></td>
                    <td><input aria-label={`Rate for item ${index + 1}`} required={Boolean(line.productId)} min="0" step="0.01" type="number" value={line.rate} onChange={(event) => updateLine(index, 'rate', event.target.value)} /></td>
                    <td><input aria-label={`GST rate for item ${index + 1}`} required={Boolean(line.productId)} readOnly value={line.gstRate} /></td>
                    <td><input aria-label={`Discount for item ${index + 1}`} min="0" step="1" type="number" value={line.discount} onChange={(event) => updateLine(index, 'discount', event.target.value)} /></td>
                    <td className="line-total">{currency(lineTotal)}</td>
                    <td>{lines.length > 1 && <button className="remove-line" aria-label={`Remove item ${index + 1}`} type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>×</button>}</td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
          <button className="add-item-button" type="button" disabled={lines.length >= MAX_INVOICE_ITEMS} onClick={() => setLines((current) => [...current, emptyLine()])}>＋ Add item ({lines.length}/{MAX_INVOICE_ITEMS})</button>
        </div>
        <div className="invoice-preview"><span>Subtotal <strong>{currency(invoicePreview.subtotal)}</strong></span><span>Estimated tax <strong>{currency(invoicePreview.tax)}</strong></span><span>Total <strong>{currencyWhole(Math.round(invoicePreview.total))}</strong></span></div>
        {invoiceError && <p className="form-error" role="alert">{invoiceError}</p>}
        <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={isSavingInvoice}>{isSavingInvoice ? 'Creating…' : 'Create invoice'}</button></div>
      </form></div></div>}
      {isCustomerModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsCustomerModalOpen(false)}><div className="invoice-modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="create-customer-title"><div className="modal-heading"><div><p className="eyebrow">CUSTOMER DIRECTORY</p><h2 id="create-customer-title">Create customer</h2><p className="muted">Add customer contact and billing details.</p></div><button className="close-button" type="button" onClick={() => setIsCustomerModalOpen(false)} aria-label="Close">×</button></div><form onSubmit={createCustomer}><div className="form-section"><div className="form-grid"><label>Customer name<input required value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Phone number<input required type="tel" value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} /></label><label>Email address<input type="email" value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} /></label><label className="customer-address-field">Address<input required value={customerForm.address} onChange={(event) => setCustomerForm((current) => ({ ...current, address: event.target.value }))} /></label><label>State code<input required pattern="[0-9]{2}" title="Enter the two-digit GST state code" value={customerForm.stateCode} onChange={(event) => setCustomerForm((current) => ({ ...current, stateCode: event.target.value }))} /></label><label>GSTIN (optional)<input value={customerForm.gstin} onChange={(event) => setCustomerForm((current) => ({ ...current, gstin: event.target.value }))} /></label></div></div>{customerError && <p className="form-error" role="alert">{customerError}</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsCustomerModalOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={isSavingCustomer}>{isSavingCustomer ? 'Saving…' : 'Save customer'}</button></div></form></div></div>}
      {isProductModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsProductModalOpen(false)}><div className="invoice-modal product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><div className="modal-heading"><div><p className="eyebrow">PRODUCT CATALOGUE</p><h2 id="product-modal-title">{editingProductId ? 'Edit product' : 'Create product'}</h2><p className="muted">Set the product details, selling price, and available stock.</p></div><button className="close-button" type="button" onClick={() => setIsProductModalOpen(false)} aria-label="Close">×</button></div><form onSubmit={saveProduct}><div className="form-section"><div className="form-grid"><label>Product name<input required value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} /></label><label>SKU<input required value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} /></label><label>HSN code<input required value={productForm.hsnCode} onChange={(event) => setProductForm((current) => ({ ...current, hsnCode: event.target.value }))} /></label><label>Unit<input required value={productForm.unit} onChange={(event) => setProductForm((current) => ({ ...current, unit: event.target.value }))} placeholder="piece, box, kg..." /></label><label>Selling price (₹)<input required min="0" step="0.01" type="number" value={productForm.sellingPrice} onChange={(event) => setProductForm((current) => ({ ...current, sellingPrice: event.target.value }))} /></label><label>GST rate (%)<input required min="0" step="0.01" type="number" value={productForm.gstRate} onChange={(event) => setProductForm((current) => ({ ...current, gstRate: event.target.value }))} /></label><label>Available quantity<input required min="0" step="1" type="number" value={productForm.quantityAvailable} onChange={(event) => setProductForm((current) => ({ ...current, quantityAvailable: event.target.value }))} /></label></div></div>{productError && <p className="form-error" role="alert">{productError}</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsProductModalOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={isSavingProduct}>{isSavingProduct ? 'Saving…' : editingProductId ? 'Save changes' : 'Create product'}</button></div></form></div></div>}
    </div>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cellIndex === 0 && typeof cell === 'string' ? <strong>{cell}</strong> : cell}</td>)}</tr>) : <tr><td className="empty-table" colSpan={headers.length}>No records found.</td></tr>}</tbody></table>
}

function currency(amount: number): string {
  return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function currencyWhole(amount: number): string {
  return `₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function navigationIcon(item: string): string {
  if (item === 'Overview') return '⌂'
  if (item === 'Invoices') return '▤'
  if (item === 'Customers') return '♙'
  if (item === 'Products') return '□'
  return '◫'
}

export default App
