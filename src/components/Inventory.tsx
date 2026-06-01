/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Eye, Edit, Trash2, ArrowUpDown, AlertTriangle, CheckCircle2, PlusCircle, Database, FileSpreadsheet, ChevronLeft, ChevronRight, RotateCcw, ShieldAlert, ClipboardList } from "lucide-react";
import { IARecord, StatusUso, Criticidade, ClassificacaoRisco } from "../types";
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
  approvalConfig?: any;
  onSaveApprovalConfig?: any;
}

export default function Inventory({ records, onEdit, onView, onDelete, onAdd, onRefresh, isAdmin }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSetor, setFilterSetor] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisco, setFilterRisco] = useState("");
  const [filterDadosSensiveis, setFilterDadosSensiveis] = useState("");
  const [sortField, setSortField] = useState<keyof IARecord | "">("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate high-level KPIs based on all unfiltered records (the whole database)
  const totalIAs = records.length;
  const emAvaliacaoCount = records.filter(r => r.statusUso === StatusUso.EM_AVALIACAO).length;
  const altoRiscoCount = records.filter(
    r => r.classificacaoRiscoManual === ClassificacaoRisco.ALTO || r.classificacaoRiscoManual === ClassificacaoRisco.CRITICO
  ).length;
  const comDadosSensiveisCount = records.filter(
    r => r.usaDadosSensiveis && (r.usaDadosSensiveis.toLowerCase().trim() === "sim" || r.usaDadosSensiveis.toLowerCase().trim() === "s")
  ).length;

  // Get unique sectors for filter
  const sectors = useMemo(() => {
    const allSectors = Array.from(new Set(records.map(r => r.unidadeSetor).filter(Boolean)));
    return allSectors;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        r.nomeFerramenta.toLowerCase().includes(searchLower) ||
        r.fornecedor.toLowerCase().includes(searchLower) ||
        r.id.toLowerCase().includes(searchLower) ||
        (r.unidadeSetor && r.unidadeSetor.toLowerCase().includes(searchLower)) ||
        (r.classificacaoRiscoManual && r.classificacaoRiscoManual.toLowerCase().includes(searchLower)) ||
        (r.statusUso && r.statusUso.toLowerCase().includes(searchLower)) ||
        (r.usaDadosSensiveis && r.usaDadosSensiveis.toLowerCase().includes(searchLower));
      
      const matchesSetor = !filterSetor || r.unidadeSetor === filterSetor;
      const matchesStatus = !filterStatus || r.statusUso === filterStatus;
      const matchesRisco = !filterRisco || r.classificacaoRiscoManual === filterRisco;
      const matchesSensiveis = !filterDadosSensiveis || r.usaDadosSensiveis === filterDadosSensiveis;

      return matchesSearch && matchesSetor && matchesStatus && matchesRisco && matchesSensiveis;
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

  // Paginated visible chunk of filters
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;

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
      { header: "SETOR", key: "setor", width: 25 },
      { header: "STATUS", key: "status", width: 22 },
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

  const getStatusBadge = (status: StatusUso) => {
    const styles: Record<StatusUso, { bg: string, border: string, dot: string }> = {
      [StatusUso.APROVADO]: {
        bg: "bg-emerald-50 text-[#075618]",
        border: "border-emerald-100",
        dot: "bg-emerald-500",
      },
      [StatusUso.APROVADO_COM_RESTRICOES]: {
        bg: "bg-amber-50 text-amber-700",
        border: "border-amber-100",
        dot: "bg-amber-500",
      },
      [StatusUso.NAO_APROVADO]: {
        bg: "bg-rose-50 text-rose-750",
        border: "border-rose-100",
        dot: "bg-rose-500",
      },
      [StatusUso.EM_AVALIACAO]: {
        bg: "bg-blue-50 text-blue-700",
        border: "border-blue-100",
        dot: "bg-blue-500",
      },
      [StatusUso.EM_TESTE_PILOTO]: {
        bg: "bg-cyan-50 text-cyan-750",
        border: "border-cyan-100",
        dot: "bg-cyan-500",
      },
      [StatusUso.SUSPENSO]: {
        bg: "bg-slate-100 text-slate-700",
        border: "border-slate-200",
        dot: "bg-slate-500",
      },
    };

    const currentStyle = styles[status] || {
      bg: "bg-slate-50 text-slate-600",
      border: "border-slate-100",
      dot: "bg-slate-400",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border tracking-tight ${currentStyle.bg} ${currentStyle.border}`}>
        <span className={`size-1.5 rounded-full ${currentStyle.dot} animate-pulse`}></span>
        {status}
      </span>
    );
  };

  const getRiscoBadge = (risco: string) => {
    const currentRisco = risco || "BAIXO RISCO";
    const isHigh = currentRisco === ClassificacaoRisco.CRITICO || currentRisco === ClassificacaoRisco.ALTO;
    const isMedium = currentRisco === ClassificacaoRisco.MEDIO;

    if (isHigh) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
          <ShieldAlert size={12} className="text-rose-500 shrink-0" />
          <span>{currentRisco}</span>
        </span>
      );
    }
    if (isMedium) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
          <span>{currentRisco}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 size={12} className="text-[#075618] shrink-0" />
        <span>{currentRisco}</span>
      </span>
    );
  };

  const rangeStart = (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, filteredRecords.length);

  return (
    <div className="space-y-6 pb-10">
      {/* 1. Internal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3 w-full justify-end">
          <button 
            onClick={exportExcel}
            className="px-4 py-2.5 bg-white border border-slate-205 text-slate-700 hover:text-[#075618] hover:bg-slate-50 font-semibold rounded-xl text-xs tracking-tight transition-all active:scale-95 flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span>Exportar inventário</span>
          </button>
          <button 
            onClick={onAdd}
            className="px-5 py-2.5 bg-[#075618] hover:bg-[#054112] text-white font-semibold rounded-xl text-xs tracking-tight transition-all active:scale-95 flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-emerald-900/10 cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>Novo registro</span>
          </button>
        </div>
      </div>

      {/* 3. Small Mini KPI summary block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-[#075618]">
            <Database size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de IAs</p>
            <p className="text-lg font-extrabold text-slate-800 leading-tight mt-0.5">{totalIAs}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <ClipboardList size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Em avaliação</p>
            <p className="text-lg font-extrabold text-slate-800 leading-tight mt-0.5">{emAvaliacaoCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alto risco</p>
            <p className="text-lg font-extrabold text-slate-800 leading-tight mt-0.5">{altoRiscoCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Com dados sensíveis</p>
            <p className="text-lg font-extrabold text-slate-800 leading-tight mt-0.5">{comDadosSensiveisCount}</p>
          </div>
        </div>
      </div>

      {/* 2. Compact Search and Filters */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, fornecedor ou ID..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-[#075618]/10 focus:border-[#075618] focus:bg-white text-slate-800 placeholder-slate-400 transition-all outline-none font-medium text-sm tracking-tight"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <strong className="text-slate-800 font-bold">{filteredRecords.length}</strong> {filteredRecords.length === 1 ? "resultado encontrado" : "resultados encontrados"}
            </span>

            {(searchTerm || filterSetor || filterStatus || filterRisco || filterDadosSensiveis) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterSetor("");
                  setFilterStatus("");
                  setFilterRisco("");
                  setFilterDadosSensiveis("");
                  setCurrentPage(1);
                }}
                className="px-3.5 py-2 bg-rose-50/50 hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 border border-rose-100/60 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1 border-t border-slate-50">
          {[
            { label: "Setor / Unidade", value: filterSetor, onChange: (val: string) => { setFilterSetor(val); setCurrentPage(1); }, options: sectors, placeholder: "Todos os Setores" },
            { label: "Status de Uso", value: filterStatus, onChange: (val: string) => { setFilterStatus(val); setCurrentPage(1); }, options: Object.values(StatusUso), placeholder: "Todos os Status" },
            { label: "Classificação de Risco", value: filterRisco, onChange: (val: string) => { setFilterRisco(val); setCurrentPage(1); }, options: Object.values(ClassificacaoRisco), placeholder: "Todos os Riscos" },
            { label: "Contém Dados Sensíveis", value: filterDadosSensiveis, onChange: (val: string) => { setFilterDadosSensiveis(val); setCurrentPage(1); }, options: ["Sim", "Não"], placeholder: "Todos" }
          ].map((f, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">{f.label}</label>
              <div className="relative">
                <select
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50/60 border border-slate-200/85 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none cursor-pointer hover:border-slate-300 focus:border-[#075618] focus:bg-white transition-all"
                >
                  <option value="">{f.placeholder}</option>
                  {f.options.map(opt => (
                    <option key={opt} value={opt} className="text-slate-800">
                      {opt}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Filter size={11} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Table - Clean Corporate Look */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#075618]/5 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="pl-6 pr-4 py-4.5 tracking-tight cursor-pointer hover:bg-slate-50/80 transition-all" onClick={() => handleSort("id")}>
                  <div className="flex items-center gap-1.5 group">ID <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" /></div>
                </th>
                <th className="px-4 py-4.5 tracking-tight cursor-pointer hover:bg-slate-50/80 transition-all min-w-[200px]" onClick={() => handleSort("nomeFerramenta")}>
                  <div className="flex items-center gap-1.5 group">Nome da IA <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" /></div>
                </th>
                <th className="px-4 py-4.5 tracking-tight cursor-pointer hover:bg-slate-50/80 transition-all min-w-[140px]" onClick={() => handleSort("unidadeSetor")}>
                  <div className="flex items-center gap-1.5 group">Setor <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" /></div>
                </th>
                <th className="px-4 py-4.5 tracking-tight min-w-[110px]">Risco</th>
                <th className="px-4 py-4.5 tracking-tight min-w-[140px]">Status</th>
                <th className="pl-4 pr-6 py-4.5 tracking-tight text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedRecords.map((record) => (
                <tr 
                  key={record.id} 
                  className="border-b border-slate-100 hover:bg-slate-50/40 transition-all duration-200 cursor-default"
                >
                  <td className="pl-6 pr-4 py-4 whitespace-nowrap">
                    <span className="font-mono text-[10px] text-[#075618] bg-[#075618]/8 px-2.5 py-1 rounded-md border border-[#075618]/15 font-bold uppercase tracking-tight inline-block">
                      {record.id}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 tracking-tight text-sm uppercase">
                        {record.nomeFerramenta}
                      </span>
                      {record.fornecedor && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {record.fornecedor}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 bg-cyan-50 border border-cyan-100 rounded-md text-[10px] font-bold text-cyan-750 uppercase tracking-tight">
                      {record.unidadeSetor}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getRiscoBadge(record.classificacaoRiscoManual)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getStatusBadge(record.statusUso)}
                  </td>
                  <td className="pl-4 pr-6 py-4 text-right whitespace-nowrap">
                    {/* 5. Ações por linha */}
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          onView(record); 
                        }} 
                        title="Visualizar Detalhes"
                        className="flex items-center justify-center size-8 text-slate-500 border border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 rounded-lg transition-all active:scale-95 bg-white cursor-pointer"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          onEdit(record); 
                        }} 
                        title="Editar Registro"
                        className="flex items-center justify-center size-8 text-slate-500 border border-slate-200 hover:text-[#075618] hover:border-[#075618]/30 hover:bg-emerald-50/50 rounded-lg transition-all active:scale-95 bg-white cursor-pointer"
                      >
                        <Edit size={14} />
                      </button>
                      
                      <div className="relative">
                        <AnimatePresence>
                          {deleteConfirmId === record.id && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute right-0 bottom-full mb-2 flex items-center gap-1.5 bg-white border border-rose-100 rounded-xl shadow-xl p-1.5 z-50 whitespace-nowrap text-slate-700"
                            >
                              <span className="text-[10px] font-bold text-slate-500 px-1">Excluir?</span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                Não
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onDelete(record.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-1 text-[9px] font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-md transition-colors cursor-pointer"
                              >
                                Sim
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <button 
                          onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            if (deleteConfirmId === record.id) {
                                setDeleteConfirmId(null);
                            } else {
                                setDeleteConfirmId(record.id);
                            }
                          }} 
                          title="Excluir Registro"
                          className={`flex items-center justify-center size-8 transition-all active:scale-95 rounded-lg cursor-pointer ${
                            deleteConfirmId === record.id 
                            ? "bg-rose-600 text-white scale-105 border border-rose-650" 
                            : "border border-slate-200 text-rose-600 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50/50 bg-white"
                          }`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Database size={40} className="text-slate-400" />
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Nenhum registro encontrado no inventário
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 7. Paginação / Rodapé da tabela */}
        <div className="bg-white border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            {filteredRecords.length === 0 ? (
              "Exibindo 0 registros"
            ) : (
              <>
                Exibindo <span className="font-semibold text-slate-700">{rangeStart}</span> a{" "}
                <span className="font-semibold text-slate-700">{rangeEnd}</span> de{" "}
                <span className="font-semibold text-slate-700">{filteredRecords.length}</span>{" "}
                {filteredRecords.length === 1 ? "registro" : "registros"}
              </>
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pg = idx + 1;
                  const isCurrent = pg === currentPage;
                  return (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`size-7 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        isCurrent 
                          ? "bg-[#075618] text-white" 
                          : "bg-white border border-slate-150 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="Próxima Página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 6. Faixa de observações ou alertas (Info Banner) */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2.5">
          <div className="size-2 rounded-full bg-rose-500 animate-pulse shrink-0"></div>
          <span>Qualquer ocorrência de <strong className="text-slate-800">Risco Crítico / Alto</strong> exige imediato escalonamento para o comitê de governança institucional.</span>
        </div>
        <div className="h-4 w-px bg-slate-200 hidden md:block select-none"></div>
        <div className="flex items-center gap-2.5 text-slate-550">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span>Auditoria continuada de conformidade regulatória é <strong className="text-slate-700">obrigatória</strong> para a manutenção e operação das soluções de IA.</span>
        </div>
      </div>
    </div>
  );
}

