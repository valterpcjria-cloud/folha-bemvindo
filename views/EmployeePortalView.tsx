
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  User,
  ShieldCheck,
  CreditCard,
  History
} from 'lucide-react';
import { api } from '../services/mockApi';
import { Funcionario } from '../types';

const EmployeePortalView: React.FC<{ user: any }> = ({ user }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setHistory([
        { id: 1, mes: '06', ano: '2024', liquido: 3250.40, status: 'PAID' },
        { id: 2, mes: '05', ano: '2024', liquido: 3100.00, status: 'PAID' },
        { id: 3, mes: '04', ano: '2024', liquido: 3100.00, status: 'PAID' },
      ]);
      setLoading(false);
    }, 1000);
  }, [user]);

  return (
    <div className="space-y-16 animate-in fade-in duration-1000 font-inter">
      {/* Operator Alpha: High Fidelity Profile */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 border-l-2 border-signal-orange pl-12 pb-16 relative">
        <div className="absolute top-0 left-0 w-32 h-[1px] bg-white/10"></div>
        <div className="space-y-6 max-w-4xl">
          <p className="text-[10px] font-black tracking-[0.6em] text-signal-orange uppercase font-mono italic">OPERATOR_IDENTITY // UPLINK_SYNC_CONNECTED</p>
          <h1 className="text-8xl font-black text-white tracking-tighter leading-none uppercase mix-blend-difference">
            {user.nome}
          </h1>
          <div className="flex flex-wrap items-center gap-12 pt-6">
            <div className="flex items-center gap-6">
              <div className="w-8 h-[2px] bg-white/10"></div>
              <p className="text-white/40 font-black text-xs uppercase tracking-[0.3em] font-mono flex items-center gap-3">
                <User size={14} className="text-signal-orange" /> SERIAL_NODE::00234
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-8 h-[2px] bg-white/10"></div>
              <p className="text-white/40 font-black text-xs uppercase tracking-[0.3em] font-mono flex items-center gap-3">
                <ShieldCheck size={14} className="text-emerald-500" /> STATUS::VERIFIED_IDENTITY
              </p>
            </div>
          </div>
        </div>

        {/* Live Liquidity Fragment */}
        <div className="techno-card depth-metal bg-white/[0.03] p-12 border-none ring-1 ring-white/10 self-start xl:self-end group relative overflow-hidden transition-all duration-700 hover:ring-signal-orange/30">
          <div className="absolute top-0 right-0 w-2 h-2 bg-signal-orange"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-4 font-mono group-hover:text-signal-orange transition-colors">LAST_PAYABLE_LIQUID</p>
          <p className="text-6xl font-black text-white tracking-tighter uppercase group-hover:scale-105 transition-transform duration-700">R$ 3.250,40</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-1">
        <div className="xl:col-span-8 space-y-1">
          {/* Payment Stream Matrix: Tactical Evolution */}
          <div className="techno-card depth-metal p-16 bg-white/[0.01] space-y-16 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5"></div>
            <div className="flex items-center justify-between border-b border-white/10 pb-10">
              <h4 className="text-[11px] font-black text-white uppercase tracking-[0.6em] flex items-center gap-6">
                <History size={24} className="text-signal-orange" strokeWidth={3} />
                PAYMENT_EVOLUTION_STREAM
              </h4>
              <span className="text-[9px] font-mono text-white/10 tracking-[0.4em] uppercase font-black">VEC::TRANSACTION_DECRYPT</span>
            </div>

            <div className="overflow-x-auto border-none ring-1 ring-white/10 shadow-2xl">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="bg-white/[0.03] text-white uppercase tracking-[0.4em] font-black">
                    <th className="px-12 py-10 border-r border-white/5">COMPETENCE_NODE</th>
                    <th className="px-12 py-10 border-r border-white/5">LIQUID_INDEX_VALUE</th>
                    <th className="px-12 py-10 border-r border-white/5">UPLINK_STATUS</th>
                    <th className="px-12 py-10 text-right">ACTION_VECTOR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={4} className="p-32 text-center text-white/5 font-black uppercase tracking-[1em] text-[10px] animate-pulse">ESTABLISHING_SYNC_PROTOCOL...</td></tr>
                  ) : history.map(h => (
                    <tr key={h.id} className="hover:bg-white/[0.03] transition-all duration-500 group/row">
                      <td className="px-12 py-10 border-r border-white/5">
                        <div className="flex items-center gap-8">
                          <div className="w-16 h-16 bg-white/[0.02] border border-white/10 flex items-center justify-center text-white/20 group-hover/row:bg-white group-hover/row:text-black transition-all duration-700">
                            <Calendar size={20} strokeWidth={3} />
                          </div>
                          <span className="font-black text-white uppercase tracking-[0.2em] group-hover/row:translate-x-4 transition-transform duration-700">{h.mes}/{h.ano}_CYCLE</span>
                        </div>
                      </td>
                      <td className="px-12 py-10 border-r border-white/5 font-black text-white group-hover/row:text-signal-orange transition-colors tracking-tighter text-lg italic">
                        R$ {h.liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-12 py-10 border-r border-white/5">
                        <span className="px-6 py-2 border-none ring-1 ring-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] bg-emerald-500/5 italic">
                          {h.status}
                        </span>
                      </td>
                      <td className="px-12 py-10 text-right">
                        <button className="btn-precision p-6 bg-white/[0.05] hover:bg-signal-orange group/btn">
                          <Download size={24} strokeWidth={3} className="group-hover/btn:scale-125 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resources & Evolution: Tactical Side Matrix */}
        <div className="xl:col-span-4 space-y-1">
          <div className="techno-card depth-metal p-12 bg-white/[0.01] space-y-12">
            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.6em] flex items-center gap-6 border-b border-white/10 pb-8">
              UPLINK_RESOURCES_V4
            </h4>
            <div className="space-y-4">
              {[
                { icon: FileText, label: 'INCOME_REPORT_NODE', cye: 'BASE_YEAR_2023_CYE', color: 'bg-white' },
                { icon: CreditCard, label: 'BENEFIT_VECTOR_SYNC', cye: 'QUOTA_QUERY::FLASH_CAJU', color: 'bg-white' }
              ].map((item, idx) => (
                <button key={idx} className="w-full p-10 bg-white/[0.03] border border-white/10 text-left hover:border-signal-orange/40 hover:bg-white/[0.05] transition-all duration-700 flex items-center gap-8 group/resource overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-1 h-0 group-hover/resource:h-full bg-signal-orange transition-all duration-500"></div>
                  <div className={`w-16 h-16 ${item.color} text-black flex items-center justify-center shadow-2xl group-hover/resource:bg-signal-orange group-hover/resource:text-white transition-all duration-700`}>
                    <item.icon size={28} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{item.label}</p>
                    <p className="text-[9px] text-white/20 font-mono font-black uppercase tracking-[0.3em] mt-2 italic">{item.cye}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-10 border-t border-white/5 italic opacity-20">
              <p className="text-[9px] font-black uppercase tracking-[1em]">SYSTEM_STAKE::V4.1</p>
            </div>
          </div>

          {/* High Fidelity Career Matrix */}
          <div className="bg-white p-12 space-y-10 relative overflow-hidden group hover:bg-black transition-all duration-1000">
            <div className="absolute top-0 right-0 w-4 h-4 bg-black group-hover:bg-signal-orange transition-colors"></div>
            <div className="w-20 h-20 bg-black text-white flex items-center justify-center shadow-2xl group-hover:bg-white group-hover:text-black transition-all duration-1000">
              <TrendingUp size={40} strokeWidth={3} className="group-hover:rotate-12 transition-transform duration-700" />
            </div>
            <div className="space-y-4">
              <h4 className="text-4xl font-black text-black tracking-tighter uppercase group-hover:text-white transition-colors italic">EVOLUTION<br />THRESHOLD</h4>
              <p className="text-black/40 text-[11px] leading-relaxed font-black uppercase tracking-[0.1em] group-hover:text-white/40 transition-colors">
                TENURE_REACHED: 12_MONTHS_CYCLE.<br />
                INITIATE_PDI_UPLINK_WITH_NODE_MANAGER FOR_GROWTH_MAPPING.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePortalView;
