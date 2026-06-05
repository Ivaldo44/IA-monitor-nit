/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, ClipboardList, PlusCircle, FileText, Menu, X, ChevronRight, Activity, ShieldAlert, CheckCircle2, AlertTriangle, Users, Database, MessageSquare, UserCircle, Building2, ShieldCheck, Bell, ChevronLeft, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IARecord, StatusUso, UserProfile, StatusAuditoria, ApprovalWorkflow, ApprovalConfig } from "./types";
import { getRecords, deleteRecord, addRecord, updateRecord, checkSupabaseStatus, saveRecordsToSupabase, getProfiles, updateUserProfile } from "./storage";
import { supabase } from "./lib/supabase";
import Dashboard from "./components/Dashboard";
import Inventory from "./components/Inventory";
import SectorMap from "./components/SectorMap";
import AdminPanel from "./components/AdminPanel";
import SectorsManager from "./components/SectorsManager";
import RegistrationForm from "./components/RegistrationForm";
import ReportView from "./components/ReportView";
import LabBackground from "./components/LabBackground";
import { Auth } from "./components/Auth";
import { UserProfileView } from "./components/UserProfileView";
import { Chat } from "./components/Chat";
import { useAuth } from "./contexts/AuthContext";
import ApprovalPage from "./components/ApprovalPage";
import { generateSystemAlerts, saveAlertInteraction } from "./lib/alerts";
import { Eye, CheckCircle, AlertCircle, Info, Check } from "lucide-react";

export interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "chat";
  actionLabel?: string;
  onAction?: () => void;
}

function playNotificationSound(type: "chat" | "success" | "info" | "warning") {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "chat") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.3);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      gain3.gain.setValueAtTime(0.1, ctx.currentTime + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.35);
      osc3.start(ctx.currentTime + 0.3);
      osc3.stop(ctx.currentTime + 0.5);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.error("Erro ao reproduzir som de notificação:", e);
  }
}

export default function App() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const isCurrentUserAdmin = profile?.role?.toLowerCase().trim() === "admin";
  const isCurrentUserModerator = profile?.role?.toLowerCase().trim() === "moderator";
  const isCurrentUserPrivileged = isCurrentUserAdmin || isCurrentUserModerator;
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "new" | "report" | "profile" | "chat" | "sectors" | "admin" | "sectors_mgr" | "approval_queue" | "alerts">("profile"); // sempre inicia no perfil após login
  const [records, setRecords] = useState<IARecord[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [approvalConfig, setApprovalConfig] = useState<ApprovalConfig>({
    steps: [
      { stepNumber: 1, roleName: "Coordenador NIT", isOpinionOnly: false },
      { stepNumber: 2, roleName: "Gerente NIT", isOpinionOnly: false },
      { stepNumber: 3, roleName: "Gerente TI", isOpinionOnly: false },
      { stepNumber: 4, roleName: "Período de Teste", isOpinionOnly: false },
      { stepNumber: 5, roleName: "Análise Financeira", isOpinionOnly: true },
      { stepNumber: 6, roleName: "Presidência", isOpinionOnly: false },
    ]
  });
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<"online" | "offline" | "checking">("checking");
  const [selectedRecord, setSelectedRecord] = useState<IARecord | null>(null);
  const [originTab, setOriginTab] = useState<string | null>("inventory");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isDarkMode = false; // Modo escuro removido - apenas modo claro

  // Estados e lógicas para o sistema integrado de Alertas
  const [alertsToken, setAlertsToken] = useState(0);
  const triggerAlertsRefresh = () => setAlertsToken(prev => prev + 1);
  const [alertFilter, setAlertFilter] = useState<"all" | "critical" | "warning" | "info" | "resolved">("all");

  const systemAlerts = useMemo(() => {
    return generateSystemAlerts(records, workflows, profile, supabaseStatus);
  }, [records, workflows, profile, supabaseStatus, alertsToken]);

  const activeUnreadAlertsCount = useMemo(() => {
    return systemAlerts.filter(a => a.status === "Ativo").length;
  }, [systemAlerts]);

  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  const addToast = (toast: Omit<NotificationToast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...toast, id }]);
    playNotificationSound(toast.type);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Dark mode removido - garantir que a classe dark nunca seja aplicada
  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);

  const [isSyncing, setIsSyncing] = useState(false);

  const loadApprovalData = async () => {
    try {
      // Carregar configurações de aprovação pela API segura do servidor
      const configRes = await fetch("/api/workflow/config");
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData && configData.length > 0) {
          setApprovalConfig({
            steps: configData.map((c: any) => ({
              stepNumber: c.step_number,
              roleName: c.role_name,
              userId: c.assigned_user_id,
              userName: c.assigned_user_name,
              isOpinionOnly: c.is_opinion_only,
            }))
          });
        }
      }

      // Carregar fluxos ativos de aprovação e etapas associadas
      const listRes = await fetch("/api/workflow/list");
      if (listRes.ok) {
        const wfData = await listRes.json();
        if (wfData) {
          setWorkflows(wfData.map((wf: any) => ({
            iaRecordId: wf.ia_record_id,
            currentStep: wf.current_step,
            finalStatus: wf.final_status,
            completedAt: wf.completed_at,
            steps: (wf.steps || []).map((s: any) => ({
              stepNumber: s.step_number,
              roleName: s.role_name,
              assignedUserId: s.assigned_user_id,
              assignedUserName: s.assigned_user_name,
              status: s.status,
              comment: s.comment,
              decidedAt: s.decided_at,
              isOpinionOnly: s.is_opinion_only,
            }))
          })));
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar dados de aprovação:", e);
    }
  };

  const refreshRecords = async () => {
    setIsSyncing(true);
    try {
      const isOnline = await checkSupabaseStatus();
      setSupabaseStatus(isOnline ? "online" : "offline");
      
      const isAdmin = profile?.role?.toLowerCase().trim() === "admin";
      const isModerator = profile?.role?.toLowerCase().trim() === "moderator";
      const isPrivileged = isAdmin || isModerator;
      
      const data = await getRecords(user?.id, isPrivileged, profile?.setor);
      setRecords(data);
      
      // Sempre buscar perfis para que o chat e outros componentes tenham os dados correspondentes
      const usersData = await getProfiles();
      if (isPrivileged) {
        setProfiles(usersData);
      } else {
        const userSector = profile?.setor?.toLowerCase().trim();
        const filteredUsers = usersData.filter(p => {
          const isUserAdmin = p.role?.toLowerCase().trim() === "admin";
          const isSameSector = p.setor && userSector && p.setor.toLowerCase().trim() === userSector;
          return isUserAdmin || isSameSector;
        });
        setProfiles(filteredUsers);
      }

      // Carregar dados de conformidade e fluxos ativos de aprovação
      await loadApprovalData();
    } catch (error) {
      console.error("Erro ao atualizar registros:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (user && profile) refreshRecords();

    // Heartbeat for last_seen status
    let interval: any;
    if (user && profile) {
      const updatePresence = async () => {
        try {
          await updateUserProfile(user.id, { last_seen: new Date().toISOString() });
        } catch (e) {
          console.warn("Falha no heartbeat de presença:", e);
        }
      };
      
      updatePresence(); // Initial call
      interval = setInterval(updatePresence, 60000); // Every 1 minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, profile]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const isOnline = await checkSupabaseStatus();
      setSupabaseStatus(isOnline ? "online" : "offline");
    }, 30000); // Check every 30s
    
    return () => clearInterval(interval);
  }, []);

  // Refs to always keep current values inside real-time event listeners
  const activeTabRef = React.useRef(activeTab);
  const profileRef = React.useRef(profile);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    console.log("🔔 Iniciando escutadores em tempo real para notificações...");

    // 1. Escutador de novas mensagens no chat
    const messageChannel = supabase
      .channel("global-chat-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;
          if (!msg || msg.sender_id === user.id) return;

          const currentTab = activeTabRef.current;
          let shouldNotify = false;

          if (currentTab !== "chat") {
            // Se não está no chat, notifica sobre mensagens públicas ou privadas direcionadas para si
            if (!msg.is_private) {
              shouldNotify = true;
            } else if (msg.recipient_id === user.id) {
              shouldNotify = true;
            }
          } else {
            // Se está na tela do chat, notifica apenas se for mensagem privada direcionada e o remetente não for o chat ativo atual
            if (msg.is_private && msg.recipient_id === user.id) {
              const activeChatWith = localStorage.getItem("active_chat_with");
              if (activeChatWith !== msg.sender_id) {
                shouldNotify = true;
              }
            }
          }

          if (shouldNotify) {
            try {
              const { data: senderProf } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", msg.sender_id)
                .single();

              const senderName = senderProf?.full_name || "Colega";
              addToast({
                title: `Chat: ${senderName}`,
                message: msg.content.length > 60 ? `${msg.content.slice(0, 60)}...` : msg.content,
                type: "chat",
                actionLabel: "Ver Mensagem",
                onAction: () => {
                  setActiveTab("chat");
                }
              });
            } catch (err) {
              console.error("Erro ao buscar remetente:", err);
            }
          }
        }
      )
      .subscribe();

    // 2. Escutador de avaliações de IA de interesse
    const recordChannel = supabase
      .channel("global-records-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ia_records" },
        async (payload) => {
          const recordRaw = payload.new as any;
          if (!recordRaw || !recordRaw.data) return;

          const updatedRec = recordRaw.data as IARecord;
          updatedRec.id = recordRaw.id; // Garante ID correto

          setRecords(prevRecords => {
            const oldRec = prevRecords.find(r => r.id === updatedRec.id);
            if (oldRec) {
              const statusAuditoriaChanged = oldRec.statusAuditoria !== updatedRec.statusAuditoria;
              const statusUsoChanged = oldRec.statusUso !== updatedRec.statusUso;

              if (statusAuditoriaChanged || statusUsoChanged) {
                const currentProfile = profileRef.current;
                
                // Notificar se a IA editada pertence ao mesmo setor do usuário
                const isRelevantForMe = 
                  updatedRec.unidadeSetor?.toLowerCase().trim() === currentProfile?.setor?.toLowerCase().trim();

                const isUpdatedByMe = currentProfile?.role?.toLowerCase().trim() === "admin" && 
                  (activeTabRef.current === "admin" || activeTabRef.current === "sectors");

                if (isRelevantForMe && !isUpdatedByMe) {
                  let text = "";
                  if (statusAuditoriaChanged && statusUsoChanged) {
                    text = `Auditoria: "${updatedRec.statusAuditoria}" e Uso: "${updatedRec.statusUso}".`;
                  } else if (statusAuditoriaChanged) {
                    text = `Auditoria atualizada para "${updatedRec.statusAuditoria}".`;
                  } else {
                    text = `Status de uso atualizado para "${updatedRec.statusUso}".`;
                  }

                  setTimeout(() => {
                    addToast({
                      title: `IA Avaliada: ${updatedRec.nomeFerramenta}`,
                      message: text,
                      type: updatedRec.statusAuditoria === StatusAuditoria.APROVADO ? "success" : "info",
                      actionLabel: "Analisar",
                      onAction: () => {
                        setSelectedRecord(updatedRec);
                        setActiveTab("report");
                      }
                    });
                  }, 50);
                }
              }
              return prevRecords.map(r => r.id === updatedRec.id ? updatedRec : r);
            }
            return prevRecords;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(recordChannel);
    };
  }, [user]);

  const handleSync = async () => {
    if (supabaseStatus !== "online") {
      alert("Supabase está offline. Verifique suas chaves de API.");
      return;
    }
    
    setIsSyncing(true);
    try {
      console.log("Forçando sincronização manual...");
      const isAdmin = isCurrentUserAdmin;
      await saveRecordsToSupabase(records, user?.id, isAdmin);
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
    setOriginTab(activeTab);
    setSelectedRecord(record);
    setActiveTab("report");
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    const previousRecords = [...records];
    setRecords(prev => prev.filter(r => r.id !== id));
    
    try {
      await deleteRecord(id);
      await refreshRecords();
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setRecords(previousRecords);
      alert("Houve um erro ao excluir o registro. Por favor, tente novamente.");
    }
  };

  const handleSave = async (record: IARecord) => {
    const isNew = !records.find(r => r.id === record.id);
    const isAdmin = isCurrentUserAdmin;
    
    try {
      if (isNew) {
        await addRecord(record, user?.id, isAdmin);
        // Criar workflow de aprovação automaticamente e de forma consistente no Backend (Evitando problemas de RLS)
        try {
          const { data, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) throw new Error(sessionErr.message);
          const session = data?.session;
          if (!session?.access_token) {
            throw new Error("Sessão ou token de acesso de autenticação não encontrado.");
          }
          
          const initRes = await fetch("/api/workflow/init", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ recordId: record.id })
          });
          
          if (!initRes.ok) {
            const errBody = await initRes.json();
            throw new Error(errBody?.error || "Erro desconhecido ao iniciar fluxo de aprovação no backend");
          }
        } catch (wfErr) {
          console.error("Erro ao criar workflow:", wfErr);
          throw wfErr;
        }
      } else {
        await updateRecord(record, user?.id, isAdmin);
      }
      await refreshRecords();
      await loadApprovalData();
      setActiveTab("inventory");
      setSelectedRecord(null);
    } catch (error: any) {
      console.error("Erro ao salvar registro:", error);
      alert(`⚠️ Erro ao salvar: ${error.message || "Erro desconhecido"}. Verifique o console ou a estrutura do banco.`);
    }
  };

  const handleSaveApprovalConfig = async (config: ApprovalConfig) => {
    try {
      for (const step of config.steps) {
        await supabase.from("approval_config").upsert({
          step_number: step.stepNumber,
          role_name: step.roleName,
          assigned_user_id: step.userId || null,
          assigned_user_name: step.userName || null,
          is_opinion_only: step.isOpinionOnly || false,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        }, { onConflict: "step_number" });
      }

      // Sincronizar também os fluxos ativos (pendentes) com os novos responsáveis e nomes
      const { data: activeWfs } = await supabase
        .from("approval_workflows")
        .select("id")
        .eq("final_status", "pendente");

      if (activeWfs && activeWfs.length > 0) {
        const activeWfIds = activeWfs.map(w => w.id);
        for (const step of config.steps) {
          await supabase
            .from("approval_steps")
            .update({
              role_name: step.roleName,
              assigned_user_id: step.userId || null,
              assigned_user_name: step.userName || null,
            })
            .in("workflow_id", activeWfIds)
            .eq("step_number", step.stepNumber);
        }
      }

      setApprovalConfig(config);
      await loadApprovalData(); // Recarrega os dados do workflow atualizados
    } catch (e) {
      console.error("Erro ao salvar config de aprovação:", e);
    }
  };

  const handleUpdateStatus = async (recordId: string, status: any, comment?: string, extraFields?: any) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    // Verificar se o usuário atual é o responsável designado para a etapa atual, um admin ou moderador
    const wf = workflows.find(w => w.iaRecordId === recordId);
    const currentStepNum = wf ? wf.currentStep : 1;
    const configStep = approvalConfig?.steps?.find(s => s.stepNumber === currentStepNum);
    const wfStep = wf?.steps?.find(s => s.stepNumber === currentStepNum);
    const assignedUserId = configStep?.userId || wfStep?.assignedUserId;

    const isAssignedToMe = assignedUserId === user?.id;

    if (!assignedUserId) {
      alert("Esta etapa ainda não possui responsável definido. Configure o fluxo antes de aprovar ou negar.");
      return;
    }

    if (!isAssignedToMe) {
      alert("Apenas o responsável designado para esta etapa pode aprovar ou negar.");
      return;
    }

    const decision = status === StatusAuditoria.APROVADO ? "aprovado" : "negado";

    try {
      // Chamar a rota segura do backend — ela valida se o usuário é o responsável da etapa atual
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        throw new Error(`Erro ao recuperar sessão: ${sessionErr.message}`);
      }
      const session = data?.session;
      const response = await fetch("/api/workflow/decide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ recordId, decision, comment, coordinatorData: extraFields })
      });

      const result = await response.json();

      if (!response.ok) {
        // Mostrar mensagem clara se não for a vez do usuário
        alert(`⚠️ ${result.error || "Erro ao processar decisão"}`);
        return;
      }

      // Atualizar estado local otimisticamente após confirmação do backend
      const newAuditStatus = result.finalStatus === "aprovado" 
        ? StatusAuditoria.APROVADO 
        : result.finalStatus === "negado" 
          ? StatusAuditoria.NEGADO 
          : StatusAuditoria.PENDENTE;

      const newStatusUso = result.finalStatus === "aprovado"
        ? StatusUso.APROVADO
        : result.finalStatus === "negado"
          ? StatusUso.NAO_APROVADO
          : StatusUso.EM_AVALIACAO;

      const updatedRecord = {
        ...record,
        statusAuditoria: newAuditStatus,
        statusUso: newStatusUso,
      };

      setRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r));

      // Mostrar feedback
      if (result.finalStatus === "aprovado") {
        addToast({ title: "IA Aprovada!", message: result.message, type: "success" });
      } else if (result.finalStatus === "negado") {
        addToast({ title: "IA Indeferida", message: result.message, type: "warning" });
      } else {
        addToast({ title: "Etapa Concluída", message: result.message, type: "info" });
      }

      await refreshRecords();
      await loadApprovalData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao comunicar com o servidor.");
      await refreshRecords();
    }
  };

  const handleResetStatus = async (recordId: string, reason?: string) => {
    try {
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        throw new Error(`Erro ao recuperar sessão: ${sessionErr.message}`);
      }
      const session = data?.session;
      const response = await fetch("/api/workflow/reset-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ recordId, reason })
      });

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        await response.text();
        throw new Error(`Erro do servidor (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(result.error || "Falha ao redefinir status");
      }

      addToast({ 
        title: "Status Redefinido", 
        message: "A IA retornou para análise no fluxo de aprovação com sucesso.", 
        type: "success" 
      });

      await refreshRecords();
      await loadApprovalData();
    } catch (error: any) {
      console.error("Erro ao redefinir status:", error);
      alert(`Erro: ${error.message || "Erro desconhecido ao redefinir status"}`);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: "admin" | "moderator" | "user") => {
    // Check if it's a real GUID/UUID (Fallback names are not UUIDs)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    if (!isUuid) {
      alert(`⚠️ Não foi possível atualizar: Este usuário ainda não possui uma conta de acesso ao sistema (perfil incompleto). Apenas usuários que já fizeram login pelo menos uma vez podem ser tornados administradores.`);
      return;
    }

    // Guard against self-demotion to avoid losing access to admin panel accidentally
    if (userId === user?.id && newRole === "user") {
      const confirmSelf = window.confirm("⚠️ Você está prestes a remover seus próprios privilégios de administrador. Você perderá acesso a este painel. Deseja continuar?");
      if (!confirmSelf) return;
    }

    // Optimistic update
    const previousProfiles = [...profiles];
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));

    try {
      console.log(`🚀 Solicitando alteração de cargo para usuário ${userId} para: ${newRole}`);
      
      // Get the session token for authentication
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        throw new Error(`Erro ao recuperar sessão: ${sessionErr.message}`);
      }
      const session = data?.session;
      
      const response = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ userId, newRole })
      });

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Erro do servidor (${response.status}): O servidor não retornou JSON. Verifique se as rotas de API estão configuradas.`);
      }

      if (!response.ok) {
        throw new Error(result.error || "Falha na comunicação com o servidor");
      }
      
      if (result.success && result.profile) {
        console.log(`✅ Alteração persistida via API para ${userId}`);
        setProfiles(prev => prev.map(p => p.id === userId ? result.profile : p));
      } else {
        throw new Error("Resposta inesperada do servidor.");
      }
      
      // Full refresh to ensure consistency across all data
      if (userId === user?.id) {
        await refreshProfile();
      }
      await refreshRecords();
      const roleLabel = newRole === "admin" ? "ADMINISTRADOR" : newRole === "moderator" ? "MODERADOR" : "USUÁRIO COMUM";
      alert(`✅ Sucesso! O usuário agora tem acesso de ${roleLabel}.`);
    } catch (error: any) {
      console.error("❌ Erro fatal ao atualizar role do usuário:", error);
      // Rollback
      setProfiles(previousProfiles);
      alert(`Erro: ${error.message || "Erro desconhecido ao atualizar permissões"}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        throw new Error(`Erro ao recuperar sessão: ${sessionErr.message}`);
      }
      const session = data?.session;
      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ userId })
      });

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        await response.text(); // consume body anyway
        throw new Error(`Erro do servidor (${response.status}). Verifique se as rotas de API do backend estão ativas no ambiente de produção.`);
      }

      if (!response.ok) {
        throw new Error(result.error || "Falha ao apagar usuário");
      }

      setProfiles(prev => prev.filter(p => p.id !== userId));
      alert("✅ Usuário apagado com sucesso.");
    } catch (error: any) {
      console.error("Erro ao apagar usuário:", error);
      alert(`⚠️ Erro ao apagar: ${error.message}`);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory", label: "Inventário de IA", icon: ClipboardList },
    { id: "approval_queue", label: "Aprovação de IAs", icon: ShieldCheck, privilegedOnly: true },
    { id: "sectors", label: "Mapa de IAs", icon: Users, adminOnly: true },
    { id: "sectors_mgr", label: "Setores", icon: Building2, adminOnly: true },
    { id: "admin", label: "Gestão Admin", icon: ShieldAlert, adminOnly: false, privilegedOnly: true },
    { id: "new", label: "Nova Solicitação", icon: PlusCircle },
    { id: "alerts", label: "Alertas", icon: Bell },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "profile", label: "Meu Perfil", icon: UserCircle },
  ].filter(item => (!item.adminOnly || isCurrentUserAdmin) && (!("privilegedOnly" in item && item.privilegedOnly) || isCurrentUserPrivileged));

  const sidebarGroupConfigs = [
    {
      title: "IA e Inventário",
      itemIds: ["dashboard", "inventory", "new"]
    },
    {
      title: "Administração",
      itemIds: ["approval_queue", "sectors", "sectors_mgr", "admin"],
      show: isCurrentUserAdmin
    },
    {
      title: "Auxiliares",
      itemIds: ["alerts", "chat", "profile"]
    }
  ];

  const sidebarGroups = sidebarGroupConfigs
    .filter(g => g.show === undefined || g.show)
    .map(g => {
      const items = g.itemIds
        .map(id => menuItems.find(item => item.id === id))
        .filter((item): item is typeof menuItems[number] => !!item);
      return {
        title: g.title,
        items
      };
    })
    .filter(g => g.items.length > 0);

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
      <div className={`min-h-screen flex flex-col md:flex-row font-sans selection:bg-brand-green selection:text-black transition-colors duration-300 bg-[var(--bg-main)] ${isDarkMode ? "dark" : ""}`}>
      <LabBackground />
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-[#004D24] to-[#003F1D] p-4 flex justify-between items-center border-b-2 border-[#F58220] sticky top-0 z-50 text-white">
        <div className="flex items-center gap-2">
          <img src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" alt="Cedro IA – Laboratório Cedro" className="h-8 w-auto brightness-0 invert" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation - AI Laboratory Control Panel Style */}
      <aside 
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          isSidebarCollapsed ? "md:w-20" : "md:w-72"
        } fixed md:static inset-y-0 left-0 z-40 bg-gradient-to-b from-[#004D24] via-[#003F1D] to-[#002F16] text-white border-r border-[#003F1D]/40 transition-all duration-300 ease-in-out md:flex flex-col shrink-0 md:overflow-visible overflow-hidden relative shadow-[4px_0_24px_rgba(0,0,0,0.3)] animate-fade-in`}
      >
        {/* Soft internal light overlay for visual thickness and premium glow */}
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#00d136]/10 to-transparent pointer-events-none blur-3xl opacity-80" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#00d136]/3 to-transparent pointer-events-none blur-2xl opacity-60" />

        {/* Brand Header Container with Larger Logo */}
        <div className={`hidden md:block transition-all duration-300 border-b border-white/10 bg-black/15 overflow-hidden relative ${
          isSidebarCollapsed 
            ? "h-20 p-3" 
            : "h-32 px-6 py-6"
        }`}>
          <div className="absolute inset-0 bg-[#00d136]/8 blur-2xl rounded-full opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Logo Completa (Visible when NOT collapsed) */}
            <div className={`transition-all duration-300 absolute inset-0 flex items-center justify-center ${
              isSidebarCollapsed ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
            }`}>
              <img
                src="/logo-cedro-ia-white.png"
                alt="Cedro IA - Laboratório Cedro"
                className="w-full max-w-[245px] h-auto object-contain drop-shadow-[0_4px_12px_rgba(0,209,54,0.15)]"
                draggable={false}
              />
            </div>

            {/* Logo Símbolo (Visible when collapsed) */}
            <div className={`transition-all duration-300 absolute inset-0 flex items-center justify-center ${
              isSidebarCollapsed ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
            }`}>
              <img 
                src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206%20(1).png" 
                alt="Símbolo Cedro IA" 
                className="h-10 w-auto brightness-0 invert object-contain filter drop-shadow-[0_2px_8px_rgba(0,209,54,0.2)]" 
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Navigation items with elegant styling */}
        <nav className={`flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar transition-all duration-300 relative z-10 ${
          isSidebarCollapsed ? "mt-4 px-2" : "mt-8"
        }`}>
          {sidebarGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-2 transition-all duration-300 relative">
              {/* Discrete horizontal group divider */}
              {groupIdx > 0 && (
                <div className={`transition-all duration-300 ${
                  isSidebarCollapsed 
                    ? "border-t border-white/10 mx-3 my-4" 
                    : "border-t border-white/10 mx-3 pt-4 mb-2"
                }`} />
              )}
              
              {/* Section titles in uppercase, desaturated green-white */}
              <div className={`text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/60 transition-all duration-300 ${
                isSidebarCollapsed ? "opacity-0 h-0 my-0 overflow-hidden pointer-events-none" : "px-4 mb-2.5 opacity-100 h-auto mt-1"
              }`}>
                {group.title}
              </div>
              
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === "new") setSelectedRecord(null);
                      setActiveTab(item.id as any);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full group flex items-center rounded-xl font-bold transition-all duration-200 relative overflow-hidden ${
                      isSidebarCollapsed ? "justify-center p-3 gap-0" : "gap-3.5 px-4 py-3"
                    } ${
                      activeTab === item.id 
                        ? "bg-gradient-to-r from-[#00d136]/24 to-[#00d136]/4 text-white border-l-4 border-l-[#00d136] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                        : "text-emerald-100/85 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <item.icon size={19} className={`shrink-0 transition-all duration-300 ${
                      activeTab === item.id ? "text-[#00d136] scale-110" : "text-emerald-200/60 group-hover:text-emerald-50/90 group-hover:scale-105"
                    } ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                    
                    <span className={`tracking-tight transition-all duration-300 text-sm whitespace-nowrap origin-left ${
                      isSidebarCollapsed 
                        ? "opacity-0 translate-x-3 w-0 max-w-0 overflow-hidden pointer-events-none" 
                        : "opacity-100 translate-x-0 w-auto max-w-[200px]"
                    }`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer with brand */}
        <div className="p-6 border-t border-white/10 bg-black/15 mt-auto select-none md:block hidden relative z-10 shrink-0">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-start">
              <img 
                src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" 
                alt="Cedro IA – Laboratório Cedro" 
                className="h-8 w-auto brightness-0 invert object-contain opacity-75 hover:opacity-100 transition-opacity duration-200"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <img 
                src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206%20(1).png" 
                alt="Símbolo Cedro IA" 
                className="h-5 w-auto brightness-0 invert opacity-65"
              />
            </div>
          )}
        </div>

        {/* Overlapping Expand/Collapse Round White Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute bottom-16 -right-3.5 size-7 rounded-full bg-white text-slate-700 hover:text-[#00d136] border border-slate-200/95 flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-90 shadow-[0_4px_12px_rgba(0,0,0,0.18)] z-50 md:flex hidden hover:scale-106"
          title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          <ChevronLeft size={13} className={`transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : "rotate-0"}`} />
        </button>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#FAF9F6]">
        <header className="bg-[#003F1D] border-b-3 border-[#F58220] px-6 md:px-8 h-20 flex items-center justify-end sticky top-0 z-30 shadow-md select-none shrink-0 w-full">
          {/* Main Right Block */}
          <div className="flex items-center gap-4 pl-4 shrink-0">
            
            {/* Alerts Bell (Sino) Button with real unread count */}
            <button 
              onClick={() => setActiveTab("alerts")} 
              className="size-10 flex items-center justify-center p-2.5 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-800/40 hover:border-emerald-700/60 rounded-full relative transition-all active:scale-95 text-emerald-100 hover:text-white shrink-0 cursor-pointer shadow-sm"
              title="Notificações"
            >
              <Bell size={18} />
              {activeUnreadAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 bg-[#F58220] rounded-full border border-[#003F1D] shadow-sm animate-pulse" />
              )}
            </button>

            {/* User Block with perfect alignment */}
            <div 
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-3 pl-4.5 border-l border-emerald-800/40 cursor-pointer group select-none"
              title="Meu Perfil"
            >
              <div className="size-10.5 rounded-full border border-emerald-900/40 overflow-hidden flex items-center justify-center p-0.5 bg-emerald-950/20 group-hover:border-emerald-400 transition-all shadow-sm shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <UserCircle size={22} className="text-emerald-100" />
                )}
              </div>
              
              <div className="flex flex-col text-left hidden sm:flex">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-white group-hover:text-emerald-300 transition-colors leading-tight">
                    {profile?.full_name || "Membro Cedro"}
                  </p>
                  {isCurrentUserAdmin && (
                    <span className="text-[8px] font-black bg-emerald-800/30 border border-emerald-600/30 text-emerald-200 px-1.5 py-0.5 rounded uppercase font-sans shrink-0 leading-none">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mt-0.5">
                  {profile?.cargo || "Colaborador"}
                </p>
              </div>
              
              <ChevronDown size={14} className="text-emerald-200 group-hover:text-white transition-colors" />
            </div>

          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-8 custom-scrollbar bg-[var(--bg-content)]">

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`max-w-[95rem] mx-auto relative ${
                activeTab === "dashboard" || activeTab === "alerts" || activeTab === "profile"
                  ? "p-0 bg-transparent border-0 shadow-none text-slate-800" 
                  : "bg-[var(--bg-card-page)] border-4 border-[var(--border-page)] rounded-[3rem] p-6 md:p-10 shadow-2xl text-[var(--text-bright)]"
              }`}
            >
              {activeTab === "dashboard" && (
                <Dashboard records={records} onNavigate={(tab) => setActiveTab(tab)} isAdmin={isCurrentUserAdmin} workflows={workflows} approvalConfig={approvalConfig} currentUserId={user?.id} />
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
                  onRefresh={refreshRecords} approvalConfig={approvalConfig} onSaveApprovalConfig={handleSaveApprovalConfig}
                  isAdmin={isCurrentUserAdmin}
                />
              )}
              {activeTab === "sectors" && isCurrentUserAdmin && (
                <SectorMap records={records} profiles={profiles} />
              )}
              {activeTab === "sectors_mgr" && isCurrentUserAdmin && (
                <SectorsManager records={records} profiles={profiles} onRefresh={refreshRecords} approvalConfig={approvalConfig} onSaveApprovalConfig={handleSaveApprovalConfig} />
              )}
              {activeTab === "approval_queue" && isCurrentUserPrivileged && (
                <ApprovalPage 
                  records={records}
                  profiles={profiles}
                  workflows={workflows}
                  approvalConfig={approvalConfig}
                  currentUserId={user?.id}
                  onUpdateStatus={handleUpdateStatus}
                  onSaveApprovalConfig={handleSaveApprovalConfig}
                  onViewRecord={handleView}
                  isAdmin={isCurrentUserAdmin}
                />
              )}
              {activeTab === "admin" && isCurrentUserPrivileged && (
                <AdminPanel 
                  records={records} 
                  profiles={profiles}
                  onUpdateStatus={handleUpdateStatus} 
                  onViewRecord={handleView} 
                  onUpdateUserRole={handleUpdateUserRole}
                  onDeleteUser={handleDeleteUser}
                  approvalConfig={approvalConfig}
                  onSaveApprovalConfig={handleSaveApprovalConfig}
                  currentUserId={user?.id}
                  workflows={workflows}
                  supabaseStatus={supabaseStatus}
                  isSyncing={isSyncing}
                  onSync={handleSync}
                  onResetStatus={handleResetStatus}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}
              {activeTab === "chat" && (
                <Chat />
              )}
              {activeTab === "profile" && (
                <UserProfileView />
              )}
              {activeTab === "alerts" && (
                <div className="space-y-6 bg-slate-50/50 p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-slate-800 animate-fade-in max-w-6xl mx-auto">
                  {/* Cabeçalho */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <h3 className="text-xl font-black uppercase text-[#075618] tracking-tight">Alertas</h3>
                      <p className="text-xs text-slate-500 font-medium">Acompanhe eventos, pendências e riscos que exigem atenção no ecossistema de IA.</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#075618] px-3 py-1 bg-[#075618]/5 border border-[#075618]/10 rounded-full uppercase tracking-widest font-mono">Status: Monitorando</span>
                  </div>

                  {/* Cards Pequenos no Topo */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Alertas ativos */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex items-center gap-4">
                      <div className="p-2.5 bg-slate-50 text-slate-700 rounded-xl">
                        <Bell size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alertas ativos</p>
                        <p className="text-lg font-black text-slate-800">
                          {systemAlerts.filter(a => a.status !== "Resolvido").length}
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Críticos */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex items-center gap-4">
                      <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Críticos</p>
                        <p className="text-lg font-black text-rose-600">
                          {systemAlerts.filter(a => a.status !== "Resolvido" && a.level === "CRÍTICO").length}
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Pendentes */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex items-center gap-4">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                        <Info size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atenção / Pendentes</p>
                        <p className="text-lg font-black text-amber-600">
                          {systemAlerts.filter(a => a.status !== "Resolvido" && a.level === "ATENÇÃO").length}
                        </p>
                      </div>
                    </div>

                    {/* Card 4: Resolvidos */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex items-center gap-4">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolvidos</p>
                        <p className="text-lg font-black text-emerald-600">
                          {systemAlerts.filter(a => a.status === "Resolvido").length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Filtros */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {[
                      { id: "all", label: "Todos" },
                      { id: "critical", label: "Críticos" },
                      { id: "warning", label: "Atenção" },
                      { id: "info", label: "Informativos" },
                      { id: "resolved", label: "Resolvidos" },
                    ].map((filt) => (
                      <button
                        key={filt.id}
                        onClick={() => setAlertFilter(filt.id as any)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer ${
                          alertFilter === filt.id
                            ? "bg-[#075618] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                        }`}
                      >
                        {filt.label}
                      </button>
                    ))}
                  </div>

                  {/* Listagem de Alertas */}
                  {(() => {
                    // Filtrar as notificações com base nas abas
                    const filtered = systemAlerts.filter(a => {
                      if (alertFilter === "all") return a.status !== "Resolvido";
                      if (alertFilter === "critical") return a.status !== "Resolvido" && a.level === "CRÍTICO";
                      if (alertFilter === "warning") return a.status !== "Resolvido" && a.level === "ATENÇÃO";
                      if (alertFilter === "info") return a.status !== "Resolvido" && a.level === "INFORMATIVO";
                      if (alertFilter === "resolved") return a.status === "Resolvido";
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-16 text-center space-y-4 bg-white rounded-2xl border border-slate-100">
                          <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                            <CheckCircle2 size={24} />
                          </div>
                          <div>
                            <p className="text-[#111111] font-bold text-sm uppercase tracking-wider">Nenhum alerta ativo</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                              Todos os processos de IA monitorados estão em conformidade no momento.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {filtered.map((alert) => {
                          // Definir estilos de acordo com severidade
                          const containerStyle = 
                            alert.status === "Resolvido" 
                              ? "bg-slate-50/70 border-slate-200/80 text-slate-500 opacity-75"
                              : alert.level === "CRÍTICO"
                                ? "bg-rose-50/40 border-rose-100/80 text-rose-950"
                                : alert.level === "ATENÇÃO"
                                  ? "bg-amber-50/40 border-amber-100/80 text-amber-950"
                                  : "bg-blue-50/40 border-blue-100/80 text-blue-950";

                          const badgeStyle = 
                            alert.status === "Resolvido"
                              ? "bg-slate-200 text-slate-700"
                              : alert.level === "CRÍTICO"
                                ? "bg-rose-100 text-rose-800"
                                : alert.level === "ATENÇÃO"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800";

                          return (
                            <div 
                              key={alert.id} 
                              className={`p-5 rounded-2xl border ${containerStyle} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-150 hover:shadow-xs hover:translate-x-0.5`}
                            >
                              <div className="space-y-2 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider ${badgeStyle}`}>
                                    {alert.level}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                    • {alert.source}
                                  </span>
                                  {alert.status === "Lido" && alert.status !== "Resolvido" && (
                                    <span className="text-[9px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                                      Lido
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-extrabold text-sm tracking-tight text-slate-800 uppercase">{alert.title}</h4>
                                <p className="text-xs leading-relaxed text-slate-600 font-medium">{alert.desc}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  Gerado em: {new Date(alert.createdAt).toLocaleString("pt-BR")}
                                </p>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                                {/* Botão Ação Principal (Ver IA ou Abrir perfil) */}
                                {alert.actionType === "open-ia" && alert.relatedRecordId && (
                                  <button
                                    onClick={() => {
                                      const matched = records.find(r => r.id === alert.relatedRecordId);
                                      if (matched) {
                                        setSelectedRecord(matched);
                                        setActiveTab("report");
                                      }
                                    }}
                                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 cursor-pointer shadow-3xs flex items-center gap-1.5"
                                  >
                                    <Eye size={12} /> Abrir IA
                                  </button>
                                )}

                                {alert.actionType === "open-profile" && (
                                  <button
                                    onClick={() => setActiveTab("profile")}
                                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 cursor-pointer shadow-3xs flex items-center gap-1.5"
                                  >
                                    <UserCircle size={12} /> Perfil
                                  </button>
                                )}

                                {/* Marcar como lido */}
                                {alert.status === "Ativo" && (
                                  <button
                                    onClick={() => {
                                      saveAlertInteraction(alert.id, "Lido");
                                      triggerAlertsRefresh();
                                    }}
                                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 cursor-pointer"
                                    title="Marcar como lido"
                                  >
                                    Lido
                                  </button>
                                )}

                                {/* Marcar como resolvido */}
                                {alert.status !== "Resolvido" && (
                                  <button
                                    onClick={() => {
                                      saveAlertInteraction(alert.id, "Resolvido");
                                      triggerAlertsRefresh();
                                    }}
                                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm flex items-center gap-1"
                                    title="Marcar como Resolvido"
                                  >
                                    <Check size={12} strokeWidth={3} /> Resolver
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
              {activeTab === "new" && (
                <RegistrationForm 
                  initialData={selectedRecord} 
                  onSave={handleSave} 
                  onCancel={() => setActiveTab("inventory")} 
                  isAdmin={isCurrentUserAdmin}
                />
              )}
              {activeTab === "report" && (
                selectedRecord ? (
                  <ReportView 
                    record={selectedRecord} 
                    onBack={() => {
                      setSelectedRecord(null);
                      if (originTab && originTab !== "report") {
                        setActiveTab(originTab as any);
                      } else {
                        setActiveTab("inventory");
                      }
                    }} 
                    onEdit={handleEdit}
                    isAdmin={isCurrentUserAdmin}
                  />
                ) : (
                  <div className="space-y-8 pb-20">
                    <div className="glass p-12 rounded-[2.5rem] border border-[var(--border-lab)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-lab-blue/5 blur-3xl rounded-full pointer-events-none"></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {records.map(record => (
                            <button
                              key={record.id}
                              onClick={() => setSelectedRecord(record)}
                              className="group flex flex-col p-6 bg-white/[0.02] border border-brand-green/20 rounded-3xl hover:bg-black/5 dark:hover:bg-white/5 hover:border-brand-green/50 transition-all text-left relative overflow-hidden shadow-lg shadow-brand-green/5"
                            >
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-lab-cyan/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                            <div className="flex justify-between items-start mb-6">
                              <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-brand-green bg-brand-green/20 px-2 py-1 rounded border border-brand-green/40 uppercase tracking-tight">{record.id}</span>
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
        {/* Removed redundant delete modal as it's handled by components */}
      </AnimatePresence>

      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-[360px] pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, x: 50 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto bg-slate-900/90 dark:bg-emerald-950/95 backdrop-blur-md rounded-2xl border border-emerald-800/50 p-4 shadow-2xl flex gap-3 relative overflow-hidden"
              style={{ boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)" }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-green to-lab-cyan" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h4 className="font-bold text-white text-sm tracking-tight truncate uppercase pr-4">
                    {toast.title}
                  </h4>
                  <button 
                    onClick={() => removeToast(toast.id)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors -mr-1 -mt-1"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-slate-300 dark:text-emerald-100 text-xs line-clamp-3 leading-relaxed mb-3 pr-2">
                  {toast.message}
                </p>
                
                {toast.actionLabel && toast.onAction && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        toast.onAction?.();
                        removeToast(toast.id);
                      }}
                      className="text-[10px] font-black uppercase text-brand-green bg-brand-green/10 hover:bg-brand-green hover:text-black py-1 px-3 rounded-full transition-all tracking-[0.05em] border border-brand-green/20"
                    >
                      {toast.actionLabel}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}