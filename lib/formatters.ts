export function formatDateFr(d: string) {
  const [y, m, dd] = d.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(dd));
  const jour = date.toLocaleDateString('fr-FR', { weekday: 'short' });
  return `${jour} ${dd}/${m}`;
}

export function formatDateTimeFr(value: string) {
  // Les timestamps SQLite sont stockés sans 'T' ni 'Z' → forcer parsing UTC
  const normalized = value.replace(' ', 'T') + (value.includes('Z') || value.includes('+') ? '' : 'Z');
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(normalized));
}
