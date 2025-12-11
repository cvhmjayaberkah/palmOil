export const formatDate = (date: Date | string, options: Intl.DateTimeFormatOptions = {}): string => {
  // Convert date to Date object if it's a string
  const dateObject = typeof date === 'string' ? new Date(date) : date;

  // Default options for Indonesian date format (DD/MM/YYYY)
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long', // Use 'long' for full month name, use '2-digit' for two-digit month
    year: 'numeric',
    // locale: 'id-ID' // Specify Indonesian locale if needed
  };

  // Combine default options with any custom options provided
  const finalOptions = { ...defaultOptions, ...options };

  return new Intl.DateTimeFormat('id-ID', finalOptions).format(dateObject);
};

// Example usage
// const formattedDate = formatDate(new Date());