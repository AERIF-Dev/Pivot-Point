const whole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const cents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $1,234 (rounded to whole dollars) */
export function money(value: number): string {
  const v = Math.round(Number.isFinite(value) ? value : 0);
  return whole.format(Object.is(v, -0) ? 0 : v);
}

/** +$46 / −$120 / $0 */
export function signedMoney(value: number): string {
  const v = Math.round(Number.isFinite(value) ? value : 0);
  if (v === 0) return "$0";
  return `${v > 0 ? "+" : "−"}${whole.format(Math.abs(v))}`;
}

/** $24.66 */
export function wage(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return cents.format(value);
}

export function hours(value: number, digits = 1): string {
  return `${(Number.isFinite(value) ? value : 0).toFixed(digits)} h`;
}

export function signedHours(value: number, digits = 1): string {
  const v = Number.isFinite(value) ? value : 0;
  const rounded = Number(v.toFixed(digits));
  if (rounded === 0) return "0 h";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)} h`;
}
