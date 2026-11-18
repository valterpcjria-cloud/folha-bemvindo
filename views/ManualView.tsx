import React, { useState } from 'react';
import { 
  BookOpen, 
  CalendarDays, 
  Calculator, 
  FileSpreadsheet, 
  Settings, 
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
  ChevronRight
} from 'lucide-react';

type SectionId = 'visao-geral' | 'competencias' | 'lancamentos' | 'feriados' | 'relatorios' | 'dicas';

interface Section {
  id: SectionId;
  title: string;
  icon: React.ElementType;
}

const SECTIONS: Section[] = [
  { id: 'visao-geral', title: 'Visão Geral do Sistema', icon: BookOpen },
  { id: 'competencias', title: 'Gestão de Competências', icon: CalendarDays },
  { id: 'lancamentos', title: 'Lançamentos e Eventos', icon: Calculator },
  { id: 'feriados', title: 'Feriados e DSR', icon: CalendarDays },
  { id: 'relatorios', title: 'Relatórios e Contracheques', icon: FileSpreadsheet },
  { id: 'dicas', title: 'Dicas e Boas Práticas', icon: Zap },
];

const ManualView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SectionId>('visao-geral');

  // Renders the specific content based on the active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'visao-geral':
        return (
          <div className="space-y-6">
            <div className="bg-sky-50 border border-sky-100 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-sky-900 mb-3 flex items-center gap-2">
                <HelpCircle className="text-sky-500" />
                Bem-vindo à Folha Bem Vindo
              </h3>
              <p className="text-sky-800 leading-relaxed mb-4">
                O <strong>Folha RH</strong> é uma plataforma completa e moderna para a gestão do seu Departamento Pessoal. Construída com tecnologia de ponta, ela garante que os cálculos de folha, controle de eventos corporativos e relatórios sejam emitidos com precisão cirúrgica e compliance.
              </p>
              <div className="flex gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm flex-1 border border-sky-100">
                  <h4 className="font-semibold text-slate-800 flex flex-col gap-2">
                    <ShieldCheck size={20} className="text-green-500" />
                    Multi-Empresas Seguras
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Navegue pelas empresas cadastradas pelo seletor no topo da tela. Todos os dados são isolados com segurança total.</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm flex-1 border border-sky-100">
                  <h4 className="font-semibold text-slate-800 flex flex-col gap-2">
                    <Zap size={20} className="text-amber-500" />
                    Fechamento Expresso
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Automatize centenas de horas extras e DSRs com apenas um clique utilizando algoritmos rápidos.</p>
                </div>
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <h4 className="text-lg font-semibold text-slate-800 pb-2 border-b border-slate-200">Como usar este manual?</h4>
              <p className="text-slate-600">
                Utilize a barra de navegação à esquerda para explorar os capítulos de operação do sistema. Cada seção contém o fluxo lógico que você deve aplicar mensalmente nas rotinas da folha.
              </p>
            </div>
          </div>
        );

      case 'competencias':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="text-sky-500" /> Gestão de Competências (Meses)
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Toda folha de pagamento funciona ao redor de uma <strong>Competência</strong> (um "Ciclo" ou "Mês").
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                <h4 className="font-bold text-slate-800 mb-2">1. Criar Competência</h4>
                <p className="text-sm text-slate-600">
                  Todo mês você iniciará abrindo uma competência (Ex: <code>04/2026</code>). Durante a criação, os <strong>Salários Base (Rubrica 33)</strong> dos funcionários ativos são <span className="text-sky-600 font-semibold">copiados automaticamente</span> da folha anterior para facilitar o preenchimento.
                </p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                <h4 className="font-bold text-slate-800 mb-2">2. Status: ABERTA vs FECHADA</h4>
                <p className="text-sm text-slate-600">
                  Apenas competências <code>ABERTAS</code> permitem edição de horas e cálculos. Após rodar a folha e gerar relatórios, clique em "Fechar Competência" para selar os dados contra alterações acidentais.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 text-amber-800 font-bold mb-1">
                <AlertCircle size={18} /> Reabertura e Auditoria
              </div>
              <p className="text-sm text-amber-900/80">
                O sistema permite **Reabrir** ou **Excluir** uma competência por segurança, mas exigirá uma "Justificativa de Auditoria" da gerência, e essa ação ficará gravada indelevelmente no menu <em>Logs do Sistema</em>.
              </p>
            </div>
          </div>
        );

      case 'lancamentos':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="text-sky-500" /> Lançamentos e Eventos da Folha
            </h2>
            
            <p className="text-slate-600 leading-relaxed">
              O módulo principal. Aqui você atribui valores (Eventos) aos funcionários do mês selecionado.
            </p>

            <div className="space-y-4">
              <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <h4 className="font-bold text-slate-700">📌 Rubricas "Fixas" vs "Variáveis"</h4>
                <ul className="list-disc ml-5 mt-2 space-y-1 text-sm text-slate-600">
                  <li><strong>Fixas:</strong> A principal delas é o <code>33 - Salário</code>. Este valor costuma ser idêntico todos os meses e é trazido nativamente pelo sistema quando se abre uma folha.</li>
                  <li><strong>Variáveis:</strong> <code>Horas Extras (49)</code>, <code>Adicional Noturno</code>, <code>Faltas</code> e <code>DSR</code> variam e precisam ser digitados pelo RH todo mês ou injetados pelo robô do <em className="text-sky-600">Fechamento Expresso</em>.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                <h4 className="font-bold text-slate-700 mb-2">Modo "Grid" de Dados Excel</h4>
                <p className="text-sm text-slate-600">
                  A tela de <strong>Lançamentos</strong> funciona como uma planilha. Você pode editar múltiplos campos rapidamente utilizando a tecla <code>TAB</code> para pular as colunas. O sistema somará os totais em tempo real no topo da tela. <strong>Importante:</strong> Sempre clique em <span className="px-2 py-1 bg-sky-500 text-white rounded text-xs mx-1">Salvar Alterações</span> após digitar.
                </p>
              </div>
            </div>
          </div>
        );

      case 'feriados':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Feriados, Domingos e DSR</h2>
            
            <div className="prose prose-slate max-w-none">
              <p>O <strong>DSR (Descanso Semanal Remunerado)</strong> para horas mensais tem uma fórmula complexa baseada na relação entre os "Dias Úteis" e os "Dias Não Úteis" de um fechamento (Ex: Dia 21 a Dia 20).</p>
              
              <ul className="space-y-2">
                <li>
                  <strong className="text-sky-700">Módulo Feriados:</strong> Você deve cadastrar feriados Nacionais ou Municipais manualmente. Se não cadastrá-los, o sistema calculará o DSR apenas contando os domingos.
                </li>
                <li>
                  <strong className="text-sky-700">Como é feito o Cálculo?</strong> O módulo <i>Fechamento Expresso</i> buscará todos os eventos que o funcionário teve no mês selecionado (Horas 100%, Horas 50%), somará monetariamente, e a equação padrão é: <code>(Custo Total das HS / Dias Úteis) x (Domingos + Feriados)</code>.
                </li>
              </ul>
            </div>
          </div>
        );

      case 'relatorios':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-sky-500" /> PDF's: Relação de Cálculo & Contracheques
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
                <h4 className="font-bold text-indigo-900 mb-2 text-lg">📄 Espelho da Folha</h4>
                <p className="text-sm text-indigo-800 mb-3">
                  Também conhecido como <em>Relação de Cálculo</em>. É o documento interno do RH. Gera uma matriz técnica para a gerência aprovar os pagamentos e ver resumos da contabilidade global (Totais por Rubricas, INSS e IRRF das Folhas).
                </p>
                <div className="flex gap-2">
                  <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded font-mono">TCPDF Engine</span>
                  <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded font-mono">Grid Analytics</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
                <h4 className="font-bold text-emerald-900 mb-2 text-lg">✂️ Contracheques</h4>
                <p className="text-sm text-emerald-800 mb-3">
                  O documento do laborador/funcionário. Também chamado de Holerite. É entregue formalmente listando as parcelas recebidas, contendo o CNPJ da empresa, e pode ser assinado (Via "Módulo Empregados"). Gerado normalmente com "Linhas de Corte".
                </p>
                <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-mono">Impresso / Digital</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 mt-4 italic">
              * O menu 'Relatórios' consolida diversas visões estatísticas, incluindo os gráficos de Dashboard. Utilize filtros para focar as impressões num único departamento ou funcionário para agilidade.
            </p>
          </div>
        );

      case 'dicas':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Dicas Práticas de Suporte</h2>
            
            <dl className="mt-4 space-y-6 divide-y divide-slate-200">
              <div className="pt-4">
                <dt className="text-base font-semibold text-slate-900">
                  O sistema está travando ou "rodando interminavelmente"?
                </dt>
                <dd className="mt-2 text-sm text-slate-600">
                  Isso geralmente ocorre por conta de oscilações do servidor na hospedagem para cálculos muito robustos. Tente recarregar a página ou utilizar o <i>Fechamento Expresso</i> selecionando os funcionários por partes (ex: 20 de cada vez) invés de dar "Check" em todos.
                </dd>
              </div>
              <div className="pt-4">
                <dt className="text-base font-semibold text-slate-900">
                  Dados apagados misteriosamente?
                </dt>
                <dd className="mt-2 text-sm text-slate-600">
                  Cuidado com transferências complexas efetuadas pela equipe técnica. Mas internamente pela interface, você conta com as proteções do sistema (só deleta-se folhas ABERTAS e com justificativa gravada rigorosamente no 'Logs de Sistema' - verifique-o em caso de dúvidas).
                </dd>
              </div>
            </dl>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex h-full">
        
        {/* Sidebar Menu Interno do Manual */}
        <div className="w-64 bg-slate-50 border-r border-slate-200/60 p-4 flex flex-col shrink-0 overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 px-3 flex items-center gap-2">
            <BookOpen size={14} /> Índice
          </h2>
          <nav className="space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeTab === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left text-sm font-medium ${
                    isActive 
                      ? 'bg-sky-100 text-sky-700 shadow-sm border border-sky-200' 
                      : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-sky-600' : 'text-slate-400'} />
                  <span className="flex-1 truncate">{section.title}</span>
                  {isActive && <ChevronRight size={16} className="text-sky-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white p-8 overflow-y-auto w-full">
          <div className="max-w-3xl">
            {renderContent()}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ManualView;
