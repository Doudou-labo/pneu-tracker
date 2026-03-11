function escapeCsvValue(value: string | number | null | undefined) {
  const stringValue = String(value ?? '');
  const sanitized = /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

export function buildCsv(rows: Array<Array<string | number | null | undefined>>) {
  return `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n')}`;
}

export function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}
