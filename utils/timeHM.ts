/**
 * Conversão entre horas decimais (armazenamento) e formato HH:MM (UI).
 * Usado em células de unidade HORA (ex: HE 50% / HE 100%) para permitir
 * que o usuário digite "2:30" ao invés de "2,50".
 */

/** Converte horas decimais em "H:MM". Ex: 2.5 → "2:30", 0.25 → "0:15". */
export function decimalToHM(decimal: number | string | null | undefined): string {
  if (decimal === null || decimal === undefined || decimal === '') return '';
  const num = typeof decimal === 'number'
    ? decimal
    : parseFloat(String(decimal).replace(',', '.'));
  if (isNaN(num) || num === 0) return '';
  // Arredonda para o minuto mais próximo para evitar "2:29" em 2.5 por float
  const totalMin = Math.round(num * 60);
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;
  return `${horas}:${String(minutos).padStart(2, '0')}`;
}

/**
 * Interpreta input do usuário e retorna horas decimais.
 * Formatos aceitos:
 *   - "2:30"  → 2.5
 *   - "02:30" → 2.5
 *   - "2h30"  → 2.5
 *   - "2,5"   → 2.5 (compat decimal BR)
 *   - "2.5"   → 2.5 (compat decimal EN)
 *   - "2"     → 2.0
 */
export function parseHMToDecimal(input: string): number {
  if (!input) return 0;
  const str = String(input).trim();

  // Formato HH:MM ou H:MM
  if (str.includes(':')) {
    const [h, m = '0'] = str.split(':');
    const horas = parseInt(h.replace(/\D/g, ''), 10) || 0;
    const minutos = parseInt(m.replace(/\D/g, ''), 10) || 0;
    return horas + (Math.min(minutos, 59)) / 60;
  }

  // Formato "2h30" ou "2h 30"
  if (/h/i.test(str)) {
    const parts = str.toLowerCase().split('h');
    const horas = parseInt(parts[0].replace(/\D/g, ''), 10) || 0;
    const minutos = parseInt((parts[1] || '0').replace(/\D/g, ''), 10) || 0;
    return horas + (Math.min(minutos, 59)) / 60;
  }

  // Compat: decimal puro (2,5 / 2.5 / 2)
  const decimal = parseFloat(str.replace(',', '.'));
  return isNaN(decimal) ? 0 : decimal;
}
