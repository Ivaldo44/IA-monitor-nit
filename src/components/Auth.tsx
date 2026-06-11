import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader2, Building, Briefcase, Phone } from "lucide-react";
import { getSectors } from "../storage";
import LabBackground from "./LabBackground";

interface AuthProps {
  onAuthSuccess?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [setor, setSetor] = useState("");
  const [cargo, setCargo] = useState("");
  const [cargosDisponiveis, setCargosDisponiveis] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getSectors().then(setSectors);
  }, []);

  useEffect(() => {
    if (!setor) {
      setCargosDisponiveis([]);
      setCargo("");
      return;
    }

    try {
      const rawDetails = localStorage.getItem("cedro_sectors_details_v2");
      if (rawDetails) {
        const details = JSON.parse(rawDetails);
        if (details[setor]?.cargos?.length > 0) {
          setCargosDisponiveis(details[setor].cargos);
          setCargo("");
          return;
        }
      }
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
    }

    const PRESET_CARGOS: Record<string, string[]> = {
      "NIT": ["Pesquisador de IA", "Analista de Inovação", "Gestor de Portfólio", "Engenheiro de Processos"],
      "TI": ["Analista de Suporte", "Administrador de Sistemas", "Desenvolvedor de Software", "Engenheiro de Dados"],
      "Marketing": ["Analista de Comunicação", "Designer Gráfico", "Especialista em SEO", "Social Media"],
      "Administrativo": ["Auxiliar Administrativo", "Assistente Financeiro", "Gerente de Operações", "Analista de Contratos"],
      "Jurídico": ["Advogado Integrado", "Assessor LGPD", "Consultor Regulatório", "Assistente Jurídico"],
      "Direção Técnica": ["Diretor Técnico", "Supervisor Analítico", "Responsável Técnico", "Auditor Médico"],
      "Qualidade": ["Gestor de Qualidade", "Analista de Qualidade", "Auditor de Processos", "Inspetor Sanitário"],
      "Atendimento / Recepção": ["Recepcionista", "Atendente Técnico", "Supervisor de Relacionamento", "Auxiliar de Caixa"],
      "Laboratório de Patologia": ["Médico Patologista", "Técnico em Histologia", "Citotécnico", "Auxiliar de Laboratório"],
      "Laboratório Central": ["Biomédico Palestrante", "Técnico em Análises Clínicas", "Farmacêutico Bioquímico", "Auxiliar de Coleta"]
    };
    setCargosDisponiveis(PRESET_CARGOS[setor] || ["Colaborador"]);
    setCargo("");
  }, [setor]);

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: cleanPassword 
        });
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess();
      } else {
        if (!setor) {
          setMessage({ type: "error", text: "Por favor, selecione seu setor." });
          setLoading(false);
          return;
        }
        if (!cargo.trim()) {
          setMessage({ type: "error", text: "Por favor, selecione seu cargo / função." });
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({ 
          email: cleanEmail, 
          password: cleanPassword,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        
        const userId = data.user?.id;

        if (!userId) {
          throw new Error("Usuário não retornado após cadastro.");
        }

        const { data: existingProfile, error: existingProfileError } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", userId)
          .maybeSingle();

        if (existingProfileError) {
          console.error("Erro ao verificar perfil existente:", existingProfileError);
          throw existingProfileError;
        }

        if (existingProfile) {
          const { error: updateProfileError } = await supabase
            .from("profiles")
            .update({
              full_name: fullName,
              setor: setor,
              cargo: cargo.trim(),
              updated_at: new Date().toISOString()
            })
            .eq("id", userId);

          if (updateProfileError) {
            console.error("Erro ao atualizar perfil existente:", updateProfileError);
            throw updateProfileError;
          }
        } else {
          const { error: insertProfileError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              full_name: fullName,
              setor: setor,
              cargo: cargo.trim(),
              role: "user",
              status: "Autorizado",
              updated_at: new Date().toISOString()
            });

          if (insertProfileError) {
            console.error("Erro ao criar perfil:", insertProfileError);
            throw insertProfileError;
          }
        }

        setMessage({ type: "success", text: "Cadastro realizado! Faça login para continuar." });
        setMode("login");
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Erro ao processar solicitação" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F6F8F5] overflow-y-auto lg:overflow-hidden font-sans">
      
      {/* COLUNA ESQUERDA (lg:w-1/2) — Painel institucional decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#003F1D] flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* LabBackground as decorative background with opacity-10 */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <LabBackground />
        </div>

        {/* Logo centralizada */}
        <div className="z-10 flex items-center justify-center">
          <img 
            src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" 
            alt="Cedro IA – Laboratório Cedro" 
            className="h-32 w-auto brightness-0 invert" 
          />
        </div>
      </div>

      {/* COLUNA DIREITA (lg:w-1/2) — Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center min-h-screen bg-white lg:bg-[#F6F8F5] lg:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border-0 lg:border border-[#E3E8E1] rounded-none lg:rounded-3xl shadow-none lg:shadow-xl p-6 lg:p-10 relative z-10"
        >
          {/* Top block */}
          <div className="mb-6 flex flex-col items-center lg:items-start">
            {/* Minimalist touch for mobile: show logo only on mobile to identify the brand, with dark filter, above the title */}
            <div className="block lg:hidden mb-6">
              <img 
                src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" 
                alt="Cedro IA – Laboratório Cedro" 
                className="h-20 w-auto [filter:var(--logo-filter)]" 
              />
            </div>
            <h2 className="text-2xl font-black text-[#1F2933] uppercase tracking-tight font-display text-center lg:text-left w-full font-bold">
              {mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
            </h2>
            <p className="text-xs text-[#667085] uppercase tracking-wider font-semibold mt-1 text-center lg:text-left w-full">
              {mode === "login" ? "Acesse sua conta institucional" : "Preencha seus dados para solicitar acesso"}
            </p>
            <div className="border-t border-[#E3E8E1] w-full mt-4" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-4"
                >
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#075618]" size={18} />
                    <input
                      type="text"
                      placeholder="Nome Completo"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-[#E3E8E1] rounded-2xl focus:border-[#075618] focus:ring-2 focus:ring-[#075618]/5 outline-none transition-all text-sm text-[#1F2933] font-semibold shadow-sm"
                    />
                  </div>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-[#075618] pointer-events-none" size={18} />
                    <select
                      required
                      value={setor}
                      onChange={(e) => setSetor(e.target.value)}
                      className="w-full pl-12 pr-10 py-4 bg-white border border-[#E3E8E1] rounded-2xl focus:border-[#075618] focus:ring-2 focus:ring-[#075618]/5 outline-none transition-all text-sm text-[#1F2933] font-semibold shadow-sm appearance-none"
                    >
                      <option value="">Selecione seu setor *</option>
                      {sectors.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-[#075618] pointer-events-none" size={18} />
                    <select
                      required
                      disabled={!setor}
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full pl-12 pr-10 py-4 bg-white disabled:bg-slate-50 border border-[#E3E8E1] rounded-2xl focus:border-[#075618] focus:ring-2 focus:ring-[#075618]/5 outline-none transition-all text-sm text-[#1F2933] font-semibold shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">{setor ? "Selecione seu cargo / função *" : "Selecione o setor primeiro"}</option>
                      {cargosDisponiveis.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#075618]" size={18} />
              <input
                type="email"
                placeholder="E-mail profissional"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-[#E3E8E1] rounded-2xl focus:border-[#075618] focus:ring-2 focus:ring-[#075618]/5 outline-none transition-all text-sm text-[#1F2933] font-semibold shadow-sm"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#075618]" size={18} />
              <input
                type="password"
                placeholder="Senha"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-[#E3E8E1] rounded-2xl focus:border-[#075618] focus:ring-2 focus:ring-[#075618]/5 outline-none transition-all text-sm text-[#1F2933] font-semibold shadow-sm"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-xs font-medium ${
                message.type === "success" ? "bg-[#EAF4EC] text-[#075618]" : "bg-red-50 text-red-500 border border-red-100"
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#03440c] hover:bg-[#075618] text-white font-black rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-50 uppercase tracking-widest text-xs shadow-md shadow-[#03440c]/20 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {mode === "login" ? "Entrar na plataforma" : "Criar minha conta"}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[#667085] text-sm font-semibold">
              {mode === "login" ? "Ainda não tem acesso?" : "Já possui uma conta?"}
              <button
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(null); }}
                className="ml-2 text-[#075618] font-bold hover:underline cursor-pointer"
              >
                {mode === "login" ? "Cadastre-se" : "Faça Login"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>

    </div>
  );
};
