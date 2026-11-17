/**
 * Utilitários para manipulação de dados
 * Funções helper usadas em importação e processamento
 */

/**
 * Busca um valor em um objeto independente de case ou acentos
 * Útil para processar dados de planilhas com headers variados
 */
export const findValue = (obj: Record<string, unknown>, patterns: string[]): unknown => {
    const keys = Object.keys(obj);
    for (const pattern of patterns) {
        const foundKey = keys.find(k => {
            const normalizedK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedP = pattern.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return normalizedK.includes(normalizedP);
        });
        if (foundKey) return obj[foundKey];
    }
    return null;
};

/**
 * Formata uma data no padrão brasileiro (DD/MM/YYYY)
 */
export const formatDateBR = (dateStr?: string): string => {
    if (!dateStr) return 'Não inf.';
    try {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
};

/**
 * Formata um valor monetário para BRL
 */
export const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

/**
 * Limpa uma string deixando apenas dígitos
 */
export const onlyDigits = (str: string): string => {
    return str.replace(/\D/g, '');
};
