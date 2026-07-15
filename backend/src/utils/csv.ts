const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

export const toCsv = (headers: string[], rows: Array<Record<string, unknown>>): string => {
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ];

  return lines.join('\n');
};
