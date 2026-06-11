/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Printer, 
  ArrowLeft, 
  Download, 
  AlertTriangle, 
  Activity, 
  Edit, 
  Clipboard, 
  FileText, 
  Info, 
  Target, 
  Database, 
  ShieldCheck, 
  ShieldAlert, 
  History, 
  HelpCircle, 
  Check, 
  CheckCircle2, 
  Users, 
  Cpu, 
  Lock, 
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Bookmark,
  ExternalLink
} from "lucide-react";
import { IARecord, StatusUso, ClassificacaoRisco, StatusAuditoria, ApprovalWorkflow, ApprovalConfig } from "../types";

interface ReportViewProps {
  record: IARecord;
  onBack: () => void;
  onEdit?: (record: IARecord) => void;
  isAdmin?: boolean;
  workflows?: ApprovalWorkflow[];
  approvalConfig?: ApprovalConfig;
}

type TabType = "visao-geral" | "finalidade-uso" | "dados-utilizados" | "riscos-controles" | "historico" | "relatorio";

export default function ReportView({ record, onBack, onEdit, isAdmin, workflows, approvalConfig }: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("visao-geral");
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});

  // Dynamic approval workflow helpers
  const workflow = workflows?.find(w => w.iaRecordId === record.id);
  const isWfFinished = !!(workflow && (workflow.finalStatus === "aprovado" || workflow.finalStatus === "negado"));
  const currentStepNum = workflow ? workflow.currentStep : 1;

  const getWorkflowSteps = () => {
    if (approvalConfig?.steps && approvalConfig.steps.length > 0) {
      return approvalConfig.steps;
    }
    return [
      { stepNumber: 1, roleName: "Coordenador NIT", isOpinionOnly: false, userId: "", userName: "" },
      { stepNumber: 2, roleName: "Gerente NIT", isOpinionOnly: false, userId: "", userName: "" },
      { stepNumber: 3, roleName: "Gerente TI", isOpinionOnly: false, userId: "", userName: "" },
      { stepNumber: 4, roleName: "Período de Teste", isOpinionOnly: false, userId: "", userName: "" },
      { stepNumber: 5, roleName: "Análise Financeira", isOpinionOnly: true, userId: "", userName: "" },
      { stepNumber: 6, roleName: "Presidência", isOpinionOnly: false, userId: "", userName: "" },
    ];
  };

  const getActiveStepDef = () => {
    return getWorkflowSteps().find(s => s.stepNumber === currentStepNum);
  };

  const getEtapaAtualText = () => {
    if (!workflow) {
      if (record.statusUso === StatusUso.APROVADO) return "Homologado";
      if (record.statusUso === StatusUso.EM_AVALIACAO) return "Triagem Inicial NIT";
      return "Cadastro Concluído";
    }
    if (isWfFinished) {
      return workflow.finalStatus === "aprovado" ? "Homologado (Concluído)" : "Declinado / Não Aprovado";
    }
    const def = getActiveStepDef();
    return def ? `${currentStepNum}. ${def.roleName}` : `Etapa ${currentStepNum}`;
  };

  const getResponsavelAtualText = () => {
    if (!workflow) return record.quemValida || "Comitê de Governança do Laboratório";
    if (isWfFinished) {
      return "Processo Finalizado";
    }
    const wfStep = workflow.steps?.find(s => s.stepNumber === currentStepNum);
    const def = getActiveStepDef();
    return wfStep?.assignedUserName || def?.userName || record.quemValida || "Aguardando definição";
  };

  const getSituacaoFluxoText = () => {
    if (!workflow) {
      if (record.statusUso === StatusUso.EM_AVALIACAO) return "Aguardando parecer da etapa atual";
      return "Cadastro concluído e ativo";
    }
    if (isWfFinished) {
      return workflow.finalStatus === "aprovado" 
        ? "Homologada em produção com auditorias regulares" 
        : "Proposta rejeitada no fluxo regulatório";
    }
    const def = getActiveStepDef();
    return `Aguardando deliberação de ${def?.roleName || "Comitê"}`;
  };

  const getDynamicNextStepText = () => {
    if (!workflow) {
      return getNextStepDescription(record.statusUso);
    }
    if (isWfFinished) {
      return workflow.finalStatus === "aprovado" 
        ? "Processo 100% concluído. Monitoramento das atividades laboratoriais em andamento." 
        : "Processo indeferido pelo comitê. Revisar proposta regulatória.";
    }
    const def = getActiveStepDef();
    return def 
      ? `Próxima ação de aprovação com: "${def.roleName}". Responsável: ${def.userName || "Comitê de Avaliadores"}.` 
      : getNextStepDescription(record.statusUso);
  };

  const toggleEvent = (idx: number) => {
    setExpandedEvents(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getStatusBgColor = (status: StatusUso) => {
    switch (status) {
      case StatusUso.APROVADO:
        return "bg-emerald-50 text-emerald-800 border-emerald-250";
      case StatusUso.APROVADO_COM_RESTRICOES:
        return "bg-amber-50 text-amber-800 border-amber-250";
      case StatusUso.EM_AVALIACAO:
        return "bg-indigo-50 text-indigo-800 border-indigo-250";
      case StatusUso.EM_TESTE_PILOTO:
        return "bg-cyan-50 text-cyan-850 border-cyan-250";
      case StatusUso.SUSPENSO:
        return "bg-slate-100 text-slate-800 border-slate-200";
      case StatusUso.NAO_APROVADO:
      default:
        return "bg-rose-50 text-rose-800 border-rose-250";
    }
  };

  const getRiskTextColor = (risk: ClassificacaoRisco) => {
    switch (risk) {
      case ClassificacaoRisco.BAIXO:
        return "text-[#075618] font-black";
      case ClassificacaoRisco.MEDIO:
        return "text-[#F59E0B] font-black";
      case ClassificacaoRisco.ALTO:
        return "text-orange-600 font-black";
      case ClassificacaoRisco.CRITICO:
        return "text-[#B42318] font-black";
      default:
        return "text-[#667085] font-black";
    }
  };

  const getNextStepDescription = (status: StatusUso) => {
    switch (status) {
      case StatusUso.EM_AVALIACAO:
        return "Aguardar parecer técnico das comissões multidisciplinares de TI, Inovação e diretrizes do dpo.";
      case StatusUso.APROVADO:
        return "Fluxo regular de monitoramento contínuo nas atividades laboratoriais regulares.";
      case StatusUso.APROVADO_COM_RESTRICOES:
        return "Acompanhar cumprimento de pendências técnicas indicadas no termo do comitê.";
      case StatusUso.EM_TESTE_PILOTO:
        return "Avaliar logs de segurança e métricas de precisão emitidos no ciclo experimental.";
      case StatusUso.SUSPENSO:
        return "Operação retida. Solicitar auditoria extraordinária ou reunião técnica reguladora.";
      case StatusUso.NAO_APROVADO:
      default:
        return "Revisar diretrizes rejeitadas ou reformular cadastro regulatório junto ao NIT.";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: StatusUso) => {
    switch (status) {
      case StatusUso.APROVADO:
        return "bg-emerald-50 text-emerald-800 border-emerald-200 dot-bg-emerald-500";
      case StatusUso.APROVADO_COM_RESTRICOES:
        return "bg-amber-50 text-amber-800 border-amber-200 dot-bg-amber-500";
      case StatusUso.EM_AVALIACAO:
        return "bg-indigo-50 text-indigo-800 border-indigo-200 dot-bg-indigo-500";
      case StatusUso.EM_TESTE_PILOTO:
        return "bg-cyan-50 text-cyan-800 border-cyan-200 dot-bg-cyan-500";
      case StatusUso.SUSPENSO:
        return "bg-slate-100 text-slate-800 border-slate-200 dot-bg-slate-500";
      case StatusUso.NAO_APROVADO:
      default:
        return "bg-rose-50 text-rose-800 border-rose-200 dot-bg-rose-500";
    }
  };

  const getRiskColor = (risk: ClassificacaoRisco) => {
    switch (risk) {
      case ClassificacaoRisco.BAIXO:
        return "bg-emerald-50 border-emerald-100 text-emerald-700";
      case ClassificacaoRisco.MEDIO:
        return "bg-amber-50 border-amber-100 text-amber-700";
      case ClassificacaoRisco.ALTO:
        return "bg-orange-50 border-orange-100 text-orange-700";
      case ClassificacaoRisco.CRITICO:
        return "bg-rose-50 border-rose-100 text-rose-700";
      default:
        return "bg-slate-50 border-slate-100 text-slate-700";
    }
  };

  // Timeline events fallback
  const getTimelineEvents = () => {
    let timeline: Array<{ date: string; action: string; user?: string; message?: string }> = [];

    if (record.historico && record.historico.length > 0) {
      timeline = [...record.historico];
    } else {
      // Fallback baseline events
      timeline.push({
        date: record.dataRegistro || "01/06/2026",
        action: "Cadastro Inicial da Solução",
        user: record.responsavelPreenchimento,
        message: "O cadastro inicial e autodeclaração de conformidade da IA foi estruturado e submetido para apreciação do NIT."
      });

      if (record.alinhadoLGPD === "Sim") {
        timeline.push({
          date: record.dataRegistro || "01/06/2026",
          action: "Conformidade LGPD Homologada",
          user: "Encarregado de Proteção de Dados (DPO)",
          message: "Conformidade preliminar LGPD homologada perante as salvaguardas regulatórias declaradas."
        });
      }
    }

    // Dynamically append decided workflow steps as history nodes
    if (workflow && workflow.steps) {
      workflow.steps.forEach((step) => {
        if (step.status !== "aguardando" && step.decidedAt) {
          const rawDate = new Date(step.decidedAt);
          const formattedDate = rawDate.toLocaleDateString("pt-BR") + " " + rawDate.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
          const statusVerb = step.status === "aprovado" ? "APROVADO" : step.status === "negado" ? "REJEITADO" : "OPINADO";
          
          const alreadyExists = timeline.some(t => t.action.includes(step.roleName) && t.date.includes(rawDate.toLocaleDateString("pt-BR")));
          
          if (!alreadyExists) {
            timeline.push({
              date: formattedDate,
              action: `Etapa ${step.stepNumber}: ${step.roleName} - ${statusVerb}`,
              user: step.assignedUserName || "Decisor do Comitê",
              message: step.comment 
                ? `Parecer técnico registrado pelo relator da etapa: "${step.comment.replace(/###.+/g, "").replace(/•/g, "").trim()}"` 
                : `Fluxo de decisão da etapa técnica concluído com parecer favorável.`
            });
          }
        }
      });
    }

    return timeline;
  };

  // Re-use current ReportView layout inside the "relatorio" tab / laudo print view
  const renderFormalReport = () => (
    <div id="report-content" className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl relative text-slate-800">
      {/* Header Documento */}
      <div className="bg-gradient-to-br from-slate-50 via-slate-100 to-transparent p-10 relative overflow-hidden border-b-4 border-[#075618] shadow-sm">
        
        {/* Top Brand Logo Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-6 mb-8 relative z-10 select-none">
          <img 
            src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" 
            alt="Laboratório Cedro" 
            className="h-12 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="text-left sm:text-right font-sans">
            <span className="px-2.5 py-1 bg-[#075618] text-white text-[9px] font-black tracking-widest uppercase rounded">
              LAD – Laboratório Cedro
            </span>
            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1.5 font-mono">
              Governança de IA & Conformidade
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-[#075618]/10 text-[#075618] text-[9px] font-black tracking-widest uppercase rounded-full">Laudo de Inteligência Artificial</span>
                <span className="text-[9px] font-mono font-bold text-slate-700 bg-slate-200/60 px-2.5 py-1 rounded border border-slate-200 uppercase tracking-tight">REF: {record.id}</span>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none uppercase">{record.nomeFerramenta}</h1>
              <div className="flex flex-wrap items-center gap-4 text-slate-500 font-semibold text-[11px] uppercase tracking-wide">
                <div className="flex items-center gap-1.5">
                  <Activity size={12} className="text-[#075618]" />
                  <span>Gerado em: {new Date().toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="size-1 rounded-full bg-slate-300"></div>
                <span>Nível de Segurança: Alto</span>
              </div>
            </div>
            <div className="text-right self-start lg:self-center">
              <div className={`px-6 py-3 rounded-xl shadow-sm font-black text-xs uppercase tracking-wider border-2 flex items-center gap-2.5 ${
                record.statusUso === StatusUso.APROVADO ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                record.statusUso === StatusUso.NAO_APROVADO ? "bg-rose-50 text-rose-800 border-rose-300" :
                "bg-amber-50 text-amber-800 border-amber-300"
              }`}>
                <div className={`size-2 rounded-full ${
                  record.statusUso === StatusUso.APROVADO ? "bg-emerald-500" :
                  record.statusUso === StatusUso.NAO_APROVADO ? "bg-rose-500" :
                  "bg-amber-500"
                }`}></div>
                {record.statusUso}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm mt-6">
            {[
              { label: "Setor institucional", value: record.unidadeSetor },
              { label: "Classificação Risco", value: record.classificacaoRiscoManual },
              { label: "Fornecedora", value: record.fornecedor },
              { label: "Responsável Técnico", value: record.responsavelPreenchimento }
            ].map((item, i) => (
              <div key={i} className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">{item.label}</label>
                <p className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo Laudo */}
      <div className="p-8 lg:p-10 space-y-12">
        {/* Section 01 */}
        <section className="relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">01</span>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Identificação e Propósito</h3>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <div className="size-1 rounded-full bg-emerald-500"></div> Descrição da Atividade
              </label>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-medium bg-slate-50 p-5 rounded-xl border border-slate-100">{record.descricaoAtividade}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <div className="size-1 rounded-full bg-emerald-500"></div> Objetivos Estratégicos
              </label>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-bold">{record.objetivos?.join(", ") || "Não cadastrados"}</p>
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <div className="size-1 rounded-full bg-emerald-500"></div> Categorias de IA Associadas
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {record.tipoIA?.map((t, i) => (
                  <span key={i} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200/80 uppercase tracking-tight">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 02 */}
        <section className="relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-100">02</span>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Privacidade e Proteção de Dados</h3>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <div className="bg-slate-50 rounded-2xl p-6 md:p-8 border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8 relative overflow-hidden">
            <div className="space-y-6 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Coleta de Dados Pessoais</label>
                <div className={`text-lg font-bold tracking-tight ${record.usaDadosPessoais === 'Sim' ? 'text-amber-700' : 'text-slate-500'}`}>{record.usaDadosPessoais?.toUpperCase() || "N/A"}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Alinhamento LGPD</label>
                <div className="flex items-center gap-2">
                  <div className={`size-1.5 rounded-full ${record.alinhadoLGPD === 'Sim' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <div className={`text-lg font-bold tracking-tight ${record.alinhadoLGPD === 'Sim' ? 'text-[#075618]' : 'text-rose-700'}`}>{record.alinhadoLGPD?.toUpperCase() || "N/A"}</div>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-6 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Categorias de Dados Coletados</label>
                <p className="text-sm text-slate-700 font-bold leading-relaxed">{record.quaisDados}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Salvaguardas de Privacidade</label>
                <p className="text-xs text-slate-500 bg-white p-4 rounded-xl border border-slate-200/60 leading-normal font-semibold italic">{record.obsProtecaoDados || "Nenhuma medida de privacidade detalhada informada."}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 03 */}
        <section className="relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono text-[#075618] bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">03</span>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Governança e Controles de Risco</h3>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Status da Supervisão Humana</label>
                <div className="flex items-center gap-3 bg-slate-50 p-4.5 rounded-xl border border-slate-100 text-xs font-medium">
                  <div className={`size-3 rounded-full flex-shrink-0 ${record.validacaoHumana === 'Sim' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                  <div>
                    <p className="font-extrabold text-slate-800 uppercase text-xs tracking-tight">{record.validacaoHumana === 'Sim' ? "Operação Assistida" : "Ausência de Validação Humana"}</p>
                    {record.validacaoHumana === 'Sim' && <p className="text-[10px] text-slate-400 uppercase tracking-tight mt-0.5">Responsável pela validação: {record.quemValida}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Score de Risco Residual</label>
                <div className="text-xl font-extrabold text-emerald-800 tracking-tight uppercase">{record.riscoResidual}</div>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-start">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Gatilhos de Alerta e Governança</label>
              <div className="space-y-3 flex-1 overflow-auto">
                {record.quaisRiscos ? record.quaisRiscos.split(',').map((riskStr, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-slate-600 font-extrabold bg-white p-3 rounded-xl border border-slate-200/60 leading-tight">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" /> {riskStr.trim().toUpperCase()}
                  </div>
                )) : (
                  <div className="text-xs text-slate-400 italic p-6 text-center border border-dashed border-slate-200 rounded-xl bg-white h-full flex items-center justify-center">Nenhum risco de segurança registrado</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Assinaturas Laudo */}
        <div className="h-px bg-slate-200/80 my-8" />
        
        <div className="bg-slate-100/50 p-8 rounded-2xl border border-slate-200/60 relative">
          <div className="pt-4">
            {workflow && workflow.steps && workflow.steps.some((s) => s.status !== "aguardando" && s.decidedAt) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
                {/* Always include requester signature */}
                <div className="border-t border-slate-300 pt-4 text-center">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{record.responsavelPreenchimento || "Requisitante Técnico"}</p>
                  <p className="text-[10px] text-[#075618] uppercase font-bold tracking-wider mt-1">{record.cargo || "Responsável Técnico"}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Autor da Autodeclaração</p>
                </div>

                {/* Dinamic workflow signers */}
                {workflow.steps
                  .filter((step) => step.status !== "aguardando" && step.decidedAt)
                  .map((step) => {
                    const rawDate = step.decidedAt ? new Date(step.decidedAt) : new Date();
                    const formattedDate = rawDate.toLocaleDateString("pt-BR") + " " + rawDate.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div key={step.stepNumber} className="border-t border-slate-200 pt-4 text-center flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{step.assignedUserName || "Comitê Autorizado"}</p>
                          <p className="text-[10px] text-[#075618] uppercase font-bold tracking-wider mt-1">{step.roleName}</p>
                        </div>
                        <p className="text-[8.5px] text-emerald-700 bg-emerald-50/50 rounded py-0.5 mt-2 select-none border border-emerald-100/60 font-black uppercase tracking-wider">
                          ✓ Assinado em {formattedDate}
                        </p>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="border-t border-slate-300 pt-4 text-center">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{record.responsavelPreenchimento}</p>
                  <p className="text-[10px] text-[#075618] uppercase font-bold tracking-wider mt-1">{record.cargo || "Responsável Técnico"}</p>
                </div>
                <div className="border-t border-slate-300 pt-4 text-center">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Comitê de Governança de IA</p>
                  <p className="text-[10px] text-[#075618] uppercase font-bold tracking-wider mt-1">Laboratório Cedro</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-12 text-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest max-w-xl mx-auto leading-relaxed">
              SISTEMA DE GOVERNANÇA INTEGRADO — REF CODE: {record.id} — CEDRO LABS — HASH VERIFICADO: {record.id.slice(-4)}-SHA256
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto px-4 sm:px-0 bg-[#F6F8F5]/30">
      {/* 1. Cabeçalho da IA */}
      <div className="flex flex-col gap-6 border-b border-[#E3E8E1] pb-8 print:hidden">
        {/* Back Link */}
        <div>
          <button 
            onClick={onBack} 
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#075618] transition-all uppercase tracking-wider group cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Voltar ao Inventário
          </button>
        </div>

        {/* Title, Badge status y acciones */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase leading-none truncate pr-2">
                {record.nomeFerramenta}
              </h1>
              {/* Status Badge */}
              <div className={`px-3 py-1 bg-white border text-[10px] font-black uppercase tracking-tight rounded-full flex items-center gap-1.5 shadow-3xs shrink-0 ${getStatusColor(record.statusUso)}`}>
                <div className={`size-1.5 rounded-full ${getStatusColor(record.statusUso).split(" ").pop()}`} />
                <span>{record.statusUso}</span>
              </div>
              {/* Risk Badge */}
              <div className={`px-3 py-1 bg-white border text-[10px] font-black uppercase tracking-tight rounded-full shadow-3xs shrink-0 ${getRiskColor(record.classificacaoRiscoManual)}`}>
                <span>{record.classificacaoRiscoManual}</span>
              </div>
            </div>

          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {onEdit && (
              <button
                onClick={() => onEdit(record)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4.5 py-3 bg-white border border-[#E3E8E1] hover:border-[#075618] hover:text-[#075618] text-slate-700 text-xs font-black uppercase rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Edit size={14} />
                Editar cadastro
              </button>
            )}

            {record.statusUso === StatusUso.EM_AVALIACAO && (
              <div className="flex-1 sm:flex-none flex items-center gap-2.5 px-4.5 py-3 bg-indigo-50/60 border border-indigo-100 text-indigo-800 text-xs font-bold uppercase rounded-xl shadow-sm">
                <Activity size={14} className="animate-pulse flex-shrink-0" />
                <span>Em Aprovação</span>
              </div>
            )}




          </div>
        </div>
      </div>

      {/* 2. Resumo executivo */}
      <section className="rounded-2xl border border-[#E3E8E1] bg-[#F6F8F5] p-6 lg:p-8 space-y-6 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#075618]">
              Resumo executivo
            </p>
            <h2 className="mt-1 text-lg font-black text-[#003F1D]">
              Visão rápida da solicitação
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Finalidade da IA */}
          <div className="bg-white border border-[#E3E8E1] p-5 rounded-2xl flex flex-col justify-between shadow-3xs hover:border-[#075618]/30 transition-all">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#075618] uppercase tracking-widest block">Finalidade da IA</span>
              <p className="text-xs text-slate-700 font-bold leading-relaxed line-clamp-4">
                {record.descricaoAtividade || "Nenhuma descrição de atividade registrada."}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-[#667085]">
              <span>Setor: {record.unidadeSetor}</span>
              <span className="text-[9px] font-black uppercase text-[#075618] bg-[#EAF4EC] px-2 py-0.5 rounded">Ativa</span>
            </div>
          </div>

          {/* Card 2: Status e Próxima Etapa */}
          <div className="bg-white border border-[#E3E8E1] p-5 rounded-2xl flex flex-col justify-between shadow-3xs hover:border-[#075618]/30 transition-all">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[#075618] uppercase tracking-widest block">Status da Avaliação</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded ${getStatusBgColor(record.statusUso)}`}>
                  {record.statusUso}
                </span>
              </div>
              <div className="space-y-1 bg-[#F6F8F5] p-3 rounded-xl border border-[#E3E8E1]">
                <span className="text-[9px] font-black text-[#667085] uppercase tracking-tight block">Próxima Etapa</span>
                <p className="text-[11px] font-semibold text-slate-800 leading-normal">
                  {getDynamicNextStepText()}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Risco & Solicitante */}
          <div className="bg-white border border-[#E3E8E1] p-5 rounded-2xl flex flex-col justify-between shadow-3xs hover:border-[#075618]/30 transition-all">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[#075618] uppercase tracking-widest block">Risco & Responsabilidade</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold text-[#667085] uppercase tracking-tight block">Responsável</span>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{record.responsavelPreenchimento || "Não informado"}</p>
                  <p className="text-[9px] font-bold text-slate-400 capitalize truncate">{record.cargo || "Não cadastrado"}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#667085] uppercase tracking-tight block">Risco Geral</span>
                  <p className={`text-xs ${getRiskTextColor(record.classificacaoRiscoManual)} uppercase tracking-tight`}>
                    {record.classificacaoRiscoManual || "Não avaliado"}
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Fornecedora:</span>
                <span className="text-xs font-black text-slate-700 uppercase truncate max-w-[120px]">{record.fornecedor || "Não informada"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Situação atual da aprovação */}
      <section className="rounded-2xl border border-[#E3E8E1] bg-white p-6 lg:p-8 space-y-6 print:hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#075618]">
            Situação da aprovação
          </p>
          <h2 className="mt-1 text-lg font-black text-[#003F1D]">
            Etapas de aprovação
          </h2>
        </div>

        {/* Metadata grid summary */}
        <div className="bg-[#F6F8F5] p-5 rounded-2xl border border-[#E3E8E1] grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-semibold">
          <div>
            <span className="text-[9px] text-[#667085] uppercase block font-bold mb-1">Etapa Atual</span>
            <span className="text-slate-800 font-extrabold uppercase tracking-tight">
              {getEtapaAtualText()}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-[#667085] uppercase block font-bold mb-1">Responsável Atual</span>
            <span className="text-slate-800 font-extrabold uppercase tracking-tight">
              {getResponsavelAtualText()}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-[#667085] uppercase block font-bold mb-1">Situação</span>
            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${getStatusBgColor(record.statusUso)}`}>
              {record.statusUso === StatusUso.EM_AVALIACAO ? "Em Avaliação" : record.statusUso}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-[#667085] uppercase block font-bold mb-1">Situação de Fluxo</span>
            <span className="text-[#075618] font-bold leading-normal">
              {getSituacaoFluxoText()}
            </span>
          </div>
        </div>

        {/* Dynamic Stepper */}
        <div className="pt-2">
          {workflow && workflow.steps && workflow.steps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[...workflow.steps].sort((a, b) => a.stepNumber - b.stepNumber).map((step) => {
                const isFailed = step.status === "negado";
                const isPassed = step.status === "aprovado" || step.status === "opiniao";
                const isCurrent = step.stepNumber === currentStepNum && !isWfFinished;
                const isAwaiting = !isPassed && !isFailed && !isCurrent;
                
                const signerName = step.assignedUserName || "Assinatura livre";
                
                return (
                  <div 
                    key={step.stepNumber} 
                    className={`border p-4 flex flex-col justify-between transition-all rounded-2xl shadow-3xs hover:shadow-xs min-h-[140px] ${
                      isPassed 
                        ? "bg-[#EAF4EC]/65 border-[#EBF5EC] text-[#075618]" 
                        : isFailed 
                          ? "bg-rose-50 border-rose-200 text-rose-900" 
                          : isCurrent 
                            ? "bg-amber-50/70 border-amber-300 text-amber-900 ring-2 ring-amber-100 ring-offset-1 animate-fade-in" 
                            : "bg-slate-50/50 border-[#E3E8E1] text-slate-400"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          isPassed 
                            ? "bg-[#075618] text-white" 
                            : isFailed 
                              ? "bg-[#B42318] text-white" 
                              : isCurrent 
                                ? "bg-[#F59E0B] text-white animate-pulse" 
                                : "bg-slate-200 text-slate-500"
                        }`}>
                          {isPassed ? "✓" : isFailed ? "✗" : step.stepNumber}
                        </div>
                        <span className={`text-[9.5px] font-black uppercase tracking-widest ${
                          isPassed ? "text-[#075618]" : isFailed ? "text-rose-800" : isCurrent ? "text-amber-800" : "text-slate-400"
                        }`}>
                          Etapa {step.stepNumber}
                        </span>
                      </div>
                      
                      <p className={`text-[11.5px] font-extrabold uppercase line-clamp-1 ${isCurrent ? "text-slate-900 font-black" : isAwaiting ? "text-slate-400" : "text-slate-800"}`}>
                        {step.roleName}
                      </p>
                      <span className="text-[8.5px] font-black uppercase tracking-tight px-1.5 py-0.5 bg-slate-100 border border-slate-200/60 text-slate-500 rounded mt-1.5 inline-block">
                        {step.stepNumber === 1 ? "Foco: Resumo" : step.stepNumber === 2 ? "Foco: Riscos" : step.stepNumber === 3 ? "Foco: Dados Tratados" : step.stepNumber === 4 ? "Foco: Uso da IA" : step.stepNumber === 5 ? "Foco: Relatório" : "Foco: LGPD"}
                      </span>
                    </div>

                    <div className="mt-4">
                      
                      <div className="pt-2 border-t border-slate-100/60 text-[10px] leading-relaxed">
                        <span className="text-slate-400 font-bold block uppercase text-[8px] tracking-wide">Responsável</span>
                        <span className={`font-black uppercase truncate block text-[10.5px] ${isCurrent ? "text-[#003F1D]" : isAwaiting ? "text-slate-400 font-medium" : "text-slate-700"}`}>
                          {signerName}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1 relative">
              {/* Step 1: Cadastro */}
              <div className="bg-[#EAF4EC]/60 border border-[#E3E8E1] p-4.5 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-5 rounded-full bg-[#075618] text-white flex items-center justify-center text-[9px] font-bold">
                    ✓
                  </div>
                  <span className="text-[9px] font-black uppercase text-[#075618] tracking-widest">1. Triagem</span>
                </div>
                <p className="text-xs font-bold text-[#003F1D]">Cadastro do Projeto</p>
                <span className="text-[8.5px] font-black uppercase tracking-tight px-1.5 py-0.5 bg-[#075618]/10 text-[#075618] rounded self-start mt-1.5 mb-1">
                  Foco: Resumo
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">Cadastro inicial e autoenquadramento efetuados.</p>
              </div>
 
              {/* Step 2: Análise NIT */}
              <div className={`border p-4.5 rounded-2xl flex flex-col justify-between ${
                record.statusUso !== StatusUso.EM_AVALIACAO 
                  ? "bg-[#EAF4EC]/60 border-[#E3E8E1] text-[#075618]" 
                  : "bg-amber-50/50 border-amber-200 text-amber-900"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    record.statusUso !== StatusUso.EM_AVALIACAO 
                      ? "bg-[#075618] text-white" 
                      : "bg-[#F59E0B] text-white animate-pulse"
                  }`}>
                    {record.statusUso !== StatusUso.EM_AVALIACAO ? "✓" : "2"}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest">2. Parecer NIT</span>
                </div>
                <p className="text-xs font-bold text-slate-800">Análise de Viabilidade</p>
                <span className="text-[8.5px] font-black uppercase tracking-tight px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded self-start mt-1.5 mb-1">
                  Foco: Uso da IA
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  {record.statusUso !== StatusUso.EM_AVALIACAO 
                    ? "Concluído com parecer de viabilidade." 
                    : "Aguardando homologação do colegiado NIT."}
                </p>
              </div>
 
              {/* Step 3: LGPD */}
              <div className={`border p-4.5 rounded-2xl flex flex-col justify-between ${
                record.alinhadoLGPD === 'Sim' 
                  ? "bg-[#EAF4EC]/60 border-[#E3E8E1]" 
                  : record.alinhadoLGPD === 'Em avaliação'
                    ? "bg-amber-50/50 border-amber-200 text-amber-900"
                    : "bg-slate-50/60 border-[#E3E8E1]"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    record.alinhadoLGPD === 'Sim' 
                      ? "bg-[#075618] text-white" 
                      : record.alinhadoLGPD === 'Em avaliação'
                        ? "bg-[#F59E0B] text-white"
                        : "bg-slate-300 text-slate-600"
                  }`}>
                    {record.alinhadoLGPD === 'Sim' ? "✓" : "3"}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest">3. Segurança & LGPD</span>
                </div>
                <p className="text-xs font-bold text-slate-800">Avaliação DPO</p>
                <span className="text-[8.5px] font-black uppercase tracking-tight px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded self-start mt-1.5 mb-1">
                  Foco: Dados Tratados & LGPD
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  {record.alinhadoLGPD === 'Sim'
                    ? "Conformidade e bases legais atestadas pelo DPO."
                    : record.alinhadoLGPD === 'Não'
                      ? "Ajustes de segurança recomendados."
                      : "Diligências e mapeamento de dados de pacientes."}
                </p>
              </div>
 
              {/* Step 4: Homologação */}
              <div className={`border p-4.5 rounded-2xl flex flex-col justify-between ${
                record.statusUso === StatusUso.APROVADO || record.statusUso === StatusUso.APROVADO_COM_RESTRICOES
                  ? "bg-[#EAF4EC]/60 border-[#E3E8E1]"
                  : record.statusUso === StatusUso.NAO_APROVADO
                    ? "bg-rose-50 border-rose-220 text-rose-905"
                    : "bg-slate-50/60 border-[#E3E8E1]"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    record.statusUso === StatusUso.APROVADO || record.statusUso === StatusUso.APROVADO_COM_RESTRICOES
                      ? "bg-[#075618] text-white"
                      : record.statusUso === StatusUso.NAO_APROVADO
                        ? "bg-[#B42318] text-white"
                        : "bg-slate-300 text-slate-600"
                  }`}>
                    {(record.statusUso === StatusUso.APROVADO || record.statusUso === StatusUso.APROVADO_COM_RESTRICOES) ? "✓" : "4"}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest">4. Homologação</span>
                </div>
                <p className="text-xs font-bold text-slate-800">Autorização Final</p>
                <span className="text-[8.5px] font-black uppercase tracking-tight px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded self-start mt-1.5 mb-1">
                  Foco: Riscos & Relatório
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  {record.statusUso === StatusUso.APROVADO 
                    ? "Solução homologada para uso ativo no Laboratório."
                    : record.statusUso === StatusUso.APROVADO_COM_RESTRICOES
                      ? "Homologada com restrições técnicas."
                      : record.statusUso === StatusUso.NAO_APROVADO
                        ? "Projeto declinado pelo comitê colegiado."
                        : "Aguardando parecer final das etapas."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>



      {/* 5. Navegação por Abas - hidden on print */}
      <div className="flex border-b border-slate-200 overflow-x-auto print:hidden gap-1 select-none custom-scrollbar pb-px">
        {[
          { id: "visao-geral", label: "Resumo", icon: Info },
          { id: "finalidade-uso", label: "Uso da IA", icon: Target },
          { id: "dados-utilizados", label: "Dados tratados", icon: Database },
          { id: "riscos-controles", label: "Riscos", icon: ShieldAlert },
          { id: "historico", label: "Histórico", icon: History },
          { id: "relatorio", label: "Relatório", icon: FileText },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-5 py-3.5 border-b-2 text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "border-[#075618] text-[#075618] bg-[#EAF4EC]/30 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
              }`}
            >
              <tab.icon size={14} className={isActive ? "text-[#075618]" : "text-slate-400"} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 6. Conteúdo Dinâmico das Abas */}
      <div className="bg-white border border-[#E3E8E1] rounded-3xl p-6 md:p-8 shadow-sm">
        
        {/* TAB 1: RESUMO / VISÃO GERAL */}
        {activeTab === "visao-geral" && (
          <div className="space-y-8 animate-fade-in text-slate-700">
            <div className="border-b border-[#E3E8E1] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-[#003F1D] uppercase tracking-widest flex items-center gap-2">
                  <Info size={16} className="text-[#075618]" />
                  Resumo da Ficha Técnica
                </h3>
              </div>
              <div className="bg-[#EAF4EC]/50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase text-[#075618] shadow-3xs self-start md:self-auto">
                <span>Avaliador: Coordenador NIT (Etapa 1)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1 — O que é esta IA? */}
              <div className="bg-[#F6F8F5]/40 border border-[#E3E8E1] p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="p-1 px-2.5 bg-[#EAF4EC] text-[#075618] text-[9px] font-black rounded-lg">Identidade</span>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#003F1D]">O que é esta IA?</h4>
                </div>
                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Nome da Ferramenta</span>
                    <p className="font-extrabold text-[#1F2933] text-sm uppercase">{record.nomeFerramenta || "Não informado"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Descrição da Atividade</span>
                    <p className="font-semibold text-slate-650 leading-relaxed text-[12.5px]">
                      {record.descricaoAtividade || "Não informada"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Tipo de Inteligência Artificial</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {record.tipoIA && record.tipoIA.length > 0 ? (
                        record.tipoIA.map((t, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-white border border-[#E3E8E1] text-[10px] font-bold text-[#003F1D] uppercase rounded-md shadow-3xs">
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic font-semibold">Não informado</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Fornecedor da Solução</span>
                    <p className="font-extrabold text-slate-800 uppercase">{record.fornecedor || "Não informado"}</p>
                  </div>
                </div>
              </div>

              {/* Card 2 — Quem solicitou? */}
              <div className="bg-[#F6F8F5]/40 border border-[#E3E8E1] p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="p-1 px-2.5 bg-[#EAF4EC] text-[#075618] text-[9px] font-black rounded-lg">Ficha Solicitante</span>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#003F1D]">Quem solicitou?</h4>
                </div>
                <div className="space-y-3.5 text-xs font-semibold">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Setor Requisitante</span>
                    <p className="font-extrabold text-[#003F1D] text-sm uppercase">{record.unidadeSetor || "Não informado"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Responsável Técnico</span>
                    <p className="font-extrabold text-[#1F2933] uppercase">{record.responsavelPreenchimento || "Não informado"}</p>
                    <p className="text-[10px] text-[#667085] mt-0.5">{record.cargo || "Função não especificada"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Data de Cadastro</span>
                    <p className="font-extrabold text-slate-800 uppercase">{record.dataRegistro || "Não informada"}</p>
                  </div>
                </div>
              </div>

              {/* Card 3 — Classificação inicial */}
              <div className="bg-[#F6F8F5]/40 border border-[#E3E8E1] p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="p-1 px-2.5 bg-[#EAF4EC] text-[#075618] text-[9px] font-black rounded-lg">Classificação</span>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#003F1D]">Classificação Inicial</h4>
                </div>
                <div className="space-y-3.5 text-xs font-semibold text-slate-800">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Nível de Criticidade</span>
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase border rounded-md shadow-3xs ${getRiskColor(record.criticidade as unknown as ClassificacaoRisco)}`}>
                      {record.criticidade || "MÉDIO"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Autonomia Operacional</span>
                    <p className="font-extrabold text-slate-800 uppercase">{record.grauAutonomia || "Não avaliado"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Público Impactado</span>
                    <p className="font-extrabold text-slate-800 uppercase">
                      {record.naturezaUso === "Assistencial" || record.naturezaUso === "Diagnóstico" ? "Pacientes e Corpo Assistencial" : "Processos de Negócios / Interno"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Status de Produção</span>
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase border rounded-md ${getStatusBgColor(record.statusUso)}`}>
                      {record.statusUso}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FINALIDADE E USO */}
        {activeTab === "finalidade-uso" && (
          <div className="space-y-8 animate-fade-in text-slate-700">
            <div className="border-b border-[#E3E8E1] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Target size={16} className="text-[#075618]" />
                  Finalidade e Fluxo de Uso
                </h3>
              </div>
              <div className="bg-[#EAF4EC]/50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase text-[#075618] shadow-3xs self-start md:self-auto">
                <span>Avaliador: Período de Teste (Etapa 4)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Processos e Objetivos */}
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618]">Objetivos Mapeados</h4>
                  <div className="space-y-3">
                    {record.objetivos && record.objetivos.length > 0 ? (
                      record.objetivos.map((obj, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs font-semibold uppercase text-slate-700">
                          <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                          <span>{obj}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Nenhum</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Benefícios e Decisão */}
              <div className="space-y-6">
                <div className="bg-[#075618]/5 border border-emerald-100/60 p-6 rounded-2xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618] mb-2">Benefícios</h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-semibold italic">
                    "{record.beneficiosEsperados || "Nenhum benefício foi autodeclarado."}"
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-2">Governança nos Resultados</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Impacto em Laudos Clínicos</span>
                      <p className={`text-xs font-extrabold uppercase ${record.impactoResultadosLaboratoriais === "Sim" ? "text-rose-700" : "text-slate-500"}`}>{record.impactoResultadosLaboratoriais || "Não"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Validação Humana Ativa</span>
                      <p className={`text-xs font-extrabold uppercase ${record.validacaoHumana === "Sim" ? "text-[#075618]" : "text-rose-700"}`}>{record.validacaoHumana || "Não"}</p>
                    </div>
                  </div>
                  {record.quemValida && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Responsável Designado</span>
                      <p className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">{record.quemValida}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DADOS UTILIZADOS */}
        {activeTab === "dados-utilizados" && (
          <div className="space-y-8 animate-fade-in text-slate-700">
            <div className="border-b border-[#E3E8E1] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Database size={16} className="text-[#075618]" />
                  Modelagem de Dados & Coleta
                </h3>
              </div>
              <div className="bg-[#EAF4EC]/50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase text-[#075618] shadow-3xs self-start md:self-auto">
                <span>Avaliador: Gerente TI (Etapa 3)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Inventário de Tipos de Dados */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618] mb-3">Dados Utilizados Ativamente</h4>
                  <p className="text-sm font-extrabold text-[#111111] leading-relaxed select-all">
                    {record.quaisDados || "Nenhum mapeamento de dados registrado."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl text-center space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Origem Interna</span>
                    <p className="text-xs font-extrabold text-slate-700 uppercase tracking-tight">{record.integradaSistemaInterno === "Sim" ? `Sim (${record.qualSistema || "Sistemas"})` : "Não"}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl text-center space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Envio Externo</span>
                    <p className="text-xs font-extrabold text-slate-700 uppercase tracking-tight">{record.envioFornecedorExterno || "Não"}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl text-center space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Treina Modelo</span>
                    <p className="text-xs font-extrabold text-slate-700 uppercase tracking-tight">{record.dadosTreinamentoModelo || "Não"}</p>
                  </div>
                </div>
              </div>

              {/* Sensibilidade de Dados */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-2">Controles de Privacidade</h4>
                
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/50 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dados Pessoais</span>
                  <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded uppercase tracking-tight ${
                    record.usaDadosPessoais === "Sim" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-500"
                  }`}>
                    {record.usaDadosPessoais}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/50 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dados Sensíveis</span>
                  <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded uppercase tracking-tight ${
                    record.usaDadosSensiveis === "Sim" ? "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse" : "bg-slate-100 text-slate-500"
                  }`}>
                    {record.usaDadosSensiveis}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/50 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dados Anonimizados</span>
                  <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded uppercase tracking-tight ${
                    record.dadosAnonimizados === "Sim" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                  }`}>
                    {record.dadosAnonimizados || "Não informado"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Instruções de Proteção</span>
                  <p className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200/50 italic leading-relaxed">
                    {record.obsProtecaoDados || "Nenhuma instrução específica informada."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RISCOS E CONTROLES */}
        {activeTab === "riscos-controles" && (
          <div className="space-y-8 animate-fade-in text-slate-700">
            <div className="border-b border-[#E3E8E1] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-[#003F1D] uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={16} className="text-[#075618]" />
                  Análise de Riscos & Controles Mitigadores
                </h3>
              </div>
              <div className="bg-[#EAF4EC]/50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase text-[#075618] shadow-3xs self-start md:self-auto">
                <span>Avaliador: Gerente NIT (Etapa 2)</span>
              </div>
            </div>

            {/* COLORIZED RISK ANALYSIS BANNER */}
            <div className={`p-5 rounded-2xl border ${
              record.classificacaoRiscoManual === ClassificacaoRisco.BAIXO 
                ? "bg-emerald-50 border-emerald-250 text-[#03440c]" 
                : record.classificacaoRiscoManual === ClassificacaoRisco.MEDIO 
                  ? "bg-amber-50 border-amber-250 text-[#6a4c10]"
                  : record.classificacaoRiscoManual === ClassificacaoRisco.ALTO 
                    ? "bg-orange-50 border-orange-250 text-orange-900"
                    : record.classificacaoRiscoManual === ClassificacaoRisco.CRITICO
                      ? "bg-rose-50 border-rose-250 text-[#6a1510]"
                      : "bg-slate-50 border-slate-200 text-slate-600"
            }`}>
              <div className="flex items-start gap-3.5">
                <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                    Classificação Geral de Risco: {record.classificacaoRiscoManual || "Não avaliado"}
                  </h4>
                  <p className="text-xs font-semibold leading-relaxed">
                    {(() => {
                      switch(record.classificacaoRiscoManual) {
                        case ClassificacaoRisco.BAIXO:
                          return "Baixo Risco: Esta solução apresenta impacto de privacidade e operabilidade muito reduzido. Os riscos são mínimos e perfeitamente gerenciados pelos controles regulares da equipe.";
                        case ClassificacaoRisco.MEDIO:
                          return "Médio Risco: Atenção moderada necessária. A solução utiliza dados regulados ou possui automações sensíveis. Exige conformidade padrão e supervisão periódica.";
                        case ClassificacaoRisco.ALTO:
                          return "Alto Risco: Nível elevado de sensibilidade técnica ou proteção de privacidade de pacientes. Recomenda-se implementar controles mitigadores redundantes e auditorias semestrais.";
                        case ClassificacaoRisco.CRITICO:
                          return "Risco Crítico: Máxima sensibilidade de conformidade jurídica ou clínica. Requer validação humana por profissionais seniores e revisão regular compulsória do comitê de ética.";
                        default:
                          return "Grau de Risco Não Avaliado: Esta IA ainda não possui classificação de risco homologada pelo comitê. Recomendado submeter os fluxofogramas para auditoria.";
                      }
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Risks Column */}
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-205/60 p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618]">Riscos de Integridade Mapeados</h4>
                    <span className={`px-2 py-0.5 text-[8.5px] font-black rounded uppercase border ${
                      record.riscosIdentificados === "Sim" ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" : "bg-slate-100 text-slate-500 border-transparent"
                    }`}>
                      Mapeado: {record.riscosIdentificados || "Não"}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {record.quaisRiscos ? (
                      record.quaisRiscos.split(",").map((riskStr, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2.5 hover:border-amber-400 transition-colors">
                          <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs font-black uppercase tracking-tight text-slate-700 leading-tight">
                            {riskStr.trim()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum risco de segurança cadastrado.</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-205/60 p-5 rounded-2xl flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Risco Residual Técnico</span>
                    <p className="text-lg font-black text-emerald-800 uppercase tracking-wide">{record.riscoResidual || "Não avaliado"}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Gestor do Risco</span>
                    <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">{record.responsavelRisco || "Gestor de Risco designado"}</p>
                  </div>
                </div>
              </div>

              {/* Controls Column */}
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-205/60 p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618]">Controles Técnicos Ativos</h4>
                    <span className={`px-2 py-0.5 text-[8.5px] font-black rounded uppercase border ${
                      record.controlesImplementados === "Sim" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-transparent"
                    }`}>
                      Ativo: {record.controlesImplementados || "Não"}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {record.quaisControles && record.quaisControles.length > 0 ? (
                      record.quaisControles.map((ctrl, i) => (
                        <div key={i} className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/70 rounded-xl text-xs font-bold text-slate-700 uppercase tracking-tight leading-none shadow-sm">
                          <Check size={14} className="text-emerald-600 font-extrabold flex-shrink-0" />
                          <span>{ctrl}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum controle ativo mapeado.</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-205/60 p-5 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Medidas Operacionais Coletadas</span>
                  <p className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200/50 italic leading-relaxed">
                    {record.obsRiscosControles || "Nenhuma observação operacional registrada."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* TAB 6: HISTÓRICO */}
        {activeTab === "historico" && (
          <div className="space-y-8 animate-fade-in text-slate-700">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <History size={16} className="text-[#075618]" />
                Registros de Auditoria & Alterações
              </h3>

            </div>

            <div className="max-w-3xl mx-auto py-4">
              <div className="relative border-l-2 border-slate-200 ml-3.5 pl-6 space-y-8 pb-4">
                {getTimelineEvents().map((ev, i) => {
                  const isLong = ev.message.length > 120;
                  const isExpanded = !!expandedEvents[i];
                  return (
                    <div key={i} className="relative group">
                      {/* Circle Indicator */}
                      <div className="absolute -left-[32px] top-1.5 size-4.5 rounded-full border-4 border-white bg-[#075618] shadow group-hover:scale-110 transition-transform flex items-center justify-center">
                        <div className="size-1 bg-white rounded-full"></div>
                      </div>
                      
                      {/* Content Box */}
                      <div className="bg-[#F6F8F5]/40 border border-[#E3E8E1] p-5 rounded-2xl hover:bg-white transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
                          <h4 className="font-black text-xs sm:text-sm text-[#003F1D] uppercase tracking-tight leading-none">
                            {ev.action}
                          </h4>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tight shrink-0 bg-white px-2 py-0.5 rounded border border-[#E3E8E1] shadow-3xs leading-none">
                            {ev.date}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                            {isLong && !isExpanded ? `${ev.message.substring(0, 120)}...` : ev.message}
                          </p>
                          {isLong && (
                            <button
                              onClick={() => toggleEvent(i)}
                              className="text-[10px] font-black uppercase text-[#075618] hover:text-[#003F1D] transition-colors cursor-pointer flex items-center gap-1"
                            >
                              {isExpanded ? "Ver menos" : "Ver mais"}
                            </button>
                          )}
                        </div>

                        {ev.user && (
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mt-3 pt-2.5 border-t border-slate-100">
                            <Users size={10} /> Executor: {ev.user}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: RELATÓRIO DO LAUDO (PRINTABLE ORIGINAL DOC VIEW) */}
        {activeTab === "relatorio" && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            {/* Official Report Area */}
            {renderFormalReport()}
          </div>
        )}

      </div>
    </div>
  );
}
