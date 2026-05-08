
export function formatDate(dateString) {
  /**
   * Format a date string from ISO 8601 to DD MMMM YYYY
   */
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateforupdate(dateString) {
  /**
   * Format a date string from ISO 8601 to MM/DD/YYYY
   */
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0'); // Ensure 2 digits for day
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Ensure 2 digits for month
  const year = date.getFullYear();

  // Format the date as MM/DD/YYYY
  return `${year}-${month}-${day}`;
}

export function formatDateforupdateSubcription(dateString) {
  /**
   * Format a date string from ISO 8601 to MM/DD/YYYY
   */
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  // return `${month}-${day}-${year}`;
  return `${year}-${month}-${day}`;
}

export function formatDateforTaskUpdate(dateString) {
  /**
   * Format a date string from ISO 8601 to DD MMM YYYY  HH:MM
   * Example: 05 Dec 2025  08:31
   */
  const date = new Date(dateString);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' }); // Short month name (Dec)
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day} ${month} ${year}  ${hours}:${minutes}`;
}

export function formatDateforEditAction(dateString) {
  /**
   * Format a date string to the `datetime-local` input format: YYYY-MM-DDTHH:MM
   */
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Ensure 2 digits for month
  const day = String(date.getDate()).padStart(2, '0'); // Ensure 2 digits for day
  const hours = String(date.getHours()).padStart(2, '0'); // Ensure 2 digits for hours
  const minutes = String(date.getMinutes()).padStart(2, '0'); // Ensure 2 digits for minutes

  // Format the date as YYYY-MM-DDTHH:MM
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatDateTimeForDisplay(dateString) {
  /**
   * Format a date string to a readable format: DD MMM YYYY HH:MM
   * Example: 07 Oct 2025 11:01
   */
  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' }); // Short month name
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

// ✅ NEW — formats number as Indian currency: ₹1,00,000
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
