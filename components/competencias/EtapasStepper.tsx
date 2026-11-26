/**
 * Bem Vindo v1.4.0: linha das 6 etapas da competência (concluídas, atual e próximas).
 */
import React from 'react';
import { Check } from 'lucide-react';
import { EtapaCompetencia } from '../../types';
import { ETAPAS, INFO_ETAPA } from '../../constants/etapasCompetencia';

const EtapasStepper: React.FC<{ atual: EtapaCompetencia }> = ({ atual }) => {
  const idx = ETAPAS.indexOf(atual);
  return (
    <ol className="flex items-center gap-1" aria-label="Etapas da competência">
      {ETAPAS.map((e, i) => {
        const feita = i < idx || atual === 'ENCERRADA';
        const agora = i === idx && atual !== 'ENCERRADA';
        return (
          <li key={e} className="flex-1 flex flex-col items-center gap-1" title={`${i + 1}. ${INFO_ETAPA[e].nome} — ${INFO_ETAPA[e].quem}`}>
            <span
              className={`h-1.5 w-full rounded-full ${feita ? 'bg-emerald-500' : agora ? 'bg-sky-500 animate-pulse' : 'bg-slate-200'}`}
            />
            <span className={`text-[9px] leading-none font-semibold flex items-center gap-0.5 ${agora ? 'text-sky-700' : feita ? 'text-emerald-600' : 'text-slate-400'}`}>
              {feita && <Check size={8} />}
              {INFO_ETAPA[e].curto}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export default EtapasStepper;
