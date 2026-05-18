/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Search, Filter, Eye, Edit, Trash2, FileOutput, ArrowUpDown, AlertCircle, CheckCircle2, AlertTriangle, XCircle, Download, ClipboardList, PlusCircle, Database, FileSpreadsheet } from "lucide-react";
import { IARecord, StatusUso, Criticidade, ClassificacaoRisco, StatusAuditoria } from "../types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface InventoryProps {
  records: IARecord[];
  onEdit: (record: IARecord) => void;
  onView: (record: IARecord) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onRefresh: () => void;
  isAdmin?: boolean;
}

export default function Inventory({ records, onEdit, onView, onDelete, onAdd, onRefresh, isAdmin }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSetor, setFilterSetor] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisco, setFilterRisco] = useState("");
  const [filterApproval, setFilterApproval] = useState("");
  const [filterDadosSensiveis, setFilterDadosSensiveis] = useState("");
  const [sortField, setSortField] = useState<keyof IARecord | "">("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Get unique sectors for filter
  const sectors = useMemo(() => {
    const allSectors = Array.from(new Set(records.map(r => r.unidadeSetor)));
    return allSectors;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = 
        r.nomeFerramenta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSetor = !filterSetor || r.unidadeSetor === filterSetor;
      const matchesStatus = !filterStatus || r.statusUso === filterStatus;
      const matchesRisco = !filterRisco || r.classificacaoRiscoManual === filterRisco;
      const matchesSensiveis = !filterDadosSensiveis || r.usaDadosSensiveis === filterDadosSensiveis;
      const matchesApproval = !filterApproval || r.statusAuditoria === filterApproval;

      return matchesSearch && matchesSetor && matchesStatus && matchesRisco && matchesSensiveis && matchesApproval;
    }).sort((a, b) => {
      if (!sortField) return 0;
      const valA = a[sortField];
      const valB = b[sortField];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });
  }, [records, searchTerm, filterSetor, filterStatus, filterRisco, filterDadosSensiveis, sortField, sortDirection]);

  const handleSort = (field: keyof IARecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventário IA Cedro");

    // Header stylings
    const brandGreen = "00C875";
    const labDark = "0F172A";
    const labCyan = "00E5FF";

    // Add Title and Metadata
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getRow(1).getCell(1);
    titleCell.value = "LABORATÓRIO CEDRO - INVENTÁRIO DE INTELIGÊNCIA ARTIFICIAL";
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: labDark } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 40;

    worksheet.mergeCells('A2:H2');
    const subTitleRow = worksheet.getRow(2);
    subTitleRow.getCell(1).value = `Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`;
    subTitleRow.getCell(1).font = { italic: true, color: { argb: '64748B' } };
    subTitleRow.getCell(1).alignment = { horizontal: 'center' };
    subTitleRow.height = 20;

    // Blank row
    worksheet.addRow([]);

    // Set columns headers (now on row 4)
    const headerRowIndex = 4;
    const columns = [
      { header: "ID", key: "id", width: 18 },
      { header: "NOME DA FERRAMENTA", key: "nome", width: 35 },
      { header: "FORNECEDOR", key: "fornecedor", width: 25 },
      { header: "SETOR RESPONSÁVEL", key: "setor", width: 25 },
      { header: "STATUS DE USO", key: "status", width: 22 },
      { header: "CLASSIFICAÇÃO RISCO", key: "risco", width: 25 },
      { header: "DADOS SENSÍVEIS", key: "dados_sensiveis", width: 18 },
      { header: "DATA DE REGISTRO", key: "data", width: 20 },
    ];

    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = columns.map(c => c.header);
    headerRow.height = 35;
    
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: brandGreen }
      };
      cell.font = {
        color: { argb: '000000' },
        bold: true,
        size: 11
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' }
      };
      
      // Sync width from columns definition
      worksheet.getColumn(colNumber).width = columns[colNumber - 1].width;
    });

    // Add data
    filteredRecords.forEach((r) => {
      const row = worksheet.addRow([
        r.id,
        r.nomeFerramenta,
        r.fornecedor,
        r.unidadeSetor,
        r.statusUso,
        r.classificacaoRiscoManual,
        r.usaDadosSensiveis,
        r.dataRegistro,
      ]);

      row.height = 25;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        };

        // Conditional styling for Status (col 5)
        if (colNumber === 5 && r.statusUso === StatusUso.APROVADO) {
          cell.font = { color: { argb: '059669' }, bold: true };
        }

        // Conditional styling for Risco (col 6)
        if (colNumber === 6 && (r.classificacaoRiscoManual === ClassificacaoRisco.ALTO || r.classificacaoRiscoManual === ClassificacaoRisco.CRITICO)) {
          cell.font = { color: { argb: 'DC2626' }, bold: true };
        }
      });
    });

    // Final border and cosmetic touch
    worksheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Create binary and save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `inventario_ia_cedro_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportCSV = () => {
    // keeping CSV as fallback but renaming button or adding both
    const headers = ["ID", "Nome", "Fornecedor", "Setor", "Status", "Risco", "Dados Sensiveis", "Data"].join(",");
    const rows = filteredRecords.map(r => [
      r.id, 
      r.nomeFerramenta, 
      r.fornecedor, 
      r.unidadeSetor, 
      r.statusUso, 
      r.classificacaoRiscoManual, 
      r.usaDadosSensiveis, 
      r.dataRegistro
    ].join(","));
    
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_ia_cedro_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredRecords, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_ia_cedro_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const getStatusBadge = (status: StatusUso) => {
    const styles: Record<string, string> = {
      [StatusUso.APROVADO]: "bg-green-100 dark:bg-brand-green/10 text-brand-green border-green-200 dark:border-brand-green/20",
      [StatusUso.APROVADO_COM_RESTRICOES]: "bg-orange-50 dark:bg-brand-orange/10 text-brand-orange border-brand-orange/20",
      [StatusUso.NAO_APROVADO]: "bg-red-50 dark:bg-lab-red/10 text-red-600 dark:text-lab-red border-red-200 dark:border-lab-red/20",
      [StatusUso.EM_AVALIACAO]: "bg-blue-50 dark:bg-lab-blue/10 text-lab-blue border-lab-blue/20",
      [StatusUso.EM_TESTE_PILOTO]: "bg-cyan-50 dark:bg-lab-cyan/10 text-lab-cyan border-lab-cyan/20",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${styles[status] || "bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Search and Filters */}
      <div className="bg-emerald-900 dark:bg-emerald-950 rounded-[3rem] p-8 space-y-8 border border-emerald-800/50 relative overflow-hidden group shadow-2xl shadow-emerald-500/10 transition-all">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-green/30 to-transparent"></div>
        <div className="flex flex-col xl:flex-row gap-6 justify-between items-stretch lg:items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400 dark:text-emerald-500 group-focus-within:text-brand-green transition-all transform group-focus-within:scale-110" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, fornecedor ou ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-black/20 dark:bg-black/40 border border-emerald-800/50 rounded-2xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-white placeholder:text-emerald-400 dark:placeholder:text-emerald-600 transition-all outline-none font-semibold text-sm tracking-tight"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={exportExcel}
              className="px-6 py-4 bg-white/5 dark:bg-white/10 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10 active:scale-95 flex items-center gap-2 text-xs tracking-tight uppercase group/btn"
            >
              <FileSpreadsheet size={14} className="text-brand-green group-hover/btn:scale-110 transition-transform" />
              Exportar Inventário
            </button>
            <button 
              onClick={onAdd}
              className="px-8 py-4 bg-brand-green hover:bg-brand-green/80 text-black font-bold rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 text-xs tracking-tight uppercase"
            >
              <PlusCircle size={16} />
              Novo Registro
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Setor Responsável", value: filterSetor, onChange: setFilterSetor, options: sectors },
            { label: "Status de Uso", value: filterStatus, onChange: setFilterStatus, options: Object.values(StatusUso) },
            { label: "Auditoria Admin", value: filterApproval, onChange: setFilterApproval, options: Object.values(StatusAuditoria) },
            { label: "Classificacao de Risco", value: filterRisco, onChange: setFilterRisco, options: Object.values(ClassificacaoRisco) },
            { label: "Dados Sensíveis", value: filterDadosSensiveis, onChange: setFilterDadosSensiveis, options: ["Sim", "Não"], isSensitive: true }
          ].map((filter, i) => (
            <div key={i} className="space-y-3">
              <label className="text-xs font-black text-emerald-100/70 uppercase tracking-widest pl-1 flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-brand-green shadow-[0_0_8px_rgba(0,255,101,0.5)]"></div> {filter.label}
              </label>
              <div className="relative group">
                <select 
                   className="w-full p-4 bg-black/20 dark:bg-black/40 border border-emerald-800/50 rounded-xl text-xs font-black text-white outline-none appearance-none cursor-pointer hover:border-brand-green/50 focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 transition-all shadow-inner"
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900">Todos os Registros</option>
                  {filter.options.map(opt => <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-slate-900">{opt}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400 transition-transform group-hover:translate-y-[-40%]">
                  <ArrowUpDown size={12} className="group-hover:text-brand-green transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table - Tech Lab Grid */}
      <div className="glass rounded-[2rem] shadow-sm shadow-black/[0.02] dark:shadow-black/20 border border-[var(--border-lab)] overflow-hidden flex flex-col relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-green/5 dark:bg-brand-green/10 text-xs uppercase text-[var(--text-muted)] border-b border-[var(--border-lab)]">
              <tr>
                <th className="px-8 py-6 font-bold tracking-tight cursor-pointer hover:bg-black/5 dark:hover:bg-white/[0.05] transition-all" onClick={() => handleSort("id")}>
                  <div className="flex items-center gap-2 group">ID <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" /></div>
                </th>
                <th className="px-8 py-6 font-bold tracking-tight cursor-pointer hover:bg-black/5 dark:hover:bg-white/[0.05] transition-all" onClick={() => handleSort("nomeFerramenta")}>
                  <div className="flex items-center gap-2 group">Nome da IA <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" /></div>
                </th>
                <th className="px-8 py-6 font-bold tracking-tight cursor-pointer hover:bg-black/5 dark:hover:bg-white/[0.05] transition-all" onClick={() => handleSort("unidadeSetor")}>
                  <div className="flex items-center gap-2 group">Setor Responsável <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" /></div>
                </th>
                <th className="px-8 py-6 font-bold tracking-tight">Risco</th>
                <th className="px-8 py-6 font-bold tracking-tight">Status Uso</th>
                <th className="px-8 py-6 font-bold tracking-tight">Auditoria</th>
                <th className="px-8 py-6 font-bold tracking-tight text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredRecords.map((record) => (
                <tr 
                  key={record.id} 
                  className={`border-b border-[var(--border-lab)] hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all group duration-300 cursor-default`}
                >
                  <td className="px-8 py-6 whitespace-nowrap min-w-[180px]">
                    <span className="font-mono text-[10px] text-emerald-800 dark:text-brand-green bg-brand-green/20 px-3 py-1.5 rounded-lg group-hover:bg-brand-green/30 transition-all border border-brand-green/20 uppercase tracking-tight inline-block">{record.id}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-[var(--text-bright)] group-hover:text-brand-green transition-colors uppercase tracking-tight">{record.nomeFerramenta}</span>
                      <div className="flex items-center gap-2 mt-1">
                         <div className="size-1.5 rounded-full bg-lab-cyan"></div>
                         <span className="text-[10px] font-black text-lab-cyan uppercase tracking-widest leading-none">{record.unidadeSetor}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                     <span className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest border transition-all ${
                        record.criticidade?.includes("ALTA") ? "bg-lab-red/10 text-lab-red border-lab-red/20" : 
                        record.criticidade?.includes("MEDIA") ? "bg-brand-orange/10 text-brand-orange border-brand-orange/20" : 
                        "bg-brand-green/10 text-brand-green border-brand-green/20"
                     }`}>
                       {record.criticidade ? record.criticidade.split(":")[0] : "N/A"}
                     </span>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-2">
                       <div className={`size-1.5 rounded-full ${record.statusUso === StatusUso.APROVADO ? "bg-brand-green" : "bg-brand-orange"}`}></div>
                       <span className="text-[11px] font-bold tracking-tight text-[var(--text-main)] uppercase leading-none">{record.statusUso}</span>
                     </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-2">
                       <span className={`text-[9px] px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full font-black uppercase tracking-widest border w-fit ${
                          record.statusAuditoria === StatusAuditoria.APROVADO ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          record.statusAuditoria === StatusAuditoria.NEGADO ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]"
                       }`}>
                         {record.statusAuditoria || StatusAuditoria.PENDENTE}
                       </span>
                    </div>
                  </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 transition-all">
                        {isAdmin && record.statusAuditoria === StatusAuditoria.PENDENTE && (
                          <>
                            <button 
                              onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation(); 
                                onEdit({ ...record, statusAuditoria: StatusAuditoria.APROVADO }); 
                                setTimeout(() => onRefresh(), 500);
                              }} 
                              title="Aprovar Auditoria"
                              className="flex items-center justify-center size-10 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all active:scale-95 border border-green-500/20"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation(); 
                                onEdit({ ...record, statusAuditoria: StatusAuditoria.NEGADO }); 
                                setTimeout(() => onRefresh(), 500);
                              }} 
                              title="Negar Auditoria"
                              className="flex items-center justify-center size-10 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-95 border border-red-500/20"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            onView(record); 
                          }} 
                          title="Visualizar"
                          className="flex items-center justify-center size-10 glass hover:text-lab-cyan hover:border-lab-cyan/50 rounded-xl transition-all active:scale-95 bg-white/5 dark:bg-white/10"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            onEdit(record); 
                          }} 
                          title="Editar"
                          className="flex items-center justify-center size-10 glass hover:text-brand-green hover:border-brand-green/50 rounded-xl transition-all active:scale-95 bg-white/5 dark:bg-white/10"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            onDelete(record.id); 
                          }} 
                          title="Excluir"
                          className="flex items-center justify-center size-10 glass border-lab-red/30 text-lab-red hover:bg-lab-red/10 rounded-xl transition-all active:scale-95 shadow-sm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Database size={48} className="text-[var(--text-muted)]" />
                      <p className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Nenhum registro encontrado no inventário</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend / Info */}
      <div className="flex flex-col md:flex-row gap-8 items-center px-6">
        <div className="flex items-center gap-3">
           <div className="size-2 rounded-full bg-lab-red"></div>
           <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tight">Risco Crítico em Operação</span>
        </div>
        <div className="h-4 w-px bg-[var(--border-lab)] hidden md:block"></div>
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
           <AlertTriangle size={14} className="text-brand-orange" />
           <span className="text-xs font-bold uppercase tracking-tight">Auditoria semestral obrigatória para todos os módulos.</span>
        </div>
      </div>

    </div>
  );
}
