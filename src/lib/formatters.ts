export function formatCurrency(
  amount: number,
  currencyCode: string = 'INR',
  symbol?: string
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0.00';
  }

  const code = (currencyCode || 'INR').toUpperCase();
  const displaySymbol = symbol || getCurrencySymbol(code);

  let formattedNumber = '';
  if (code === 'INR') {
    // Indian numbering format (lakhs, crores)
    formattedNumber = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } else if (code === 'AED') {
    formattedNumber = new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } else {
    formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return `${displaySymbol} ${formattedNumber}`;
}

export function formatCompactCurrency(
  amount: number,
  currencyCode: string = 'INR',
  symbol?: string
): string {
  if (!amount || amount === 0) return '0';
  const displaySymbol = symbol || getCurrencySymbol(currencyCode);
  if (Math.abs(amount) >= 10000000) {
    return `${displaySymbol} ${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `${displaySymbol} ${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${displaySymbol} ${(amount / 1000).toFixed(1)}k`;
  }
  return `${displaySymbol} ${Math.round(amount)}`;
}

export function getCurrencySymbol(code: string): string {
  switch ((code || '').toUpperCase()) {
    case 'INR':
      return '₹';
    case 'AED':
      return 'AED';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return code || '₹';
  }
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getMonthName(monthNumber: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || '';
}

export function getDayOfWeekAbbr(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const d = date.getDay();
  return d === 0 || d === 6; // Sunday or Saturday
}

export function isCurrentDay(year: number, month: number, day: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === day
  );
}

export function formatDateISO(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}
