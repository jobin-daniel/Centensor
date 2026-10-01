# Centensor

**Centensor** is a modern multi-currency personal finance and general ledger expense tracking application, engineered as a multi-tenant service (SaaS). It features a month-view worksheet matrix, multi-currency account books (e.g. INR, AED, USD), double-entry GL ledger reconciliation, and rich category analytics.

## Features

- **Multi-Tenant SaaS Architecture**: Complete user isolation with private account books, ledger accounts, transactions, and categories per user.
- **Secure Authentication**: Built-in credential authentication with bcrypt password hashing and JWT sessions via NextAuth / Auth.js v5.
- **Instant Workspace Provisioning**: Newly registered users automatically receive pre-configured account books (INR, AED, USD), default cash & bank accounts, and standard general ledger category taxonomy.
- **Multi-Currency Account Books**: Manage separate country or account books with automated master base currency conversions.
- **Monthly Worksheet Matrix**: Interactive daily expense grid with live category head and subcategory rollups.
- **Double-Entry General Ledger**: Settle transactions with real-time balance calculations across bank, cash, and credit card accounts.
- **Analytics & Visual Dashboards**: Monthly burn rate, category breakdowns, and exportable reports.
- **Embedded SQLite Backend**: Zero-config, low-latency local database storage with WAL mode enabled.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy the environment variables template:

```bash
cp .env.example .env.local
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Demo Credentials

- **Email**: `demo@centensor.com`
- **Password**: `Password123!`

Or click **Create an Account** to register a new user with instant isolated workspace provisioning.

## Hosting Centensor as a Service

Centensor is designed for deployment on persistent servers or containers (e.g. Docker, Coolify, Railway, Render, DigitalOcean, AWS EC2):

1. **Persistent Volume**: Mount `/app/data` to a persistent disk volume to retain the SQLite database (`centensor.db`).
2. **Environment Variable**: Set `AUTH_SECRET` to a strong random string (e.g. generated via `openssl rand -base64 32`).

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Authentication**: [Auth.js / NextAuth v5](https://authjs.dev/) with `bcryptjs`
- **Language**: TypeScript
- **Styling**: Vanilla CSS Variables & Design System
- **Icons**: [lucide-react](https://lucide.dev/)
- **Database**: SQLite (`node:sqlite`) with WAL mode
