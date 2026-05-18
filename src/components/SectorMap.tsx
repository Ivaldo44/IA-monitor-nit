/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { Users, Layout, ChevronRight, User, ShieldCheck, Clock, Layers, X, Info, Shield, Zap, Globe, Cpu, Database, Plus } from "lucide-react";
import { IARecord, UserProfile } from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface SectorMapProps {
  records: IARecord[];
  profiles: UserProfile[];
}

export default function SectorMap({ records, profiles }: SectorMapProps) {
  const [selectedIA, setSelectedIA] = useState<IARecord | null>(null);
  const [showTechnicalReport, setShowTechnicalReport] = useState<IARecord | null>(null);
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

  const toggleSector = (sector: string) => {
    setExpandedSectors(prev => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  };

  // Group records by sector
  const sectorGroups = useMemo(() => {
    const groups: Record<string, {
      sector: string;
      records: IARecord[];
      totalIAs: number;
      authorizedCount: number;
      pendingCount: number;
      users: Set<string>;
    }> = {};

    records.forEach(r => {
      const sector = r.unidadeSetor || "Não Informado";
      if (!groups[sector]) {
        groups[sector] = {
          sector,
          records: [],
          totalIAs: 0,
          authorizedCount: 0,
          pendingCount: 0,
          users: new Set(),
        };
      }
      
      groups[sector].records.push(r);
      groups[sector].totalIAs++;
      if (r.statusAuditoria === "Aprovado") groups[sector].authorizedCount++;
      if (r.statusAuditoria === "Pendente") groups[sector].pendingCount++;
      if (r.responsavelPreenchimento) groups[sector].users.add(r.responsavelPreenchimento);
    });

    return Object.values(groups).sort((a, b) => b.totalIAs - a.totalIAs);
  }, [records]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-[var(--text-bright)] tracking-tight flex items-center gap-3">
            <Layers className="text-lab-cyan" size={32} />
            Mapa de IAs
          </h2>
          <p className="text-[var(--text-muted)] font-medium max-w-2xl">
            Visualização estratégica da distribuição de Inteligência Artificial entre os departamentos e usuários do laboratório.
          </p>
        </div>
        
        <div className="flex gap-4">
           <div className="glass px-4 py-2 rounded-xl border border-[var(--border-lab)]">
             <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block">Total Setores</span>
             <span className="text-xl font-bold text-lab-cyan">{sectorGroups.length}</span>
           </div>
           <div className="glass px-4 py-2 rounded-xl border border-[var(--border-lab)]">
             <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block">Colaboradores</span>
             <span className="text-xl font-bold text-brand-green">
               {profiles.length > 0 ? profiles.length : new Set(records.map(r => r.responsavelPreenchimento)).size}
             </span>
           </div>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 xl:grid-cols-2 gap-8"
      >
        {sectorGroups.map((group, idx) => {
          const density = group.totalIAs >= 6 ? 'high' : group.totalIAs >= 3 ? 'medium' : 'low';
          const densityStyles = {
            high: { border: 'border-emerald-800/60 shadow-[0_0_25px_rgba(6,95,70,0.15)]', dot: 'bg-emerald-800 animate-pulse', label: 'Alta Densidade de IA', text: 'text-emerald-800', badge: 'bg-emerald-800/10 text-emerald-800', title: 'text-emerald-900 dark:text-emerald-400' },
            medium: { border: 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]', dot: 'bg-emerald-500', label: 'Média Densidade de IA', text: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500', title: 'text-emerald-700 dark:text-emerald-400' },
            low: { border: 'border-emerald-300/40 shadow-[0_0_15px_rgba(110,231,183,0.05)]', dot: 'bg-emerald-300', label: 'Baixa Densidade de IA', text: 'text-emerald-300', badge: 'bg-emerald-300/10 text-emerald-300', title: 'text-emerald-600 dark:text-emerald-500' }
          }[density];

          return (
            <motion.div 
              key={idx} 
              variants={item}
              className={`glass rounded-[2.5rem] p-8 border ${densityStyles.border} relative overflow-hidden group hover:border-emerald-500/50 transition-all`}
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                <Users size={120} />
              </div>

              <div className="flex items-start justify-between mb-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${densityStyles.dot}`}></div>
                    <span className={`text-[10px] font-black ${densityStyles.text} uppercase tracking-[0.2em]`}>
                      {densityStyles.label}
                    </span>
                    {group.totalIAs > 1 && (
                      <span className={`${densityStyles.badge} text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter`}>MULTI-IA</span>
                    )}
                  </div>
                  <h3 className={`text-2xl font-black ${densityStyles.title} tracking-tight uppercase group-hover:text-lab-cyan transition-colors`}>
                    {group.sector}
                  </h3>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-3xl font-black ${densityStyles.text}`}>{group.totalIAs}</span>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Aplicações IA</span>
                </div>
              </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-[var(--border-lab)]">
                <div className="flex items-center gap-2 text-brand-green mb-1">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-black uppercase">Autorizadas</span>
                </div>
                <span className="text-lg font-bold text-[var(--text-main)]">{group.authorizedCount}</span>
              </div>
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-[var(--border-lab)]">
                <div className="flex items-center gap-2 text-brand-orange mb-1">
                  <Clock size={14} />
                  <span className="text-[10px] font-black uppercase">Pendentes</span>
                </div>
                <span className="text-lg font-bold text-[var(--text-main)]">{group.pendingCount}</span>
              </div>
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-[var(--border-lab)]">
                <div className="flex items-center gap-2 text-lab-blue mb-1">
                  <User size={14} />
                  <span className="text-[10px] font-black uppercase">Usuários</span>
                </div>
                <span className="text-lg font-bold text-[var(--text-main)]">{group.users.size}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layout size={12} /> Mapa de Conexões (IAs / Autores)
                </h4>
                {group.totalIAs > 1 && (
                  <button 
                    onClick={() => toggleSector(group.sector)}
                    className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl transition-all flex items-center gap-2 ${
                      expandedSectors.has(group.sector)
                      ? "bg-lab-cyan text-white shadow-xl shadow-lab-cyan/30 scale-105"
                      : "bg-lab-cyan/10 text-lab-cyan hover:bg-lab-cyan hover:text-white shadow-lg shadow-lab-cyan/5"
                    }`}
                  >
                    {expandedSectors.has(group.sector) ? "Recolher" : `Ver ${group.totalIAs} Ferramentas`}
                    <ChevronRight size={14} className={`transition-transform duration-300 ${expandedSectors.has(group.sector) ? "rotate-90" : ""}`} />
                  </button>
                )}
              </div>

              <div className="relative group/map">
                <AnimatePresence initial={false}>
                  {(group.totalIAs === 1 || expandedSectors.has(group.sector)) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-2">
                        {group.records.map((r, i) => (
                          <div 
                            key={i} 
                            onClick={() => setSelectedIA(r)}
                            className="flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/[0.02] border border-transparent hover:border-lab-cyan/30 hover:bg-lab-cyan/[0.03] transition-all group/ia cursor-pointer active:scale-[0.98] hover:shadow-lg hover:shadow-lab-cyan/5"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`size-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                                r.statusAuditoria === "Aprovado" ? "bg-brand-green/10 text-brand-green" : "bg-brand-orange/10 text-brand-orange"
                              }`}>
                                {r.statusAuditoria === "Aprovado" ? "✓" : "?"}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-[var(--text-bright)] group-hover/ia:text-lab-cyan transition-colors uppercase">{r.nomeFerramenta}</div>
                                <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                   <User size={10} /> {r.responsavelPreenchimento}
                                   {profiles.find(p => p.id === r.owner_id || p.full_name === r.responsavelPreenchimento)?.avatar_url && (
                                     <img 
                                       src={profiles.find(p => p.id === r.owner_id || p.full_name === r.responsavelPreenchimento)?.avatar_url} 
                                       alt={r.responsavelPreenchimento}
                                       className="size-4 rounded-full ml-1"
                                     />
                                   )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-[var(--text-muted)] opacity-0 group-hover/ia:opacity-100 transition-all -translate-x-2 group-hover/ia:translate-x-0 group-hover/ia:text-lab-cyan" />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {group.totalIAs > 1 && !expandedSectors.has(group.sector) && (
                  <div 
                    onClick={() => toggleSector(group.sector)}
                    className="relative cursor-pointer group/stack mt-2"
                  >
                    {/* Visual Stack Effect */}
                    <div className="absolute top-4 left-4 right-4 h-14 bg-slate-200/20 dark:bg-white/5 rounded-2xl border border-slate-200/50 -z-30 translate-y-2 scale-[0.92] blur-[0.5px]"></div>
                    <div className="absolute top-2 left-2 right-2 h-14 bg-slate-100/40 dark:bg-white/5 border border-slate-200/50 rounded-2xl -z-20 translate-y-1 scale-[0.96]"></div>
                    <div className="h-16 w-full bg-white dark:bg-white/5 rounded-2xl border-2 border-dashed border-lab-cyan/30 flex items-center justify-center gap-3 group-hover/stack:border-lab-cyan group-hover/stack:bg-lab-cyan/[0.02] transition-all">
                      <div className="size-8 rounded-lg bg-lab-cyan/10 flex items-center justify-center text-lab-cyan">
                        <Plus size={16} className="group-hover/stack:rotate-90 transition-transform" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-lab-cyan uppercase tracking-widest">Expandir Conexões</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">+{group.totalIAs} ferramentas integradas neste setor</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Modal de Detalhes da IA */}
      <AnimatePresence>
        {selectedIA && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIA(null)}
              className="absolute inset-0 bg-white/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden"
            >
              {/* Header do Modal */}
              <div className="relative h-32 bg-gradient-to-r from-lab-cyan/10 to-lab-blue/10 flex items-center px-10 border-b border-slate-100">
                <div className="absolute top-6 right-6">
                  <button 
                    onClick={() => setSelectedIA(null)}
                    className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="size-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-lab-cyan shadow-sm">
                    <Cpu size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
                      {selectedIA.nomeFerramenta}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                        selectedIA.statusAuditoria === "Aprovado" 
                        ? "bg-brand-green/10 text-brand-green border-brand-green/20" 
                        : "bg-brand-orange/10 text-brand-orange border-brand-orange/20"
                      }`}>
                        {selectedIA.statusAuditoria || "Pendente"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Globe size={10} /> {selectedIA.fornecedor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo do Modal */}
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-lab-cyan uppercase tracking-widest">
                      <Info size={14} /> Atribuição e Origem
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs text-slate-400 font-bold">Unidade / Setor</span>
                        <span className="text-sm text-slate-900 font-black uppercase">{selectedIA.unidadeSetor}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs text-slate-400 font-bold">Responsável</span>
                        <span className="text-sm text-slate-900 font-black">{selectedIA.responsavelPreenchimento}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-xs text-slate-400 font-bold">Natureza de Uso</span>
                        <span className="text-sm text-slate-900 font-black">{selectedIA.naturezaUso}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-brand-green uppercase tracking-widest">
                      <Shield size={14} /> Governança Lab
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs text-slate-400 font-bold">Status Conformidade</span>
                        <div className="flex items-center gap-2">
                          <div className={`size-1.5 rounded-full ${selectedIA.alinhadoLGPD === "Sim" ? "bg-brand-green" : "bg-red-400"}`}></div>
                          <span className="text-sm text-slate-900 font-black uppercase">LGPD: {selectedIA.alinhadoLGPD}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs text-slate-400 font-bold">Risco Residual</span>
                        <span className={`text-sm font-black uppercase ${
                          selectedIA.riscoResidual === "Baixo" ? "text-brand-green" : "text-brand-orange"
                        }`}>{selectedIA.riscoResidual}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-xs text-slate-400 font-bold">Criticidade</span>
                        <span className="text-sm text-slate-900 font-black uppercase">{selectedIA.criticidade}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-lab-blue uppercase tracking-widest">
                    <Database size={14} /> Descritivo e Objetivos
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                    <div className="space-y-2">
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Atividade / Processo</p>
                       <p className="text-sm text-slate-700 italic leading-relaxed">
                         "{selectedIA.descricaoAtividade}"
                       </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedIA.objetivos?.map((obj, i) => (
                        <span key={i} className="text-[9px] font-black bg-white text-slate-500 px-3 py-1 rounded-full border border-slate-200 uppercase">
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100">
                   <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-lab-blue/10 flex items-center justify-center text-lab-blue">
                        <Zap size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-lab-blue font-black uppercase tracking-widest">Usuário(s) Autorizado(s)</p>
                        <p className="text-slate-900 font-black">{selectedIA.responsavelPreenchimento}</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setShowTechnicalReport(selectedIA)}
                     className="px-6 py-2 bg-slate-900 text-white font-black text-xs rounded-full hover:bg-black transition-all uppercase tracking-widest"
                   >
                      Ver Fluxo
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Relatório Técnico de Integração */}
      <AnimatePresence>
        {showTechnicalReport && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTechnicalReport(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 20 }}
              className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]"
            >
              {/* Sidebar do Relatório */}
              <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-10 flex flex-col justify-between">
                <div>
                  <div className="size-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-lab-cyan mb-6">
                    <Database size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight uppercase mb-2">Relatório de Integração</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{showTechnicalReport.nomeFerramenta}</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase">ID do Registro</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{showTechnicalReport.id}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Versão do Sistema</p>
                    <p className="text-sm font-black text-slate-900">{showTechnicalReport.versao || "v1.0.0"}</p>
                  </div>
                  <button 
                    onClick={() => setShowTechnicalReport(null)}
                    className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                  >
                    <X size={14} /> Fechar Relatório
                  </button>
                </div>
              </div>

              {/* Grid de Informações Técnicas */}
              <div className="flex-1 p-12 overflow-y-auto max-h-[85vh] custom-scrollbar bg-white">
                <div className="space-y-12">
                  {/* Seção 1: Camada de Dados */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <h4 className="text-[10px] font-black text-lab-cyan uppercase tracking-[0.3em]">01. Camada de Dados</h4>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Tratamento PII</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">Anonimização</span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                            showTechnicalReport.dadosAnonimizados === "Sim" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {showTechnicalReport.dadosAnonimizados === "Sim" ? "ATIVO" : "NÃO APLICADO"}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Exposição Externa</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">Fornecedor Cloud</span>
                          <span className="text-[10px] font-black text-slate-900 uppercase">{showTechnicalReport.envioFornecedorExterno}</span>
                        </div>
                      </div>
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Pipeline Treinamento</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">Reuso de Dados</span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                            showTechnicalReport.dadosTreinamentoModelo === "Não" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {showTechnicalReport.dadosTreinamentoModelo === "Não" ? "PROTEGIDO" : "TREINAMENTO"}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Acesso Físico</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">Nível Perfil</span>
                          <span className="text-[10px] font-black text-slate-900 uppercase">CONTROLADO</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Seção 2: Conectividade */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <h4 className="text-[10px] font-black text-lab-blue uppercase tracking-[0.3em]">02. Conectividade</h4>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-4">
                           <Layers size={18} className="text-lab-blue" />
                           <span className="text-sm font-black text-slate-900 uppercase">Interface de Sistemas</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          {showTechnicalReport.integradaSistemaInterno === "Sim" 
                            ? `Integrado ao ${showTechnicalReport.qualSistema || "Core Lab"}` 
                            : "Uso Standalone"}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-4">
                           <Layout size={18} className="text-lab-blue" />
                           <span className="text-sm font-black text-slate-900 uppercase">Ambiente Produtivo</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          {showTechnicalReport.ambienteHomologacao === "Sim" ? "Homologado em Sandbox" : "Apenas Produção"}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Seção 3: Observabilidade */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <h4 className="text-[10px] font-black text-brand-orange uppercase tracking-[0.3em]">03. Observabilidade</h4>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="p-8 rounded-[2rem] border-2 border-slate-50 space-y-4">
                          <Zap size={24} className="text-brand-orange" />
                          <h5 className="font-black text-slate-900 uppercase tracking-tight">Trilha de Auditoria</h5>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Registro contínuo de logs de acesso e transações para conformidade técnica.
                          </p>
                          <span className={`text-[10px] font-black px-4 py-1.5 rounded-full ${
                             showTechnicalReport.trilhaAuditoria === "Sim" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-400"
                          }`}>
                            {showTechnicalReport.trilhaAuditoria === "Sim" ? "CONFIGURADO" : "INDISPONÍVEL"}
                          </span>
                       </div>

                       <div className="p-8 rounded-[2rem] border-2 border-slate-50 space-y-4">
                          <ShieldCheck size={24} className="text-brand-green" />
                          <h5 className="font-black text-slate-900 uppercase tracking-tight">Log de Decisão</h5>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Rastreabilidade dos parâmetros que levaram ao resultado gerado pela IA.
                          </p>
                          <span className={`text-[10px] font-black px-4 py-1.5 rounded-full ${
                             showTechnicalReport.registroLogDecisao === "Sim" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
                          }`}>
                            {showTechnicalReport.registroLogDecisao === "Sim" ? "LOG ATIVO" : "SEM LOG"}
                          </span>
                       </div>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
