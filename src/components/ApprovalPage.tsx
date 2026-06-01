import React, { useState, useMemo } from "react";
import { 
  CheckCircle2, XCircle, Users, LayoutGrid, Search, 
  Filter, MoreHorizontal, ShieldCheck, ShieldAlert, ShieldX, 
  Database, ArrowUpRight, TrendingUp, AlertTriangle, Activity,
  ChevronLeft, Clock, Settings, Save, Check, Shield, CircleDot, Info,
  ClipboardCheck, Sliders, ChevronDown, ChevronUp, MessageSquare, Briefcase, Scale
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IARecord, StatusAuditoria, StatusUso, UserProfile, ApprovalConfig, ApprovalWorkflow } from "../types";

interface ApprovalPageProps {
  records: IARecord[];
  profiles: UserProfile[];
  workflows: ApprovalWorkflow[];
  approvalConfig: ApprovalConfig;
  currentUserId?: string;
  onUpdateStatus: (recordId: string, status: StatusAuditoria, comment?: string, extraFields?: any) => void;
  onSaveApprovalConfig: (config: ApprovalConfig) => void;
  onViewRecord: (record: IARecord) => void;
  isAdmin: boolean;
}

export default function ApprovalPage({
  records,
  profiles,
  workflows = [],
  approvalConfig,
  currentUserId,
  onUpdateStatus,
  onSaveApprovalConfig,
  onViewRecord,
  isAdmin
}: ApprovalPageProps) {
  const [activeTab, setActiveTab] = useState<"queue" | "config">("queue");
  const [workflowConfig, setWorkflowConfig] = useState<ApprovalConfig["steps"]>(
    approvalConfig?.steps ?? [
      { stepNumber: 1, roleName: "Coordenador NIT", isOpinionOnly: false },
      { stepNumber: 2, roleName: "Gerente NIT", isOpinionOnly: false },
      { stepNumber: 3, roleName: "Gerente TI", isOpinionOnly: false },
      { stepNumber: 4, roleName: "Análise Financeira", isOpinionOnly: true },
      { stepNumber: 5, roleName: "Presidência", isOpinionOnly: false },
    ]
  );
  const [workflowSaved, setWorkflowSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [queueFilter, setQueueFilter] = useState<"pending" | "my_turn" | "all">("pending");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  
  // Custom states for interactive analysis form
  const [analysisModal, setAnalysisModal] = useState<{ isOpen: boolean; record: IARecord | null }>({ isOpen: false, record: null });
  const [auditComment, setAuditComment] = useState("");

  // States for NIT Coordenador (Etapa 1)
  const [coordAlinhamento, setCoordAlinhamento] = useState("Alinhado");
  const [coordTransferencia, setCoordTransferencia] = useState("Médio");
  const [coordViabilidade, setCoordViabilidade] = useState("Sim");

  // Coordinator private Data Fields (Analise de dados)
  const [coordUsaDadosPessoais, setCoordUsaDadosPessoais] = useState("Não");
  const [coordUsaDadosSensiveis, setCoordUsaDadosSensiveis] = useState("Não");
  const [coordQuaisDados, setCoordQuaisDados] = useState("");
  const [coordDadosAnonimizados, setCoordDadosAnonimizados] = useState("Não");
  const [coordEnvioFornecedorExterno, setCoordEnvioFornecedorExterno] = useState("Não");
  const [coordDadosTreinamentoModelo, setCoordDadosTreinamentoModelo] = useState("Não");

  // States for NIT Gerente (Etapa 2)
  const [gerenteTRL, setGerenteTRL] = useState("TRL 7-9 (Pronto para Produção)");
  const [gerenteCustos, setGerenteCustos] = useState("Baixo (Sem investimento adicional)");
  const [gerenteRiscos, setGerenteRiscos] = useState("Aprovado sem restrição");

  // New detailed states for NIT Gerente (Etapa 2) Form
  const [g1RiscosRelevantes, setG1RiscosRelevantes] = useState<"Sim" | "Não" | "Não identificado">("Não identificado");
  const [g1TiposRisk, setG1TiposRisk] = useState<string[]>([]);
  const [g1Descricao, setG1Descricao] = useState("");

  const [g2ControlesExistentes, setG2ControlesExistentes] = useState<"Sim" | "Não" | "Parcialmente" | "Não se aplica">("Não se aplica");
  const [g2ControlesTipos, setG2ControlesTipos] = useState<string[]>([]);
  const [g2ControlesAdicionais, setG2ControlesAdicionais] = useState("");

  const [g3RiscoResidual, setG3RiscoResidual] = useState<"Baixo" | "Médio" | "Alto" | "Crítico" | "Não avaliado">("Não avaliado");
  const [g3Responsavel, setG3Responsavel] = useState("NIT");
  const [g3Observacoes, setG3Observacoes] = useState("");

  // States for TI Gerente (Etapa 3)
  const [tiInfra, setTiInfra] = useState("Compatível / Cloud nativa");
  const [tiSeguranca, setTiSeguranca] = useState("Conforme (Criptografado e restrito)");
  const [tiIntegracao, setTiIntegracao] = useState("Não (Plataforma autônoma)");

  // State to manage expanding/collapsing sections of the requester visualization
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    solicitante: true,
    identificacao: true,
    objetivo: false,
    dados: false,
    integracao: false,
    riscos: false,
    conformidade: false,
    classificacao: false
  });

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const privilegedProfiles = useMemo(() => {
    return profiles.filter(p => {
      const role = p.role?.toLowerCase().trim();
      return role === "admin" || role === "moderator";
    });
  }, [profiles]);

  const currentSteps = useMemo(() => {
    return approvalConfig?.steps && approvalConfig.steps.length > 0
      ? approvalConfig.steps
      : [
          { stepNumber: 1, roleName: "Coordenador NIT", isOpinionOnly: false, userId: "", userName: "" },
          { stepNumber: 2, roleName: "Gerente NIT", isOpinionOnly: false, userId: "", userName: "" },
          { stepNumber: 3, roleName: "Gerente TI", isOpinionOnly: false, userId: "", userName: "" },
          { stepNumber: 4, roleName: "Análise Financeira", isOpinionOnly: true, userId: "", userName: "" },
          { stepNumber: 5, roleName: "Presidência", isOpinionOnly: false, userId: "", userName: "" },
        ];
  }, [approvalConfig]);

  // Encontra o fluxo de processo real para cada IA
  const getRecordWf = (recordId: string) => {
    return workflows.find(wf => wf.iaRecordId === recordId);
  };

  const filteredRecords = useMemo(() => {
    let list = records.filter(r => {
      const matchesSearch = r.nomeFerramenta.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           r.unidadeSetor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           r.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    if (queueFilter === "pending") {
      // Somente as pendentes no resultado geral
      list = list.filter(r => (r.statusAuditoria || StatusAuditoria.PENDENTE) === StatusAuditoria.PENDENTE);
    } else if (queueFilter === "my_turn") {
      // Somente as IAs onde o usuário logado é o responsável pela etapa atual ativa
      list = list.filter(r => {
        const isPending = (r.statusAuditoria || StatusAuditoria.PENDENTE) === StatusAuditoria.PENDENTE;
        if (!isPending) return false;

        const wf = getRecordWf(r.id);
        const isWfFinished = wf && (wf.finalStatus === "aprovado" || wf.finalStatus === "negado");
        if (isWfFinished) return false;

        const currentStepNum = wf ? wf.currentStep : 1;
        const stepDef = currentSteps.find(s => s.stepNumber === currentStepNum);
        
        // Live config assigned user with fallback to active workflow's step user
        const wfStep = wf?.steps?.find(s => s.stepNumber === currentStepNum);
        const stepUserId = stepDef?.userId || wfStep?.assignedUserId;

        const currentUserProfile = profiles.find(p => p.id === currentUserId);
        const isUserAdmin = isAdmin;
        const isUserModerator = currentUserProfile?.role?.toLowerCase().trim() === "moderator";
        const isUserPrivileged = isUserAdmin || isUserModerator;

        const isStepUnassigned = !stepUserId;
        const isAssignedToMe = stepUserId === currentUserId;

        return (isAssignedToMe || (isStepUnassigned && isUserPrivileged));
      });
    }

    return list;
  }, [records, queueFilter, searchTerm, workflows, currentSteps, currentUserId, profiles, isAdmin]);

  const stats = useMemo(() => {
    const total = records.length;
    
    // IAs sob responsabilidade direta do logado
    const myTurnCount = records.filter(r => {
      const isPending = (r.statusAuditoria || StatusAuditoria.PENDENTE) === StatusAuditoria.PENDENTE;
      if (!isPending) return false;
      const wf = workflows.find(w => w.iaRecordId === r.id);
      const isWfFinished = wf && (wf.finalStatus === "aprovado" || wf.finalStatus === "negado");
      if (isWfFinished) return false;

      const currentStepNum = wf ? wf.currentStep : 1;
      const stepDef = currentSteps.find(s => s.stepNumber === currentStepNum);

      const wfStep = wf?.steps?.find(s => s.stepNumber === currentStepNum);
      const stepUserId = stepDef?.userId || wfStep?.assignedUserId;

      const currentUserProfile = profiles.find(p => p.id === currentUserId);
      const isUserAdmin = isAdmin;
      const isUserModerator = currentUserProfile?.role?.toLowerCase().trim() === "moderator";
      const isUserPrivileged = isUserAdmin || isUserModerator;

      const isStepUnassigned = !stepUserId;
      const isAssignedToMe = stepUserId === currentUserId;

      return (isAssignedToMe || (isStepUnassigned && isUserPrivileged));
    }).length;

    const totalPending = records.filter(r => (r.statusAuditoria || StatusAuditoria.PENDENTE) === StatusAuditoria.PENDENTE).length;

    return { total, myTurnCount, totalPending };
  }, [records, workflows, currentSteps, currentUserId, profiles, isAdmin]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Governança, Risco e Conformidade (GRC)
          </span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Aprovação de sistemas
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Acompanhe a conformidade de processos corporativos e valide com segurança os pareceres de etapas sequentes.
          </p>
        </div>

        {/* Compact indicators */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-left min-w-[120px]">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Na minha vez</p>
            <p className="text-lg font-bold text-slate-800">{stats.myTurnCount}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-left min-w-[125px]">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Pendentes</p>
            <p className="text-lg font-bold text-amber-650">{stats.totalPending}</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-px">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("queue")}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative ${
              activeTab === "queue"
                ? "text-[#03440c] border-b-2 border-[#03440c] font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Fila de aprovação
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setActiveTab("config")}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative ${
                activeTab === "config"
                  ? "text-[#03440c] border-b-2 border-[#03440c] font-bold"
                  : "text-slate-500 hover:text-[#03440c]"
              }`}
            >
              Configurar fluxo
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + queueFilter + searchTerm}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "queue" && (() => {
            const activeRecord = (() => {
              if (filteredRecords.length === 0) return null;
              const found = filteredRecords.find(r => r.id === selectedRecordId);
              return found || filteredRecords[0];
            })();

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                
                {/* COLUNA ESQUERDA: Fila de Solicitações (col-span-5) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col space-y-4 shadow-sm">
                  <div>
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Fila de aprovação</h2>
                    <p className="text-[11px] text-slate-400">Selecione uma solicitação para revisar</p>
                  </div>

                  {/* Filtros compactos - Minha vez, Pendentes, Todos */}
                  <div className="flex flex-wrap gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
                    {[
                      { label: "Minha vez", value: "my_turn" },
                      { label: "Pendentes", value: "pending" },
                      { label: "Todos", value: "all" }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setQueueFilter(opt.value as any);
                          setSelectedRecordId(null);
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center uppercase tracking-wide transition-all ${
                          queueFilter === opt.value
                            ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Barra de busca compacta */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar ferramenta, ID, setor..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSelectedRecordId(null);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-inner"
                    />
                  </div>

                  {/* Lista de Registros */}
                  <div className="space-y-2 overflow-y-auto max-h-[560px] pr-1">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((record) => {
                        const isSelected = activeRecord && record.id === activeRecord.id;
                        const wf = getRecordWf(record.id);
                        const currentStepNum = wf ? wf.currentStep : 1;
                        
                        const activeStepDef = currentSteps.find(s => s.stepNumber === currentStepNum);
                        const wfStep = wf?.steps?.find(s => s.stepNumber === currentStepNum);
                        const stepUserId = activeStepDef?.userId || wfStep?.assignedUserId;

                        const currentUserProfile = profiles.find(p => p.id === currentUserId);
                        const isUserAdmin = isAdmin;
                        const isUserModerator = currentUserProfile?.role?.toLowerCase().trim() === "moderator";
                        const isUserPrivileged = isUserAdmin || isUserModerator;

                        const isStepUnassigned = !stepUserId;
                        const isAssignedToMe = stepUserId === currentUserId;
                        const isWfFinished = wf && (wf.finalStatus === "aprovado" || wf.finalStatus === "negado");
                        const isMyTurn = !isWfFinished && isAssignedToMe && record.statusAuditoria === StatusAuditoria.PENDENTE;

                        return (
                          <div
                            key={record.id}
                            onClick={() => setSelectedRecordId(record.id)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? "bg-emerald-50/20 border-emerald-600 border-l-4 shadow-xs"
                                : isMyTurn
                                  ? "bg-amber-50/20 border-amber-300 hover:border-amber-400"
                                  : "bg-white border-slate-200 hover:border-slate-350"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[9px] text-slate-400 font-semibold">{record.id}</span>
                              <span className={`text-[8px] px-2 py-0.5 rounded font-bold tracking-wider uppercase ${
                                record.statusAuditoria === StatusAuditoria.APROVADO ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                record.statusAuditoria === StatusAuditoria.NEGADO ? "bg-red-50 text-red-700 border border-red-100" :
                                "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                {record.statusAuditoria || "Pendente"}
                              </span>
                            </div>
                            
                            <h3 className="text-xs font-bold text-slate-800 line-clamp-1 uppercase">
                              {record.nomeFerramenta}
                            </h3>

                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-medium truncate max-w-[150px]">{record.unidadeSetor} • {record.responsavelPreenchimento}</span>
                              <span className="font-mono text-[9px] shrink-0">{new Date(record.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-450 font-medium">Nenhuma solicitação pendente</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUNA DIREITA: Detalhes e Fluxo de Aprovação (col-span-7) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col space-y-5 shadow-sm min-h-[500px]">
                  {activeRecord ? (() => {
                    const record = activeRecord;
                    const wf = getRecordWf(record.id);
                    const currentStepNum = wf ? wf.currentStep : 1;
                    const activeStepDef = currentSteps.find(s => s.stepNumber === currentStepNum);
                    
                    const wfStep = wf?.steps?.find(s => s.stepNumber === currentStepNum);
                    const stepUserId = activeStepDef?.userId || wfStep?.assignedUserId;
                    const displayedRoleName = activeStepDef?.roleName || wfStep?.roleName || "N/A";
                    const displayedUserName = activeStepDef?.userName || wfStep?.assignedUserName;

                    const currentUserProfile = profiles.find(p => p.id === currentUserId);
                    const isUserAdmin = isAdmin;
                    const isUserModerator = currentUserProfile?.role?.toLowerCase().trim() === "moderator";
                    const isUserPrivileged = isUserAdmin || isUserModerator;

                    const isStepUnassigned = !stepUserId;
                    const isAssignedToMe = stepUserId === currentUserId;
                    const isWfFinished = wf && (wf.finalStatus === "aprovado" || wf.finalStatus === "negado");
                    const isMyTurn = !isWfFinished && isAssignedToMe && record.statusAuditoria === StatusAuditoria.PENDENTE;

                    const latestDecision = record.historico?.find(
                      h => h.action && !h.action.includes("Criação") && !h.action.includes("Atualização")
                    );

                    return (
                      <>
                        {/* Pane Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                          <div>
                            <span className="font-mono text-[9px] text-slate-400 font-semibold">{record.id}</span>
                            <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase mt-0.5">
                              {record.nomeFerramenta}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">{record.unidadeSetor} • {record.responsavelPreenchimento}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isMyTurn ? (
                              <button
                                onClick={() => {
                                  setAnalysisModal({ isOpen: true, record });
                                  setAuditComment("");
                                  setCoordAlinhamento("Alinhado");
                                  setCoordTransferencia("Médio");
                                  setCoordViabilidade("Sim");
                                  
                                  setCoordUsaDadosPessoais(record.usaDadosPessoais || "Não");
                                  setCoordUsaDadosSensiveis(record.usaDadosSensiveis || "Não");
                                  setCoordQuaisDados(record.quaisDados || "");
                                  setCoordDadosAnonimizados(record.dadosAnonimizados || "Não");
                                  setCoordEnvioFornecedorExterno(record.envioFornecedorExterno || "Não");
                                  setCoordDadosTreinamentoModelo(record.dadosTreinamentoModelo || "Não");
                                  setGerenteTRL("TRL 7-9 (Pronto para Produção)");
                                  setGerenteCustos("Baixo (Sem investimento adicional)");
                                  setGerenteRiscos("Aprovado sem restrição");
                                  
                                  setG1RiscosRelevantes("Não identificado");
                                  setG1TiposRisk([]);
                                  setG1Descricao("");
                                  setG2ControlesExistentes("Não se aplica");
                                  setG2ControlesTipos([]);
                                  setG2ControlesAdicionais("");
                                  setG3RiscoResidual("Não avaliado");
                                  setG3Responsavel("NIT");
                                  setG3Observacoes("");

                                  setTiInfra("Compatível / Cloud nativa");
                                  setTiSeguranca("Conforme (Criptografado e restrito)");
                                  setTiIntegracao("Não (Plataforma autônoma)");
                                }}
                                className="bg-[#03440c] hover:bg-[#03440c]/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                              >
                                <ClipboardCheck size={14} /> Registrar parecer
                              </button>
                            ) : (
                              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] text-slate-500 font-bold flex items-center gap-1.5 select-none">
                                <Clock size={12} className="text-slate-400" />
                                <span>
                                  {record.statusAuditoria === StatusAuditoria.PENDENTE ? "Pendente" : "Finalizado"}
                                </span>
                              </div>
                            )}
                            
                            <button
                              onClick={() => onViewRecord(record)}
                              className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-750 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            >
                              Ver ficha
                            </button>
                          </div>
                        </div>

                        {/* Metadata Summary Info Line */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div>
                            <p className="text-[9px] text-slate-450 uppercase font-bold">Setor</p>
                            <p className="text-xs font-bold text-slate-700 truncate">{record.unidadeSetor}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-450 uppercase font-bold">Solicitante</p>
                            <p className="text-xs font-bold text-slate-700 truncate">{record.responsavelPreenchimento}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-450 uppercase font-bold">Data Cadastro</p>
                            <p className="text-xs font-medium text-slate-600">{new Date(record.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-450 uppercase font-bold">Criticidade sugerida</p>
                            <p className="text-xs font-bold text-slate-600">{record.criticidade || "Mapeamento pendente"}</p>
                          </div>
                        </div>

                        {/* Seção: Último Parecer */}
                        {latestDecision && (
                          <div className="p-3 bg-emerald-50/15 border border-emerald-100 rounded-xl">
                            <span className="text-[9px] font-bold uppercase text-emerald-800 tracking-wider block mb-1">Último parecer</span>
                            <p className="text-[11px] text-slate-600 italic leading-relaxed">
                              "{latestDecision.message || latestDecision.action}"
                            </p>
                            <div className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-700">
                              <CheckCircle2 size={10} />
                              <span>{latestDecision.action}</span>
                            </div>
                          </div>
                        )}

                        {/* Seção: Fluxo de Governança (Horizontal Stepper) */}
                        <div className="space-y-3 pt-1">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Fluxo de aprovação</h3>
                          
                          <div className="relative flex items-center justify-between w-full px-4">
                            {/* Thin connection line behind */}
                            <div className="absolute left-6 right-6 top-[11px] h-[1px] bg-slate-200 z-0" />
                            
                            {currentSteps.map((step) => {
                              const wfStep = wf?.steps?.find(s => s.stepNumber === step.stepNumber);
                              const hasWfStepDecision = wfStep && wfStep.status !== "aguardando";

                              const isPassed = hasWfStepDecision
                                ? (wfStep.status === "aprovado" || wfStep.status === "opiniao")
                                : (step.stepNumber < currentStepNum || record.statusAuditoria === StatusAuditoria.APROVADO);

                              const isFailed = hasWfStepDecision
                                ? (wfStep.status === "negado")
                                : (record.statusAuditoria === StatusAuditoria.NEGADO && step.stepNumber === currentStepNum);

                              const isCurrent = step.stepNumber === currentStepNum && record.statusAuditoria === StatusAuditoria.PENDENTE;

                              return (
                                <div key={step.stepNumber} className="relative z-10 flex flex-col items-center">
                                  <div
                                    title={`${step.stepNumber}. ${step.roleName}`}
                                    className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                                      isPassed
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : isFailed
                                          ? "bg-red-650 border-red-650 text-white"
                                          : isCurrent
                                            ? "bg-amber-500 border-amber-500 text-white ring-2 ring-amber-100 ring-offset-1 animate-pulse"
                                            : "bg-white border-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {step.stepNumber}
                                  </div>
                                  
                                  <span className="text-[8px] font-bold text-slate-500 mt-1 max-w-[64px] truncate text-center uppercase tracking-tight block">
                                    {step.roleName.split(" ")[0]} {step.roleName.split(" ")[1] || ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Seção: Histórico Completo de Responsáveis (Vertical compact list) */}
                        <div className="space-y-3 pt-1">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Responsáveis pelo processo</h3>
                          
                          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/10 overflow-hidden shadow-xs">
                            {currentSteps.map((step) => {
                              const wfStep = wf?.steps?.find(s => s.stepNumber === step.stepNumber);
                              const hasWfStepDecision = wfStep && wfStep.status !== "aguardando";
                              
                              const isPassed = hasWfStepDecision
                                ? (wfStep.status === "aprovado" || wfStep.status === "opiniao")
                                : (step.stepNumber < currentStepNum || record.statusAuditoria === StatusAuditoria.APROVADO);

                              const isFailed = hasWfStepDecision
                                ? (wfStep.status === "negado")
                                : (record.statusAuditoria === StatusAuditoria.NEGADO && step.stepNumber === currentStepNum);

                              const isCurrent = step.stepNumber === currentStepNum && record.statusAuditoria === StatusAuditoria.PENDENTE;

                              const signerName = wfStep?.assignedUserName || step.userName || "Usuário livre";
                              const decidedAt = wfStep?.decidedAt;
                              const opinion = wfStep?.comment;

                              return (
                                <div key={step.stepNumber} className="p-3 flex items-start gap-4 justify-between bg-white hover:bg-slate-50/50 transition-colors">
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-slate-400">Etapa {step.stepNumber}</span>
                                      <span className="text-slate-300">|</span>
                                      <span className="text-[11px] font-bold text-slate-800 truncate">{step.roleName}</span>
                                    </div>
                                    
                                    <p className="text-[10px] text-slate-500">
                                      Responsável: <span className="font-semibold text-slate-700">{signerName}</span>
                                    </p>

                                    {decidedAt && (
                                      <p className="text-[9px] text-slate-450 font-mono">Assinado em {new Date(decidedAt).toLocaleDateString()}</p>
                                    )}

                                    {opinion && (
                                      <p className="text-[10px] text-slate-500 italic mt-1 leading-snug font-medium pl-2 border-l border-slate-200 bg-slate-50/50 p-1 rounded">
                                        "{opinion.replace(/###.+/g, "").replace(/•/g, "").replace(/\*/g, "").trim()}"
                                      </p>
                                    )}
                                  </div>

                                  <div className="shrink-0 pt-0.5">
                                    {isPassed ? (
                                      <span className="px-2 py-0.5 text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase rounded">Aprovado</span>
                                    ) : isFailed ? (
                                      <span className="px-2 py-0.5 text-[8px] bg-red-50 text-red-700 border border-red-200 font-bold uppercase rounded">Negado</span>
                                    ) : isCurrent ? (
                                      <span className="px-2 py-0.5 text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold uppercase rounded animate-pulse">Atual</span>
                                    ) : (
                                      <span className="px-2 py-0.5 text-[8px] bg-slate-50 text-slate-400 border border-slate-150 font-bold uppercase rounded">Aguardando</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })() : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-2">
                      <ShieldCheck size={40} className="text-slate-300 pointer-events-none" />
                      <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase">Nenhum protocolo ativo</h3>
                        <p className="text-[11px]">Selecione uma solicitação da fila à esquerda para analisar</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {activeTab === "config" && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Definir Responsáveis pelas Etapas</h3>
                  <p className="text-xs text-[var(--text-muted)] font-bold mt-1">
                    Atribua quais administradores ou moderadores do Laboratório Cedro assinam as decisões de conformidade.
                  </p>
                </div>
                {workflowSaved && (
                  <span className="text-xs font-black text-brand-green bg-brand-green/10 border border-brand-green/20 px-3 py-1.5 rounded-xl uppercase">✓ Configuração salva</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowConfig.map((step, idx) => (
                  <div key={step.stepNumber} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="size-10 rounded-xl flex items-center justify-center font-black text-sm border bg-[#03440c]/10 border-[#03440c]/20 text-[#03440c]">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={step.roleName}
                          onChange={(e) => {
                            const updated = [...workflowConfig];
                            updated[idx] = { ...updated[idx], roleName: e.target.value };
                            setWorkflowConfig(updated);
                            setWorkflowSaved(false);
                          }}
                          className="w-full bg-transparent font-black text-slate-900 text-sm border-b border-slate-200 focus:border-brand-green outline-none pb-1 transition-colors"
                        />
                        <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Cargo / Papel da etapa</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Usuário Responsável (Admin/Moderador)</label>
                      <select
                        value={step.userId ?? ""}
                        onChange={(e) => {
                          const selectedProfile = privilegedProfiles.find(p => p.id === e.target.value);
                          const updated = [...workflowConfig];
                          updated[idx] = {
                            ...updated[idx],
                            userId: e.target.value || undefined,
                            userName: selectedProfile?.full_name || undefined,
                          };
                          setWorkflowConfig(updated);
                          setWorkflowSaved(false);
                        }}
                        className="w-full px-4 py-3 bg-black/5 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold outline-none focus:border-brand-green transition-all"
                      >
                        <option value="">— Selecione um administrador ou moderador —</option>
                        {privilegedProfiles.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} ({p.role === "admin" ? "Admin" : "Moderador"}{p.cargo ? ` • ${p.cargo}` : ""})
                          </option>
                        ))}
                      </select>
                      {privilegedProfiles.length === 0 && (
                        <p className="text-[9px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-bold mt-1">
                          Nenhum administrador ou moderador cadastrado. Promova usuários na aba Gestão Admin.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    if (onSaveApprovalConfig) {
                      onSaveApprovalConfig({ steps: workflowConfig });
                      setWorkflowSaved(true);
                      setTimeout(() => setWorkflowSaved(false), 4000);
                    }
                  }}
                  className={`w-full py-4 font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 relative overflow-hidden ${
                    workflowSaved
                      ? "bg-brand-green text-white shadow-lg shadow-brand-green/30 scale-[1.01]"
                      : "bg-[#03440c] text-white shadow-md hover:bg-[#03440c]/90"
                  }`}
                >
                  {workflowSaved ? (
                    <>
                      <CheckCircle2 size={16} />
                      Fluxo configurado com sucesso!
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Salvar Configuração de Etapas
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Analysis & Decision Modal Overlay */}
      <AnimatePresence>
        {analysisModal.isOpen && analysisModal.record && (() => {
          const record = analysisModal.record;
          const wf = getRecordWf(record.id);
          const currentStepNum = wf ? wf.currentStep : 1;
          const activeStepDef = currentSteps.find(s => s.stepNumber === currentStepNum);

          const handleDecisionSubmit = (status: StatusAuditoria) => {
            let finalComment = "";
            let extraFields: any = undefined;
            if (currentStepNum === 1) {
              finalComment = `### FORMULÁRIO DE AVALIAÇÃO - COORDENADOR NIT\n` +
                             `• Alinhamento Estratégico: ${coordAlinhamento}\n` +
                             `• Potencial de Transferência: ${coordTransferencia}\n` +
                             `• Viabilidade de Patentes: ${coordViabilidade}\n\n` +
                             `**Parecer:** ${auditComment || "Etapa aprovada com ressalvas mínimas."}`;
              
              extraFields = {
                usaDadosPessoais: coordUsaDadosPessoais,
                usaDadosSensiveis: coordUsaDadosSensiveis,
                quaisDados: coordQuaisDados,
                dadosAnonimizados: coordDadosAnonimizados,
                envioFornecedorExterno: coordEnvioFornecedorExterno,
                dadosTreinamentoModelo: coordDadosTreinamentoModelo
              };
            } else if (currentStepNum === 2) {
              const riscosStr = g1TiposRisk.length > 0 ? g1TiposRisk.join(", ") : "Nenhum tipo de risco relevante selecionado";
              const controlesStr = g2ControlesTipos.length > 0 ? g2ControlesTipos.join(", ") : "Nenhum controle específico listado";
              finalComment = `### FORMULÁRIO DE GESTÃO DE RISCOS (GERENTE NIT)\n` +
                             `* BLOCO 1 - RISCOS IDENTIFICADOS *\n` +
                             `• Riscos Relevantes? ${g1RiscosRelevantes}\n` +
                             `• Tipos de Risco: ${riscosStr}\n` +
                             `• Detalhamento de Riscos: ${g1Descricao || "Nenhum"}\n\n` +
                             `* BLOCO 2 - CONTROLES & MITIGAÇÃO *\n` +
                             `• Há Controles Implementados? ${g2ControlesExistentes}\n` +
                             `• Tipos de Controle: ${controlesStr}\n` +
                             `• Controles Adicionais Necessários: ${g2ControlesAdicionais || "Nenhum"}\n\n` +
                             `* BLOCO 3 - RISCO RESIDUAL & RESPONSABILIDADES *\n` +
                             `• Risco Residual após Controles: ${g3RiscoResidual}\n` +
                             `• Responsável pelo Acompanhamento: ${g3Responsavel}\n` +
                             `• Observações Críticas de Risco: ${g3Observacoes || "Nenhuma"}\n\n` +
                             `**Parecer Final da Etapa:** ${auditComment || "Etapa assinada sob conformidade de processos corporativos do NIT."}`;
            } else if (currentStepNum === 3) {
              finalComment = `### FORMULÁRIO DE AVALIAÇÃO - GERENTE TI\n` +
                             `• Infraestrutura e APIs: ${tiInfra}\n` +
                             `• Segurança e LGPD: ${tiSeguranca}\n` +
                             `• Integração Sistemas TI: ${tiIntegracao}\n\n` +
                             `**Parecer:** ${auditComment || "Etapa validada tecnicamente pelo departamento de TI."}`;
            } else {
              // 4 e 5
              finalComment = auditComment || (status === StatusAuditoria.APROVADO ? "Parecer estratégico aprovado na íntegra." : "Recusado.");
            }

            onUpdateStatus(record.id, status, finalComment, extraFields);
            setAnalysisModal({ isOpen: false, record: null });
            setAuditComment("");
          };

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAnalysisModal({ isOpen: false, record: null })}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative w-full max-w-6xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col lg:flex-row h-full max-h-[90vh]"
              >
                {/* COLUNA ESQUERDA: Formulário do Solicitante (Visualização) */}
                <div className="lg:w-1/2 border-r border-slate-100 flex flex-col h-full bg-slate-50/50">
                  <div className="p-6 md:p-8 border-b border-slate-200/60 bg-white">
                    <span className="text-[10px] font-black uppercase text-[#03440c] tracking-widest block mb-1">DADOS DA NOVA SOLICITAÇÃO</span>
                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{record.nomeFerramenta || "SISTEMA DE IA"}</h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] font-bold text-slate-500">
                      <span className="px-2.5 py-0.5 bg-black/5 rounded-md font-mono">Protocolo: {record.id}</span>
                      <span>•</span>
                      <span>Criado em: {new Date(record.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                    {/* Folder 1: Solicitante */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleSection("solicitante")}
                        className="w-full p-4 flex items-center justify-between font-bold text-xs uppercase text-slate-700 bg-slate-50/70 border-b border-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <Users size={14} className="text-[#03440c]" /> 1. Solicitante
                        </span>
                        {expandedSections.solicitante ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSections.solicitante && (
                        <div className="p-4 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 border-t border-slate-50">
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Setor Solicitante</p>
                            <p className="uppercase font-extrabold">{record.unidadeSetor}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Cargo</p>
                            <p className="capitalize">{record.cargo || "Não cadastrado"}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Solicitante</p>
                            <p>{record.responsavelPreenchimento}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Data da Solicitação</p>
                            <p>{record.dataRegistro ? new Date(record.dataRegistro + "T00:00:00").toLocaleDateString() : "-"}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Folder 2: Identificação */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleSection("identificacao")}
                        className="w-full p-4 flex items-center justify-between font-bold text-xs uppercase text-slate-700 bg-slate-50/70 border-b border-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <Sliders size={14} className="text-[#03440c]" /> 2. Identificação da IA
                        </span>
                        {expandedSections.identificacao ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSections.identificacao && (
                        <div className="p-4 space-y-3 text-xs font-semibold text-slate-700 border-t border-slate-50">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-black">Nome da Ferramenta</p>
                              <p className="font-extrabold uppercase text-[#03440c]">{record.nomeFerramenta}</p>
                            </div>
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-black">Fornecedor / Desenvolvedor</p>
                              <p className="uppercase">{record.fornecedor || "Interno"}</p>
                            </div>
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-black">Versão / Plano</p>
                              <p>{record.versao || "Não especificada"}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Tipo de Tecnologia</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {(record.tipoIA || []).map((t: string) => (
                                <span key={t} className="px-2.5 py-1 bg-[#03440c]/10 text-emerald-800 text-[10px] rounded-lg font-black uppercase tracking-tight">{t}</span>
                              ))}
                              {(!(record.tipoIA && record.tipoIA.length)) && <span className="text-slate-400 italic">Mapeamento não preenchido</span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Folder 3: Objetivo */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleSection("objetivo")}
                        className="w-full p-4 flex items-center justify-between font-bold text-xs uppercase text-slate-700 bg-slate-50/70 border-b border-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <Info size={14} className="text-[#03440c]" /> 3. Finalidade e Objetivos
                        </span>
                        {expandedSections.objetivo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSections.objetivo && (
                        <div className="p-4 space-y-3 text-xs font-semibold text-slate-700 border-t border-slate-50">
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Descrição da Atividade</p>
                            <p className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 italic mt-1 font-medium leading-relaxed">"{record.descricaoAtividade}"</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Objetivos de Negócio / Clínicos</p>
                            <div className="flex flex-wrap gap-1 md:gap-1.5 mt-1.5">
                              {(record.objetivos || []).map((t: string) => (
                                <span key={t} className="px-2.5 py-1 bg-blue-50 border border-blue-100/50 text-blue-700 text-[10px] rounded-lg font-black uppercase tracking-tight">{t}</span>
                              ))}
                              {(!(record.objetivos && record.objetivos.length)) && <span className="text-slate-400 italic">Sem objetivos definidos</span>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-black">Etapa do Processo</p>
                              <p className="font-extrabold uppercase mt-0.5">{record.etapaProcesso || "Outros"}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Benefícios Esperados</p>
                            <p className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 italic mt-1 font-medium leading-relaxed">"{record.beneficiosEsperados}"</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Folder 4: Dados */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleSection("dados")}
                        className="w-full p-4 flex items-center justify-between font-bold text-xs uppercase text-slate-700 bg-slate-50/70 border-b border-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <Database size={14} className="text-[#03440c]" /> 4. Fluxo de Dados e Privacidade
                        </span>
                        {expandedSections.dados ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSections.dados && (
                        <div className="p-4 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 border-t border-slate-50">
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Trata Dados Pessoais?</p>
                            <span className={`inline-block mt-1 px-3 py-1 rounded-md text-[10px] font-black uppercase ${record.usaDadosPessoais === "Sim" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {record.usaDadosPessoais}
                            </span>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Trata Dados Sensíveis?</p>
                            <span className={`inline-block mt-1 px-3 py-1 rounded-md text-[10px] font-black uppercase ${record.usaDadosSensiveis === "Sim" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {record.usaDadosSensiveis}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[8px] text-slate-400 uppercase font-black">Quais Dados são Processados?</p>
                            <p className="text-slate-600 mt-1 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">{record.quaisDados || "Nenhum dado informado ou aplicável."}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Os Dados são Anonimizados?</p>
                            <p className="uppercase mt-0.5">{record.dadosAnonimizados || "Não"}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Compartilha com Fornecedor?</p>
                            <p className="uppercase mt-0.5">{record.envioFornecedorExterno || "Não"}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Folder 5: Integração */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleSection("integracao")}
                        className="w-full p-4 flex items-center justify-between font-bold text-xs uppercase text-slate-700 bg-slate-50/70 border-b border-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <Activity size={14} className="text-[#03440c]" /> 5. Integração e Homologação
                        </span>
                        {expandedSections.integracao ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSections.integracao && (
                        <div className="p-4 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 border-t border-slate-50">
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Integrada ao Sistema Cedro?</p>
                            <p className="uppercase mt-0.5">{record.integradaSistemaInterno}</p>
                          </div>
                          {record.integradaSistemaInterno === "Sim" && (
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-black">Qual Sistema?</p>
                              <p className="uppercase mt-0.5 font-extrabold text-[#03440c]">{record.qualSistema || "-"}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Impacto em Laudos de Exames?</p>
                            <p className="uppercase mt-0.5 font-extrabold">{record.impactoResultadosLaboratoriais}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Exige Validação Humana?</p>
                            <p className="uppercase mt-0.5 font-extrabold">{record.validacaoHumana}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Folder 6: Riscos */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleSection("riscos")}
                        className="w-full p-4 flex items-center justify-between font-bold text-xs uppercase text-slate-700 bg-slate-50/70 border-b border-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-[#03440c]" /> 6. Riscos e Controles
                        </span>
                        {expandedSections.riscos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSections.riscos && (
                        <div className="p-4 space-y-3 text-xs font-semibold text-slate-700 border-t border-slate-50">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-black">Viés/Erro Identificados?</p>
                              <p className="uppercase mt-0.5">{record.riscosIdentificados}</p>
                            </div>
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-black">Controles Existentes?</p>
                              <p className="uppercase mt-0.5">{record.controlesImplementados}</p>
                            </div>
                          </div>
                          {record.riscoResidual && (
                            <div className="pt-1.5 border-t border-slate-100">
                              <p className="text-[8px] text-slate-400 uppercase font-black">Nível de Risco Residual</p>
                              <span className={`inline-block mt-1 px-3 py-1 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800`}>
                                {record.riscoResidual}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Folder 7: Conformidade */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleSection("conformidade")}
                        className="w-full p-4 flex items-center justify-between font-bold text-xs uppercase text-slate-700 bg-slate-50/70 border-b border-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck size={14} className="text-[#03440c]" /> 7. Conformidade Legal
                        </span>
                        {expandedSections.conformidade ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSections.conformidade && (
                        <div className="p-4 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 border-t border-slate-50">
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Alinhado com a LGPD?</p>
                            <p className="uppercase mt-0.5 font-extrabold text-[#03440c]">{record.alinhadoLGPD}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Tem Política de Uso de IA?</p>
                            <p className="uppercase mt-0.5">{record.politicaInterna}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Folder 8: Classificação */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleSection("classificacao")}
                        className="w-full p-4 flex items-center justify-between font-bold text-xs uppercase text-slate-700 bg-slate-50/70 border-b border-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <Scale size={14} className="text-[#03440c]" /> 8. Classificação de Impacto
                        </span>
                        {expandedSections.classificacao ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSections.classificacao && (
                        <div className="p-4 space-y-2 text-xs font-semibold text-slate-700 border-t border-slate-50">
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-black">Classificação de Criticidade</p>
                            <p className="uppercase font-extrabold text-slate-800 mt-0.5">{record.criticidade}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-100">
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-black">Enquadramento Calculado (Auto)</p>
                              <span className="inline-block mt-1 px-3 py-1 bg-[#03440c]/10 text-emerald-800 text-[10px] font-black rounded-lg uppercase tracking-tight">
                                {record.classificacaoRiscoAutomatico || "Baixo risco"}
                              </span>
                            </div>
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-black">Risco Manual Cadastrado</p>
                              <span className="inline-block mt-1 px-3 py-1 bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-black rounded-lg uppercase tracking-tight">
                                {record.classificacaoRiscoManual || "Baixo risco"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: Form de Preenchimento de Aprovação do Decisor */}
                <div className="lg:w-1/2 flex flex-col h-full bg-white p-6 md:p-8 justify-between overflow-y-auto">
                  <div className="space-y-6">
                    {/* Header do Formulário */}
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="size-11 rounded-xl bg-[#03440c]/10 text-[#03440c] flex items-center justify-center font-black shadow-inner text-sm">
                        {currentStepNum}
                      </div>
                      <div>
                        <span className="text-[9px] text-[#03440c] font-black uppercase tracking-widest block">Parecer d0 Decisor Responsável</span>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                          Formulário de Aprovação: <strong className="text-[#03440c] font-black">{activeStepDef?.roleName || "Avaliador Autorizado"}</strong>
                        </h4>
                      </div>
                    </div>

                    {/* Histórico Recente de pareceres de etapas concluídas */}
                    {(() => {
                      const prevSteps = wf?.steps?.filter((s) => s.stepNumber < currentStepNum && s.status !== "aguardando") || [];
                      if (prevSteps.length === 0) return null;
                      return (
                        <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-2">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Pareceres Registrados das Etapas Anteriores</p>
                          <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto custom-scrollbar space-y-2.5 pr-2">
                            {prevSteps.map((s) => (
                              <div key={s.stepNumber} className="pt-2 text-[11px] font-semibold text-slate-700">
                                <div className="flex items-center justify-between text-[9px] font-black uppercase">
                                  <span className="text-[#023309] font-black">{s.stepNumber}. {s.roleName} : {s.assignedUserName || "Assinatura livre"}</span>
                                  <span className={s.status === "negado" ? "text-red-600 font-black" : "text-emerald-700 font-black"}>{s.status.toUpperCase()}</span>
                                </div>
                                <p className="text-slate-600 font-medium italic mt-1 text-[11px] leading-relaxed whitespace-pre-wrap">
                                  {s.comment || "Sem comentários específicos registrados."}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* FORMULÁRIO DE PREENCHIMENTO EXCLUSIVO DAS CONTAS ATIVAS DE COORDENADOR NIT, GERENTE NIT, E GERENTE TI */}
                    {currentStepNum === 1 && (
                      <div className="space-y-4 pt-1">
                        <p className="text-[9px] font-black text-[#03440c] uppercase tracking-wider bg-[#03440c]/5 border border-[#03440c]/10 px-3 py-1.5 rounded-lg">✓ RECURSOS OBRIGATÓRIOS DO COORDENADOR NIT</p>
                        
                        {/* Campo 1 */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Alinhamento Estratégico de Inovação</label>
                          <div className="flex gap-2">
                            {["Alinhado", "Parcialmente Alinhado", "Não Alinhado"].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setCoordAlinhamento(opt)}
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                  coordAlinhamento === opt
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Campo 2 */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Potencial de Transferência ou Patente</label>
                          <div className="flex gap-2">
                            {["Alto", "Médio", "Baixo", "Não avaliado"].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setCoordTransferencia(opt)}
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                  coordTransferencia === opt
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Campo 3 */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Viabilidade de Registro de Software</label>
                          <div className="flex gap-2">
                            {["Sim", "Não", "Em estudo"].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setCoordViabilidade(opt)}
                                className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                  coordViabilidade === opt
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Divisor */}
                        <div className="h-px bg-slate-100 my-4" />
                        
                        <p className="text-[9px] font-black text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">🛡️ Análise de Dados e Privacidade — Coordenador NIT</p>
                        
                        {/* Campo Dados Pessoais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Utiliza dados pessoais?</label>
                            <div className="flex gap-2">
                              {["Sim", "Não"].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setCoordUsaDadosPessoais(opt)}
                                  className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                    coordUsaDadosPessoais === opt
                                      ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Utiliza dados sensíveis?</label>
                            <div className="flex gap-2">
                              {["Sim", "Não"].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setCoordUsaDadosSensiveis(opt)}
                                  className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                    coordUsaDadosSensiveis === opt
                                      ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Campo Quais Dados são Processados */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Quais Dados são Processados?</label>
                          <textarea
                            value={coordQuaisDados}
                            onChange={(e) => setCoordQuaisDados(e.target.value)}
                            placeholder="Descreva detalhadamente os dados analisados/processados pela ferramenta (ex: CPF, nome, prontuário, exames, etc.)."
                            className="w-full text-xs font-semibold p-3 outline-none rounded-xl border border-slate-200 focus:border-indigo-400 focus:bg-indigo-50/10 placeholder-slate-400 bg-slate-50 text-slate-700 min-h-[60px] resize-none"
                          />
                        </div>

                        {/* Campo Dados Anonimizados */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Os dados são anonimizados?</label>
                            <div className="flex gap-1">
                              {["Sim", "Não", "Parcial"].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setCoordDadosAnonimizados(opt)}
                                  className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                    coordDadosAnonimizados === opt
                                      ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Compartilha ambiente externo / Fornecedor?</label>
                            <div className="flex gap-2">
                              {["Sim", "Não"].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setCoordEnvioFornecedorExterno(opt)}
                                  className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                    coordEnvioFornecedorExterno === opt
                                      ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Campo Armazenamento de treinamento de dados */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">A ferramenta armazena ou utiliza os dados para treinamento?</label>
                          <div className="flex gap-2">
                            {["Sim", "Não", "Não sei"].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setCoordDadosTreinamentoModelo(opt)}
                                className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                  coordDadosTreinamentoModelo === opt
                                    ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStepNum === 2 && (
                      <div className="space-y-6 pt-1">
                        {/* PAINEL EXECUTIVO DE DECISÃO RÁPIDA (PARA O GERENTE DO NIT) */}
                        <div className="bg-gradient-to-br from-indigo-50/70 via-emerald-50/30 to-slate-50 border border-slate-200/80 rounded-[1.25rem] p-4 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-lg bg-[#03440c]/10 text-[#03440c]">
                                <Activity size={14} />
                              </div>
                              <p className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Painel Executivo de Decisão Rápida</p>
                            </div>
                            <span className="text-[8px] bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                              ⚡ Leitura Veloz
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Bloco A: Resumo Crítico do Solicitante */}
                            <div className="bg-white border border-slate-100 p-3 rounded-xl space-y-2">
                              <p className="text-[8px] font-black uppercase text-slate-400 tracking-tight flex items-center gap-1.5">
                                <Info size={10} className="text-slate-500" /> DADOS DA SOLICITAÇÃO
                              </p>
                              
                              <div className="space-y-1 text-xs text-slate-700 font-semibold">
                                <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                  <span className="text-[8px] text-[#03440c]/70 font-black uppercase">IA Proposta</span>
                                  <span className="font-extrabold text-slate-900 truncate max-w-[140px] uppercase text-[10px]">{record.nomeFerramenta}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-[8px] text-slate-400 uppercase">Setor / Cargo</span>
                                  <span className="font-medium text-slate-600 truncate max-w-[150px] uppercase">{record.unidadeSetor} • {record.cargo || "Não inf."}</span>
                                </div>
                                
                                {/* Alerta de Risco LGPD */}
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-[8px] text-slate-400 uppercase">Tratamento de Dados</span>
                                  <div className="flex gap-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${record.usaDadosPessoais === "Sim" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                                      {record.usaDadosPessoais === "Sim" ? "PESSOAIS ⚠️" : "NÃO PESSOAIS"}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${record.usaDadosSensiveis === "Sim" ? "bg-red-100 text-red-800 animate-pulse" : "bg-slate-100 text-slate-500"}`}>
                                      {record.usaDadosSensiveis === "Sim" ? "SENSÍVEIS 🔥" : "NÃO SENSÍVEIS"}
                                    </span>
                                  </div>
                                </div>

                                {/* Criticidade Estimada */}
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-[8px] text-slate-400 uppercase">Criticidade Geral</span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                    record.criticidade?.toLowerCase().includes("alta") || record.criticidade?.toLowerCase().includes("crít")
                                      ? "bg-red-50 border border-red-200 text-red-700"
                                      : record.criticidade?.toLowerCase().includes("méd")
                                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                                      : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                  }`}>
                                    {record.criticidade || "Baixa"}
                                  </span>
                                </div>

                                {/* Resumo da descrição */}
                                <div className="pt-1.5 border-t border-slate-100">
                                  <span className="text-[8px] text-slate-400 uppercase block mb-0.5">Finalidade do Uso</span>
                                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic bg-emerald-50/10 p-2 rounded-lg border border-emerald-100/20 truncate">
                                    {record.descricaoAtividade || "Nenhuma descrição fornecida."}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Bloco B: Parecer Consolidado do Coordenador NIT */}
                            {(() => {
                              const coordStep = wf?.steps?.find(s => s.stepNumber === 1);
                              const commentRaw = coordStep?.comment || "";
                              
                              const matchAlinhamento = commentRaw.match(/Alinhamento Estratégico:\s*([^\n•]+)/i);
                              const matchTransferencia = commentRaw.match(/Potencial de Transferência:\s*([^\n•]+)/i);
                              const matchViabilidade = commentRaw.match(/Viabilidade de Patentes:\s*([^\n•]+)/i);
                              const matchParecerText = commentRaw.match(/\*\*Parecer:\*\*\s*(.+)$/is) || commentRaw.match(/Parecer Final:\s*(.+)$/is) || commentRaw.match(/\*\*Parecer Final da Etapa:\*\*\s*(.+)$/is);

                              const alinhamentoVal = matchAlinhamento ? matchAlinhamento[1].trim() : "Alinhado";
                              const transferenciaVal = matchTransferencia ? matchTransferencia[1].trim() : "Médio";
                              const viabilidadeVal = matchViabilidade ? matchViabilidade[1].trim() : "Sim";
                              const parecerJustificativa = matchParecerText ? matchParecerText[1].trim() : (commentRaw ? commentRaw : "Sem parecer detalhado do coordenador do NIT.");

                              return (
                                <div className="bg-white border border-slate-100 p-3 rounded-xl space-y-2">
                                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-tight flex items-center gap-1.5">
                                    <ShieldCheck size={10} className="text-[#03440c]" /> PARECER COORDENADOR NIT
                                  </p>
                                  
                                  <div className="space-y-1 text-xs text-slate-700 font-semibold">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-[8px] text-slate-400 uppercase">Alinhamento</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                        alinhamentoVal.includes("Não") ? "bg-red-50 text-red-800" : alinhamentoVal.includes("Parcial") ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
                                      }`}>{alinhamentoVal}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-[8px] text-slate-400 uppercase">Transferência</span>
                                      <span className="text-slate-950 font-extrabold uppercase">{transferenciaVal}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-[8px] text-slate-400 uppercase">Reg. Software</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                        viabilidadeVal === "Sim" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-500"
                                      }`}>{viabilidadeVal}</span>
                                    </div>

                                    {/* Parecer textual reduzido */}
                                    <div className="pt-1.5 border-t border-slate-100">
                                      <span className="text-[8px] text-slate-400 uppercase block mb-0.5">Parecer Coordenador</span>
                                      <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic bg-indigo-50/10 p-2 rounded-lg border border-indigo-100/20 truncate">
                                        {parecerJustificativa}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* FORMULÁRIO GESTÃO DE RISCO DO GERENTE NIT */}
                        <div className="space-y-5">
                          {/* BLOCO 1 - IDENTIFICAÇÃO DOS RISCOS */}
                          <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                              <span className="text-xs bg-[#03440c] text-white size-5 rounded-full flex items-center justify-center font-black">1</span>
                              <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Bloco 1 — Identificação dos riscos</h5>
                            </div>

                            {/* Campo 1.1 */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight">1. Foram identificados riscos relevantes no uso da IA?</label>
                              <div className="flex gap-2">
                                {["Sim", "Não", "Não identificado"].map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setG1RiscosRelevantes(opt as any)}
                                    className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                      g1RiscosRelevantes === opt
                                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-sm"
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Campo 1.2 */}
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight block">2. Tipo de risco identificado (Multi-escolha)</label>
                              <div className="grid grid-cols-2 gap-2 text-[9px] font-semibold">
                                {[
                                  "Dados e sigilo",
                                  "Segurança da informação",
                                  "Integração com sistemas",
                                  "Processo operacional",
                                  "Resultado laboratorial",
                                  "Uso inadequado da IA",
                                  "Falha de validação humana",
                                  "Reputacional",
                                  "Outro"
                                ].map((opt) => {
                                  const isSelected = g1TiposRisk.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setG1TiposRisk(g1TiposRisk.filter(item => item !== opt));
                                        } else {
                                          setG1TiposRisk([...g1TiposRisk, opt]);
                                        }
                                      }}
                                      className={`py-1.5 px-3 rounded-lg border text-[9px] font-bold uppercase transition-all text-left flex items-center justify-between ${
                                        isSelected
                                          ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      {isSelected && <span className="text-[8px] text-indigo-700 font-black">✓</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Campo 1.3 */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight block">3. Descrição dos riscos identificados</label>
                              <textarea
                                value={g1Descricao}
                                onChange={(e) => setG1Descricao(e.target.value)}
                                placeholder="Descreva tecnicamente os riscos mapeados nesta IA, como viés na tomada de decisões, problemas na segurança dos dados ou vazamentos..."
                                className="w-full h-20 bg-white border border-slate-200 hover:border-slate-350 text-slate-900 placeholder-slate-400 rounded-xl p-3 text-[11px] font-semibold focus:border-indigo-550 focus:ring-1 focus:ring-indigo-500/10 outline-none transition-all resize-none shadow-sm"
                              />
                            </div>
                          </div>

                          {/* BLOCO 2 - CONTROLES E MITIGAÇÃO */}
                          <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                              <span className="text-xs bg-[#03440c] text-white size-5 rounded-full flex items-center justify-center font-black">2</span>
                              <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Bloco 2 — Controles e mitigação</h5>
                            </div>

                            {/* Campo 2.1 */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight">1. Existem controles previstos ou implementados para reduzir os riscos?</label>
                              <div className="flex gap-2">
                                {["Sim", "Não", "Parcialmente", "Não se aplica"].map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setG2ControlesExistentes(opt as any)}
                                    className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                      g2ControlesExistentes === opt
                                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-sm"
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Campo 2.2 */}
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight block">2. Quais controles existem? (Multi-escolha)</label>
                              <div className="grid grid-cols-2 gap-2 text-[9px] font-semibold">
                                {[
                                  "Revisão humana obrigatória",
                                  "Restrição de acesso",
                                  "Controle de dados inseridos",
                                  "Monitoramento de uso",
                                  "Logs e trilha de auditoria",
                                  "Validação técnica prévia",
                                  "Treinamento dos usuários",
                                  "Controle de versão",
                                  "Plano de contingência",
                                  "Uso em ambiente de teste/homologação",
                                  "Outro"
                                ].map((opt) => {
                                  const isSelected = g2ControlesTipos.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setG2ControlesTipos(g2ControlesTipos.filter(item => item !== opt));
                                        } else {
                                          setG2ControlesTipos([...g2ControlesTipos, opt]);
                                        }
                                      }}
                                      className={`py-1.5 px-3 rounded-lg border text-[9px] font-bold uppercase transition-all text-left flex items-center justify-between ${
                                        isSelected
                                          ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      {isSelected && <span className="text-[8px] text-indigo-700 font-black">✓</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Campo 2.3 */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
                                  3. Controles adicionais necessários
                                </label>
                                {(g2ControlesExistentes === "Não" || g2ControlesExistentes === "Parcialmente") && (
                                  <span className="text-[8px] bg-red-100 text-red-700 font-extrabold tracking-widest uppercase px-2 py-0.5 rounded animate-pulse">
                                    Obrigatório ⚠️
                                  </span>
                                )}
                              </div>
                              <textarea
                                value={g2ControlesAdicionais}
                                onChange={(e) => setG2ControlesAdicionais(e.target.value)}
                                placeholder="Liste e descreva quais medidas preventivas adicionais são sugeridas ou necessárias para mitigar os riscos mapeados..."
                                className="w-full h-20 bg-white border border-slate-200 hover:border-slate-350 text-slate-900 placeholder-slate-400 rounded-xl p-3 text-[11px] font-semibold focus:border-[#03440c] focus:ring-1 focus:ring-[#03440c]/10 outline-none transition-all resize-none shadow-sm"
                                required={g2ControlesExistentes === "Não" || g2ControlesExistentes === "Parcialmente"}
                              />
                            </div>
                          </div>

                          {/* BLOCO 3 - RISCO RESIDUAL E RESPONSABILIDADE */}
                          <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                              <span className="text-xs bg-[#03440c] text-white size-5 rounded-full flex items-center justify-center font-black">3</span>
                              <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Bloco 3 — Risco residual e responsabilidade</h5>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              {/* Risco Residual com Pill Colors */}
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight">1. Risco residual após os controles</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    { val: "Baixo", col: "active:bg-emerald-600 bg-emerald-50 border-emerald-200 text-emerald-800", selCol: "bg-emerald-600 border-emerald-600 text-white" },
                                    { val: "Médio", col: "active:bg-amber-500 bg-amber-50 border-amber-200 text-amber-850", selCol: "bg-amber-500 border-amber-500 text-white animate-pulse" },
                                    { val: "Alto", col: "active:bg-orange-600 bg-orange-50 border-orange-200 text-orange-800", selCol: "bg-orange-500 border-orange-500 text-white text-[9px]" },
                                    { val: "Crítico", col: "active:bg-red-700 bg-red-50 border-red-200 text-red-800", selCol: "bg-red-600 border-red-600 text-white text-[9px] animate-pulse" },
                                    { val: "Não avaliado", col: "active:bg-slate-500 bg-slate-50 border-slate-200 text-slate-550", selCol: "bg-slate-500 border-slate-500 text-white" }
                                  ].map((opt) => {
                                    const isSelected = g3RiscoResidual === opt.val;
                                    return (
                                      <button
                                        key={opt.val}
                                        type="button"
                                        onClick={() => setG3RiscoResidual(opt.val as any)}
                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                          isSelected ? opt.selCol : `${opt.col} hover:opacity-90`
                                        }`}
                                      >
                                        {opt.val}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Responsável pelo Acompanhamento (Dropdown) */}
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight">2. Responsável pelo acompanhamento do risco</label>
                                <select
                                  value={g3Responsavel}
                                  onChange={(e) => setG3Responsavel(e.target.value)}
                                  className="w-full py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200 text-slate-700 bg-white hover:border-[#03440c] outline-none transition-all shadow-sm"
                                >
                                  {[
                                    "NIT",
                                    "TI",
                                    "Segurança da Informação",
                                    "Qualidade",
                                    "Responsável técnico",
                                    "Setor solicitante",
                                    "Gestor da área",
                                    "Outro"
                                  ].map((opt) => (
                                    <option key={opt} value={opt} className="font-extrabold uppercase text-[10px] text-slate-700 p-2">
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Campo 3.3 */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight block">3. Observações de riscos e controles</label>
                              <textarea
                                value={g3Observacoes}
                                onChange={(e) => setG3Observacoes(e.target.value)}
                                placeholder="Insira quaisquer notas, observações jurídicas, de patentes ou recomendações especiais sobre os riscos e formas de mitigação planejados..."
                                className="w-full h-20 bg-white border border-slate-200 hover:border-slate-350 text-slate-900 placeholder-slate-400 rounded-xl p-3 text-[11px] font-semibold focus:border-[#03440c] focus:ring-1 focus:ring-[#03440c]/10 outline-none transition-all resize-none shadow-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStepNum === 3 && (
                      <div className="space-y-4 pt-1">
                        <p className="text-[9px] font-black text-[#03440c] uppercase tracking-wider bg-[#03440c]/5 border border-[#03440c]/10 px-3 py-1.5 rounded-lg">✓ RECURSOS OBRIGATÓRIOS DO GERENTE TI</p>
                        
                        {/* Campo Infra */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Compatibilidade de Rede e APIs</label>
                          <div className="flex gap-2">
                            {["Compatível / Cloud nativa", "Requer novas VMs", "Incompatível"].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setTiInfra(opt)}
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                  tiInfra === opt
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Campo Segurança */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Garantias de Segurança de Dados e LGPD</label>
                          <div className="flex gap-2">
                            {["Conforme", "Alerta", "Crítico"].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setTiSeguranca(opt)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                                  tiSeguranca === opt
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Campo Integração */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Integração com Sistemas de TI Cedro</label>
                          <div className="flex gap-2">
                            {["Não (Autônoma)", "Sim (Requer API)", "Sim (Requer Customização)"].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setTiIntegracao(opt)}
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                  tiIntegracao === opt
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Contas 4 (Análise Financeira) e 5 (Presidência) têm modo de visualização nua */}
                    {(currentStepNum === 4 || currentStepNum === 5) && (
                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-600">
                          <ShieldAlert size={18} />
                          <p className="text-[10px] font-black uppercase tracking-wider">Modo Exclusivo de Governança e Decisão</p>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                          Este perfil de avaliador corporativo (<span className="text-slate-900 font-extrabold">{activeStepDef?.roleName}</span>) possui atribuição de análise estratégica direta.
                          Você não necessita preencher campos técnicos adicionais. Avalie atentamente as informações prestadas pelo solicitante e os pareceres registrados de inovação, governança e TI para assinar sua decisão de etapa no final deste formulário.
                        </p>
                      </div>
                    )}

                    {/* Parecer de Texto Livre Comum a Todos */}
                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-black text-[#03440c] uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <MessageSquare size={13} /> Parecer Técnico Justificado
                      </label>
                      <textarea 
                        value={auditComment}
                        onChange={(e) => setAuditComment(e.target.value)}
                        placeholder="Insira aqui as considerações técnicas, recomendações ou motivos fundamentadores do parecer de aprovação ou repúdio técnica..."
                        className="w-full h-32 bg-white border border-slate-200 hover:border-slate-350 text-slate-900 placeholder-slate-400 rounded-2xl p-4 text-xs font-semibold focus:border-[#03440c] focus:ring-2 focus:ring-[#03440c]/10 outline-none transition-all resize-none shadow-inner"
                        required
                      />
                    </div>
                  </div>

                  {/* Ações / Botões Finais de Aprovar ou Negar no Final do Formulário */}
                  <div className="border-t border-slate-100 pt-6 flex items-center justify-between gap-4">
                    <button 
                      onClick={() => setAnalysisModal({ isOpen: false, record: null })}
                      className="px-5 py-4 text-sm font-black text-[#03440c] hover:text-[#006400] tracking-wide uppercase transition-all rounded-full hover:bg-slate-50 text-center"
                    >
                      Cancelar
                    </button>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleDecisionSubmit(StatusAuditoria.NEGADO)}
                        className="py-4 px-6 text-xs font-black text-white tracking-widest uppercase transition-all bg-red-600 hover:bg-red-700 hover:shadow-lg rounded-2xl text-center active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-200"
                      >
                        <XCircle size={15} /> Negar Etapa
                      </button>
                      <button 
                        onClick={() => handleDecisionSubmit(StatusAuditoria.APROVADO)}
                        className="py-4 px-7 text-xs font-black text-white tracking-widest uppercase transition-all bg-emerald-700 hover:bg-emerald-800 hover:shadow-lg rounded-2xl text-center active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-200"
                      >
                        <CheckCircle2 size={15} /> Aprovar Etapa
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
