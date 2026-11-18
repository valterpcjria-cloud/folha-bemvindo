/**
 * PayrollPagination - paginação da matriz (modo lista, sem agrupar por setor).
 * Extraído do PayrollGridView sem mudança de comportamento.
 */
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

const PayrollPagination: React.FC<Props> = ({ currentPage, totalPages, startIndex, itemsPerPage, totalItems, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-slate-500">
        Mostrando <span className="font-semibold text-slate-700">{startIndex + 1}</span> até <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="font-semibold text-slate-700">{totalItems}</span> registros
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${currentPage === pageNum
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-blue-600 shadow-sm'
                  }`}
              >
                {pageNum}
              </button>
            );
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <>
              <span className="text-slate-400 px-1">...</span>
              <button
                onClick={() => onPageChange(totalPages)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default PayrollPagination;
