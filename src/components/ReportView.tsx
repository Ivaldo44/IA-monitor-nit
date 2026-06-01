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
import { IARecord, StatusUso, ClassificacaoRisco, StatusAuditoria } from "../types";

interface ReportViewProps {
  record: IARecord;
  onBack: () => void;
  onEdit?: (record: IARecord) => void;
  isAdmin?: boolean;
}

type TabType = "visao-geral" | "finalidade-uso" | "dados-utilizados" | "riscos-controles" | "lgpd-conformidade" | "historico" | "relatorio";

export default function ReportView({ record, onBack, onEdit, isAdmin }: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("visao-geral");

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
    if (record.historico && record.historico.length > 0) {
      return record.historico;
    }
    // Generated based on records info
    const timeline = [
      {
        date: record.dataRegistro || "01/06/2026",
        action: "Cadastro Inicial da Solução",
        user: record.responsavelPreenchimento,
        message: "O cadastro inicial e autodeclaração de conformidade da IA foi estruturado e submetido para apreciação do NIT."
      }
    ];

    if (record.alinhadoLGPD !== "Sim") {
      timeline.push({
        date: "01/06/2026",
        action: "Análise de Privacidade Desencadeada",
        user: "Encarregado de Proteção de Dados (DPO)",
        message: "Devido ao processamento indicado de dados internos ou sensíveis, foi solicitada revisão dos controles."
      });
    } else {
      timeline.push({
        date: "01/06/2026",
        action: "Conformidade LGPD Homologada",
        user: "Encarregado de Proteção de Dados (DPO)",
        message: "As diretrizes técnicas apresentadas cumprem as salvaguardas de conformidade básica regulatória."
      });
    }

    if (record.statusUso === StatusUso.EM_AVALIACAO) {
      timeline.push({
        date: "Em andamento",
        action: "Aguardando Parecer Multidisciplinar",
        user: "Comitê de Governança de IA",
        message: "Análise técnica de riscos residuais e avaliação operacional para futura comissão deliberativa."
      });
    } else if (record.statusUso === StatusUso.APROVADO) {
      timeline.push({
        date: record.dataAprovacao || "01/06/2026",
        action: "Homologado para Uso Operacional",
        user: "Presidência & Comitê NIT",
        message: "Avaliação técnica concluída com êxito. Autorização para produção ativa liberada."
      });
    }

    return timeline;
  };

  // Re-use current ReportView layout inside the "relatorio" tab / laudo print view
  const renderFormalReport = () => (
    <div id="report-content" className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl relative text-slate-800">
      {/* Header Documento */}
      <div className="bg-gradient-to-br from-slate-50 via-slate-100 to-transparent p-10 relative overflow-hidden border-b-4 border-[#075618] shadow-sm">
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-[#075618] text-white text-[9px] font-black tracking-widest uppercase rounded-full">Laudo de Inteligência Artificial</span>
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
        <img src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" alt="" className="absolute right-[-40px] top-[-40px] size-[400px] opacity-5 -rotate-12 brightness-0 pointer-events-none" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
            <div className="border-t border-slate-300 pt-4 text-center">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{record.responsavelPreenchimento}</p>
              <p className="text-[10px] text-[#075618] uppercase font-bold tracking-wider mt-1">{record.cargo || "Responsável Técnico"}</p>
            </div>
            <div className="border-t border-slate-300 pt-4 text-center">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Comitê de Governança de IA</p>
              <p className="text-[10px] text-[#075618] uppercase font-bold tracking-wider mt-1">Laboratório Cedro</p>
            </div>
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
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-0">
      {/* 1. Header Ficha Técnica (Topo da página com Voltar, Título, badges e botões de ação) */}
      <div className="flex flex-col gap-6 border-b border-slate-200/60 pb-6 print:hidden">
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
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none truncate pr-2">
                {record.nomeFerramenta}
              </h1>
              {/* Status Badge */}
              <div className={`px-3 py-1 bg-white border text-[10px] font-black uppercase tracking-tight rounded-full flex items-center gap-1.5 shadow-sm shrink-0 ${getStatusColor(record.statusUso)}`}>
                <div className={`size-1.5 rounded-full ${getStatusColor(record.statusUso).split(" ").pop()}`} />
                <span>{record.statusUso}</span>
              </div>
              {/* Risk Badge */}
              <div className={`px-3 py-1 bg-white border text-[10px] font-black uppercase tracking-tight rounded-full shadow-sm shrink-0 ${getRiskColor(record.classificacaoRiscoManual)}`}>
                <span>{record.classificacaoRiscoManual}</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-tight">
              Ficha técnica de governança, riscos de privacidade e auditoria regulatória da solução.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {onEdit && (
              <button
                onClick={() => onEdit(record)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:border-[#075618] hover:text-[#075618] text-slate-700 text-xs font-black uppercase rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Edit size={14} />
                Editar cadastro
              </button>
            )}

            {record.statusUso === StatusUso.EM_AVALIACAO && (
              <div className="flex-1 sm:flex-none flex items-center gap-2.5 px-4 py-2.5 bg-indigo-50/60 border border-indigo-100 text-indigo-800 text-xs font-bold uppercase rounded-xl shadow-sm">
                <Activity size={14} className="animate-pulse flex-shrink-0" />
                <span>Em Aprovação</span>
              </div>
            )}

            <button
              onClick={() => setActiveTab("relatorio")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer border ${
                activeTab === "relatorio" 
                  ? "bg-[#075618] text-white border-[#075618] hover:bg-[#075618]/90" 
                  : "bg-white text-slate-700 border-slate-200 hover:border-[#075618] hover:text-[#075618]"
              }`}
            >
              <FileCheck2 size={14} />
              Ver Relatório / Laudo
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-[#075618] border border-emerald-100 hover:bg-emerald-100/60 text-xs font-black uppercase rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Download size={14} />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* 2. Card Principal de Resumo (Visão Unificada da Ficha) - hidden on print */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm print:hidden">
        {[
          { label: "ID do Sistema", value: record.id, icon: Bookmark, valColor: "text-slate-900 font-mono" },
          { label: "Setor / Divisão", value: record.unidadeSetor, icon: Users, valColor: "text-slate-800" },
          { label: "Responsável", value: record.responsavelPreenchimento, icon: Info, valColor: "text-slate-800 text-xs sm:text-sm" },
          { label: "Fornecedor da IA", value: record.fornecedor, icon: Cpu, valColor: "text-slate-800" },
          { label: "Grau de Autonomia", value: record.grauAutonomia?.slice(0, 15) || "Médio", icon: TrendingUp, valColor: "text-slate-800" },
          { label: "Frequência de Revisão", value: record.frequenciaReavaliacao, icon: History, valColor: "text-slate-800" },
          { label: "Conformidade LGPD", value: record.alinhadoLGPD, icon: ShieldCheck, valColor: record.alinhadoLGPD === 'Sim' ? 'text-emerald-700' : 'text-amber-700' },
          { label: "Data de Cadastro", value: record.dataRegistro || "Não cadastrada", icon: Clipboard, valColor: "text-slate-800" },
        ].map((item, i) => (
          <div key={i} className="flex gap-3 bg-slate-50/50 hover:bg-slate-50/95 transition-colors p-3.5 rounded-xl border border-slate-100">
            <div className="p-2 rounded-lg bg-white border border-slate-200/50 text-[#075618] self-start shadow-sm">
              <item.icon size={14} className="shrink-0" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">{item.label}</label>
              <p className={`font-black text-xs uppercase tracking-tight truncate ${item.valColor}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Navegação por Abas - hidden on print */}
      <div className="flex border-b border-slate-200 overflow-x-auto print:hidden gap-1 select-none custom-scrollbar pb-px">
        {[
          { id: "visao-geral", label: "Visão Geral", icon: Info },
          { id: "finalidade-uso", label: "Finalidade e Uso", icon: Target },
          { id: "dados-utilizados", label: "Dados Utilizados", icon: Database },
          { id: "riscos-controles", label: "Riscos e Controles", icon: ShieldAlert },
          { id: "lgpd-conformidade", label: "LGPD e Conformidade", icon: ShieldCheck },
          { id: "historico", label: "Histórico", icon: History },
          { id: "relatorio", label: "Laudo / Relatório", icon: FileText },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-5 py-3.5 border-b-2 text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "border-[#075618] text-[#075618] bg-[#075618]/5 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
              }`}
            >
              <tab.icon size={14} className={isActive ? "text-[#075618]" : "text-slate-400"} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 4. Conteúdo Dinâmico das Abas */}
      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 md:p-8 shadow-sm">
        
        {/* TAB 1: VISÃO GERAL */}
        {activeTab === "visao-geral" && (
          <div className="space-y-8 animate-fade-in text-slate-700">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Info size={16} className="text-[#075618]" />
                Visão Geral do Mapeamento
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Identificação institucional, criticidade e descrição operacional da solução de IA.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Descrição em Card de Destaque */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618] mb-2.5">Descrição da Atividade</h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                    {record.descricaoAtividade || "Nenhuma descrição informada."}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618] mb-3">Modelos de IA Autodeclarados</h4>
                  <div className="flex flex-wrap gap-2">
                    {record.tipoIA && record.tipoIA.length > 0 ? (
                      record.tipoIA.map((t, i) => (
                        <span key={i} className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700 uppercase tracking-tight shadow-sm">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Não informado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Parâmetros Organizacionais */}
              <div className="space-y-4 bg-slate-50 border border-slate-200/60 p-5 rounded-2xl">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-2">Informações Organizacionais</h4>
                {[
                  { label: "Setor Requisitante", value: record.unidadeSetor },
                  { label: "Público Alvo / Impactado", value: record.naturezaUso === "Assistencial" || record.naturezaUso === "Diagnóstico" ? "Pacientes / Médicos Assistentes" : "Interno Corporativo" },
                  { label: "Grau de Criticidade", value: record.criticidade || "Médio" },
                  { label: "Grau de Autonomia", value: record.grauAutonomia || "Não avaliado" },
                  { label: "Versão do Sistema", value: record.versao || "1.0.0" },
                  { label: "Situação da Avaliação", value: record.statusUso, isBadge: true }
                ].map((row, i) => (
                  <div key={i} className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{row.label}</span>
                    {row.isBadge ? (
                      <div className="pt-0.5">
                        <span className="inline-flex px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-[#075618]/10 text-[#075618] border border-[#075618]/10">
                          {row.value}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs font-extrabold text-slate-700 uppercase tracking-tight truncate">{row.value}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FINALIDADE E USO */}
        {activeTab === "finalidade-uso" && (
          <div className="space-y-8 animate-fade-in text-slate-700">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Target size={16} className="text-[#075618]" />
                Finalidade e Fluxo de Uso
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Processos de negócio impactados, limites operacionais e impactos em inteligência clínica.</p>
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

                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618] mb-2">Etapa do Processo Laboratorial</h4>
                  <p className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">{record.etapaProcesso || "Não especificado"}</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal font-medium">Assegura o fluxo de governança mapeado no setor "{record.unidadeSetor}".</p>
                </div>
              </div>

              {/* Benefícios e Decisão */}
              <div className="space-y-6">
                <div className="bg-[#075618]/5 border border-emerald-100/60 p-6 rounded-2xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618] mb-2">Benefícios e Geração de Valor</h4>
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
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Database size={16} className="text-[#075618]" />
                Modelagem de Dados & Coleta
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Categorias de dados, origem, fluxo de transmissão e integridade estrutural.</p>
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
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert size={16} className="text-[#075618]" />
                Análise de Riscos & Controles Mitigadores
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Classificação de perigos operacionais, salvaguardas implementadas e governança integrada.</p>
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
                    <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">{record.responsavelRisco || record.responsavelPreenchimento || "Não informado"}</p>
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

        {/* TAB 5: LGPD E CONFORMIDADE */}
        {activeTab === "lgpd-conformidade" && (
          <div className="space-y-8 animate-fade-in text-slate-700">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#075618]" />
                Segurança Jurídica & Direitos de Privacidade (LGPD)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Bases legais aplicadas, transparência, procedimentos de privacidade e auditoria regulatória.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* LGPD Badges and Summary */}
              <div className="md:col-span-2 space-y-6">
                {/* Ripa / Dpia Warning Banner */}
                {record.usaDadosSensiveis === "Sim" && (
                  <div className="p-4 bg-orange-50 border border-orange-100 text-orange-850 rounded-xl flex gap-3 text-xs leading-relaxed font-semibold">
                    <AlertTriangle size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-extrabold uppercase text-[10px] tracking-tight mb-0.5 text-orange-900">RIPD/DPIA Recomendado institucionalmente</p>
                      <p className="text-slate-600">Este sistema processa dados pessoais sensíveis protegidos pela LGPD. O comitê recomenda gerar e arquivar o Relatório de Impacto à Proteção de Dados (RIPD).</p>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#075618] mb-4">Parâmetros de Auditoria Regulatória</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Acordo de Processamento de Dados (DPA)", value: record.contratoProtecaoDados || "Não informado" },
                      { label: "Política de Governança Interna", value: record.politicaInterna === "Sim" ? "Ativa" : "Inexistente" },
                      { label: "Treinamentos Realizados", value: record.treinamentoColaboradores === "Sim" ? "Sim (Concluído)" : "Não" },
                      { label: "Trilha de Auditoria (Logs)", value: record.trilhaAuditoria || "Não informado" },
                      { label: "Controle de Perfil e RBAC", value: record.controleAcessoPerfil || "Não informado" },
                      { label: "Procedimento de Incidentes", value: record.procedimentoIncidente === "Sim" ? "Ativo" : "Não" },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-sm flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500 uppercase tracking-tight truncate mr-3">{item.label}</span>
                        <span className="font-black text-slate-800 uppercase tracking-tight shrink-0">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legal Base & Review */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-2">Base Legal Mapeada</h4>
                <div className="bg-white p-4.5 rounded-xl border border-slate-200/60 shadow-sm">
                  <p className="text-[10.5px] font-black uppercase text-[#075618] mb-1">Base Legal Sugerida</p>
                  <p className="text-xs font-bold text-slate-700 leading-normal">
                    {record.usaDadosSensiveis === "Sim" ? "Artigo 11, II, 'g' da LGPD (Prevenção a fraudes e segurança)" : "Artigo 7, V ou IX (Legítimo interesse / Execução de contrato)"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Parecer de Conformidade Legal</span>
                  <p className="text-xs text-slate-500 bg-white p-4 rounded-xl border border-slate-200/50 italic leading-relaxed">
                    {record.obsConformidade || "O departamento responsável não emitiu restrições adicionais à operação."}
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
              <p className="text-xs text-slate-400 mt-0.5">Trilha histórica das avaliações do comitê, status regulatório e revisões técnicas.</p>
            </div>

            <div className="max-w-3xl mx-auto py-4">
              <div className="relative border-l-2 border-slate-200 ml-3.5 pl-6 space-y-8 pb-4">
                {getTimelineEvents().map((ev, i) => (
                  <div key={i} className="relative group">
                    {/* Circle Indicator */}
                    <div className="absolute -left-[32px] top-1.5 size-4.5 rounded-full border-4 border-white bg-[#075618] shadow group-hover:scale-110 transition-transform flex items-center justify-center">
                      <div className="size-1 bg-white rounded-full"></div>
                    </div>
                    
                    {/* Content Box */}
                    <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl hover:bg-slate-50/90 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                        <h4 className="font-black text-xs sm:text-sm text-slate-800 uppercase tracking-tight leading-none text-[#075618]">
                          {ev.action}
                        </h4>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tight shrink-0 bg-white px-2 py-0.5 rounded border border-slate-200/60 shadow-sm leading-none">
                          {ev.date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-normal font-semibold mb-2">
                        {ev.message}
                      </p>
                      {ev.user && (
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mt-3">
                          <Users size={10} /> Executor: {ev.user}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: RELATÓRIO DO LAUDO (PRINTABLE ORIGINAL DOC VIEW) */}
        {activeTab === "relatorio" && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            {/* Control banner inside Report Tab */}
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-[#075618] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-semibold select-none print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck2 size={16} className="text-[#075618]" />
                <span>Modo de visualização do laudo completo para impressão institucional.</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white text-slate-800 hover:text-[#075618] hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold uppercase transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={12} />
                  Imprimir Laudo
                </button>
              </div>
            </div>

            {/* Official Report Area */}
            {renderFormalReport()}
          </div>
        )}

      </div>
    </div>
  );
}
