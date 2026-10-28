import { IncomeStreamDefinition, IncomeType } from './types';

export const INCOME_STREAM_DEFINITIONS: IncomeStreamDefinition[] = [
  {
    type: 'petty_hand_loan',
    label: '🤝 Petty Hand Loan from Friends & Family',
    shortLabel: 'Hand Loans',
    icon: '🤝',
    color: '#f59e0b', // Amber
    description: 'Informal hand borrowings from friends, relatives, or colleagues',
    defaultCategories: [
      'Hand Loan from Friend',
      'Borrowing from Relative / Family',
      'Emergency Cash from Colleague',
      'Friendly Advance',
      'Informal Short-Term Loan',
      'Other Hand Loan',
    ],
    payerLabel: 'Friend / Lender Name',
    payerPlaceholder: 'e.g. Vikram Sharma, Rahul, Alex (Friend)',
    descriptionPlaceholder: 'e.g. Hand loan for emergency travel, zero interest',
  },
  {
    type: 'farm',
    label: '🌱 Farm & Agriculture Income',
    shortLabel: 'Farm Income',
    icon: '🌱',
    color: '#10b981', // Emerald Green
    description: 'Agricultural produce, harvest, dairy, livestock, crop sales, farmland lease',
    defaultCategories: [
      'Crop Harvest & Produce Sales',
      'Coconut & Plantation Harvest',
      'Dairy & Milk Sales',
      'Livestock & Cattle / Poultry',
      'Farmland Lease / Agricultural Rent',
      'Government Agri Subsidy / PM-KISAN',
      'Timber & Agro-Forestry Yield',
      'Farm Equipment Hiring / Custom Work',
      'Organic Produce & Fruit Orchard',
    ],
    payerLabel: 'Trader / Mandi / Buyer / Co-op',
    payerPlaceholder: 'e.g. APMC Mandi, Local Dairy Society, Green Traders',
    descriptionPlaceholder: 'e.g. Q3 coconut harvest 2.5 tons, Wheat produce sale',
  },
  {
    type: 'stock_capital',
    label: '📈 Stock & Capital Gains Income',
    shortLabel: 'Stock Gains',
    icon: '📈',
    color: '#8b5cf6', // Violet
    description: 'Equity trading, capital gains (STCG/LTCG), options/futures, buybacks',
    defaultCategories: [
      'Short-Term Capital Gains (STCG)',
      'Long-Term Capital Gains (LTCG)',
      'Intraday & Swing Trading Profit',
      'Options & Futures (F&O) Profit',
      'Share Buyback Proceeds',
      'ESOP / RSU Exercise Proceeds',
      'Cryptocurrency & Digital Asset Gains',
    ],
    payerLabel: 'Broker / Exchange / Scrip Ticker',
    payerPlaceholder: 'e.g. Zerodha, Robinhood, Groww, TCS Equity, Apple Inc',
    descriptionPlaceholder: 'e.g. Realized gain on 100 shares of Reliance, STCG profit',
  },
  {
    type: 'interest',
    label: '💰 Interests & Fixed Yield',
    shortLabel: 'Interests',
    icon: '💰',
    color: '#06b6d4', // Cyan
    description: 'Bank savings interest, fixed deposits (FD), recurring deposits, bonds',
    defaultCategories: [
      'Bank Savings Account Interest',
      'Fixed Deposit (FD) Quarterly Interest',
      'Recurring Deposit (RD) Maturity Yield',
      'Government Bonds & Treasury Yield',
      'Corporate Debt & Debentures Interest',
      'P2P Lending Interest Payout',
      'Provident Fund / PPF Accrued Interest',
    ],
    payerLabel: 'Bank / Financial Institution',
    payerPlaceholder: 'e.g. HDFC Bank, SBI, Emirates NBD, Chase Bank',
    descriptionPlaceholder: 'e.g. Q2 savings account quarterly interest credit',
  },
  {
    type: 'investment',
    label: '🏢 Investments & Dividends',
    shortLabel: 'Investments',
    icon: '🏢',
    color: '#3b82f6', // Blue
    description: 'Stock dividends, mutual fund distributions, REITs, business profits',
    defaultCategories: [
      'Stock Equity Cash Dividends',
      'Mutual Fund Dividend / IDCW Payout',
      'REIT / InvIT Yield Distribution',
      'Private Equity / Startup Angel Return',
      'Business Partnership Profit Share',
      'Annuity & Pension Scheme Distributions',
    ],
    payerLabel: 'Company / Fund House / Entity',
    payerPlaceholder: 'e.g. Infosys Ltd Dividend, Vanguard S&P 500, Embassy REIT',
    descriptionPlaceholder: 'e.g. Interim dividend of ₹15 per share (200 shares)',
  },
  {
    type: 'salary',
    label: '💼 Salary & Professional Wages',
    shortLabel: 'Salary',
    icon: '💼',
    color: '#ec4899', // Neu Magenta
    description: 'Regular employment paycheck, wages, performance bonuses, incentives',
    defaultCategories: [
      'Monthly Base Salary',
      'Annual Performance Bonus',
      'Sales Commission & Incentives',
      'Overtime & Shift Allowance',
      'Severance / Gratuity Payout',
      'Director Remuneration',
    ],
    payerLabel: 'Employer / Company Name',
    payerPlaceholder: 'e.g. Google LLC, Tata Consultancy, Emirates Group',
    descriptionPlaceholder: 'e.g. October monthly salary credit',
  },
  {
    type: 'rental',
    label: '🏠 Rental & Real Estate Income',
    shortLabel: 'Rental',
    icon: '🏠',
    color: '#eab308', // Yellow
    description: 'Residential rent, commercial lease, warehouse, Airbnb, parking space',
    defaultCategories: [
      'Residential Apartment Rent',
      'Commercial Shop / Office Space Lease',
      'Warehouse / Godown Storage Rent',
      'Airbnb & Short-Term Stay Rentals',
      'Parking Space & Garage Rent',
    ],
    payerLabel: 'Tenant / Guest / Lessee',
    payerPlaceholder: 'e.g. Tenant John Doe, Retail Store Lessee, Airbnb Payout',
    descriptionPlaceholder: 'e.g. October rent for Apartment 4B',
  },
  {
    type: 'freelance',
    label: '💻 Freelance, Consulting & Gigs',
    shortLabel: 'Freelance',
    icon: '💻',
    color: '#14b8a6', // Teal
    description: 'Independent consulting, contract milestones, digital creators, gig work',
    defaultCategories: [
      'Client Retainer Fee',
      'Project Milestone Payment',
      'Hourly Consulting Advisory',
      'Digital Product Sales & Downloads',
      'Creator YouTube / AdSense Revenue',
      'Keynote Speaking / Workshop Honorarium',
    ],
    payerLabel: 'Client / Platform',
    payerPlaceholder: 'e.g. Stripe, Upwork, Acme Corp, YouTube Partner',
    descriptionPlaceholder: 'e.g. UI/UX design deliverables milestone 2',
  },
  {
    type: 'business',
    label: '🛒 Business Revenue & Trade',
    shortLabel: 'Business',
    icon: '🛒',
    color: '#6366f1', // Indigo
    description: 'Store sales, wholesale, merchant payouts, trade receipts',
    defaultCategories: [
      'Retail Shop Cash / POS Inflows',
      'Wholesale Invoice Settlement',
      'E-commerce Sales Payout',
      'Professional Service Fees',
      'Vendor Commission',
    ],
    payerLabel: 'Customer / Buyer / Marketplace',
    payerPlaceholder: 'e.g. Shopify Payout, Amazon Merchant, Client Invoice',
    descriptionPlaceholder: 'e.g. Weekly net POS settlement',
  },
  {
    type: 'gift',
    label: '🎁 Gifts, Grants & Windfalls',
    shortLabel: 'Gifts & Grants',
    icon: '🎁',
    color: '#d946ef', // Fuchsia
    description: 'Festive cash gifts, family shagun, inheritance, prizes, lottery',
    defaultCategories: [
      'Festive Gift / Family Shagun',
      'Birthday / Wedding Cash Gift',
      'Inheritance / Estate Bequest',
      'Grant / Fellowship / Scholarship',
      'Prize Money / Competition Award',
    ],
    payerLabel: 'Giver / Organization / Relative',
    payerPlaceholder: 'e.g. Grandfather, Wedding Guest, Award Foundation',
    descriptionPlaceholder: 'e.g. Festive Diwali cash blessing',
  },
  {
    type: 'refund',
    label: '🔄 Refunds & Reimbursements',
    shortLabel: 'Refunds',
    icon: '🔄',
    color: '#64748b', // Slate
    description: 'Corporate expense claims, tax refunds, insurance claims, cashbacks',
    defaultCategories: [
      'Corporate Expense Claim Reimbursement',
      'Income Tax (TDS / IT) Refund',
      'Health / Motor Insurance Claim Settlement',
      'Merchant Return / Credit Card Cashback',
    ],
    payerLabel: 'Issuer / Organization',
    payerPlaceholder: 'e.g. Income Tax Dept, Employer Claims, Oriental Insurance',
    descriptionPlaceholder: 'e.g. AY 2025-26 income tax refund',
  },
  {
    type: 'other',
    label: '⚡ Other & Miscellaneous Inflow',
    shortLabel: 'Other Inflows',
    icon: '⚡',
    color: '#a855f7', // Purple
    description: 'Old asset sale, scrap, royalties, one-off capital receipts',
    defaultCategories: [
      'Old Household Asset / Vehicle Resale',
      'Scrap & Material Disposal',
      'Book / Music Royalties & IP Rights',
      'Settlement & Compensation',
      'Miscellaneous Inflow',
    ],
    payerLabel: 'Payer / Source',
    payerPlaceholder: 'e.g. Buyer, Publisher, Entity',
    descriptionPlaceholder: 'e.g. Sold old generator/scrap machinery',
  },
];

export function getIncomeStreamDef(type?: string | null): IncomeStreamDefinition {
  if (!type) return INCOME_STREAM_DEFINITIONS[0];
  const found = INCOME_STREAM_DEFINITIONS.find((d) => d.type === type);
  return (
    found || {
      type: 'other',
      label: '⚡ Other Inflow',
      shortLabel: 'Other',
      icon: '⚡',
      color: '#a855f7',
      description: 'Miscellaneous income inflow',
      defaultCategories: ['Miscellaneous Inflow'],
      payerLabel: 'Payer / Source',
      payerPlaceholder: 'e.g. Source',
      descriptionPlaceholder: 'e.g. Income description',
    }
  );
}

export function getAllIncomeCategories(): { type: IncomeType; typeLabel: string; category: string }[] {
  const result: { type: IncomeType; typeLabel: string; category: string }[] = [];
  for (const def of INCOME_STREAM_DEFINITIONS) {
    for (const cat of def.defaultCategories) {
      result.push({
        type: def.type as IncomeType,
        typeLabel: def.shortLabel,
        category: cat,
      });
    }
  }
  return result;
}
