// src/utils/currencyUtils.js

/**
 * Get the currency symbol for a given currency code
 * @param {string} currencyCode - ISO currency code (USD, EUR, GBP, JPY)
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currencyCode) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
    };
    
    return symbols[currencyCode] || '$';
  };
  
  /**
   * Format amount with currency symbol
   * @param {number} amount - Amount to format
   * @param {string} currencyCode - ISO currency code
   * @returns {string} Formatted amount with currency symbol
   */
  export const formatCurrency = (amount, currencyCode = 'USD') => {
    const symbol = getCurrencySymbol(currencyCode);
    
    return `${symbol}${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };
  
  /**
   * Get array of common currency options
   * @returns {Array} Currency options with code and symbol
   */
  export const getCurrencyOptions = () => {
    return [
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'GBP', symbol: '£', name: 'British Pound' },
      { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    ];
  };