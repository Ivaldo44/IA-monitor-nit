import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Lazy-initialized Supabase clients to prevent startup crashes if keys are not set
let supabaseClient: any = null;
let supabaseAdminClient: any = null;

function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or Anon Key is missing in server environment");
    }
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL or Service Role Key is missing in admin server environment");
    }
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdminClient;
}

// API Routes
const router = express.Router();

router.post("/admin/update-role", async (req, res) => {
  const { userId, newRole } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    
    // Lazy initialized supabase client
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: requesterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || requesterProfile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: You are not an admin" });
    }

    // Lazy initialized supabase admin client
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({ success: true, profile: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/admin/delete-user", async (req, res) => {
  const { userId } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: "Invalid token" });

    const { data: requester } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (requester?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Limpar mensagens vinculadas
    await supabaseAdmin.from("messages").delete().eq("sender_id", userId);
    await supabaseAdmin.from("messages").delete().eq("recipient_id", userId);

    // 2. Limpar referências
    await supabaseAdmin.from("ia_records").update({ authorized_by: null }).eq("authorized_by", userId);
    await supabaseAdmin.from("ia_records").update({ owner_id: null }).eq("owner_id", userId);
    await supabaseAdmin.from("profiles").update({ authorized_by: null }).eq("authorized_by", userId);

    // 3. Storage
    try {
      await supabaseAdmin.rpc("delete_user_storage_objects", { user_id: userId });
    } catch (e) {
      // @ts-ignore
      await supabaseAdmin.from("storage.objects").delete().eq("owner", userId).catch(() => {});
    }

    // 4. Deletar perfil
    const { error: profileDeleteError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
    if (profileDeleteError) {
      return res.status(500).json({ error: `Erro ao apagar perfil: ${profileDeleteError.message}` });
    }

    // 5. Deletar do Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
       return res.status(500).json({ 
         error: `Erro ao apagar conta no Auth: ${authDeleteError.message}`
       });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Rota de aprovação/negação de IA com validação de fluxo
router.post("/workflow/decide", async (req, res) => {
  const { recordId, decision, comment } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  if (!["aprovado", "negado"].includes(decision)) {
    return res.status(400).json({ error: "Decisão inválida. Use: aprovado ou negado" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verificar quem está fazendo a requisição
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Token inválido" });

    // 2. Verificar se é admin ou moderador
    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const role = requesterProfile?.role?.toLowerCase().trim();
    if (!["admin", "moderator"].includes(role)) {
      return res.status(403).json({ error: "Apenas administradores e moderadores podem participar do fluxo" });
    }

    // 3. Buscar workflow da IA
    let wfData = null;
    const { data: existingWf } = await supabaseAdmin
      .from("approval_workflows")
      .select("id, current_step, final_status")
      .eq("ia_record_id", recordId)
      .maybeSingle();

    if (existingWf) {
      wfData = existingWf;
    } else {
      console.log(`Workflow não encontrado para a IA ${recordId}. Inicializando on-the-fly...`);
      // Buscar configuração atual das etapas de aprovação
      const { data: configRows } = await supabaseAdmin
        .from("approval_config")
        .select("*")
        .order("step_number");

      // Criar entrada no approval_workflows
      const { data: newWf, error: newWfErr } = await supabaseAdmin
        .from("approval_workflows")
        .insert({
          ia_record_id: recordId,
          current_step: 1,
          final_status: "pendente",
        })
        .select("id, current_step, final_status")
        .single();

      if (newWfErr || !newWf) {
        return res.status(500).json({ error: `Não foi possível inicializar o fluxo de aprovação para esta IA: ${newWfErr?.message || "Erro desconhecido"}` });
      }

      wfData = newWf;

      // Montar e inserir as etapas do workflow no approval_steps
      const defaultSteps = [
        { step_number: 1, role_name: "Coordenador NIT", is_opinion_only: false },
        { step_number: 2, role_name: "Gerente NIT", is_opinion_only: false },
        { step_number: 3, role_name: "Gerente TI", is_opinion_only: false },
        { step_number: 4, role_name: "Análise Financeira", is_opinion_only: true },
        { step_number: 5, role_name: "Presidência", is_opinion_only: false },
      ];

      const stepsToInsert = (configRows && configRows.length > 0)
        ? configRows.map((c: any) => ({
            workflow_id: newWf.id,
            ia_record_id: recordId,
            step_number: c.step_number,
            role_name: c.role_name,
            assigned_user_id: c.assigned_user_id || null,
            assigned_user_name: c.assigned_user_name || null,
            status: "aguardando",
            is_opinion_only: c.is_opinion_only || false,
          }))
        : defaultSteps.map(s => ({
            workflow_id: newWf.id,
            ia_record_id: recordId,
            step_number: s.step_number,
            role_name: s.role_name,
            assigned_user_id: null,
            assigned_user_name: null,
            status: "aguardando",
            is_opinion_only: s.is_opinion_only,
          }));

      const { error: stepsInsertErr } = await supabaseAdmin
        .from("approval_steps")
        .insert(stepsToInsert);

      if (stepsInsertErr) {
        console.error("Erro ao inserir etapas automáticas:", stepsInsertErr);
      }
    }

    if (wfData.final_status !== "pendente") {
      return res.status(400).json({ error: "Esta IA já teve seu fluxo encerrado" });
    }

    // 4. Verificar se o usuário é o responsável pela etapa atual
    const { data: currentStepData } = await supabaseAdmin
      .from("approval_steps")
      .select("id, is_opinion_only, assigned_user_id")
      .eq("workflow_id", wfData.id)
      .eq("step_number", wfData.current_step)
      .maybeSingle();

    if (!currentStepData) {
      return res.status(404).json({ error: "Etapa atual não encontrada no workflow" });
    }

    // Aprovadores com permissões (Admin Override ou preenchimento de etapa não atribuída)
    const isRequesterAdmin = role === "admin";
    const isStepUnassigned = !currentStepData.assigned_user_id;
    const isAssignedToMe = currentStepData.assigned_user_id === user.id;

    if (!isAssignedToMe && !isRequesterAdmin && !(isStepUnassigned && ["admin", "moderator"].includes(role))) {
      return res.status(403).json({ 
        error: "Você não é o responsável pela etapa atual deste fluxo. Aguarde sua vez." 
      });
    }

    // 5. Registrar decisão
    const isOpinionOnly = currentStepData.is_opinion_only;
    const decisionStatus = isOpinionOnly ? "opiniao" : decision;

    await supabaseAdmin
      .from("approval_steps")
      .update({
        status: decisionStatus,
        comment: comment || null,
        decided_at: new Date().toISOString(),
        assigned_user_id: currentStepData.assigned_user_id || user.id,
        assigned_user_name: currentStepData.assigned_user_name || requesterProfile.full_name,
      })
      .eq("id", currentStepData.id);

    // 6. Contar total de etapas
    const { data: allSteps } = await supabaseAdmin
      .from("approval_steps")
      .select("step_number")
      .eq("workflow_id", wfData.id);

    const totalSteps = allSteps?.length ?? 5;
    const nextStep = wfData.current_step + 1;

    let finalStatus = "pendente";
    let newAuditStatus = "Pendente";
    let newStatusUso = "Em avaliação";

    if (!isOpinionOnly && decision === "negado") {
      finalStatus = "negado";
      newAuditStatus = "Negado";
      newStatusUso = "Não aprovado";
      await supabaseAdmin
        .from("approval_workflows")
        .update({ current_step: wfData.current_step, final_status: "negado", completed_at: new Date().toISOString() })
        .eq("id", wfData.id);
    } else if (nextStep > totalSteps) {
      finalStatus = "aprovado";
      newAuditStatus = "Aprovado";
      newStatusUso = "Aprovado";
      await supabaseAdmin
        .from("approval_workflows")
        .update({ current_step: nextStep, final_status: "aprovado", completed_at: new Date().toISOString() })
        .eq("id", wfData.id);
    } else {
      await supabaseAdmin
        .from("approval_workflows")
        .update({ current_step: nextStep })
        .eq("id", wfData.id);
    }

    // 7. Atualizar o registro da IA no banco
    const { data: iaRecord } = await supabaseAdmin
      .from("ia_records")
      .select("data")
      .eq("id", recordId)
      .single();

    if (iaRecord?.data) {
      const recordData = iaRecord.data as any;
      const actionLabel = decision === "aprovado"
        ? `Etapa ${wfData.current_step}/${totalSteps} aprovada por ${requesterProfile.full_name}`
        : `Etapa ${wfData.current_step}/${totalSteps} negada por ${requesterProfile.full_name}`;

      const updatedData = {
        ...recordData,
        statusAuditoria: newAuditStatus,
        statusUso: newStatusUso,
        historico: [{
          date: new Date().toISOString(),
          user: requesterProfile.full_name,
          action: actionLabel,
          message: comment || actionLabel
        }, ...(recordData.historico || [])]
      };

      await supabaseAdmin
        .from("ia_records")
        .update({
          data: updatedData,
          status: newAuditStatus,
          status_uso: newStatusUso,
        })
        .eq("id", recordId);
    }

    return res.json({ 
      success: true, 
      finalStatus,
      nextStep: finalStatus === "pendente" ? nextStep : null,
      message: finalStatus === "aprovado" ? "IA aprovada com sucesso!" 
             : finalStatus === "negado" ? "IA indeferida."
             : `Aprovado! Aguardando etapa ${nextStep}.`
    });

  } catch (err: any) {
    console.error("Erro no workflow/decide:", err);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
});

// Routing mapping
app.use("/api", router);
app.use("/.netlify/functions/api", router);

export { app };