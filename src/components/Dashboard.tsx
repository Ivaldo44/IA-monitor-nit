/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { CheckCircle2, AlertTriangle, ShieldX, Clock, Database, ShieldAlert, UserCheck, HardDrive, FileWarning, BarChart3, PieChart as PieChartIcon, Activity, PlusCircle, ChevronRight, FileSpreadsheet, FileJson } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { IARecord, StatusUso, Criticidade, ClassificacaoRisco } from "../types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface DashboardProps {
  records: IARecord[];
  onNavigate: (tab: "inventory" | "new" | "report") => void;
}

export default function Dashboard({ records, onNavigate }: DashboardProps) {
  // Performance optimization: Memoize stats calculations
  const stats = useMemo(() => ({
    total: records.length,
    aprovadas: records.filter((r) => r.statusUso === StatusUso.APROVADO).length,
    aprovadasRestricoes: records.filter((r) => r.statusUso === StatusUso.APROVADO_COM_RESTRICOES).length,
    naoAprovadas: records.filter((r) => r.statusUso === StatusUso.NAO_APROVADO).length,
    emAvaliacao: records.filter((r) => r.statusUso === StatusUso.EM_AVALIACAO).length,
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
    const brandGreen = "00C875";
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
    { label: "Uso Aprovado", value: stats.aprovadas, color: "border-brand-green border-l-4", textColor: "text-brand-green" },
    { label: "Alta Criticidade", value: stats.altaCriticidade, color: "border-red-500 border-l-4", textColor: "text-red-600" },
    { label: "Dados Sensíveis", value: stats.dadosSensiveis, color: "border-brand-orange border-l-4", textColor: "text-brand-orange" },
    { label: "Em Avaliação", value: stats.emAvaliacao, color: "border-brand-orange border-l-4", textColor: "text-brand-orange" },
  ], [stats]);

  // Distribution for Geometric Balance look
  const statusValues = useMemo(() => [
    { label: "Aprovado", value: stats.aprovadas, percent: stats.total ? Math.round((stats.aprovadas / stats.total) * 100) : 0, color: "bg-brand-green", hex: "#00ff41" },
    { label: "Em Avaliação", value: stats.emAvaliacao, percent: stats.total ? Math.round((stats.emAvaliacao / stats.total) * 100) : 0, color: "bg-brand-orange", hex: "#ff9900" },
    { label: "Suspenso/Não Aprovado", value: stats.naoAprovadas, percent: stats.total ? Math.round(((stats.naoAprovadas) / stats.total) * 100) : 0, color: "bg-brand-black", hex: "#111111" },
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
              card.textColor === "text-red-600" ? "bg-lab-red" : 
              card.textColor === "text-brand-orange" ? "bg-brand-orange" :
              "bg-[var(--border-lab)]"
            }`}></div>
            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.15em] mb-3">{card.label}</p>
            <div className="flex items-end justify-between">
              <p className={`text-4xl font-black tracking-tighter ${card.textColor?.replace("brand-green", "brand-green").replace("red-600", "lab-red").replace("brand-orange", "brand-orange") || "text-[var(--text-bright)]"}`}>
                {card.value.toString().padStart(2, '0')}
              </p>
              <div className={`p-2 rounded-lg bg-black/5 dark:bg-white/5 opacity-50 group-hover:opacity-100 transition-opacity`}>
                {i === 0 ? <Database size={16} /> : i === 1 ? <CheckCircle2 size={16} /> : i === 2 ? <ShieldAlert size={16} /> : i === 3 ? <FileWarning size={16} /> : <Clock size={16} />}
              </div>
            </div>
            {/* Reduced blur for performance */}
            <div className={`absolute -right-4 -bottom-4 w-16 h-16 blur-xl opacity-[0.02] dark:opacity-5 rounded-full pointer-events-none ${
               card.textColor === "text-brand-green" ? "bg-brand-green" : 
               card.textColor === "text-red-600" ? "bg-lab-red" : 
               card.textColor === "text-brand-orange" ? "bg-brand-orange" :
               "bg-[var(--text-muted)]"
            }`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Governance & Risk Alerts Table */}
        <div className="col-span-12 xl:col-span-8 glass rounded-3xl flex flex-col overflow-hidden relative border border-[var(--border-lab)] shadow-lg shadow-black/[0.02]">
          <div className="p-6 border-b border-[var(--border-lab)] flex justify-between items-center bg-brand-green/[0.03]">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-brand-green"></div>
              <h3 className="font-bold text-[var(--text-bright)] uppercase tracking-tight text-base">Monitoramento de Governança e Risco</h3>
            </div>
            <button 
              onClick={() => onNavigate("inventory")}
              className="text-xs bg-black/5 dark:bg-white/5 text-[var(--text-main)] hover:bg-brand-green/20 hover:text-brand-green px-4 py-2 rounded-full font-bold transition-all border border-[var(--border-lab)] active:scale-95"
            >
              Ver Tudo →
            </button>
          </div>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-brand-green/5 dark:bg-brand-green/10 text-xs uppercase text-[var(--text-muted)] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-tight">ID da IA</th>
                  <th className="px-6 py-4 font-bold tracking-tight">Nome da IA</th>
                  <th className="px-6 py-4 font-bold tracking-tight text-center">Risco</th>
                  <th className="px-6 py-4 font-bold tracking-tight">Status</th>
                  <th className="px-6 py-4 font-bold tracking-tight">Ação Necessária</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {records.slice(0, 6).map((record) => (
                  <tr key={record.id} className="border-b border-[var(--border-lab)] hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all group font-medium">
                    <td className="px-6 py-4">
                       <span className="font-mono text-[10px] text-[var(--text-muted)] bg-black/5 dark:bg-white/5 px-2 py-1 rounded group-hover:text-lab-cyan transition-colors">{record.id}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-[var(--text-main)] group-hover:text-[var(--text-bright)] transition-colors">{record.nomeFerramenta}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`text-[9px] px-3 py-1 rounded-full font-black border tracking-widest transition-transform group-hover:scale-110 ${
                          record.criticidade?.includes("ALTA") 
                            ? "bg-lab-red/10 border-lab-red/30 text-lab-red" 
                            : record.criticidade?.includes("MEDIA") 
                              ? "bg-brand-orange/10 border-brand-orange/30 text-brand-orange" 
                              : "bg-brand-green/10 border-brand-green/30 text-brand-green"
                        }`}>
                          {record.criticidade ? record.criticidade.split(":")[0] : "NA"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                         <div className={`size-1.5 rounded-full ${record.statusUso === StatusUso.APROVADO ? "bg-brand-green" : "bg-brand-orange/50"}`}></div>
                         <span className="text-[11px] font-bold tracking-tight text-[var(--text-main)]">{record.statusUso}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold">
                        {record.validacaoHumana === "Não" ? (
                          <span className="text-lab-red flex items-center gap-1.5">
                            <ShieldX size={14} /> Revisão Humana Pendente
                          </span>
                        ) : record.alinhadoLGPD !== "Sim" ? (
                          <span className="text-brand-orange flex items-center gap-1.5">
                            <ShieldAlert size={14} /> Adequação LGPD
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] font-bold uppercase opacity-60 text-[10px]">Operação Normal</span>
                        )}
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
