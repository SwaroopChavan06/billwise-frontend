# Billwise Frontend

React + TypeScript + Vite frontend for the Billwise billing application.

## Run locally

```powershell
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

## Validate

```powershell
npm run build
npm run lint
```

## Current UI

The current interface is an operational billing dashboard focused on:

- Outstanding invoices
- Issued invoices
- Low-stock alerts
- Recent invoices
- Customers, products, inventory, and invoice navigation

Invoice creation, customer lookup, product lookup, invoice listing, and PDF
downloads are connected to the backend API.

## Backend API connection

The invoice modal creates and issues an invoice through:

```text
POST http://localhost:3000/api/v1/invoices
```

Invoice creation now submits to `POST /api/v1/invoices`, which calculates and
issues the invoice. The UI loads customers from `GET /api/v1/customers`,
products from `GET /api/v1/products`, and print-ready invoice HTML from
`GET /api/v1/invoices/:id/print`. Use the invoice page's **Print / Save as PDF**
button to save the formatted invoice as a PDF.

By default the frontend uses `http://localhost:3000`. To use another API
origin, create `apps/web/.env.local`:

```text
VITE_API_URL=http://localhost:3000
```

Start the backend and frontend in separate terminals:

```powershell
cd "E:\GG\Billing Project\apps\api"
npm run start:dev
```

```powershell
cd "E:\GG\Billing Project\apps\web"
npm run dev
```

If port `3000` is already occupied, run the API on another port and point the
frontend to it using `apps/web/.env.local`:

```text
VITE_API_URL=http://localhost:3100
```

In the backend terminal, set the API port before starting:

```powershell
$env:PORT=3100
npm run start:dev
```
