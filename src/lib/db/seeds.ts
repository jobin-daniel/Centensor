export interface SeedCategory {
  name: string;
  group_name: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface SeedSubHead {
  name: string;
  icon?: string;
  color?: string;
  sort_order: number;
  monthly_budget?: number;
}

export interface SeedCategoryHead {
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  sub_heads: SeedSubHead[];
}

export const SEED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', exchange_rate_to_master: 1.0, decimal_digits: 2, is_master_base: 1 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', exchange_rate_to_master: 22.7, decimal_digits: 2, is_master_base: 0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', exchange_rate_to_master: 83.5, decimal_digits: 2, is_master_base: 0 },
  { code: 'EUR', symbol: '€', name: 'Euro', exchange_rate_to_master: 91.0, decimal_digits: 2, is_master_base: 0 },
  { code: 'GBP', symbol: '£', name: 'British Pound', exchange_rate_to_master: 108.0, decimal_digits: 2, is_master_base: 0 },
];

export const SEED_BOOKS = [
  { name: 'Home Land (India)', currency_code: 'INR', description: 'Primary household and homeland expense book', is_default: 1, sort_order: 1 },
  { name: 'UAE Expenses', currency_code: 'AED', description: 'UAE daily living, utilities and local spending', is_default: 0, sort_order: 2 },
  { name: 'US Travel', currency_code: 'USD', description: 'US travel and international expenditure', is_default: 0, sort_order: 3 },
];

export const SEED_INSTITUTIONS = [
  { name: 'HDFC Bank', country_code: 'IN', institution_type: 'bank' },
  { name: 'State Bank of India', country_code: 'IN', institution_type: 'bank' },
  { name: 'Emirates NBD', country_code: 'AE', institution_type: 'bank' },
  { name: 'Abu Dhabi Commercial Bank (ADCB)', country_code: 'AE', institution_type: 'bank' },
  { name: 'Chase Bank', country_code: 'US', institution_type: 'bank' },
  { name: 'American Express', country_code: 'US', institution_type: 'card_issuer' },
];

// Recommended General Ledger Taxonomy: Main Heads & Sub Heads
export const SEED_CATEGORY_HEADS: SeedCategoryHead[] = [
  {
    name: '🍔 Food / Eating out',
    icon: '🍔',
    color: '#10B981',
    sort_order: 1,
    sub_heads: [
      { name: 'Groceries', icon: '🛒', color: '#10B981', sort_order: 1 },
      { name: 'Restaurants', icon: '🍽️', color: '#059669', sort_order: 2 },
      { name: 'Fast food', icon: '🍟', color: '#F59E0B', sort_order: 3 },
      { name: 'Cafes & Coffee', icon: '☕', color: '#D97706', sort_order: 4 },
    ],
  },
  {
    name: '🚗 Car / Transport',
    icon: '🚗',
    color: '#3B82F6',
    sort_order: 2,
    sub_heads: [
      { name: 'Fuel & Petrol', icon: '⛽', color: '#EF4444', sort_order: 1 },
      { name: 'Maintenance & Service', icon: '🔧', color: '#3B82F6', sort_order: 2 },
      { name: 'Public Transit', icon: '🚌', color: '#6366F1', sort_order: 3 },
      { name: 'Parking & Tolls', icon: '🅿️', color: '#8B5CF6', sort_order: 4 },
    ],
  },
  {
    name: '🏠 House',
    icon: '🏠',
    color: '#6366F1',
    sort_order: 3,
    sub_heads: [
      { name: 'Rent & Mortgage', icon: '🏢', color: '#4F46E5', sort_order: 1 },
      { name: 'Utilities (Power, Water, Gas)', icon: '💡', color: '#F59E0B', sort_order: 2 },
      { name: 'Household Goods', icon: '🧹', color: '#10B981', sort_order: 3 },
      { name: 'Repairs & Improvements', icon: '🔨', color: '#64748B', sort_order: 4 },
    ],
  },
  {
    name: '🛒 Shopping',
    icon: '🛒',
    color: '#EC4899',
    sort_order: 4,
    sub_heads: [
      { name: 'Personal Items', icon: '🛍️', color: '#EC4899', sort_order: 1 },
      { name: 'Footwear', icon: '👞', color: '#DB2777', sort_order: 2 },
      { name: 'Electronics & Gadgets', icon: '📱', color: '#8B5CF6', sort_order: 3 },
      { name: 'Home Supplies', icon: '📦', color: '#14B8A6', sort_order: 4 },
    ],
  },
  {
    name: '🎬 Entertainment',
    icon: '🎬',
    color: '#A855F7',
    sort_order: 5,
    sub_heads: [
      { name: 'Movies & Cinema', icon: '🍿', color: '#A855F7', sort_order: 1 },
      { name: 'Hobbies & Crafts', icon: '🎨', color: '#F97316', sort_order: 2 },
      { name: 'Concerts & Events', icon: '🎟️', color: '#E11D48', sort_order: 3 },
      { name: 'Games & Digital Content', icon: '🎮', color: '#6366F1', sort_order: 4 },
    ],
  },
  {
    name: '💊 Health',
    icon: '💊',
    color: '#EF4444',
    sort_order: 6,
    sub_heads: [
      { name: 'Medicine & Pharmacy', icon: '💊', color: '#EF4444', sort_order: 1 },
      { name: 'Doctor Visits & Checkups', icon: '🩺', color: '#DC2626', sort_order: 2 },
      { name: 'Health Insurance', icon: '🏥', color: '#2563EB', sort_order: 3 },
      { name: 'Dental & Eye Care', icon: '🦷', color: '#06B6D4', sort_order: 4 },
    ],
  },
  {
    name: '📞 Bills / Communications',
    icon: '📞',
    color: '#06B6D4',
    sort_order: 7,
    sub_heads: [
      { name: 'Mobile / Phone Bill', icon: '📱', color: '#06B6D4', sort_order: 1 },
      { name: 'Internet & WiFi', icon: '🌐', color: '#0284C7', sort_order: 2 },
      { name: 'Subscriptions & Streaming', icon: '📺', color: '#8B5CF6', sort_order: 3 },
      { name: 'Software & Cloud Services', icon: '💻', color: '#6366F1', sort_order: 4 },
    ],
  },
  {
    name: '✈️ Travel',
    icon: '✈️',
    color: '#0EA5E9',
    sort_order: 8,
    sub_heads: [
      { name: 'Vacations & Trips', icon: '🏖️', color: '#0EA5E9', sort_order: 1 },
      { name: 'Hotel Bookings', icon: '🏨', color: '#0284C7', sort_order: 2 },
      { name: 'Flights & Rail Tickets', icon: '🛫', color: '#2563EB', sort_order: 3 },
      { name: 'Visa & Travel Insurance', icon: '🧳', color: '#475569', sort_order: 4 },
    ],
  },
  {
    name: '🐾 Pets',
    icon: '🐾',
    color: '#F97316',
    sort_order: 9,
    sub_heads: [
      { name: 'Pet Food & Treats', icon: '🥩', color: '#F97316', sort_order: 1 },
      { name: 'Accessories & Toys', icon: '🦴', color: '#EA580C', sort_order: 2 },
      { name: 'Vet Care & Medicines', icon: '🩺', color: '#DC2626', sort_order: 3 },
      { name: 'Pet Grooming', icon: '✂️', color: '#D97706', sort_order: 4 },
    ],
  },
  {
    name: '👚 Clothes',
    icon: '👚',
    color: '#D946EF',
    sort_order: 10,
    sub_heads: [
      { name: 'Everyday Apparel', icon: '👕', color: '#D946EF', sort_order: 1 },
      { name: 'Footwear & Shoes', icon: '👟', color: '#C026D3', sort_order: 2 },
      { name: 'Formal & Office Wear', icon: '👔', color: '#4F46E5', sort_order: 3 },
      { name: 'Tailoring & Laundry', icon: '🧵', color: '#64748B', sort_order: 4 },
    ],
  },
  {
    name: '❓ Taxi / Miscellaneous',
    icon: '❓',
    color: '#64748B',
    sort_order: 11,
    sub_heads: [
      { name: 'Taxi / Cab Rides', icon: '🚕', color: '#F59E0B', sort_order: 1 },
      { name: 'Courier & Deliveries', icon: '📦', color: '#64748B', sort_order: 2 },
      { name: 'Miscellaneous Expenses', icon: '❓', color: '#94A3B8', sort_order: 3 },
    ],
  },
  {
    name: '🎁 Charity',
    icon: '🎁',
    color: '#14B8A6',
    sort_order: 12,
    sub_heads: [
      { name: 'Tithe', icon: '🙏', color: '#14B8A6', sort_order: 1 },
      { name: 'Donations & NGO', icon: '🤝', color: '#0D9488', sort_order: 2 },
      { name: 'Community Giving', icon: '🤲', color: '#059669', sort_order: 3 },
    ],
  },
  {
    name: '📚 Stationary',
    icon: '📚',
    color: '#84CC16',
    sort_order: 13,
    sub_heads: [
      { name: 'Books & Learning', icon: '📖', color: '#84CC16', sort_order: 1 },
      { name: 'Office & Desk Supplies', icon: '✏️', color: '#65A30D', sort_order: 2 },
      { name: 'Printing & Paper', icon: '🖨️', color: '#4D7C0F', sort_order: 3 },
    ],
  },
  {
    name: '🏛️ Govt. Expenses',
    icon: '🏛️',
    color: '#EAB308',
    sort_order: 14,
    sub_heads: [
      { name: 'Govt. Fees & Registrations', icon: '📄', color: '#EAB308', sort_order: 1 },
      { name: 'Passport & License Renewals', icon: '🛂', color: '#CA8A04', sort_order: 2 },
      { name: 'Fines & Penalties', icon: '⚠️', color: '#DC2626', sort_order: 3 },
    ],
  },
  {
    name: '💰 Taxes',
    icon: '💰',
    color: '#F43F5E',
    sort_order: 15,
    sub_heads: [
      { name: 'Income Tax', icon: '📑', color: '#F43F5E', sort_order: 1 },
      { name: 'Property Tax', icon: '🏡', color: '#E11D48', sort_order: 2 },
      { name: 'Vehicle & Road Tax', icon: '🚗', color: '#BE123C', sort_order: 3 },
      { name: 'Sales / VAT / GST', icon: '🧾', color: '#9F1239', sort_order: 4 },
    ],
  },
];

// Flat categories fallback for backward compatibility
export const SEED_CATEGORIES: SeedCategory[] = SEED_CATEGORY_HEADS.flatMap((head) =>
  head.sub_heads.map((sub, idx) => ({
    name: sub.name,
    group_name: head.name,
    icon: sub.icon || head.icon,
    color: sub.color || head.color,
    sort_order: head.sort_order * 100 + idx,
  }))
);
