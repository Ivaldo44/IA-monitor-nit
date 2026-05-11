/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LayoutDashboard, ClipboardList, PlusCircle, FileText, Menu, X, ChevronRight, Activity, ShieldAlert, CheckCircle2, AlertTriangle, Users, Database, Sun, Moon, MessageSquare, UserCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IARecord, StatusUso } from "./types";
import { getRecords, deleteRecord, addRecord, updateRecord, checkSupabaseStatus, saveRecordsToSupabase } from "./storage";
import Dashboard from "./components/Dashboard";
import Inventory from "./components/Inventory";
import RegistrationForm from "./components/RegistrationForm";
import ReportView from "./components/ReportView";
import LabBackground from "./components/LabBackground";
import { Auth } from "./components/Auth";
import { UserProfileView } from "./components/UserProfileView";
import { Chat } from "./components/Chat";
import { useAuth } from "./contexts/AuthContext";

export default function App() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "new" | "report" | "profile" | "chat">("dashboard");
  const [records, setRecords] = useState<IARecord[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<"online" | "offline" | "checking">("checking");
  const [selectedRecord, setSelectedRecord] = useState<IARecord | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });

  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const [isSyncing, setIsSyncing] = useState(false);

  const refreshRecords = async () => {
    setIsSyncing(true);
    try {
      const isOnline = await checkSupabaseStatus();
      setSupabaseStatus(isOnline ? "online" : "offline");
      
      const data = await getRecords();
      setRecords(data);
    } catch (error) {
      console.error("Erro ao atualizar registros:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    refreshRecords();

    const interval = setInterval(async () => {
      const isOnline = await checkSupabaseStatus();
      setSupabaseStatus(isOnline ? "online" : "offline");
    }, 30000); // Check every 30s
    
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (supabaseStatus !== "online") {
      alert("Supabase está offline. Verifique suas chaves de API.");
      return;
    }
    
    setIsSyncing(true);
    try {
      console.log("Forçando sincronização manual...");
      await saveRecordsToSupabase(records);
      await refreshRecords();
      alert("✅ Sincronização concluída com sucesso!");
    } catch (error: any) {
      console.error("Erro na sincronização manual:", error);
      alert(`❌ Erro na sincronização: ${error.message || "Erro desconhecido"}. Verifique o SQL do Supabase.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEdit = (record: IARecord) => {
    setSelectedRecord(record);
    setActiveTab("new");
  };

  const handleView = (record: IARecord) => {
    setSelectedRecord(record);
    setActiveTab("report");
  };

  const handleDelete = async (id: string) => {
    console.log("App: Triggering delete confirmation for id:", id);
    setRecordToDelete(id);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    
    const id = recordToDelete;
    console.log("App: Proceeding with deletion of id:", id);
    
    // Optimistic update
    setRecords(prev => prev.filter(r => r.id !== id));
    setRecordToDelete(null);
    
    try {
      await deleteRecord(id);
      await refreshRecords();
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Houve um erro ao excluir o registro. Por favor, tente novamente.");
      await refreshRecords(); // Rollback to actual state
    }
  };

  const handleSave = async (record: IARecord) => {
    const isNew = !records.find(r => r.id === record.id);
    if (isNew) {
      await addRecord(record);
    } else {
      await updateRecord(record);
    }
    await refreshRecords();
    setActiveTab("inventory");
    setSelectedRecord(null);
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory", label: "Inventário de IA", icon: ClipboardList },
    { id: "new", label: "Novo Cadastro", icon: PlusCircle },
    { id: "report", label: "Relatórios", icon: FileText },
    { id: "chat", label: "Colaboração Chat", icon: MessageSquare },
    { id: "profile", label: "Meu Perfil", icon: UserCircle },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lab-cyan"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={isDarkMode ? "dark" : ""}>
        <Auth />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans selection:bg-brand-green selection:text-black transition-colors duration-300 ${isDarkMode ? "dark" : ""}`}>
      <LabBackground />
      {/* Mobile Header */}
      <div className="md:hidden bg-[var(--bg-sidebar)] backdrop-blur-md p-4 flex justify-between items-center border-b border-[var(--border-lab)] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" alt="Cedro IA Logo" className="h-10 w-auto [filter:var(--logo-filter)]" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation - AI Laboratory Control Panel Style */}
      <aside 
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } fixed md:static inset-y-0 left-0 z-40 w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border-lab)] transition-transform duration-300 ease-in-out md:flex flex-col shrink-0 overflow-hidden shadow-xl shadow-black/5 dark:shadow-black/50`}
      >
        <div className="p-8 hidden md:block border-b border-[var(--border-lab)] bg-gradient-to-b from-brand-green/10 to-transparent">
          <div className="flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-brand-green/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" alt="Cedro IA Logo" className="h-16 w-auto [filter:var(--logo-filter)] relative z-10" />
          </div>
        </div>

        <nav className="mt-8 flex-1 px-4 space-y-2">
          <div className="text-xs font-black uppercase tracking-[0.05em] mb-4 px-4 text-[var(--text-muted)]">Navegação Principal</div>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "new") setSelectedRecord(null);
                setActiveTab(item.id as any);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 relative overflow-hidden ${
                activeTab === item.id 
                  ? "bg-brand-green/10 text-brand-green" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-brand-green"
                />
              )}
              <item.icon size={20} className={`${
                activeTab === item.id ? "text-brand-green" : "text-slate-600 group-hover:text-slate-400"
              }`} />
              <span className="tracking-tight">{item.label}</span>
              {activeTab === item.id && (
                <div className="ml-auto flex items-center gap-1">
                  <div className="size-1 rounded-full bg-brand-green animate-pulse"></div>
                  <div className="size-1 rounded-full bg-brand-green/40"></div>
                </div>
              )}
            </button>
          ))}
        </nav>


      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="bg-[var(--bg-main)]/60 backdrop-blur-md border-b border-[var(--border-lab)] px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-brand-green/5 border border-brand-green/20 rounded-full">
              <div className="size-1.5 rounded-full bg-brand-green"></div>
              <span className="text-[11px] font-bold text-brand-green uppercase tracking-wide">Status: Online</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-bright)] flex items-center gap-3">
              <span className="text-brand-green/40 opacity-50 font-mono text-sm leading-none tabular-nums">/0{menuItems.findIndex(m => m.id === activeTab) + 1}</span>
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden sm:flex items-center gap-3 mr-4">
                <div className="text-right">
                   <p className="text-[11px] font-bold text-[var(--text-bright)] leading-tight">{profile?.full_name || "Usuário"}</p>
                   <p className="text-[9px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{profile?.cargo || "Colaborador"}</p>
                </div>
                <button 
                  onClick={() => setActiveTab("profile")}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-lab-cyan p-0.5"
                >
                  <div className="w-full h-full rounded-[10px] bg-[var(--bg-card)] overflow-hidden flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle size={20} className="text-[var(--text-muted)]" />
                    )}
                  </div>
                </button>
             </div>
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="hidden sm:flex p-2 glass rounded-xl text-slate-500 hover:text-brand-green transition-all hover:scale-105 active:scale-95">
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
             </button>
             <div className="hidden sm:flex items-center gap-8 px-5 py-2 glass rounded-2xl">
               <div className="flex flex-col items-end">
                 <div className="flex items-center gap-1.5">
                   <ShieldAlert size={12} className="text-lab-cyan" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Privacidade LGPD</span>
                 </div>
                 <span className="text-[11px] font-black text-lab-cyan">ATIVO</span>
               </div>
               <div className="h-8 w-px bg-[var(--border-lab)]"></div>
               <div className="flex flex-col items-end">
                 <div className="flex items-center gap-1.5">
                   <Activity size={12} className="text-brand-green" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Saúde do Sistema</span>
                 </div>
                 <span className="text-[11px] font-black text-brand-green">OTIMIZADO</span>
               </div>
               <div className="h-8 w-px bg-[var(--border-lab)]"></div>
               <div className="flex flex-col items-end group relative">
                 <div className="flex items-center gap-1.5">
                   <Database size={12} className={supabaseStatus === "online" ? "text-brand-green" : "text-brand-orange"} />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nuvem</span>
                 </div>
                 <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`text-[11px] font-black flex items-center gap-1 hover:underline decoration-dotted ${
                    supabaseStatus === "online" ? "text-brand-green" : supabaseStatus === "offline" ? "text-brand-orange" : "text-slate-400"
                  }`}
                 >
                   {isSyncing ? "SINCRONIZANDO..." : supabaseStatus === "online" ? "ATIVO (SICRONIZAR)" : supabaseStatus === "offline" ? "OFFLINE" : "VERIFICANDO..."}
                   {isSyncing && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="size-2 border-t-2 border-brand-green rounded-full" />}
                 </button>
               </div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 custom-scrollbar">

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === "dashboard" && (
                <Dashboard records={records} onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === "inventory" && (
                <Inventory 
                  records={records} 
                  onEdit={handleEdit} 
                  onView={handleView} 
                  onDelete={handleDelete}
                  onAdd={() => {
                    setSelectedRecord(null);
                    setActiveTab("new");
                  }}
                  onRefresh={refreshRecords}
                />
              )}
              {activeTab === "chat" && (
                <Chat />
              )}
              {activeTab === "profile" && (
                <UserProfileView />
              )}
              {activeTab === "new" && (
                <RegistrationForm 
                  initialData={selectedRecord} 
                  onSave={handleSave} 
                  onCancel={() => setActiveTab("inventory")} 
                />
              )}
              {activeTab === "report" && (
                selectedRecord ? (
                  <ReportView 
                    record={selectedRecord} 
                    onBack={() => {
                      setSelectedRecord(null);
                      setActiveTab("report");
                    }} 
                  />
                ) : (
                  <div className="space-y-8 pb-20">
                    <div className="glass p-12 rounded-[2.5rem] border border-[var(--border-lab)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-lab-blue/5 blur-3xl rounded-full pointer-events-none"></div>
                      <div className="flex items-center gap-6 mb-12">
                        <div className="p-4 bg-lab-blue/10 border border-lab-blue/30 rounded-2xl shadow-sm">
                          <FileText className="text-lab-blue" size={28} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-[var(--text-bright)] tracking-tight">Módulo Central de Auditoria</h3>
                          <p className="text-sm text-[var(--text-muted)] mt-1">Selecione um registro para visualizar o relatório completo de conformidade e governança.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {records.map(record => (
                          <button
                            key={record.id}
                            onClick={() => setSelectedRecord(record)}
                            className="group flex flex-col p-6 bg-white/[0.02] border border-[var(--border-lab)] rounded-3xl hover:bg-black/5 dark:hover:bg-white/[0.04] hover:border-lab-cyan/30 transition-all text-left relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-lab-cyan/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                            <div className="flex justify-between items-start mb-6">
                              <span className="text-[10px] font-mono font-bold text-brand-green bg-brand-green/10 px-2 py-1 rounded border border-brand-green/20 uppercase tracking-tight">{record.id}</span>
                              <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-slate-500 group-hover:text-lab-cyan group-hover:bg-lab-cyan/10 transition-all border border-transparent group-hover:border-lab-cyan/20">
                                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                            <h4 className="font-bold text-[var(--text-bright)] text-lg tracking-tight mb-1 group-hover:text-lab-cyan transition-colors uppercase truncate">{record.nomeFerramenta}</h4>
                            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-tight truncate w-full flex items-center gap-2">
                              <Users size={12} className="opacity-50" /> {record.unidadeSetor}
                            </p>
                            
                            <div className="mt-8 pt-6 border-t border-[var(--border-lab)] flex justify-between items-center">
                              <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                                record.statusUso === StatusUso.APROVADO 
                                  ? "bg-brand-green/10 text-brand-green border-brand-green/20" 
                                  : "bg-brand-orange/10 text-brand-orange border-brand-orange/20"
                              }`}>
                                <div className={`size-1.5 rounded-full ${record.statusUso === StatusUso.APROVADO ? "bg-brand-green" : "bg-brand-orange"}`}></div>
                                {record.statusUso}
                              </div>
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">{record.dataRegistro}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      {records.length === 0 && (
                        <div className="py-32 text-center space-y-6">
                          <div className="inline-block p-6 bg-black/5 dark:bg-white/[0.02] rounded-full border border-[var(--border-lab)] relative">
                            <div className="absolute inset-0 bg-brand-green/5 blur-xl rounded-full"></div>
                            <ClipboardList className="text-[var(--text-muted)] relative z-10" size={40} />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[var(--text-muted)] font-bold text-base uppercase tracking-wide">Nenhum dado encontrado para auditoria</p>
                            <p className="text-sm text-[var(--text-muted)]">Aguardando novos registros para gerar relatórios de conformidade.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecordToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass p-8 rounded-[2rem] border border-lab-red/30 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-lab-red"></div>
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-4 bg-lab-red/10 border border-lab-red/20 rounded-2xl text-lab-red">
                  <AlertTriangle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[var(--text-bright)] uppercase tracking-tight">Confirmar Exclusão</h3>
                  <p className="text-sm text-[var(--text-muted)]">Você está prestes a excluir permanentemente este registro de IA. Esta ação não pode ser desfeita.</p>
                </div>
                <div className="flex gap-4 w-full pt-4">
                  <button 
                    onClick={() => setRecordToDelete(null)}
                    className="flex-1 px-6 py-4 glass hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-bright)] font-bold rounded-xl transition-all border border-[var(--border-lab)] uppercase text-xs tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-4 bg-lab-red hover:bg-lab-red/80 text-white font-bold rounded-xl transition-all shadow-lg shadow-lab-red/20 uppercase text-xs tracking-widest"
                  >
                    Excluir IA
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
