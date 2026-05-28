import React, { useState, useMemo } from "react";
import { 
  CheckCircle2, XCircle, Users, LayoutGrid, Search, 
  Filter, MoreHorizontal, ShieldCheck, ShieldAlert, ShieldX, 
  Database, ArrowUpRight, TrendingUp, AlertTriangle, Activity,
  ChevronLeft, Clock, Settings, Save, Check, Shield, CircleDot, Info
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
  const [decisionModal, setDecisionModal] = useState<{ isOpen: boolean; record: IARecord | null; status: StatusAuditoria | null }>({ isOpen: false, record: null, status: null });
  const [auditComment, setAuditComment] = useState("");

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
                  const isMyTurn = !isWfFinished && (isAssignedToMe || (isStepUnassigned && isUserPrivileged)) && record.statusAuditoria === StatusAuditoria.PENDENTE;

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
                          {record.historico && record.historico.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                              <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Último Parecer Gravado</p>
                              <div className="flex items-center gap-2">
                                <Activity size={12} className="text-brand-green" />
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{record.historico[0].action}</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium italic">"{record.historico[0].message}"</p>
                            </div>
                          )}
                        </div>

                        {/* Interactive Steps Visual Indicator */}
                        <div className="flex flex-col items-end gap-3 self-stretch justify-between xl:border-l xl:border-slate-200 xl:pl-8 xl:w-80">
                          <div className="w-full text-left xl:text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Fluxo de Assinaturas</p>
                            
                            <div className="flex items-center gap-1 w-full justify-start xl:justify-end mb-2">
                              {currentSteps.map((step) => {
                                const isCurrent = step.stepNumber === currentStepNum && record.statusAuditoria === StatusAuditoria.PENDENTE;
                                const isPassed = step.stepNumber < currentStepNum || record.statusAuditoria === StatusAuditoria.APROVADO;
                                const isFailed = record.statusAuditoria === StatusAuditoria.NEGADO && step.stepNumber === currentStepNum;

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
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  onClick={() => setDecisionModal({ isOpen: true, record, status: StatusAuditoria.APROVADO })}
                                  className="py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-black uppercase text-[9px] tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle2 size={13} /> Aprovar Etapa
                                </button>
                                <button 
                                  onClick={() => setDecisionModal({ isOpen: true, record, status: StatusAuditoria.NEGADO })}
                                  className="py-3 px-4 rounded-xl bg-lab-red hover:bg-lab-red/90 text-white font-black uppercase text-[9px] tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                  <ShieldX size={13} /> Negar Etapa
                                </button>
                              </div>
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

      {/* Decision Parecer Modal Overlay */}
      <AnimatePresence>
        {decisionModal.isOpen && decisionModal.record && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDecisionModal({ isOpen: false, record: null, status: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`size-16 rounded-2xl flex items-center justify-center shadow-lg ${
                    decisionModal.status === StatusAuditoria.APROVADO 
                      ? "bg-[#03440c] text-white" 
                      : "bg-red-700 text-white" 
                  }`}>
                    {decisionModal.status === StatusAuditoria.APROVADO ? <CheckCircle2 size={32} /> : <ShieldX size={32} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
                      {decisionModal.status === StatusAuditoria.APROVADO ? "Assinar Aprovação Técnica" : "Negar/Recusar Solicitação"}
                    </h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{decisionModal.record.nomeFerramenta}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-black/5 p-6 rounded-2xl border border-black/5">
                    <p className="text-[8px] font-black text-[#03440c]/70 uppercase tracking-widest mb-1">Setor Solicitante</p>
                    <p className="text-xs font-black text-slate-900 uppercase">{decisionModal.record.unidadeSetor}</p>
                    <p className="text-[10px] font-bold text-slate-600 mt-0.5">{decisionModal.record.responsavelPreenchimento}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#03440c] uppercase tracking-[0.2em] flex items-center gap-2">
                      Parecer e Assinatura Técnica do Responsável
                    </label>
                    <textarea 
                      value={auditComment}
                      onChange={(e) => setAuditComment(e.target.value)}
                      placeholder="Indique as justificativas, ressalvas de segurança ou motivos relevantes que fundamentam a sua decisão técnica..."
                      className="w-full h-32 bg-white border border-[#03440c]/20 text-slate-900 placeholder-slate-400 rounded-2xl p-4 text-xs font-semibold focus:border-[#03440c] focus:ring-2 focus:ring-[#03440c]/10 outline-none transition-all resize-none shadow-inner"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button 
                      onClick={() => setDecisionModal({ isOpen: false, record: null, status: null })}
                      className="flex-1 py-4 text-[#03440c] hover:text-[#006400] font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:bg-black/5 rounded-2xl"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={() => {
                        if (decisionModal.record && decisionModal.status) {
                          onUpdateStatus(decisionModal.record.id, decisionModal.status, auditComment);
                          setDecisionModal({ isOpen: false, record: null, status: null });
                          setAuditComment("");
                        }
                      }}
                      className="flex-[2] py-5 rounded-2xl font-black uppercase text-[12px] tracking-[0.1em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 bg-[#03440c] text-white hover:bg-[#03440c]/90"
                    >
                      {decisionModal.status === StatusAuditoria.APROVADO ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                      Assinar Parecer
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
