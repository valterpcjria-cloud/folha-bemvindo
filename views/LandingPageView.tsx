import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    ChevronRight,
    CheckCircle2,
    BarChart3,
    ShieldCheck,
    Clock,
    Users,
    Calculator,
    Menu,
    X,
    ArrowRight,
    FileText,
    Activity,
    Lock,
    TrendingUp,
    CalendarDays,
    ListChecks,
    FileDown,
    FileSearch,
    Printer
} from 'lucide-react';

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as any } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const scaleUp = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
};

// Components
const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        setMobileMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/80 backdrop-blur-md border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
                        <Activity className="text-white w-5 h-5" />
                    </div>
                    <span className="font-display font-bold text-xl tracking-tight text-white">
                        Folha de Pagamento<span className="text-sky-400">RH</span>
                    </span>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Funcionalidades</button>
                    <button onClick={() => scrollToSection('diferenciais')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Diferenciais</button>
                    <button onClick={() => scrollToSection('contato')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Contato</button>
                    <div className="flex items-center gap-4 ml-4">
                        <Link to="/login" className="text-sm font-medium text-white hover:text-sky-400 transition-colors">
                            Entrar
                        </Link>
                        <button onClick={() => scrollToSection('contato')} className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-all shadow-[0_0_15px_rgba(2,132,199,0.3)] hover:shadow-[0_0_25px_rgba(2,132,199,0.5)]">
                            Falar com um consultor
                        </button>
                    </div>
                </nav>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Nav */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-slate-900 border-b border-white/10 overflow-hidden"
                    >
                        <div className="px-4 py-6 flex flex-col gap-4">
                            <button onClick={() => scrollToSection('features')} className="text-left text-lg font-medium text-slate-300">Funcionalidades</button>
                            <button onClick={() => scrollToSection('diferenciais')} className="text-left text-lg font-medium text-slate-300">Diferenciais</button>
                            <button onClick={() => scrollToSection('contato')} className="text-left text-lg font-medium text-slate-300">Contato</button>
                            <hr className="border-white/10 my-2" />
                            <Link to="/login" className="text-lg font-medium text-white">Entrar</Link>
                            <button onClick={() => scrollToSection('contato')} className="w-full py-3 text-center font-semibold text-white bg-sky-600 rounded-lg">
                                Falar com um consultor
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

const HeroSection = () => {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-600/20 rounded-full blur-[120px] mix-blend-screen mix-blend-plus-lighter"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen mix-blend-plus-lighter"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIvPjwvc3ZnPg==')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-white/10 backdrop-blur-sm shadow-xl mb-8"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-xs font-medium text-slate-300">O fim dos erros no fechamento folha</span>
                    </motion.div>

                    <motion.h1
                        initial="hidden" animate="visible" variants={fadeInUp}
                        className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white mb-6 leading-tight"
                    >
                        Gestão de RH inteligente para empresas que <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">focam no futuro</span>.
                    </motion.h1>

                    <motion.p
                        initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.1 }}
                        className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto"
                    >
                        Automatize cálculos, calcule DSR sobre horas extras automaticamente e gere contracheques em PDF — tudo com conformidade eSocial e portal self-service para colaboradores.
                    </motion.p>

                    <motion.div
                        initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.2 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 shadow-lg">
                            Agendar Demonstração <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                        <button className="w-full sm:w-auto px-8 py-4 bg-slate-800 text-white font-semibold rounded-xl border border-white/10 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                            Ver Funcionalidades
                        </button>
                    </motion.div>
                </div>

                {/* Dashboard Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.4 }}
                    className="mt-20 relative mx-auto max-w-5xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-20 pointer-events-none rounded-2xl"></div>
                    <div className="relative rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl overflow-hidden">
                        {/* Browser Window Header */}
                        <div className="flex items-center px-4 py-3 border-b border-white/5 bg-slate-800/50">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
                            </div>
                        </div>
                        {/* Mockup content: Abstract Representation of the dashboard */}
                        <div className="p-8 grid grid-cols-12 gap-6 opacity-80 pointer-events-none">
                            <div className="col-span-3 space-y-4">
                                <div className="h-6 w-32 bg-white/10 rounded"></div>
                                <div className="h-4 w-full bg-white/5 rounded mt-8"></div>
                                <div className="h-4 w-5/6 bg-white/5 rounded"></div>
                                <div className="h-4 w-4/6 bg-white/5 rounded"></div>
                                <div className="h-4 w-full bg-white/5 rounded mt-4"></div>
                                <div className="h-4 w-3/6 bg-white/5 rounded"></div>
                            </div>
                            <div className="col-span-9 space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="h-24 bg-gradient-to-br from-sky-500/20 to-sky-600/5 rounded-xl border border-white/5 p-4 flex flex-col justify-between">
                                        <div className="h-3 w-20 bg-white/20 rounded"></div>
                                        <div className="h-8 w-32 bg-white/40 rounded"></div>
                                    </div>
                                    <div className="h-24 bg-slate-800/50 rounded-xl border border-white/5 p-4 flex flex-col justify-between">
                                        <div className="h-3 w-24 bg-white/10 rounded"></div>
                                        <div className="h-8 w-24 bg-white/20 rounded"></div>
                                    </div>
                                    <div className="h-24 bg-slate-800/50 rounded-xl border border-white/5 p-4 flex flex-col justify-between">
                                        <div className="h-3 w-16 bg-white/10 rounded"></div>
                                        <div className="h-8 w-28 bg-white/20 rounded"></div>
                                    </div>
                                </div>
                                <div className="h-64 bg-slate-800/30 border border-white/5 rounded-xl p-4">
                                    <div className="h-full w-full flex items-end justify-between gap-2">
                                        {[40, 70, 45, 90, 65, 80, 50, 60, 30, 85].map((h, i) => (
                                            <div key={i} className="w-full bg-sky-500/20 rounded-t-sm" style={{ height: `${h}%` }}>
                                                <div className="w-full bg-sky-400/50 rounded-t-sm" style={{ height: '4px' }}></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};



const FeatureCard = ({ icon: Icon, title, description, delay }: any) => {
    return (
        <motion.div
            variants={fadeInUp}
            className="p-8 rounded-2xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-sky-500/30 transition-all duration-300 group"
        >
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6 text-sky-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-display">{title}</h3>
            <p className="text-slate-400 leading-relaxed">{description}</p>
        </motion.div>
    );
};

const FeaturesSection = () => {
    const features = [
        {
            icon: Calculator,
            title: "Motor de Cálculo Preciso",
            description: "Esqueça planilhas sujeitas a erros humanos. Nosso motor processa milhares de contracheques, horas extras e adicionais em segundos."
        },
        {
            icon: ShieldCheck,
            title: "Auditoria Contínua",
            description: "Cruzamento automático de dados antes do fechamento para evitar multas trabalhistas e inconsistências no eSocial."
        },
        {
            icon: Users,
            title: "Portal do Colaborador",
            description: "Empodere sua equipe com acesso web seguro a contracheques, informes de rendimento e histórico de férias."
        },
        {
            icon: FileText,
            title: "Gestão Integrada de Eventos",
            description: "Adicione rubricas, descontos e bônus de forma intuitiva, com rastreabilidade completa e sem complicação."
        },
        {
            icon: CheckCircle2,
            title: "Preparado para eSocial",
            description: "Mapeamento natural de rubricas e dependentes estruturado para exportação e conformidade com as exigências do governo."
        },
        {
            icon: Clock,
            title: "Fechamento Expresso",
            description: "Reduza os dias de fechamento de folha para apenas algumas horas com aprovações em massa e recálculo instantâneo."
        },
        {
            icon: TrendingUp,
            title: "DSR sobre H.E. Automático",
            description: "A Rubrica 59 é calculada automaticamente com base nos dias úteis, feriados do mês e horas extras lançadas. Campo read-only — conformidade garantida sem intervenção manual."
        },
        {
            icon: CalendarDays,
            title: "Calendário de Feriados por Empresa",
            description: "Gerencie feriados nacionais, estaduais e municipais com recorrência anual automática. Integração direta com o cálculo de DSR elimina erros de contagem de dias."
        },
        {
            icon: ListChecks,
            title: "Relação de Cálculo por Competência",
            description: "Resumo consolidado de proventos e descontos por departamento, com totalizadores e exportação PDF em um clique para contabilidade e auditoria."
        }
    ];

    return (
        <section id="features" className="py-24 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
                        <h2 className="text-sm font-semibold text-sky-400 tracking-wide uppercase mb-3">Recursos Poderosos</h2>
                        <h3 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Tudo que o seu RH precisa.</h3>
                        <p className="text-lg text-slate-400">Um ecossistema completo desenhado para eliminar a fricção operacional e garantir segurança legal na gestão de folha de pagamento.</p>
                    </motion.div>
                </div>

                <motion.div
                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {features.map((feature, idx) => (
                        <FeatureCard key={idx} {...feature} />
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

const BentoGridSection = () => {
    return (
        <section id="diferenciais" className="py-24 bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="mb-16 md:flex justify-between items-end">
                    <div className="max-w-2xl">
                        <h2 className="text-sm font-semibold text-emerald-400 tracking-wide uppercase mb-3">Diferenciais Técnicos</h2>
                        <h3 className="text-3xl md:text-5xl font-display font-bold text-white">Engenharia de ponta sob o capô.</h3>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                    {/* Large Card */}
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleUp}
                        className="md:col-span-2 md:row-span-2 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-8 sm:p-12 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none transition-all duration-700 group-hover:bg-sky-500/20 group-hover:scale-110"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="w-14 h-14 rounded-2xl bg-sky-500/20 flex items-center justify-center mb-6 border border-sky-400/20">
                                    <Activity className="w-7 h-7 text-sky-400" />
                                </div>
                                <h4 className="text-3xl font-display font-bold text-white mb-4">Motor Liquid Precision</h4>
                                <p className="text-lg text-slate-400 max-w-md leading-relaxed">Arquitetura assíncrona capaz de re-calcular o IRRF, INSS e DSR de dezenas de milhares de funcionários simultaneamente sem travar a interface.</p>
                            </div>

                            {/* Visual Abstract */}
                            <div className="mt-8 bg-slate-950/50 rounded-xl border border-white/5 p-4 overflow-hidden backdrop-blur-sm self-end w-full sm:w-2/3">
                                <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <span className="text-xs font-mono text-emerald-400">STATUS: PROCESSING</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                        <motion.div initial={{ width: "0%" }} whileInView={{ width: "100%" }} transition={{ duration: 2, ease: "linear" }} className="h-full bg-sky-500"></motion.div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                                        <span>CALC_COMP_JUL/2026</span>
                                        <span>15,432 RECORDS</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Small Card 1 */}
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleUp}
                        className="rounded-3xl bg-slate-800/40 border border-white/5 p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
                    >
                        <Lock className="w-8 h-8 text-emerald-400 mb-6" />
                        <h4 className="text-xl font-display font-bold text-white mb-2">Segurança Bancária</h4>
                        <p className="text-slate-400">Dados criptografados em repouso e trânsito, com infraestrutura isolada por locatário (tenant).</p>
                    </motion.div>

                    {/* Small Card 2 */}
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleUp}
                        className="rounded-3xl bg-slate-800/40 border border-white/5 p-8 relative overflow-hidden group hover:border-purple-500/30 transition-colors"
                    >
                        <BarChart3 className="w-8 h-8 text-purple-400 mb-6" />
                        <h4 className="text-xl font-display font-bold text-white mb-2">Relatórios Deep Dive</h4>
                        <p className="text-slate-400">Dashboards gerenciais para CFOs analisarem o custo real do departamento e provisões futuras.</p>
                    </motion.div>

                    {/* Small Card 3 */}
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleUp}
                        className="rounded-3xl bg-slate-800/40 border border-white/5 p-8 relative overflow-hidden group hover:border-amber-500/30 transition-colors"
                    >
                        <FileDown className="w-8 h-8 text-amber-400 mb-6" />
                        <h4 className="text-xl font-display font-bold text-white mb-2">Contracheque em PDF</h4>
                        <p className="text-slate-400">Holerites individuais gerados pelo motor TCPDF com layout CLT profissional. 3 por página A4, prontos para impressão ou envio digital.</p>
                    </motion.div>

                    {/* Small Card 4 */}
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleUp}
                        className="rounded-3xl bg-slate-800/40 border border-white/5 p-8 relative overflow-hidden group hover:border-teal-500/30 transition-colors"
                    >
                        <FileSearch className="w-8 h-8 text-teal-400 mb-6" />
                        <h4 className="text-xl font-display font-bold text-white mb-2">Espelho da Folha</h4>
                        <p className="text-slate-400">Relatório consolidado por funcionário com seleção em lote. Versão completa ou resumida para envio à contabilidade.</p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

const PDFReportsSection = () => {
    const bullets = [
        { icon: Printer, text: "Contracheque individual por funcionário, layout A4 com 3 por página" },
        { icon: Users, text: "Seleção em lote para geração massiva de holerites" },
        { icon: BarChart3, text: "Relação de Cálculo com totalizadores por departamento" },
        { icon: FileSearch, text: "Versão resumida do Espelho da Folha para envio à contabilidade" },
    ];

    return (
        <section id="relatorios" className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-teal-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-amber-500/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left — Copy */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
                        <h2 className="text-sm font-semibold text-amber-400 tracking-wide uppercase mb-3">Documentação Fiscal</h2>
                        <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-6 leading-tight">
                            Relatórios PDF prontos para qualquer auditoria.
                        </h3>
                        <p className="text-lg text-slate-400 mb-10">
                            Do contracheque individual ao espelho consolidado — tudo gerado pelo sistema com um clique, sem precisar exportar para Excel ou montar manualmente.
                        </p>
                        <ul className="space-y-5">
                            {bullets.map(({ icon: Icon, text }, i) => (
                                <li key={i} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Icon className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <span className="text-slate-300 leading-relaxed">{text}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Right — Contracheque Mockup */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/10 to-teal-500/10 rounded-3xl blur-xl"></div>
                        <div className="relative bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            {/* PDF header bar */}
                            <div className="flex items-center justify-between px-5 py-3 bg-slate-800/80 border-b border-white/5">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/70"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70"></div>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">contracheque_joao_silva_jul2026.pdf</span>
                                <FileDown className="w-3.5 h-3.5 text-slate-500" />
                            </div>

                            {/* PDF Content Mockup */}
                            <div className="p-6 font-mono text-[10px] leading-relaxed text-slate-300 space-y-4">
                                {/* Header empresa */}
                                <div className="text-center border-b border-white/10 pb-3 space-y-0.5">
                                    <div className="text-[11px] font-bold text-white uppercase tracking-wider">EMPRESA MODELO LTDA</div>
                                    <div className="text-slate-500">CNPJ: 00.000.000/0001-00 | Competência: JUL/2026</div>
                                    <div className="text-slate-400 font-semibold tracking-widest pt-1">DEMONSTRATIVO DE PAGAMENTO</div>
                                </div>

                                {/* Dados funcionário */}
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-white/10 pb-3">
                                    <div><span className="text-slate-500">Nome: </span><span className="text-white">João da Silva</span></div>
                                    <div><span className="text-slate-500">Matrícula: </span><span className="text-white">00042</span></div>
                                    <div><span className="text-slate-500">Cargo: </span><span className="text-white">Auxiliar Administrativo</span></div>
                                    <div><span className="text-slate-500">Admissão: </span><span className="text-white">15/03/2022</span></div>
                                </div>

                                {/* Tabela proventos/descontos */}
                                <div>
                                    <div className="grid grid-cols-12 text-slate-500 border-b border-white/5 pb-1 mb-1">
                                        <span className="col-span-1">Cód</span>
                                        <span className="col-span-7">Descrição</span>
                                        <span className="col-span-2 text-right">Proventos</span>
                                        <span className="col-span-2 text-right">Descontos</span>
                                    </div>
                                    {[
                                        { cod: "033", desc: "Salário Base", prov: "1.621,00", desc_val: "" },
                                        { cod: "049", desc: "Horas Extras 100%", prov: "294,00", desc_val: "" },
                                        { cod: "059", desc: "DSR s/ H.E. Diurnas", prov: "49,00", desc_val: "" },
                                        { cod: "035", desc: "INSS", prov: "", desc_val: "178,31" },
                                        { cod: "036", desc: "IRRF", prov: "", desc_val: "0,00" },
                                    ].map((row, i) => (
                                        <div key={i} className={`grid grid-cols-12 py-0.5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                                            <span className="col-span-1 text-slate-500">{row.cod}</span>
                                            <span className="col-span-7 text-slate-300">{row.desc}</span>
                                            <span className="col-span-2 text-right text-emerald-400">{row.prov}</span>
                                            <span className="col-span-2 text-right text-red-400">{row.desc_val}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Totalizador */}
                                <div className="border-t border-white/10 pt-3 grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <div className="text-slate-500">Sal. Bruto</div>
                                        <div className="text-white font-bold">R$ 1.964,00</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500">Descontos</div>
                                        <div className="text-red-400 font-bold">R$ 178,31</div>
                                    </div>
                                    <div className="bg-emerald-500/10 rounded-lg p-1">
                                        <div className="text-emerald-400">Líquido</div>
                                        <div className="text-emerald-300 font-bold text-[12px]">R$ 1.785,69</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

const ContactFormSection = () => {
    return (
        <section id="contato" className="py-24 relative">
            <div className="absolute inset-0 bg-slate-900">
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-16 flex flex-col lg:flex-row gap-16 justify-between items-center shadow-2xl">

                    <div className="lg:w-1/2">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
                            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-6">Pronto para modernizar o seu RH?</h2>
                            <p className="text-lg text-slate-400 mb-8">Nossos especialistas estão prontos para demonstrar como o Folha de PagamentoRH pode reduzir custos, mitigar riscos e otimizar a rotina da sua equipe.</p>

                            <ul className="space-y-4">
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="text-slate-300">Migração assistida e sem atritos.</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="text-slate-300">Treinamento completo para a equipe de RH.</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="text-slate-300">Suporte técnico prioritário SLA de 2 horas.</span>
                                </li>
                            </ul>
                        </motion.div>
                    </div>

                    <div className="lg:w-5/12 w-full">
                        <motion.form
                            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                            className="bg-slate-900 border border-white/5 rounded-2xl p-8 shadow-inner"
                        >
                            <h3 className="text-xl font-bold text-white mb-6 font-display">Fale com vendas</h3>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-1">Nome completo</label>
                                    <input type="text" id="name" className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors text-white placeholder:text-slate-500" placeholder="João da Silva" required />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">E-mail corporativo</label>
                                    <input type="email" id="email" className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors text-white placeholder:text-slate-500" placeholder="joao@empresa.com.br" required />
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-slate-400 mb-1">Como podemos ajudar?</label>
                                    <textarea id="message" rows={4} className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors text-white placeholder:text-slate-500 resize-none" placeholder="Conte-nos sobre os desafios do seu RH atual..."></textarea>
                                </div>
                                <button type="submit" className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-sky-600/20 active:scale-[0.98]">
                                    Solicitar Contato
                                </button>
                                <p className="text-xs text-center text-slate-500 mt-4">Ao enviar este formulário, você concorda com nossas Políticas de Privacidade.</p>
                            </div>
                        </motion.form>
                    </div>

                </div>
            </div>
        </section>
    );
}

const Footer = () => {
    return (
        <footer className="bg-slate-950 pt-16 pb-8 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded border border-sky-500 bg-sky-500/20 flex items-center justify-center">
                                <Activity className="text-sky-400 w-4 h-4" />
                            </div>
                            <span className="font-display font-bold text-lg text-white">
                                Folha de Pagamento<span className="text-sky-400">RH</span>
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">A evolução tecnológica do Departamento Pessoal. Precisão, segurança e automação para o seu fechamento de folha.</p>
                        <div className="flex gap-4">
                            {/* Social Placeholders */}
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 cursor-pointer transition-colors">in</div>
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 cursor-pointer transition-colors">x</div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Produto</h4>
                        <ul className="space-y-2">
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Funcionalidades</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Segurança</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Portal do Colaborador</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Espelho da Folha</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">DSR Automático</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Integrações</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Empresa</h4>
                        <ul className="space-y-2">
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Sobre nós</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Carreiras</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Blog</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Contato</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2">
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Termos de Uso</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Política de Privacidade</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-sky-400 text-sm transition-colors">Cookies</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-sm text-center md:text-left">
                        © {new Date().getFullYear()} Folha de PagamentoRH. Desenvolvido para transformar o RH.
                    </p>
                    <div className="text-slate-500 text-sm flex items-center gap-2">
                        Status do Sistema: <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Operacional</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

const LandingPageView: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-sky-500/30 selection:text-white overflow-x-hidden">
            <Navbar />
            <main>
                <HeroSection />

                <FeaturesSection />
                <BentoGridSection />
                <PDFReportsSection />
                <ContactFormSection />
            </main>
            <Footer />
        </div>
    );
};

export default LandingPageView;
