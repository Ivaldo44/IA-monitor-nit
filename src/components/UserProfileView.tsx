import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Mail, 
  Briefcase, 
  Building, 
  Phone, 
  Save, 
  Loader2, 
  Camera, 
  LogOut, 
  ShieldCheck, 
  ChevronRight, 
  Calendar, 
  Lock, 
  Key, 
  Info, 
  AppWindow, 
  Sparkles,
  CheckCircle2,
  X
} from "lucide-react";
import { getSectors } from "../storage";

export const UserProfileView: React.FC = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    cargo: "",
    setor: "",
    contato: "",
    avatar_url: ""
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);

  // Password alteration modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchSectors = async () => {
      const list = await getSectors();
      setSectors(list);
    };
    fetchSectors();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        cargo: profile.cargo || "",
        setor: profile.setor || "",
        contato: profile.contato || "",
        avatar_url: profile.avatar_url || ""
      });
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage(null);

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("Você deve selecionar uma imagem para fazer o upload.");
      }

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `user-avatars/${fileName}`;

      // Upload file to storage budget 'avatars'
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Fetch public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      setMessage({ type: "success", text: "Foto carregada! Não esqueça de salvar as alterações para concluir." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Erro no upload da foto" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          ...formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      await refreshProfile();
      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Erro ao atualizar perfil" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "As senhas informadas não coincidem." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "A nova senha deve possuir pelo menos 6 caracteres." });
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      setPasswordMessage({ type: "success", text: "Senha corporativa atualizada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordMessage(null);
      }, 2500);
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err.message || "Erro ao atualizar senha." });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Human readable registration date
  const formattedCreatedDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : "Março de 2026";

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 md:px-8 select-none bg-slate-50/25 rounded-[2.5rem]">
      {/* 4. BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6 bg-white/65 p-2 px-4 rounded-full border border-slate-100 w-fit shadow-xs">
        <span className="hover:text-[#00d136] transition-colors cursor-pointer flex items-center gap-1">Início</span>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-slate-700 font-bold">Meu Perfil</span>
      </div>

      <div className="space-y-8">
        {/* 5. CARD HERO DO PERFIL */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
        >
          {/* Subtle design waves abstract decoration on the right side */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none md:block hidden">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-slate-500">
              <path d="M10,0 C30,40 50,20 70,60 C80,80 90,90 100,100 L100,0 Z" />
            </svg>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 z-10 w-full">
            {/* Avatar container with aro verde and Camera Overlay */}
            <div className="relative shrink-0">
              <div className="size-28 md:size-32 rounded-full p-1 bg-gradient-to-tr from-[#00d136] via-[#053d10] to-emerald-400 shadow-lg relative">
                <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center p-0.5 border border-white">
                  {uploading ? (
                    <Loader2 className="animate-spin text-emerald-500 w-8 h-8" />
                  ) : formData.avatar_url ? (
                    <img 
                      src={formData.avatar_url} 
                      alt="Avatar Usuário" 
                      className="w-full h-full object-cover rounded-full" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={48} className="text-slate-300" />
                  )}
                </div>
              </div>
              <label 
                htmlFor="avatar-upload-hero"
                className="absolute bottom-0.5 right-0.5 p-2 bg-[#00d136] hover:bg-emerald-600 border border-white text-white rounded-full shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Modificar imagem"
              >
                <Camera size={14} />
                <input 
                  id="avatar-upload-hero"
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* User Meta Information Group */}
            <div className="text-center md:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2.5">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                  {formData.full_name || user?.email?.split("@")[0] || "Membro Cedro"}
                </h2>
                <span className="w-fit self-center px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest leading-none shadow-sm select-none">
                  {profile?.role === "admin" ? "Administrador" : "Colaborador"}
                </span>
                <span className="w-fit self-center px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest leading-none shadow-sm select-none">
                  Ativo
                </span>
              </div>
              
              <p className="text-sm font-bold text-slate-500 flex items-center justify-center md:justify-start gap-1">
                <Briefcase size={14} className="text-[#00d136] shrink-0" />
                {formData.cargo || "Função corporativa não declarada"}
              </p>
              
              <div className="h-px bg-slate-100 max-w-[280px] mx-auto md:mx-0 py-0.5"></div>
              
              <p className="text-xs text-slate-400 font-medium max-w-lg leading-relaxed">
                Setor: <span className="font-bold text-slate-600">{formData.setor || "Geral"}</span> • Integrante credenciado para operações e auditoria no sistema inteligente do Laboratório Cedro.
              </p>
            </div>
          </div>

          {/* Sair da Conta Button right-aligned with red outline styling */}
          <div className="z-10 shrink-0 md:self-center w-full md:w-auto">
            <button 
              onClick={() => signOut()}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/15 rounded-2xl active:scale-95 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer shadow-2xs shrink-0"
            >
              <LogOut size={14} />
              Sair da Conta
            </button>
          </div>
        </motion.div>

        {/* COMPOSIÇÃO DE DUAS COLUNAS ABAIXO DO HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA: CARDS MENORES */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* CARD 1: RESUMO DO PERFIL */}
            <motion.div 
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 md:p-7 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-4.5 pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 text-[#00d136] rounded-xl border border-emerald-500/10">
                  <Info size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Resumos do Perfil</h4>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Histórico e segurança cadastral</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Usuário desde row */}
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 shrink-0">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Usuário Desde</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{formattedCreatedDate}</p>
                  </div>
                </div>

                {/* Último acesso row */}
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 shrink-0">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Autorização de Acesso</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">Sessão estabelecida e ativa</p>
                  </div>
                </div>

                {/* Status da conta row */}
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Status da Conta</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-emerald-600">Ativa / Operável</span>
                    </div>
                  </div>
                </div>

                {/* Permissões row */}
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 shrink-0">
                    <ShieldCheck size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Nível Administrativo</p>
                    <p className="text-xs font-black text-slate-700 uppercase mt-0.5">
                      {profile?.role === "admin" ? "Acesso Geral / Root" : "Acesso de Colaborador"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CARD 2: SEGURANÇA DA CONTA */}
            <motion.div 
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 md:p-7 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4.5 pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 text-[#00d136] rounded-xl border border-emerald-500/10">
                  <Key size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Segurança da Conta</h4>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Ambiente altamente restrito</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Mantenha suas credenciais protegidas contra terceiros. Altere sua senha corporativa em caso de suspeitas ou auditorias periódicas.
                </p>
                
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full py-3 bg-white hover:bg-emerald-50/25 border-2 border-emerald-500/20 hover:border-emerald-500 text-emerald-600 text-xs font-extrabold uppercase tracking-widest rounded-2xl transition-all duration-300 cursor-pointer text-center select-none shadow-xs"
                >
                  Alterar Senha do Perfil
                </button>
              </div>
            </motion.div>

          </div>

          {/* COLUNA DIREITA: CARD GRANDE DE INFORMAÇÕES PESSOAIS */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm relative"
            >
              <div className="mb-6 pb-5 border-b border-slate-100 select-none">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Informações Pessoais</h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Atualize seus dados pessoais e de contato</p>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Nome Completo field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 select-none flex items-center gap-1">
                      <User size={12} className="text-[#00d136]" /> Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-5 py-4 bg-white border border-slate-200/80 rounded-2xl focus:border-[#00d136] focus:ring-4 focus:ring-[#00d136]/5 outline-none transition-all text-sm text-slate-700 font-bold shadow-2xs"
                      placeholder="Ex: Carlos Ferreira"
                    />
                  </div>

                  {/* Cargo field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 select-none flex items-center gap-1">
                      <Briefcase size={12} className="text-[#00d136]" /> Cargo / Função
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                      className="w-full px-5 py-4 bg-white border border-slate-200/80 rounded-2xl focus:border-[#00d136] focus:ring-4 focus:ring-[#00d136]/5 outline-none transition-all text-sm text-slate-700 font-bold shadow-2xs"
                      placeholder="Ex: Farmacêutico Coordenador"
                    />
                  </div>

                  {/* Setor de atuação field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 select-none flex items-center gap-1">
                      <Building size={12} className="text-[#00d136]" /> Setor de Atuação
                    </label>
                    <div className="relative">
                      {profile?.role === "admin" ? (
                        <>
                          <select
                            value={formData.setor}
                            onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                            className="w-full pl-5 pr-12 py-4 bg-white border border-slate-200/80 rounded-2xl focus:border-[#00d136] focus:ring-4 focus:ring-[#00d136]/5 outline-none transition-all text-sm appearance-none cursor-pointer text-slate-700 font-bold shadow-2xs"
                          >
                            <option value="">Selecione um departamento...</option>
                            {sectors.map((sec) => (
                              <option key={sec} value={sec}>{sec}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="size-4 fill-current opacity-70" viewBox="0 0 20 20">
                              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                          </div>
                        </>
                      ) : (
                        <input
                          type="text"
                          value={formData.setor}
                          disabled
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-400 font-medium cursor-not-allowed select-none"
                          placeholder="Departamento Restrito"
                        />
                      )}
                    </div>
                  </div>

                  {/* Contato Ramal field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 select-none flex items-center gap-1">
                      <Phone size={12} className="text-[#00d136]" /> Contato / Ramal
                    </label>
                    <input
                      type="text"
                      value={formData.contato}
                      onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                      className="w-full px-5 py-4 bg-white border border-slate-200/80 rounded-2xl focus:border-[#00d136] focus:ring-4 focus:ring-[#00d136]/5 outline-none transition-all text-sm text-slate-700 font-bold shadow-2xs"
                      placeholder="Ex: (21) 99999-9999"
                    />
                  </div>

                  {/* E-mail (Disabled, informational only) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 select-none flex items-center gap-1">
                      <Mail size={12} className="text-[#00d136]" /> E-mail Credenciado
                    </label>
                    <input
                      type="text"
                      value={user?.email || ""}
                      disabled
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-400 font-medium cursor-not-allowed select-none"
                    />
                  </div>

                  {/* URL da foto de perfil field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 select-none flex items-center gap-1">
                      <Camera size={12} className="text-[#00d136]" /> URL da foto de perfil
                    </label>
                    <input
                      type="url"
                      value={formData.avatar_url}
                      onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                      className="w-full px-5 py-4 bg-white border border-slate-200/80 rounded-2xl focus:border-[#00d136] focus:ring-4 focus:ring-[#00d136]/5 outline-none transition-all text-sm text-slate-700 font-bold shadow-2xs"
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                  </div>

                </div>

                {/* Feedback message display */}
                {message && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl text-xs font-bold border leading-relaxed ${
                      message.type === "success" 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                        : "bg-rose-50 border-rose-100 text-rose-700"
                    }`}
                  >
                    {message.text}
                  </motion.div>
                )}

                {/* Submit button using custom corporate green gradient */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4.5 bg-gradient-to-r from-[#075618] via-[#00d136] to-[#044413] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-md hover:shadow-lg active:scale-[0.985] hover:brightness-[1.10] hover:scale-[1.005] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <Loader2 className="animate-spin text-white" size={18} />
                  ) : (
                    <>
                      <Save size={18} />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>

        </div>
      </div>

      {/* DIALOG/MODAL COMPLETO DE ALTAREÇÃO DE SENHA CORPORATIVA */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop layer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 w-full max-w-md relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-50 text-[#00d136] rounded-2xl shrink-0 border border-emerald-100">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Alterar Senha</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Garanta a segurança de seus acessos</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nova Senha Corporativa</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-2xl focus:border-[#00d136] focus:ring-4 focus:ring-[#00d136]/5 outline-none transition-all text-sm text-slate-700 font-semibold shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar nova senha"
                    className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-2xl focus:border-[#00d136] focus:ring-4 focus:ring-[#00d136]/5 outline-none transition-all text-sm text-slate-700 font-semibold shadow-2xs"
                  />
                </div>

                {passwordMessage && (
                  <div className={`p-4 rounded-2xl text-xs font-bold leading-relaxed border ${
                    passwordMessage.type === "success" 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                      : "bg-rose-50 border-rose-100 text-rose-700"
                  }`}>
                    {passwordMessage.text}
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-5 py-3 border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={passwordLoading}
                    className="px-6 py-3 bg-gradient-to-r from-[#075618] to-[#00d136] text-white rounded-2xl hover:brightness-110 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {passwordLoading ? (
                      <Loader2 className="animate-spin text-white" size={14} />
                    ) : (
                      "Confirmar Nova Senha"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
