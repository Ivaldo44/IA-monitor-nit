import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ChatMessage, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Send, User, Hash, MoreVertical, MessageSquare, ShieldCheck, X, Briefcase, Building, Phone, Mail } from "lucide-react";

const ProfileModal: React.FC<{ profile: UserProfile; onClose: () => void }> = ({ profile, onClose }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
      onClick={e => e.stopPropagation()}
    >
      <div className="relative h-32 bg-gradient-to-br from-brand-green to-lab-cyan">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="px-6 pb-8 -mt-12">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-white border-4 border-white overflow-hidden shadow-lg mb-4 flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-slate-300" />
            )}
          </div>
          <div className="absolute bottom-6 right-0 w-5 h-5 bg-brand-green rounded-full border-4 border-white" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-1">{profile.full_name}</h2>
        <p className="text-lab-cyan font-bold text-sm mb-6 uppercase tracking-wider">Membro da Equipe Cedro</p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green">
              <Briefcase size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cargo</p>
              <p className="text-sm font-bold text-slate-700">{profile.cargo || "Não informado"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-lab-cyan/10 flex items-center justify-center text-lab-cyan">
              <Building size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Setor</p>
              <p className="text-sm font-bold text-slate-700">{profile.setor || "Não informado"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-lab-blue/10 flex items-center justify-center text-lab-blue">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Contato</p>
              <p className="text-sm font-bold text-slate-700">{profile.contato || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

export const Chat: React.FC = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cleanupOldMessages();
    fetchInitialData();
    
    // Real-time subscription - Escuta todas as mensagens relevantes
    const channel = supabase
      .channel("cedro-chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Logica para decidir se a mensagem deve aparecer na tela atual
          const isRelevant = 
            (!newMessage.is_private && activeTab === "public") || 
            (newMessage.is_private && activeTab === "private" && 
             ((newMessage.sender_id === user?.id && newMessage.recipient_id === selectedRecipient?.id) ||
              (newMessage.sender_id === selectedRecipient?.id && newMessage.recipient_id === user?.id)));

          if (!isRelevant) return;

          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            
            const knownSender = prev.find(m => m.sender_id === newMessage.sender_id)?.sender_profile;
            if (knownSender) {
              return [...prev, { ...newMessage, sender_profile: knownSender }];
            }

            fetchSenderProfile(newMessage.sender_id).then(profileData => {
              if (profileData) {
                setMessages(current => 
                  current.map(m => m.id === newMessage.id ? { ...m, sender_profile: profileData } : m)
                );
              }
            });

            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, selectedRecipient, user?.id]);

  const fetchInitialData = async () => {
    setLoading(true);
    await fetchUsers();
    await fetchMessages();
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", user?.id || "");
    setUsers(data || []);
  };

  const fetchMessages = async () => {
    try {
      let query = supabase
        .from("messages")
        .select("*, sender_profile: profiles!messages_sender_id_fkey (*)")
        .order("created_at", { ascending: true })
        .limit(100);

      if (activeTab === "public") {
        query = query.eq("is_private", false);
      } else if (selectedRecipient) {
        query = query.or(`and(sender_id.eq.${user?.id},recipient_id.eq.${selectedRecipient.id}),and(sender_id.eq.${selectedRecipient.id},recipient_id.eq.${user?.id})`);
      } else {
        setMessages([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Erro ao buscar mensagens:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSenderProfile = async (senderId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", senderId)
      .single();
    return data;
  };

  const cleanupOldMessages = async () => {
    try {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      await supabase.from("messages").delete().lt("created_at", yesterday.toISOString());
    } catch (err) {
      console.error("Erro na limpeza:", err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;
    if (activeTab === "private" && !selectedRecipient) return;

    const messageContent = newMessage.trim();
    setNewMessage("");

    const temporaryId = Math.random().toString(36).substring(7);
    const optimisticMessage: ChatMessage = {
      id: temporaryId,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      content: messageContent,
      is_private: activeTab === "private",
      recipient_id: selectedRecipient?.id,
      sender_profile: profile || undefined
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          content: messageContent,
          sender_id: user.id,
          is_private: activeTab === "private",
          recipient_id: selectedRecipient?.id
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setMessages(prev => prev.map(m => m.id === temporaryId ? { ...data, sender_profile: profile || undefined } : m));
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== temporaryId));
      setNewMessage(messageContent);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-160px)] flex gap-6 py-6 px-6">
      {/* Sidebar */}
      <div className="w-80 hidden lg:flex flex-col gap-4">
        <div className="glass border border-[var(--border-lab)] p-6 rounded-[32px] flex-1 overflow-y-auto">
          <h2 className="text-lg font-bold text-[var(--text-bright)] mb-6 flex items-center gap-2">
            <MessageSquare size={18} className="text-lab-cyan" />
            Canais Cedro
          </h2>
          
          <div className="space-y-2 mb-8">
            <button 
              onClick={() => { setActiveTab("public"); setSelectedRecipient(null); }}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                activeTab === "public" ? "bg-lab-cyan/10 text-lab-cyan border-lab-cyan/20 border" : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
              }`}
            >
              <Hash size={18} />
              <span className="font-bold text-sm">Canal Geral</span>
            </button>
          </div>

          <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 ml-2">Usuários Online</h3>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="group relative">
                <button 
                  onClick={() => { setActiveTab("private"); setSelectedRecipient(u); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    selectedRecipient?.id === u.id ? "bg-brand-green/10 text-brand-green border-brand-green/20 border" : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
                  }`}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-lab)] overflow-hidden flex items-center justify-center">
                      {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <User size={14} />}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-green rounded-full border-2 border-[var(--bg-main)]" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-bright)] truncate">{u.full_name}</p>
                    <p className="text-[9px] text-[var(--text-muted)] truncate">{u.setor || "Sem setor"}</p>
                  </div>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setViewingProfile(u); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-all text-[var(--text-muted)]"
                  title="Ver Perfil"
                >
                  <User size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col glass border border-[var(--border-lab)] rounded-[32px] overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b border-[var(--border-lab)] flex justify-between items-center bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${activeTab === "public" ? "bg-gradient-to-br from-brand-green to-lab-cyan" : "bg-gradient-to-br from-lab-blue to-lab-cyan"}`}>
              {activeTab === "public" ? <Hash className="text-white" size={24} /> : <ShieldCheck className="text-white" size={24} />}
            </div>
            <div>
              <h2 className="font-bold text-[var(--text-bright)]">
                {activeTab === "public" ? "Canal Geral" : `Conversa com ${selectedRecipient?.full_name}`}
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                  {activeTab === "public" ? "Espaço Colaborativo Cedro" : "Chat Criptografado de Ponta-a-Ponta"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lab-cyan" /></div>
          ) : activeTab === "private" && !selectedRecipient ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-4"><User className="text-[var(--text-muted)]" size={32} /></div>
              <h3 className="text-xl font-bold text-[var(--text-bright)] mb-2">Inicie uma conversa privada</h3>
              <p className="text-[var(--text-muted)] text-sm max-w-xs">Selecione um colega na barra lateral para trocar mensagens privadas e seguras.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex gap-4 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                  <button 
                    onClick={() => msg.sender_profile && setViewingProfile(msg.sender_profile)}
                    className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-lab)] overflow-hidden shrink-0 flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                  >
                    {msg.sender_profile?.avatar_url ? <img src={msg.sender_profile.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="text-[var(--text-muted)]" />}
                  </button>
                  <div className={`max-w-[70%] space-y-1 ${isOwn ? "text-right items-end" : "text-left items-start"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <button 
                         onClick={() => msg.sender_profile && setViewingProfile(msg.sender_profile)}
                         className="text-[11px] font-bold text-[var(--text-bright)] hover:text-lab-cyan transition-colors"
                      >
                        {msg.sender_profile?.full_name || "Membro Cedro"}
                      </button>
                      <span className="text-[9px] font-medium text-[var(--text-muted)]">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`p-4 rounded-[20px] text-sm leading-relaxed shadow-sm ${isOwn ? "bg-lab-cyan text-white rounded-tr-none" : "bg-white/5 dark:bg-white/10 text-[var(--text-bright)] border border-[var(--border-lab)] rounded-tl-none"}`}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="p-6">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3 p-2 pl-6 bg-black/5 dark:bg-white/5 border border-[var(--border-lab)] rounded-[24px] focus-within:border-lab-cyan/50 transition-all shadow-inner">
            <input
              type="text"
              placeholder={activeTab === "private" && !selectedRecipient ? "Selecione um usuário primeiro..." : "Digite sua mensagem..."}
              disabled={activeTab === "private" && !selectedRecipient}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-transparent py-4 outline-none text-sm text-[var(--text-bright)]"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim() || (activeTab === "private" && !selectedRecipient)}
              className="w-12 h-12 flex items-center justify-center bg-lab-cyan hover:bg-lab-blue text-white rounded-[18px] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale shadow-lg shadow-lab-cyan/20"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
      <AnimatePresence>
        {viewingProfile && (
          <ProfileModal 
            profile={viewingProfile} 
            onClose={() => setViewingProfile(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
