// src/components/ResponsiveAmount.jsx
import React from 'react';

const ResponsiveAmount = ({ amount, currency = '€', className = '', positive = false }) => {
  // Format the amount with proper thousand separators and decimal places
  const formattedAmount = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));

  // Determine text size based on the length of the formatted amount
  const getTextSize = (textLength) => {
    if (textLength > 12) return 'text-lg'; // Very long numbers
    if (textLength > 10) return 'text-xl'; // Long numbers
    if (textLength > 8) return 'text-2xl'; // Medium numbers
    return 'text-3xl'; // Default size for short numbers
  };

  // Remove currency symbol for length calculation
  const amountLength = formattedAmount.replace(currency, '').trim().length;
  const textSizeClass = getTextSize(amountLength);

  return (
    <span className={`font-bold ${textSizeClass} ${positive ? (amount >= 0 ? 'text-green-500' : 'text-red-500') : ''} ${className}`}>
      {amount >= 0 && positive ? '+' : ''}
      {formattedAmount}
    </span>
  );
};

export default ResponsiveAmount;