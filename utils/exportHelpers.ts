import ExcelJS from 'exceljs';

/**
 * Exporta dados para um arquivo Excel (.xlsx)
 */
export const exportToExcel = async (
    filename: string,
    columns: { header: string; key: string; width: number }[],
    data: any[],
    sheetName: string = 'Dados'
) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;

    // Estilo para o cabeçalho
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Adiciona os dados
    worksheet.addRows(data);

    // Gera o arquivo e inicia o download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};

/**
 * Exporta dados para um arquivo CSV
 */
export const exportToCSV = (filename: string, columns: { header: string; key: string }[], data: any[]) => {
    const headers = columns.map(c => c.header).join(';');
    const rows = data.map(item => {
        return columns.map(c => {
            const val = item[c.key];
            return val !== undefined && val !== null ? String(val).replace(';', ',') : '';
        }).join(';');
    });

    const content = [headers, ...rows].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
};
