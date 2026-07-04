export const formatCurrency = (value = 0) => {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)} FCFA`;
};
