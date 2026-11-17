/**
 * Utilitários de formatação monetária no padrão BR (R$ 2.263,25).
 * Usado pelo campo salario_base do funcionário.
 */

export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else {
    const str = String(value);
    // Se tem vírgula, é formato BR ("2.223,33"); senão é machine ("2223.33")
    num = str.includes(',')
      ? parseFloat(str.replace(/\./g, '').replace(',', '.'))
      : parseFloat(str);
  }
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converte string formatada BR (ex: "2.263,25") em number (2263.25).
 * Aceita valores com ou sem formatação.
 */
export function parseBRL(value: string): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d,.-]/g, '');
  // Se tem vírgula, é decimal BR: remove pontos de milhar e troca vírgula por ponto
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Caso contrário trata como número simples
  return parseFloat(cleaned) || 0;
}

/**
 * Máscara progressiva para input: ao digitar "226325" resulta em "2.263,25".
 * Mantém sempre 2 casas decimais.
 */
export function maskBRL(input: string): string {
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
