# Centensor

**Centensor** is a modern multi-currency personal finance and general ledger expense tracking application. It features a month-view worksheet matrix, multi-currency account books (e.g. INR, AED, USD), double-entry GL ledger reconciliation, and rich category analytics.

## Features

- **Multi-Currency Account Books**: Manage separate country or account books with automated master base currency conversions.
- **Monthly Worksheet Matrix**: Interactive daily expense grid with live category head and subcategory rollups.
- **Double-Entry General Ledger**: Settle transactions with real-time balance calculations across bank, cash, and credit card accounts.
- **Analytics & Visual Dashboards**: Monthly burn rate, category breakdowns, and exportable reports.
- **Embedded SQLite Backend**: Zero-config, low-latency local database storage with WAL mode enabled.

## Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore Centensor.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Vanilla CSS Variables & Design System
- **Icons**: [lucide-react](https://lucide.dev/)
- **Database**: SQLite (`node:sqlite`)
