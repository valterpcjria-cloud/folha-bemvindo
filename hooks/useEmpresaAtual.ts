import { useEffect, useState } from 'react';
import { api } from '../services/mockApi';

/** Bem Vindo: dados da empresa logada para cabeçalhos (contracheque, impressão em lote). */
export interface EmpresaCabecalho {
  razao_social: string;
  cnpj: string;
  cidadeUf: string;   // "Luziânia-GO" (vazio se não cadastrado)
}

export function useEmpresaAtual(): { empresa: EmpresaCabecalho | null; pronto: boolean } {
  const [empresa, setEmpresa] = useState<EmpresaCabecalho | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    api.getEmpresaAtual()
      .then((e) => {
        if (!vivo || !e) return;
        const cidadeUf = [e.nome_cidade, e.uf].filter(Boolean).join('-');
        setEmpresa({ razao_social: e.razao_social || '', cnpj: e.cnpj || '', cidadeUf });
      })
      .catch(() => { /* cabeçalho fica sem a empresa; não bloqueia a tela */ })
      .finally(() => { if (vivo) setPronto(true); });
    return () => { vivo = false; };
  }, []);

  return { empresa, pronto };
}
