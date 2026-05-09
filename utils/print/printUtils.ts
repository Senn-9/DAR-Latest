// Shared print utilities used by both ORS and PO print builders

export function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatMoney(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return `\u20b1${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toWords(amount: number): string {
  if (!amount || isNaN(amount)) return "ZERO PESOS";

  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function threeDigits(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
    return `${ones[Math.floor(n / 100)]} HUNDRED${n % 100 ? ` ${threeDigits(n % 100)}` : ""}`;
  }

  const pesos = Math.floor(amount);
  const centavos = Math.round((amount - pesos) * 100);
  const parts: string[] = [];

  if (pesos >= 1_000_000_000) parts.push(`${threeDigits(Math.floor(pesos / 1_000_000_000))} BILLION`);
  if (pesos % 1_000_000_000 >= 1_000_000) parts.push(`${threeDigits(Math.floor((pesos % 1_000_000_000) / 1_000_000))} MILLION`);
  if (pesos % 1_000_000 >= 1_000) parts.push(`${threeDigits(Math.floor((pesos % 1_000_000) / 1_000))} THOUSAND`);
  if (pesos % 1_000 > 0) parts.push(threeDigits(pesos % 1_000));

  const pesoWords = pesos === 0 ? "ZERO" : parts.join(" ");
  const centWords = centavos > 0 ? ` AND ${threeDigits(centavos)}/100` : "";
  return `${pesoWords} PESOS${centWords}`;
}
