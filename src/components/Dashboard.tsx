/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { CheckCircle2, AlertTriangle, ShieldX, Clock, Database, ShieldAlert, UserCheck, HardDrive, FileWarning, BarChart3, PieChart as PieChartIcon, Activity, PlusCircle, ChevronRight, FileSpreadsheet, FileJson, Users } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { IARecord, StatusUso, Criticidade, ClassificacaoRisco, StatusAuditoria } from "../types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface DashboardProps {
  records: IARecord[];
  onNavigate: (tab: "inventory" | "new" | "report") => void;
  isAdmin?: boolean;
}

export default function Dashboard({ records, onNavigate, isAdmin }: DashboardProps) {
  // Performance optimization: Memoize stats calculations
  const stats = useMemo(() => ({
    total: records.length,
    aprovadas: records.filter((r) => r.statusUso === StatusUso.APROVADO).length,
    aprovadasRestricoes: records.filter((r) => r.statusUso === StatusUso.APROVADO_COM_RESTRICOES).length,
    naoAprovadas: records.filter((r) => r.statusUso === StatusUso.NAO_APROVADO).length,
    emAvaliacao: records.filter((r) => r.statusUso === StatusUso.EM_AVALIACAO).length,
    pendentesAprovacao: records.filter((r) => r.statusAuditoria === StatusAuditoria.PENDENTE).length,
    autorizadas: records.filter((r) => r.statusAuditoria === StatusAuditoria.APROVADO).length,
    negadas: records.filter((r) => r.statusAuditoria === StatusAuditoria.NEGADO).length,
    dadosPessoais: records.filter((r) => r.usaDadosPessoais === "Sim").length,
    dadosSensiveis: records.filter((r) => r.usaDadosSensiveis === "Sim").length,
    altaCriticidade: records.filter((r) => r.criticidade === Criticidade.ALTA).length,
    semValidacaoHumana: records.filter((r) => r.validacaoHumana === "Não").length,
    necessitaPlanoAcao: records.filter((r) => r.necessitaPlanoAcao === "Sim").length,
  }), [records]);

  const exportCSV = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Painel Geral Cedro");

    // Header stylings
    const brandGreen = "00FF41";
    const labDark = "0F172A";

    // Add Title and Metadata
    worksheet.mergeCells("A1:F1");
    const titleCell = worksheet.getRow(1).getCell(1);
    titleCell.value = "LABORATÓRIO CEDRO - PAINEL GERAL DE INTELIGÊNCIA ARTIFICIAL";
    titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: labDark } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(1).height = 40;

    worksheet.mergeCells("A2:F2");
    const subTitleRow = worksheet.getRow(2);
    subTitleRow.getCell(1).value = `Relatório resumido gerado em: ${new Date().toLocaleString("pt-BR")}`;
    subTitleRow.getCell(1).font = { italic: true, color: { argb: "64748B" } };
    subTitleRow.getCell(1).alignment = { horizontal: "center" };
    subTitleRow.height = 20;

    worksheet.addRow([]); // Blank row

    // Set columns headers
    const headerRowIndex = 4;
    const columns = [
      { header: "ID", key: "id", width: 18 },
      { header: "NOME DA FERRAMENTA", key: "nome", width: 35 },
      { header: "SETOR RESPONSÁVEL", key: "setor", width: 25 },
      { header: "STATUS DE USO", key: "status", width: 22 },
      { header: "CLASSIFICAÇÃO RISCO", key: "risco", width: 25 },
      { header: "DATA DE REGISTRO", key: "data", width: 20 },
    ];

    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = columns.map((c) => c.header);
    headerRow.height = 35;

    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: brandGreen },
      };
      cell.font = { color: { argb: "000000" }, bold: true, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "medium" },
        right: { style: "thin" },
      };
      worksheet.getColumn(colNumber).width = columns[colNumber - 1].width;
    });

    // Add data
    records.forEach((r) => {
      const row = worksheet.addRow([
        r.id,
        r.nomeFerramenta,
        r.unidadeSetor,
        r.statusUso,
        r.classificacaoRiscoManual,
        r.dataRegistro,
      ]);

      row.height = 25;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
        cell.border = {
          bottom: { style: "thin", color: { argb: "E2E8F0" } },
          left: { style: "thin", color: { argb: "E2E8F0" } },
          right: { style: "thin", color: { argb: "E2E8F0" } },
        };

        if (colNumber === 4 && r.statusUso === StatusUso.APROVADO) {
          cell.font = { color: { argb: "059669" }, bold: true };
        }

        if (colNumber === 5 && (r.classificacaoRiscoManual === ClassificacaoRisco.ALTO || r.classificacaoRiscoManual === ClassificacaoRisco.CRITICO)) {
          cell.font = { color: { argb: "DC2626" }, bold: true };
        }
      });
    });

    worksheet.views = [{ state: "frozen", ySplit: 4 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `dashboard_ia_cedro_${new Date().getTime()}.xlsx`);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    saveAs(blob, `dashboard_export_${new Date().getTime()}.json`);
  };

  const cards = useMemo(() => [
    { label: "Total de IAs", value: stats.total, color: "border-slate-200" },
    { label: "Pendente Auditoria", value: stats.pendentesAprovacao, color: "border-yellow-500 border-l-4", textColor: "text-yellow-600" },
    { label: "Aprovadas Admin", value: stats.autorizadas, color: "border-brand-green border-l-4", textColor: "text-brand-green" },
    { label: "Negadas Admin", value: stats.negadas, color: "border-red-500 border-l-4", textColor: "text-red-500" },
    { label: "Dados Sensíveis", value: stats.dadosSensiveis, color: "border-brand-orange border-l-4", textColor: "text-brand-orange" },
  ], [stats]);

  // Distribution for Geometric Balance look
  const statusValues = useMemo(() => [
    { label: "Aprovado", value: stats.autorizadas, percent: stats.total ? Math.round((stats.autorizadas / stats.total) * 100) : 0, color: "bg-brand-green", hex: "#00d136" },
    { label: "Pendente", value: stats.pendentesAprovacao, percent: stats.total ? Math.round((stats.pendentesAprovacao / stats.total) * 100) : 0, color: "bg-brand-orange", hex: "#d9a006" },
    { label: "Negado", value: stats.negadas, percent: stats.total ? Math.round((stats.negadas / stats.total) * 100) : 0, color: "bg-lab-red", hex: "#ef4444" },
  ], [stats]);

  const pieData = useMemo(() => statusValues.map(s => ({
    name: s.label,
    value: s.value,
    color: s.hex
  })), [statusValues]);

  return (
    <div className="space-y-8 pb-10 relative">
      {/* Background Gradient Layer for Dashboard - Simplified to improve scroll performance */}
      <div className="absolute inset-x-0 -top-40 h-80 bg-brand-green/[0.03] blur-[100px] pointer-events-none -z-10" />
      
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="glass p-5 rounded-2xl relative overflow-hidden group hover:scale-[1.01] transition-transform duration-200">
            <div className={`absolute top-0 left-0 w-1 h-full ${
              card.textColor === "text-brand-green" ? "bg-brand-green" : 
              card.textColor === "text-red-600" || card.textColor === "text-red-500" ? "bg-lab-red" : 
              card.textColor === "text-brand-orange" ? "bg-brand-orange" :
              card.textColor === "text-yellow-600" ? "bg-yellow-500" :
              "bg-[var(--border-lab)]"
            }`}></div>
            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.15em] mb-3">{card.label}</p>
            <div className="flex items-end justify-between">
              <p className={`text-4xl font-black tracking-tighter ${card.textColor || "text-[var(--text-bright)]"}`}>
                {card.value.toString().padStart(2, '0')}
              </p>
              <div className={`p-2 rounded-lg bg-black/5 dark:bg-white/5 opacity-50 group-hover:opacity-100 transition-opacity`}>
                {i === 0 ? <Database size={16} /> : i === 1 ? <Clock size={16} /> : i === 2 ? <CheckCircle2 size={16} /> : i === 3 ? <ShieldX size={16} /> : <FileWarning size={16} />}
              </div>
            </div>
            {/* Reduced blur for performance */}
            <div className={`absolute -right-4 -bottom-4 w-16 h-16 blur-xl opacity-[0.02] dark:opacity-5 rounded-full pointer-events-none ${
               card.textColor === "text-brand-green" ? "bg-brand-green" : 
               card.textColor === "text-red-600" || card.textColor === "text-red-500" ? "bg-lab-red" : 
               card.textColor === "text-brand-orange" ? "bg-brand-orange" :
               card.textColor === "text-yellow-600" ? "bg-yellow-500" :
               "bg-[var(--text-muted)]"
            }`}></div>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div className="glass p-8 rounded-[2.5rem] border border-lab-cyan/20 bg-gradient-to-br from-lab-cyan/[0.03] to-transparent">
          <div className="flex items-center gap-4 mb-8">
            <div className="size-12 rounded-2xl bg-lab-cyan/10 flex items-center justify-center text-lab-cyan border border-lab-cyan/20">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Painel de Acompanhamento</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Status de suas solicitações de IA</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {records.filter(r => r.statusAuditoria === StatusAuditoria.PENDENTE).length > 0 ? (
              records.filter(r => r.statusAuditoria === StatusAuditoria.PENDENTE).slice(0, 3).map((r, i) => (
                <div key={i} className="p-6 rounded-3xl bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-yellow-600/70 bg-yellow-50 dark:bg-yellow-500/10 px-2 py-0.5 rounded uppercase">{r.id}</span>
                    <div className="flex items-center gap-1.5">
                       <Clock size={12} className="text-yellow-500 animate-spin-slow" />
                       <span className="text-[10px] font-black text-yellow-600 uppercase">Em Análise</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white truncate uppercase">{r.nomeFerramenta}</h4>
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                       <Users size={12} className="text-slate-400" />
                    </div>
                    <span className="text-xs font-black text-lab-cyan/80 uppercase">{r.unidadeSetor}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "30%" }}
                      animate={{ width: "65%" }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                      className="h-full bg-yellow-500 rounded-full"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest">Aguardando Parecer Técnico</p>
                </div>
              ))
            ) : (
              <div className="col-span-3 py-10 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                <CheckCircle2 size={32} className="text-brand-green" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Nenhuma solicitação pendente</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Governance & Risk Alerts Table */}
        <div className="col-span-12 xl:col-span-8 bg-emerald-900 dark:bg-emerald-950 rounded-[2.5rem] flex flex-col overflow-hidden relative border border-emerald-800/50 shadow-2xl shadow-emerald-500/10 transition-all">
          <div className="p-6 border-b border-emerald-800/50 flex justify-between items-center bg-black/20">
            <div className="flex items-center gap-3">
              <div className="size-2.5 rounded-full bg-brand-green shadow-[0_0_10px_rgba(0,255,101,0.5)]"></div>
              <h3 className="font-black text-white uppercase tracking-tight text-base">Monitoramento de Governança e Risco</h3>
            </div>
            <button 
              onClick={() => onNavigate("inventory")}
              className="text-[10px] bg-white/10 text-emerald-100 hover:bg-brand-green hover:text-black px-5 py-2 rounded-xl font-black transition-all border border-white/10 active:scale-95 uppercase tracking-widest"
            >
              Ver Tudo →
            </button>
          </div>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-black/40 text-[10px] uppercase text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] sticky top-0 z-10 font-black tracking-widest">
                <tr>
                  <th className="px-6 py-5 border-b border-emerald-800/50">ID da IA</th>
                  <th className="px-6 py-5 border-b border-emerald-800/50">IA / Setor</th>
                  <th className="px-6 py-5 border-b border-emerald-800/50 text-center">Risco</th>
                  <th className="px-6 py-5 border-b border-emerald-800/50">Auditoria</th>
                  <th className="px-6 py-5 border-b border-emerald-800/50">Status Uso</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {records.slice(0, 6).map((record) => (
                  <tr key={record.id} className="border-b border-emerald-800/30 hover:bg-white/5 transition-all group font-medium">
                    <td className="px-6 py-5 whitespace-nowrap">
                       <span className="font-mono text-[10px] text-emerald-400 bg-black/30 px-2 py-1 rounded border border-emerald-800/50 group-hover:text-brand-green transition-colors">{record.id}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-white group-hover:text-brand-green transition-colors uppercase tracking-tight">{record.nomeFerramenta}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                           <div className="size-1 rounded-full bg-brand-green/60"></div>
                           <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{record.unidadeSetor}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <span className={`text-[9px] px-3 py-1 rounded-md font-black border tracking-widest transition-transform group-hover:scale-110 ${
                          record.criticidade?.includes("ALTA") 
                            ? "bg-red-500/20 border-red-500/40 text-red-500" 
                            : record.criticidade?.includes("MEDIA") 
                              ? "bg-brand-orange/20 border-brand-orange/40 text-brand-orange" 
                              : "bg-brand-green/20 border-brand-green/40 text-brand-green"
                        }`}>
                          {record.criticidade ? record.criticidade.split(":")[0] : "NA"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[10px] font-black uppercase tracking-widest">
                        {record.statusAuditoria === StatusAuditoria.PENDENTE ? (
                          <span className="text-yellow-400 flex items-center gap-2 animate-pulse">
                            <Clock size={14} /> Pendente
                          </span>
                        ) : record.statusAuditoria === StatusAuditoria.NEGADO ? (
                          <span className="text-red-400 flex items-center gap-2">
                            <ShieldX size={14} /> Negado
                          </span>
                        ) : (
                          <span className="text-brand-green flex items-center gap-2">
                            <CheckCircle2 size={14} /> Aprovado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex items-center gap-2">
                         <div className={`size-1.5 rounded-full ${record.statusUso === StatusUso.APROVADO ? "bg-brand-green shadow-[0_0_8px_rgba(0,255,101,0.4)]" : "bg-brand-orange/50"}`}></div>
                         <span className="text-[10px] font-black tracking-widest text-emerald-100/80 group-hover:text-white transition-colors uppercase">{record.statusUso}</span>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribution Stats */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
          <div className="glass p-8 rounded-3xl border border-[var(--border-lab)] flex flex-col shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 blur-xl rounded-full"></div>
            <div>
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-6 flex items-center gap-2">
                <PieChartIcon size={14} className="text-brand-green" /> Visão Geral de Conformidade
              </h3>
              
              {/* Pie Chart container */}
              <div className="h-64 w-full mb-6 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid #333', 
                        borderRadius: '12px',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                      }}
                       itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-[var(--text-bright)] tracking-tighter">{stats.total}</span>
                  <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total IAs</span>
                </div>
              </div>

              <div className="space-y-4">
                {statusValues.map((stat, i) => (
                  <div key={i} className="group">
                    <div className="flex justify-between text-[10px] mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`size-1.5 rounded-full ${stat.color}`}></div>
                        <span className="font-bold text-[var(--text-muted)] group-hover:text-[var(--text-bright)] transition-colors uppercase tracking-tight">{stat.label}</span>
                      </div>
                      <span className="font-mono text-brand-green font-bold tabular-nums">{stat.percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.percent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`${stat.color} h-full rounded-full opacity-80`} 
                      ></motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-[var(--border-lab)]">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Fator de Carga</span>
                   <span className="text-sm font-bold text-[var(--text-bright)] uppercase tracking-tight">Estável / Baixa Latência</span>
                 </div>
                 <Activity size={24} className="text-brand-green/20" />
              </div>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl border border-[var(--border-lab)] text-[var(--text-main)] relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/5 blur-3xl rounded-full"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                 <div className="bg-brand-green/10 text-brand-green p-1.5 rounded-lg border border-brand-green/20">
                   <PlusCircle size={14} />
                 </div>
                 <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Ação Necessária</h3>
              </div>
              <p className="text-xl font-bold tracking-tight leading-tight mb-8 text-[var(--text-bright)] group-hover:translate-x-1 transition-transform">Expandir o Inventário de IA para novos departamentos.</p>
              <button 
                onClick={() => onNavigate("new")}
                className="w-full bg-brand-green text-black py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-brand-green/90 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                Novo Registro <ChevronRight size={14} />
              </button>
            </div>
            <img src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" alt="" className="absolute right-[-20px] bottom-[-20px] size-48 opacity-[0.05] dark:opacity-[0.03] rotate-12 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>

      {/* Footer Simulation */}
      <div className="flex flex-col md:flex-row justify-between items-center glass border border-[var(--border-lab)] rounded-3xl p-6 gap-6">
        <div className="flex gap-4">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] hover:text-brand-green transition-all group"
          >
            <div className="p-2 bg-black/5 dark:bg-white/5 border border-[var(--border-lab)] rounded-xl group-hover:border-brand-green/30 transition-colors">
              <Database size={16} />
            </div>
            Exportar CSV
          </button>
          <button 
            onClick={exportJSON}
            className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] hover:text-lab-cyan transition-all group"
          >
            <div className="p-2 bg-black/5 dark:bg-white/5 border border-[var(--border-lab)] rounded-xl group-hover:border-lab-cyan/30 transition-colors">
              <HardDrive size={16} />
            </div>
            Exportar JSON
          </button>
        </div>
        <div className="flex items-center gap-4">
           <div className="size-2 rounded-full bg-brand-green"></div>
           <span className="text-[11px] font-mono text-[var(--text-muted)] tracking-tight">
             Sessão Ativa | {new Date().toLocaleTimeString()}
           </span>
        </div>
      </div>
    </div>
  );

}
