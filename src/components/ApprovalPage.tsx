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
  onUpdateStatus: (recordId: string, status: StatusAuditoria, comment?: string) => void;
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
  
  // Custom states for interactive analysis form
  const [analysisModal, setAnalysisModal] = useState<{ isOpen: boolean; record: IARecord | null }>({ isOpen: false, record: null });
  const [auditComment, setAuditComment] = useState("");

  // States for NIT Coordenador (Etapa 1)
  const [coordAlinhamento, setCoordAlinhamento] = useState("Alinhado");
  const [coordTransferencia, setCoordTransferencia] = useState("Médio");
  const [coordViabilidade, setCoordViabilidade] = useState("Sim");

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--border-lab)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-brand-green" size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Controle de Governança corporativa</span>
          </div>
          <h1 className="text-4xl font-black text-[var(--text-bright)] uppercase tracking-tight leading-none">Aprovação de Sistemas</h1>
          <p className="text-xs text-[var(--text-muted)] font-bold mt-2 max-w-2xl">
            Acompanhe o andamento sequencial do inventário técnico e assine os pareceres do fluxo de conformidade.
          </p>
        </div>

        {/* Dynamic Badges */}
        <div className="flex flex-wrap gap-3">
          <div className="px-5 py-3 rounded-2xl bg-brand-green/10 border border-brand-green/20 text-center">
            <p className="text-[9px] font-black text-brand-green uppercase tracking-wider mb-0.5">Sob Minha Vez</p>
            <p className="text-3xl font-mono font-black text-brand-green">{stats.myTurnCount.toString().padStart(2, "0")}</p>
          </div>
          <div className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-0.5">Pendentes Total</p>
            <p className="text-3xl font-mono font-black text-amber-600">{stats.totalPending.toString().padStart(2, "0")}</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-white shadow-md p-3 rounded-[2.5rem] border-2 border-[#03440c]">
        <div className="flex items-center gap-1 w-full xl:w-auto p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "queue" 
              ? "bg-white text-[#03440c] shadow-sm border border-slate-200" 
              : "text-slate-700 hover:text-slate-950"
            }`}
          >
            Fila de Aprovação
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setActiveTab("config")}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "config" 
                ? "bg-white text-[#03440c] shadow-sm border border-slate-200" 
                : "text-slate-700 hover:text-slate-950"
              }`}
            >
              Configurar Fluxo (Etapas 1-5)
            </button>
          )}
        </div>

        {/* Tab Filters for queue */}
        {activeTab === "queue" && (
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto px-4">
            <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              {[
                { label: "Minha Vez", value: "my_turn" },
                { label: "Pendentes", value: "pending" },
                { label: "Todos", value: "all" }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setQueueFilter(opt.value as any)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    queueFilter === opt.value 
                    ? "bg-white text-[#03440c] shadow-sm scale-105 border border-slate-200" 
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-200/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#03440c] transition-colors" size={16} />
              <input 
                type="text"
                placeholder="Buscar IA, ID ou Setor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 focus:border-[#03440c] focus:ring-2 focus:ring-[#03440c]/10 outline-none transition-all"
              />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + queueFilter + searchTerm}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "queue" && (
            <div className="grid grid-cols-1 gap-6">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
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
                  const isMyTurn = !isWfFinished && (isAssignedToMe || isUserAdmin || (isStepUnassigned && isUserPrivileged)) && record.statusAuditoria === StatusAuditoria.PENDENTE;

                  return (
                    <div 
                      key={record.id} 
                      className={`font-sans bg-white p-8 rounded-[2.5rem] border-2 transition-all shadow-md group ${
                        isMyTurn 
                        ? "border-amber-400 shadow-amber-100/10 hover:border-amber-500" 
                        : "border-emerald-100/40 hover:border-emerald-500/40"
                      }`}
                    >
                      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                        {/* Core Info */}
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-[9px] font-black text-slate-800 bg-black/5 px-2.5 py-1 rounded-lg border border-slate-200 uppercase">
                              {record.id}
                            </span>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight truncate">
                              {record.nomeFerramenta}
                            </h3>
                            <span className={`text-[9px] px-3 py-1 rounded-md font-black border tracking-widest uppercase ${
                              record.statusAuditoria === StatusAuditoria.APROVADO ? "bg-brand-green/10 text-brand-green border-brand-green/20" :
                              record.statusAuditoria === StatusAuditoria.NEGADO ? "bg-lab-red/10 text-lab-red border-lab-red/20" :
                              "bg-brand-orange/10 text-brand-orange border-brand-orange/20"
                            }`}>
                              {record.statusAuditoria || "Pendente"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-y-2 gap-x-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><LayoutGrid size={13} /> {record.unidadeSetor}</span>
                            <span className="flex items-center gap-1.5"><Users size={13} /> {record.responsavelPreenchimento}</span>
                            <span className="flex items-center gap-1.5"><Clock size={13} /> {new Date(record.createdAt).toLocaleDateString()}</span>
                          </div>

                          {/* Historical context of decisions */}
                          {(() => {
                            const latestDecision = record.historico?.find(
                              h => h.action && !h.action.includes("Criação") && !h.action.includes("Atualização")
                            );
                            if (!latestDecision) return null;
                            return (
                              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Último Parecer Gravado</p>
                                <div className="flex items-center gap-2">
                                  <Activity size={12} className="text-brand-green" />
                                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{latestDecision.action}</span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium italic">"{latestDecision.message || latestDecision.action}"</p>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Interactive Steps Visual Indicator */}
                        <div className="flex flex-col items-end gap-3 self-stretch justify-between xl:border-l xl:border-slate-200 xl:pl-8 xl:w-80">
                          <div className="w-full text-left xl:text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Fluxo de Assinaturas</p>
                            
                            <div className="flex items-center gap-1 w-full justify-start xl:justify-end mb-2">
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
                                  <div 
                                    key={step.stepNumber} 
                                    title={`${step.stepNumber}. ${step.roleName}`}
                                    className={`size-6 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                                      isPassed 
                                        ? "bg-brand-green/20 border-brand-green text-brand-green" 
                                        : isFailed
                                          ? "bg-lab-red/20 border-lab-red text-lab-red"
                                          : isCurrent
                                            ? "bg-amber-400 border-amber-500 text-white shadow-md animate-pulse scale-105" 
                                            : "bg-black/5 border-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {step.stepNumber}
                                  </div>
                                );
                              })}
                            </div>

                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                              {record.statusAuditoria === StatusAuditoria.APROVADO ? (
                                <span className="text-brand-green">✓ Aprovada em definitivo</span>
                              ) : record.statusAuditoria === StatusAuditoria.NEGADO ? (
                                <span className="text-lab-red">✕ Fluxo indeferido / Bloqueado</span>
                              ) : (
                                <span>Ativo na Etapa {currentStepNum}/{currentSteps.length}: <strong className="text-amber-600 block sm:inline">{displayedRoleName} {displayedUserName ? `(${displayedUserName})` : ""}</strong></span>
                              )}
                            </p>
                          </div>

                          {/* Action Buttons based on User Turn */}
                          <div className="w-full mt-2">
                            {isMyTurn ? (
                              <button 
                                onClick={() => {
                                  setAnalysisModal({ isOpen: true, record });
                                  setAuditComment("");
                                  // Pre-fill or reset form states for the active approver role
                                  setCoordAlinhamento("Alinhado");
                                  setCoordTransferencia("Médio");
                                  setCoordViabilidade("Sim");
                                  setGerenteTRL("TRL 7-9 (Pronto para Produção)");
                                  setGerenteCustos("Baixo (Sem investimento adicional)");
                                  setGerenteRiscos("Aprovado sem restrição");
                                  
                                  // Detailed NIT Gerente Resets
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
                                className="w-full py-3.5 px-4 rounded-xl bg-[#03440c] hover:bg-[#03440c]/90 text-white font-black uppercase text-[10px] tracking-widest shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-[#03440c]"
                              >
                                <ClipboardCheck size={14} /> Analisar
                              </button>
                            ) : (
                              <div className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[10px] font-bold text-slate-500 select-none">
                                <Info size={14} className="text-slate-400" />
                                <span className="truncate">
                                  {record.statusAuditoria === StatusAuditoria.PENDENTE ? (
                                    <span className="font-black uppercase tracking-wider text-amber-500">Pendente</span>
                                  ) : (
                                    <>Ações encerradas para este protocolo</>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Linha do Tempo / Pareceres e Assinaturas */}
                      <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-3">
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

                          // Determinar detalhes da assinatura
                          const signerName = wfStep?.assignedUserName || step.userName || "";
                          const comment = wfStep?.comment;
                          const decidedAt = wfStep?.decidedAt;

                          return (
                            <div 
                              key={step.stepNumber} 
                              className={`p-3 p md:p-4 rounded-2xl border transition-all text-left flex flex-col justify-between h-full ${
                                isPassed 
                                  ? "bg-emerald-50/25 border-emerald-100/70 hover:border-emerald-300/60" 
                                  : isFailed
                                    ? "bg-red-50/25 border-red-100/70 hover:border-red-300/60"
                                    : isCurrent
                                      ? "bg-amber-50/40 border-amber-300/70 shadow-sm shadow-amber-100/10 scale-[1.01]" 
                                      : "bg-slate-50/40 border-slate-100/70 opacity-60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className={`text-[9px] font-black uppercase tracking-wider ${
                                    isPassed ? "text-emerald-700" :
                                    isFailed ? "text-red-700" :
                                    isCurrent ? "text-amber-700 animate-pulse" :
                                    "text-slate-500"
                                  }`}>
                                    {step.stepNumber}. {step.roleName}
                                  </span>
                                  {isPassed && <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />}
                                  {isFailed && <XCircle size={11} className="text-red-600 shrink-0" />}
                                  {isCurrent && <div className="size-1.5 rounded-full bg-amber-500 shrink-0 animate-ping" />}
                                </div>
                                
                                <p className="text-[10px] font-bold text-slate-700 truncate">
                                  {signerName ? `${signerName}` : <span className="text-slate-400 italic font-medium">Assinatura livre</span>}
                                </p>
                              </div>

                              {(isPassed || isFailed) && (comment || decidedAt) ? (
                                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                                  {comment && (
                                    <p className="text-[10px] text-slate-600 font-medium italic line-clamp-2 leading-snug">
                                      "{comment}"
                                    </p>
                                  )}
                                  {decidedAt && (
                                    <p className="text-[8px] font-mono text-slate-400 uppercase font-bold">
                                      {new Date(decidedAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              ) : isCurrent ? (
                                <div className="mt-2.5 text-[9px] font-black uppercase text-amber-600 tracking-wider">
                                  ★ Sua vez / Pendente
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-inner">
                  <div className="size-24 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-sm">
                    <ShieldCheck size={36} className="text-slate-300" />
                  </div>
                  <h4 className="text-slate-900 font-black uppercase tracking-tight text-2xl mb-2">Sem Solicitações</h4>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum registro requer sua atenção no momento</p>
                </div>
              )}
            </div>
          )}

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
            if (currentStepNum === 1) {
              finalComment = `### FORMULÁRIO DE AVALIAÇÃO - COORDENADOR NIT\n` +
                             `• Alinhamento Estratégico: ${coordAlinhamento}\n` +
                             `• Potencial de Transferência: ${coordTransferencia}\n` +
                             `• Viabilidade de Patentes: ${coordViabilidade}\n\n` +
                             `**Parecer:** ${auditComment || "Etapa aprovada com ressalvas mínimas."}`;
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

            onUpdateStatus(record.id, status, finalComment);
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
                          <Database size={14} className="text-[#03440c]" /> 4. Fluxo e LGPD
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
                            <p className="text-[8px] text-slate-400 uppercase font-black">Totalmente Alinhado LGPD?</p>
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
