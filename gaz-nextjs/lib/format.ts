const currencyFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  minimumFractionDigits: 2
});

export const formatCurrency = (value: number) => currencyFormatter.format(value);

export const formatIndex = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return value.toLocaleString("ro-RO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
};
