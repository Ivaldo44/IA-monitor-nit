import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ChatMessage, UserProfile } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, User, Hash, MoreVertical, MessageSquare, ShieldCheck, X, 
  Briefcase, Building, Mail, Search, Filter, Plus, ArrowLeft, 
  Paperclip, Smile, Star, CheckCheck, Check, ChevronLeft, Info, HelpCircle,
  FileText, Download
} from "lucide-react";

const SUGGESTED_EMOJIS = ["😀", "😄", "👍", "👏", "🙏", "✅", "⚠️", "📌", "💬", "📎"];

// Avatar do Usuário customizado, seguro contra falhas e compatível com Supabase
const ChatAvatar: React.FC<{
  avatarUrl?: string | null;
  fullName?: string;
  sizeClassName?: string;
  textClassName?: string;
  className?: string;
}> = ({ avatarUrl, fullName, sizeClassName = "size-9", textClassName = "text-xs", className = "" }) => {
  const [hasError, setHasError] = useState(false);

  // Geração de iniciais a partir de full_name ou correspondente
  const initials = useMemo(() => {
    if (!fullName) return "IA";
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "IA";
    return parts.map(p => p[0]).join("").substring(0, 2).toUpperCase();
  }, [fullName]);

  // Resetar falha quando o avatar_url for atualizado
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const hasPhoto = avatarUrl && avatarUrl.trim() !== "" && !hasError;

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold uppercase shrink-0 overflow-hidden text-center select-none ${sizeClassName} ${
        hasPhoto
          ? "bg-slate-50 border border-slate-200"
          : "bg-emerald-50 text-[#075618] border border-emerald-100/60"
      } ${className}`}
    >
      {hasPhoto ? (
        <img
          src={avatarUrl}
          alt={fullName || "Avatar"}
          className="w-full h-full object-cover rounded-full animate-fade-in"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className={`font-black tracking-tight select-none ${textClassName}`}>
          {initials}
        </span>
      )}
    </div>
  );
};

// Modal para visualização detalhada do perfil do profissional
const ProfileModal: React.FC<{ profile: UserProfile; onClose: () => void }> = ({ profile, onClose }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div 
      initial={{ scale: 0.95, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: 10 }}
      className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-200"
      onClick={e => e.stopPropagation()}
    >
      <div className="relative h-28 bg-[#075618]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-black/10 hover:bg-black/20 text-white rounded-lg transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="px-6 pb-8 -mt-12 text-center">
        <div className="relative inline-block mb-4">
          <ChatAvatar 
            avatarUrl={profile.avatar_url} 
            fullName={profile.full_name} 
            sizeClassName="w-24 h-24" 
            textClassName="text-2xl"
            className="border-4 border-white shadow-md mx-auto"
          />
        </div>

        <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">{profile.full_name}</h2>
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full mb-6">
          <ShieldCheck size={11} className="text-emerald-700" />
          <p className="text-emerald-800 font-extrabold text-[9px] uppercase tracking-wider">Membro Cedro</p>
        </div>

        <div className="space-y-3 text-left">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Cargo</p>
              <p className="text-xs font-bold text-slate-700 uppercase">{profile.cargo || "Não informado"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Building size={16} />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Setor de Atuação</p>
              <p className="text-xs font-bold text-slate-700 uppercase">{profile.setor || "Não informado"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Contato / Email</p>
              <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{profile.contato || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

export const Chat: React.FC = () => {
  const { user, profile } = useAuth();
  
  // States reais do bando de dados do Supabase
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [lastMessagesMap, setLastMessagesMap] = useState<Record<string, ChatMessage>>({});
  
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Conversa ativa selecionada (representa o ID do usuário real de profiles)
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [listFilter, setListFilter] = useState<"all" | "unread" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Busca na conversa ativa
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  
  // Controle de arquivos e emojis
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [uiError, setUiError] = useState("");
  const [uploading, setUploading] = useState(false);

  // Modais de ações adicionais
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  
  // Controle local de favoritos
  const [favorites, setFavorites] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Setup de datas amigáveis
  const isSameDay = (d1Str: string, d2Str: string) => {
    try {
      const d1 = new Date(d1Str);
      const d2 = new Date(d2Str);
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    } catch {
      return false;
    }
  };

  const getFriendlyDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) {
        return "Hoje";
      }
      if (d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) {
        return "Ontem";
      }
      
      const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
    } catch {
      return "Data Indeterminada";
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  // Carregar usuários reais da tabela profiles
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id || "");
      
      if (!error && data) {
        let filtered = data || [];
        
        // Regra de permissões com base no cargo/setor
        const isCurrentUserAdmin = profile?.role?.toLowerCase().trim() === "admin";
        if (!isCurrentUserAdmin) {
          const userSector = profile?.setor?.toLowerCase().trim();
          filtered = filtered.filter(u => {
            const isUserAdmin = u.role?.toLowerCase().trim() === "admin";
            const isSameSector = u.setor && userSector && u.setor.toLowerCase().trim() === userSector;
            return isUserAdmin || isSameSector;
          });
        }
        setUsers(filtered);
      }
    } catch (e) {
      console.error("Falha ao carregar perfis reais de usuários para o Chat:", e);
    }
  };

  // Carregar mensagens reais entre o usuário logado e o usuário selecionado
  const fetchRealtimeMessages = async () => {
    if (!selectedConvId || !user?.id) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      console.log("Carregando mensagens para a conversa:", selectedConvId);
      let data = null;
      let error = null;

      // 1. Tentar a consulta .or() combinada padrão do PostgREST
      try {
        const res = await supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedConvId}),and(sender_id.eq.${selectedConvId},recipient_id.eq.${user.id})`)
          .order("created_at", { ascending: true })
          .limit(150);
        data = res.data;
        error = res.error;
      } catch (orErr) {
        console.warn("Falha de parser na query .or() combinada, usando manual...", orErr);
      }

      // 2. Se falhar ou do banco retornar erro, usar busca por consultas separadas (absolutamente imune a falhas)
      if (error || !data) {
        console.log("Buscando mensagens separadamente para máxima compatibilidade...");
        const [sentRes, recvRes] = await Promise.all([
          supabase
            .from("messages")
            .select("*")
            .eq("sender_id", user.id)
            .eq("recipient_id", selectedConvId)
            .limit(100),
          supabase
            .from("messages")
            .select("*")
            .eq("sender_id", selectedConvId)
            .eq("recipient_id", user.id)
            .limit(100)
        ]);

        if (sentRes.error) {
          console.error("Erro na busca de enviadas:", sentRes.error);
        }
        if (recvRes.error) {
          console.error("Erro na busca de recebidas:", recvRes.error);
        }

        const combined = [...(sentRes.data || []), ...(recvRes.data || [])];
        combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        data = combined;
        error = null;
      }

      console.log("Mensagens carregadas do Supabase:", data);

      if (data) {
        const enriched = data.map((msg: any) => {
          let senderProfile = null;
          if (msg.sender_id === user.id) {
            senderProfile = profile;
          } else {
            senderProfile = users.find(u => u.id === msg.sender_id) || null;
          }
          return {
            ...msg,
            sender_profile: senderProfile
          };
        });
        setMessages(enriched);
      }
    } catch (err) {
      console.error("Erro fatal ao carregar mensagens reais do Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar as últimas mensagens de todas as conversas para as prévias na sidebar
  const fetchAllLastMessages = async () => {
    if (!user?.id) return;
    try {
      let data = null;
      let error = null;

      try {
        const res = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false });
        data = res.data;
        error = res.error;
      } catch (orErr) {
        console.warn("Falha no .or de busca das últimas mensagens:", orErr);
      }

      if (error || !data) {
        const [sentRes, recvRes] = await Promise.all([
          supabase
            .from("messages")
            .select("*")
            .eq("sender_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("messages")
            .select("*")
            .eq("recipient_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100)
        ]);

        const combined = [...(sentRes.data || []), ...(recvRes.data || [])];
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        data = combined;
        error = null;
      }

      if (data) {
        const lastMsgs: Record<string, ChatMessage> = {};
        data.forEach((msg: ChatMessage) => {
          const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
          if (partnerId && !lastMsgs[partnerId]) {
            lastMsgs[partnerId] = msg;
          }
        });
        setLastMessagesMap(lastMsgs);
      }
    } catch (err) {
      console.error("Erro ao carregar mapa de conversas com últimas mensagens:", err);
    }
  };

  // Atualizar tudo ao start ou mudar de usuário
  useEffect(() => {
    fetchUsers();
    fetchAllLastMessages();
  }, [user?.id, profile]);

  useEffect(() => {
    if (selectedConvId) {
      fetchRealtimeMessages();
    } else {
      setMessages([]);
    }
  }, [selectedConvId, user?.id]);

  // Integração em tempo real com o canal do Supabase
  useEffect(() => {
    if (!user?.id) return;

    const messageChannel = supabase
      .channel("chat-realtime-cedro")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const insertMsg = payload.new as ChatMessage;
          const isRelatedToMe = insertMsg.sender_id === user.id || insertMsg.recipient_id === user.id;

          if (isRelatedToMe) {
            // Atualiza mapa de últimas mensagens
            const partnerId = insertMsg.sender_id === user.id ? insertMsg.recipient_id : insertMsg.sender_id;
            if (partnerId) {
              setLastMessagesMap(prev => ({
                ...prev,
                [partnerId]: insertMsg
              }));
            }

            // Se for do chat ativamente aberto, adiciona na lista
            const isForOpenChat = 
              (insertMsg.sender_id === user.id && insertMsg.recipient_id === selectedConvId) ||
              (insertMsg.sender_id === selectedConvId && insertMsg.recipient_id === user.id);

            if (isForOpenChat) {
              let senderProfile = null;
              if (insertMsg.sender_id === user.id) {
                senderProfile = profile;
              } else {
                senderProfile = users.find(u => u.id === insertMsg.sender_id) || null;
              }
              const enrichedMsg = {
                ...insertMsg,
                sender_profile: senderProfile
              };

              setMessages(prev => {
                if (prev.some(m => m.id === enrichedMsg.id)) return prev;
                return [...prev, enrichedMsg].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [selectedConvId, user?.id]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedConvId]);

  // Recipiente ativo
  const selectedRecipient = useMemo(() => {
    if (!selectedConvId) return null;
    return users.find(u => u.id === selectedConvId) || null;
  }, [selectedConvId, users]);

  // Lista de conversas computadas baseadas apenas nos profissionais do sistema
  const computedConversations = useMemo(() => {
    return users.map(u => {
      const lastMsgObj = lastMessagesMap[u.id];
      const hasAttachment = lastMsgObj?.attachment_url;
      const lastMsgText = lastMsgObj 
        ? (lastMsgObj.content || (hasAttachment ? "📎 Arquivo Anexo" : "")) 
        : "Nenhuma mensagem ainda. Inicie a conversa.";

      const lastMsgTime = lastMsgObj 
        ? formatMessageTime(lastMsgObj.created_at) 
        : "";

      return {
        id: u.id,
        name: u.full_name || "Sem Nome",
        subtitle: `${u.setor || "Sem setor"} • ${u.cargo || "Profissional"}`,
        lastMessage: lastMsgText || "",
        time: lastMsgTime || "",
        favorite: favorites.includes(u.id),
        unreadCount: 0,
        profile: u
      };
    });
  }, [users, lastMessagesMap, favorites]);

  // Filtragem e busca de conversas na aba de conversas
  const filteredConversations = useMemo(() => {
    return computedConversations.filter(c => {
      const nameStr = c.name || "";
      const subtitleStr = c.subtitle || "";
      const lastMsgStr = c.lastMessage || "";
      const queryStr = searchQuery || "";

      const matchesSearch = 
        nameStr.toLowerCase().includes(queryStr.toLowerCase()) ||
        subtitleStr.toLowerCase().includes(queryStr.toLowerCase()) ||
        lastMsgStr.toLowerCase().includes(queryStr.toLowerCase());
      
      if (!matchesSearch) return false;

      if (listFilter === "all") return true;
      if (listFilter === "favorites") return !!c.favorite;
      return true;
    });
  }, [computedConversations, searchQuery, listFilter]);

  // Manuseio de anexação de arquivos
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Bloquear arquivos com mais de 10MB
    if (file.size > 10 * 1024 * 1024) {
      setUiError("O arquivo selecionado é muito grande. O limite máximo permitido é 10MB.");
      setTimeout(() => setUiError(""), 5000);
      return;
    }

    // Bloquear arquivos inseguros
    const unsafeExtensions = ["exe", "bat", "cmd", "sh", "js", "vbs"];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt && unsafeExtensions.includes(fileExt)) {
      setUiError("Este tipo de arquivo não é permitido por motivos de segurança do laboratório.");
      setTimeout(() => setUiError(""), 5000);
      return;
    }

    setSelectedFile(file);
    setUiError("");
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Seletor de emoji funcional
  const handleEmojiClick = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setNewMessage(prev => prev + emoji);
      return;
    }

    const start = input.selectionStart ?? newMessage.length;
    const end = input.selectionEnd ?? newMessage.length;
    const text = newMessage;
    const nextText = text.substring(0, start) + emoji + text.substring(end);
    setNewMessage(nextText);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);

    setIsEmojiOpen(false);
  };

  // Enviar mensagem real e anexos via Storage
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    if (!user?.id) {
      setUiError("Você precisa estar autenticado para enviar mensagens.");
      return;
    }

    if (!selectedConvId) {
      setUiError("Selecione um profissional para conversar.");
      return;
    }

    const textToSend = newMessage.trim();
    const fileToUpload = selectedFile;

    // 1. Validar anexo antes de prosseguir
    if (fileToUpload) {
      const allowedExts = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "txt"];
      const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !allowedExts.includes(fileExt)) {
        setUiError("Tipo de arquivo não permitido.");
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10 MB
      if (fileToUpload.size > maxSize) {
        setUiError("O arquivo excede o tamanho máximo permitido de 10 MB.");
        return;
      }
    }

    setUiError("");

    // 2. Criar mensagem otimista temporária imediatamente
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatMessage = {
      id: tempId,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      content: textToSend || `Anexou arquivo: ${fileToUpload ? fileToUpload.name : ""}`,
      is_private: true,
      recipient_id: selectedConvId,
      sender_profile: profile || undefined,
      status: "sending"
    };

    if (fileToUpload) {
      tempMessage.attachment_name = fileToUpload.name;
      tempMessage.attachment_size = fileToUpload.size;
      tempMessage.attachment_type = fileToUpload.type;
    }

    // Inserir localmente instantaneamente!
    setMessages(prev => [...prev, tempMessage]);

    // Atualizar mapa de última mensagem instantaneamente na sidebar
    setLastMessagesMap(prev => ({
      ...prev,
      [selectedConvId]: tempMessage
    }));

    // Limpar estados na hora para melhorar a responsividade
    setNewMessage("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    let attachment_url = "";
    let attachment_name = "";
    let attachment_type = "";
    let attachment_size = 0;
    let uploadFailed = false;

    if (fileToUpload) {
      setUploading(true);
      try {
        const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase();
        const fileName = `${Math.random().toString(36).substring(2, 11)}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Tenta fazer o upload para o bucket chat-attachments
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, fileToUpload);

        if (uploadError) {
          throw uploadError;
        }

        if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from("chat-attachments")
            .getPublicUrl(filePath);

          attachment_url = publicUrlData.publicUrl;
          attachment_name = fileToUpload.name;
          attachment_type = fileToUpload.type;
          attachment_size = fileToUpload.size;
        }
      } catch (storageErr: any) {
        console.error("Falha ao realizar o upload:", storageErr);
        uploadFailed = true;
        setUiError("Bucket de anexos não configurado. Crie o bucket chat-attachments no Supabase Storage.");
        
        // Se NÃO há texto digitado, não dá para enviar nada no banco. Restauramos e interrompemos.
        if (!textToSend) {
          setUploading(false);
          setNewMessage(textToSend);
          setSelectedFile(fileToUpload);
          setMessages(prev => prev.filter(m => m.id !== tempId));
          return;
        }
      } finally {
        setUploading(false);
      }
    }

    try {
      const payload: any = {
        content: textToSend || `Anexou arquivo: ${attachment_name}`,
        sender_id: user.id,
        is_private: true,
        recipient_id: selectedConvId,
        attachment_url: uploadFailed ? null : (attachment_url || null),
        attachment_name: uploadFailed ? null : (attachment_name || null),
        attachment_type: uploadFailed ? null : (attachment_type || null),
        attachment_size: uploadFailed ? null : (attachment_size || null)
      };

      console.log("Enviando mensagem:", payload);

      let insertData = null;
      let insertError = null;

      // 1. Tentar inserção completa com suporte a anexo
      const res1 = await supabase
        .from("messages")
        .insert(payload)
        .select()
        .single();
      
      insertData = res1.data;
      insertError = res1.error;

      // 2. Se der erro por falta de colunas (anexos ausentes na tabela do Supabase legado)
      if (insertError && (insertError.code === "42703" || insertError.message?.includes("attachment") || insertError.message?.includes("column"))) {
        console.warn("Tabela remote 'messages' não suporta anexos ainda. Tentando persistência com fallback básico de texto.");
        
        let fallbackText = textToSend;
        if (attachment_url && !uploadFailed) {
          fallbackText = (textToSend ? textToSend + "\n\n" : "") + `📎 Arquivo Anexo: [${attachment_name}](${attachment_url})`;
        }

        const basicPayload = {
          content: fallbackText || "📎 Anexo enviado",
          sender_id: user.id,
          is_private: true,
          recipient_id: selectedConvId
        };

        const res2 = await supabase
          .from("messages")
          .insert(basicPayload)
          .select()
          .single();
        
        insertData = res2.data;
        insertError = res2.error;
      }

      if (insertError) {
        console.error("Erro ao salvar mensagem no Supabase:", insertError);
        setUiError(`Erro ao enviar mensagem: ${insertError.message || insertError.details || "Código do banco: " + insertError.code}`);
        
        // Marcar mensagem local temporária como erro
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error" } : m));
        // Restaurar para que o usuário possa tentar novamente
        setNewMessage(textToSend);
        setSelectedFile(fileToUpload);
        return;
      }

      if (insertData) {
        console.log("Mensagem salva com sucesso:", insertData);

        const enrichedInsert = {
          ...insertData,
          sender_profile: profile
        };

        // Substituir a mensagem temporária local pela real retornada pelo Supabase!
        setMessages(prev => {
          return prev.map(m => m.id === tempId ? enrichedInsert : m);
        });

        // Atualizar listagem de prévias lateral
        fetchAllLastMessages();
      }
    } catch (dbErr: any) {
      console.error("Erro fatal ao processar envio de mensagem:", dbErr);
      setUiError(`Erro ao processar envio: ${dbErr.message || dbErr}`);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error" } : m));
      setNewMessage(textToSend);
      setSelectedFile(fileToUpload);
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  // Filtragem de palavras chave internamente no chat ativado
  const highlightTerm = (text: string = "", term: string) => {
    if (!text) return "";
    if (!term) return text;
    const parts = text.split(new RegExp(`(${term})`, "gi"));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() 
            ? <span key={i} className="bg-yellow-100 text-slate-800 px-0.5 rounded font-extrabold">{part}</span> 
            : part
        )}
      </>
    );
  };

  const activeMessagesToShow = useMemo(() => {
    let result = messages;
    if (chatSearchOpen && chatSearchQuery.trim()) {
      const query = chatSearchQuery.toLowerCase();
      result = result.filter(m => (m.content || "").toLowerCase().includes(query));
    }
    return result;
  }, [messages, chatSearchOpen, chatSearchQuery]);

  // Lista para nova conversa (modal busca em profiles reais)
  const modalUsersRoster = useMemo(() => {
    if (newChatSearch.trim()) {
      return users.filter(u => 
        u.full_name?.toLowerCase().includes(newChatSearch.toLowerCase()) ||
        u.setor?.toLowerCase().includes(newChatSearch.toLowerCase()) ||
        u.cargo?.toLowerCase().includes(newChatSearch.toLowerCase())
      );
    }
    return users;
  }, [users, newChatSearch]);

  const activeConvObj = computedConversations.find(c => c.id === selectedConvId);

  return (
    <div className="w-full max-w-full h-[calc(100vh-140px)] flex flex-col pt-1">
      {/* Container Principal Claro, Corporativo e Sofisticado do Cedro */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl overflow-hidden flex h-full shadow-xs">
        
        {/* COLUNA ESQUERDA - Sidebar de conversas */}
        <div className={`w-full lg:w-96 flex flex-col bg-white border-r border-slate-200 shrink-0 ${selectedConvId ? "hidden lg:flex" : "flex"}`}>
          
          {/* Header Superior da Sidebar */}
          <div className="p-5 border-b border-slate-100 flex flex-col gap-3.5 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Chat</h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Comunique-se com sua equipe</p>
              </div>
              <button 
                onClick={() => setIsNewChatOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#075618] hover:bg-[#053e11] text-white text-[10px] font-black uppercase rounded-lg shadow-3xs transition cursor-pointer active:scale-95"
              >
                <Plus size={12} strokeWidth={3} /> Nova conversa
              </button>
            </div>

            {/* Caixa de Busca */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#075618]/60 focus:ring-1 focus:ring-[#075618]/20 transition font-medium"
                />
              </div>
            </div>

            {/* Chips de filtro */}
            <div className="flex gap-1.5 pt-0.5">
              {[
                { id: "all", label: "Todas" },
                { id: "favorites", label: "Favoritas" },
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setListFilter(chip.id as any)}
                  className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border cursor-pointer transition ${
                    listFilter === chip.id 
                      ? "bg-emerald-50 text-[#075618] border-emerald-200 shadow-3xs"
                      : "bg-white text-slate-500 border-slate-200/60 hover:bg-slate-100/50"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listagem de conversas */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {users.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="size-12 bg-slate-50 text-slate-400 rounded-xl border border-slate-250 flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nenhum contato disponível</h3>
                  <p className="text-[11px] text-slate-400/80 mt-1.5 leading-relaxed max-w-[240px]">
                    Ainda não há outros usuários cadastrados para iniciar uma conversa.
                  </p>
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-12 p-5 text-center space-y-2">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Nenhuma conversa encontrada</p>
                <p className="text-xs text-slate-400/80">Verifique os filtros ou busque por outro profissional.</p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = selectedConvId === conv.id;
                const isConvFavorite = !!conv.favorite;

                return (
                  <div 
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-4 flex items-start gap-3 transition-all cursor-pointer relative group ${
                      isActive 
                        ? "bg-slate-50/70 text-slate-800" 
                        : "bg-white hover:bg-slate-50/40 text-slate-700"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-[#075618] rounded-r" />
                    )}

                    {/* Avatar da Conversa */}
                    <div className="relative shrink-0 mt-0.5">
                      <ChatAvatar 
                        avatarUrl={conv.profile.avatar_url} 
                        fullName={conv.name} 
                        sizeClassName="size-9"
                        textClassName="text-xs"
                      />
                    </div>

                    {/* Conteúdo Textual */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex justify-between items-baseline mb-0.5 gap-2">
                        <h4 className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">
                          {conv.name}
                        </h4>
                        <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                          {conv.time}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1 truncate block opacity-75">
                        {conv.subtitle}
                      </p>
                      <p className="text-xs text-slate-500 truncate font-medium">
                        {conv.lastMessage}
                      </p>
                    </div>

                    {/* Opções e favoritar */}
                    <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-1.5">
                      <button 
                        onClick={(e) => toggleFavorite(conv.id, e)}
                        className={`text-slate-300 hover:text-amber-400 transition cursor-pointer md:opacity-0 group-hover:opacity-100 ${
                          isConvFavorite ? "opacity-100! text-amber-400!" : ""
                        }`}
                        title={isConvFavorite ? "Remover dos favoritos" : "Marcar como favorita"}
                      >
                        <Star size={12} fill={isConvFavorite ? "currentColor" : "none"} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé da Sidebar */}
          <div className="p-4 bg-slate-50 border-t border-slate-105 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Laboratório Cedro</span>
            <span>{filteredConversations.length} Contatos</span>
          </div>
        </div>

        {/* ÁREA DIREITA - Conversa ativa com os usuários reais */}
        <div className={`flex-1 flex flex-col bg-slate-50/55 relative ${!selectedConvId ? "hidden lg:flex" : "flex"}`}>
          
          {activeConvObj && selectedRecipient ? (
            <>
              {/* HEADER DA CONVERSA ATIVA */}
              <div className="p-4 border-b border-slate-200/80 flex justify-between items-center bg-white shadow-3xs p-4">
                <div className="flex items-center gap-3">
                  
                  {/* Botão voltar para lista no layout mobile */}
                  <button 
                    onClick={() => setSelectedConvId("")}
                    className="lg:hidden p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition shrink-0 active:scale-95 mr-1"
                    title="Voltar para lista"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>

                  <ChatAvatar 
                    avatarUrl={selectedRecipient.avatar_url} 
                    fullName={selectedRecipient.full_name} 
                    sizeClassName="size-11"
                    textClassName="text-sm font-black"
                  />

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5 leading-snug">
                      {selectedRecipient.full_name}
                      {selectedRecipient.role === "admin" && (
                        <span className="px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/25 rounded text-[7px] font-black text-amber-700 tracking-wider">ADM</span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">
                      {selectedRecipient.setor || "Sem setor específico"} • {selectedRecipient.cargo || "Membro Cedro"}
                    </p>
                  </div>
                </div>

                {/* Ações do header do chat */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setChatSearchOpen(prev => {
                      if (prev) setChatSearchQuery("");
                      return !prev;
                    })}
                    className={`p-2 rounded-lg transition active:scale-95 shrink-0 ${
                      chatSearchOpen 
                        ? "bg-[#075618]/10 text-[#075618] border border-[#075618]/20" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                    }`}
                    title="Pesquisar na conversa"
                  >
                    <Search size={14} strokeWidth={2.5} />
                  </button>

                  <button 
                    onClick={() => setViewingProfile(selectedRecipient)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg active:scale-95 shrink-0 transition border border-transparent"
                    title="Ver detalhes de perfil"
                  >
                    <Info size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* BARRA DE PESQUISA INTERNA ATIVA */}
              <AnimatePresence>
                {chatSearchOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-white border-b border-slate-250 p-3 flex items-center gap-2 overflow-hidden shadow-3xs"
                  >
                    <Search size={13} className="text-slate-400 shrink-0 ml-1" />
                    <input 
                      type="text"
                      placeholder="Filtrar por palavras-chave na conversa..."
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-xs py-1 px-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#075618]/50"
                    />
                    {chatSearchQuery && (
                      <button 
                        onClick={() => setChatSearchQuery("")}
                        className="p-1 hover:bg-slate-100 text-slate-400 rounded-md shrink-0 template-btn"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CORPO DE MENSAGENS */}
              <div 
                ref={scrollRef} 
                className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 custom-scrollbar bg-slate-50/50"
              >
                {activeMessagesToShow.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="size-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-3.5 border border-slate-200 shadow-4xs">
                      <MessageSquare size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Nenhuma mensagem ainda</h3>
                    <p className="text-xs text-slate-400/80 mt-1 max-w-[260px] leading-relaxed">
                      Envie uma mensagem para iniciar a conversa.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const elements: React.ReactNode[] = [];
                    let lastMessageDateStr = "";

                    activeMessagesToShow.forEach((msg, idx) => {
                      const idOwn = msg.sender_id === user?.id;
                      
                      // Adicionar separador de data se o dia mudou
                      const msgDateStr = msg.created_at;
                      if (!lastMessageDateStr || !isSameDay(lastMessageDateStr, msgDateStr)) {
                        elements.push(
                          <div key={`date-${msg.id}`} className="flex items-center justify-center my-6 gap-3 select-none">
                            <div className="h-px bg-slate-200 flex-1"></div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2.5 bg-slate-50/5" style={{ background: "#f8fafc" }}>
                              {getFriendlyDateLabel(msgDateStr)}
                            </span>
                            <div className="h-px bg-slate-200 flex-1"></div>
                          </div>
                        );
                        lastMessageDateStr = msgDateStr;
                      }

                      const showAvatar = idx === 0 || activeMessagesToShow[idx-1].sender_id !== msg.sender_id || (elements[elements.length - 1] as any)?.key?.startsWith("date-");

                      elements.push(
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          key={msg.id} 
                          className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${idOwn ? "ml-auto flex-row-reverse" : "mr-auto flex-row"}`}
                        >
                          {/* Avatar */}
                          <div className="size-8 shrink-0">
                            {showAvatar && (
                              <button 
                                onClick={() => msg.sender_profile && setViewingProfile(msg.sender_profile as UserProfile)}
                                className="transition hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                <ChatAvatar 
                                  avatarUrl={msg.sender_profile?.avatar_url} 
                                  fullName={msg.sender_profile?.full_name} 
                                  sizeClassName="size-8"
                                  textClassName="text-[10px]"
                                />
                              </button>
                            )}
                          </div>
                          
                          {/* Conteúdo do balão */}
                          <div className={`space-y-1 ${idOwn ? "items-end text-right" : "items-start text-left"}`}>
                            {showAvatar && (
                              <div className={`flex items-baseline gap-1.5 select-none ${idOwn ? "flex-row-reverse" : "flex-row"}`}>
                                <span className="text-[10px] font-bold text-slate-705 uppercase tracking-tight">
                                  {msg.sender_profile?.full_name || "Membro Cedro"}
                                </span>
                                {msg.status === "sending" ? (
                                  <span className="text-[8px] font-black text-amber-600 uppercase animate-pulse select-none">
                                    Enviando...
                                  </span>
                                ) : msg.status === "error" ? (
                                  <span className="text-[8px] font-black text-rose-500 uppercase select-none">
                                    Falha ao enviar
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-semibold text-slate-400 uppercase">
                                    {formatMessageTime(msg.created_at)}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className={`p-3 px-4 rounded-xl text-xs font-semibold leading-relaxed shadow-4xs border whitespace-pre-wrap ${
                              idOwn 
                                ? "bg-[#e2f5e7] text-slate-800 border-emerald-100 rounded-tr-none text-left" 
                                : "bg-white text-slate-800 border-slate-200/80 rounded-tl-none text-left"
                            }`}>
                              {highlightTerm(msg.content, chatSearchQuery)}

                              {/* Exibição de Anexos */}
                              {(msg.attachment_url || msg.attachment_name) && (
                                <div className="mt-2.5 pt-2 border-t border-slate-200/40 flex items-center gap-2">
                                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                                    <FileText size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-slate-700 truncate">{msg.attachment_name || "Documento"}</p>
                                    <p className="text-[9px] text-slate-400">
                                      {msg.attachment_size ? `${Math.round(msg.attachment_size / 1024)} KB` : "Arquivo"}
                                      {msg.status === "sending" && <span className="ml-1 text-amber-500 animate-pulse">(Anexando...)</span>}
                                    </p>
                                  </div>
                                  {msg.attachment_url ? (
                                    <a 
                                      href={msg.attachment_url} 
                                      target="_blank" 
                                      rel="noreferrer referrer"
                                      className="p-1 text-[#075618] hover:bg-slate-50 rounded-lg transition"
                                      title="Baixar anexo"
                                    >
                                      <Download size={14} />
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-amber-500 font-bold inline-block animate-pulse">...</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {(!showAvatar && (msg.status === "sending" || msg.status === "error")) && (
                              <div className={`text-[8px] font-bold uppercase select-none ${idOwn ? "text-right text-slate-400" : "text-left text-slate-400"}`}>
                                {msg.status === "sending" && <span className="text-amber-600 animate-pulse">Enviando...</span>}
                                {msg.status === "error" && <span className="text-rose-500">Falha ao enviar</span>}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    });
                    
                    return elements;
                  })()
                )}
              </div>

              {/* BARRA DE PRÉVIA DE ANEXO SELECIONADO */}
              {selectedFile && (
                <div className="p-2.5 px-6 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 text-xs select-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip size={14} className="text-slate-500 shrink-0" />
                    <span className="font-bold text-slate-700 truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-[10px] text-slate-450 shrink-0">({Math.round(selectedFile.size / 1024)} KB)</span>
                  </div>
                  <button 
                    onClick={handleRemoveFile}
                    className="p-1 bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition cursor-pointer"
                    title="Remover anexo"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* BARRA DE AVISOS OU ERROS DE SISTEMA */}
              {uiError && (
                <div className="bg-rose-50 border-t border-rose-100 p-2.5 px-6 text-xs text-rose-800 font-bold tracking-tight text-center select-none">
                  ⚠️ {uiError}
                </div>
              )}

              {/* CAMPO DE COMPOSIÇÃO FIXO (RODAPÉ) */}
              <div className="p-4 bg-white border-t border-slate-200/80 shadow-3xs relative">
                
                {/* Painel do Seletor de Emojis */}
                <AnimatePresence>
                  {isEmojiOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsEmojiOpen(false)} 
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-16 left-4 z-50 bg-white p-3 rounded-2xl border border-slate-200 shadow-lg flex gap-1.5 items-center max-w-sm"
                      >
                        {SUGGESTED_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-lg transition active:scale-95 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  
                  {/* Inputs ocultos de arquivos */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect} 
                  />

                  {/* Anexar arquivo e emojis */}
                  <div className="flex items-center gap-1 text-slate-400 select-none shrink-0">
                    <button 
                      type="button"
                      onClick={handleFileClick}
                      className="p-1.5 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition cursor-pointer"
                      title="Anexar parecer de IA ou arquivos"
                    >
                      <Paperclip size={15} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEmojiOpen(prev => !prev)}
                      className={`p-1.5 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition cursor-pointer ${isEmojiOpen ? "text-[#075618] bg-slate-100" : ""}`}
                      title="Inserir emoji"
                    >
                      <Smile size={15} />
                    </button>
                  </div>

                  <input
                    type="text"
                    ref={inputRef}
                    placeholder="Digite sua mensagem corporativa..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl outline-none py-2 px-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#075618]/50 focus:bg-white transition"
                    disabled={uploading}
                  />
                  
                  <button 
                    type="submit"
                    disabled={(!newMessage.trim() && !selectedFile) || uploading}
                    className="size-8.5 flex items-center justify-center bg-[#075618] hover:bg-[#053e11] disabled:opacity-40 disabled:hover:bg-[#075618] text-white rounded-lg transition shrink-0 cursor-pointer shadow-3xs active:scale-95"
                    title="Enviar"
                  >
                    <Send size={13} fill="currentColor" />
                  </button>
                </form>

                <div className="mt-2.5 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider px-1 select-none">
                  <span className="flex items-center gap-1">
                    <span className="size-1 bg-[#075618] rounded-full inline-block animate-pulse" /> Mensagem segura e confidencial
                  </span>
                  <span>Canal interno</span>
                </div>
              </div>
            </>
          ) : (
            /* ESTADO VAGIO PADRAO DA CONVERSA */
            <div className="flex-1 h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/20">
              <div className="size-14 bg-emerald-50 text-[#075618] border border-emerald-100 rounded-2xl flex items-center justify-center mb-4 shadow-3xs">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">Selecione uma conversa</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                Escolha um profissional de audito ou governança na lista ao lado para iniciar conversas, compartilhar pareces de IA e anexos de auditoria de forma criptografada.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL INICIAR NOVA CONVERSA */}
      <AnimatePresence>
        {isNewChatOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-3xs"
            onClick={() => {
              setIsNewChatOpen(false);
              setNewChatSearch("");
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200 flex flex-col h-[400px]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-150 flex justify-between items-center bg-slate-50 select-none">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Iniciar Conversa</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Selecione um profissional do Cedro Labs</p>
                </div>
                <button 
                  onClick={() => {
                    setIsNewChatOpen(false);
                    setNewChatSearch("");
                  }}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Buscar profissional por nome, setor ou cargo..."
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#075618]/50"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                {modalUsersRoster.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 select-none">
                    <p className="text-xs uppercase font-black tracking-wider">Profissional não cadastrado</p>
                  </div>
                ) : (
                  modalUsersRoster.map(rosterUser => (
                    <div 
                      key={rosterUser.id}
                      onClick={() => {
                        setSelectedConvId(rosterUser.id);
                        setIsNewChatOpen(false);
                        setNewChatSearch("");
                      }}
                      className="p-3.5 hover:bg-slate-50 flex items-center gap-3 cursor-pointer transition select-none"
                    >
                      <ChatAvatar 
                        avatarUrl={rosterUser.avatar_url} 
                        fullName={rosterUser.full_name} 
                        sizeClassName="size-8.5"
                        textClassName="text-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">{rosterUser.full_name}</h4>
                        <p className="text-[9px] text-[#075618] font-bold uppercase tracking-wider truncate mb-0.5">{rosterUser.cargo}</p>
                        <p className="text-[9px] text-slate-400 font-medium truncate uppercase">{rosterUser.setor || "NIT / Cedro"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL AUDITOR VERIFICADO DE PERFIL */}
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
