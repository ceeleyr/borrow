const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Cek string tanggal YYYY-MM-DD yang valid (termasuk kabisat). */
function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function diffDays(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

function addDays(dateString, days) {
  return toDateString(new Date(Date.parse(`${dateString}T00:00:00Z`) + days * DAY_MS));
}

module.exports = { isValidDateString, toDateString, diffDays, addDays };
