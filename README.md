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

Backend API integration will be added as the business workflows are finalized.

## Backend API connection

The invoice modal sends a draft to:

```text
POST http://localhost:3000/api/v1/invoices/drafts
```

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
