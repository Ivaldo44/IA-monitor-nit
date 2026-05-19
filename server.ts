import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Supabase Clients
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Client for general operations (honors RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client with Service Role (bypasses RLS) - USE WITH CAUTION
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// API Routes
app.post("/api/admin/update-role", async (req, res) => {
  const { userId, newRole } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1. Verify the requester's identity and if they are an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // 2. Check if the requester is an admin in the profiles table
    const { data: requesterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || requesterProfile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: You are not an admin" });
    }

    // 3. Perform the update using the ADMIN client (bypasses RLS)
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Server misconfigured: Service Role Key missing" });
    }

    console.log(`[Admin] Updating user ${userId} to role ${newRole}`);

    const { data, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase Admin Update Error:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({ success: true, profile: data });
  } catch (err) {
    console.error("Critical error in update-role:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/delete-user", async (req, res) => {
  const { userId } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !supabaseAdmin) {
    return res.status(401).json({ error: "Unauthorized or server misconfigured" });
  }

    try {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) return res.status(401).json({ error: "Invalid token" });

      // Verificar se quem solicita é admin
      const { data: requester } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (requester?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

      console.log(`[Admin] Permanently deleting user ${userId}`);

      // 1. Limpar mensagens vinculadas ao usuário
      await supabaseAdmin.from("messages").delete().eq("sender_id", userId);
      await supabaseAdmin.from("messages").delete().eq("recipient_id", userId);

      // 2. Limpar referências em ia_records
      await supabaseAdmin.from("ia_records").update({ authorized_by: null }).eq("authorized_by", userId);
      await supabaseAdmin.from("ia_records").update({ owner_id: null }).eq("owner_id", userId);

      // 3. Limpar referências em outros perfis
      await supabaseAdmin.from("profiles").update({ authorized_by: null }).eq("authorized_by", userId);

      // 4. Limpar Storage (Opcional - tenta remover referências em storage.objects se o admin puder)
      try {
        await supabaseAdmin.rpc('delete_user_storage_objects', { user_id: userId });
      } catch (e) {
        // @ts-ignore
        await supabaseAdmin.from('storage.objects').delete().eq('owner', userId).catch(() => {});
      }

      // 5. Deletar o perfil do usuário
      const { error: profileDeleteError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
      if (profileDeleteError) {
        console.error("Profile Delete Error:", profileDeleteError);
        return res.status(500).json({ error: `Erro ao apagar perfil: ${profileDeleteError.message}` });
      }

      // 6. Deletar do Auth (Supabase Auth)
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
         console.error("Auth Delete Error:", authDeleteError);
         return res.status(500).json({ 
           error: `Erro ao apagar conta no Auth: ${authDeleteError.message}. Verifique se existem registros vinculados a este usuário em outras tabelas.`,
           details: authDeleteError
         });
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Critical error during user deletion flow:", err);
      return res.status(500).json({ error: err.message });
    }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
