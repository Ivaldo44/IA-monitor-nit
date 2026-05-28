import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserProfile } from "../types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error && error.code !== "PGRST116") {
        console.error("Erro ao buscar perfil:", error);
      }
      
      setProfile(data || null);
    } catch (err) {
      console.error("Erro inesperado ao buscar perfil:", err);
    }
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Erro na sessão inicial:", error);
        // Se o erro for de token inválido/expirado, limpamos os tokens locais e forçamos logout
        if (
          error.message?.includes("Refresh Token") || 
          error.message?.includes("not found") ||
          error.status === 400 ||
          error.status === 401
        ) {
          try {
            // Limpa chaves do Supabase no localStorage para evitar loop infinito
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith("sb-") || key.includes("supabase.auth"))) {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {
            console.error("Erro ao limpar localStorage:", e);
          }
          supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
      }
      
      const session = data?.session ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Erro fatal ao carregar getSession:", err);
      // Fallback em caso de erro grave (rejeição de Promise por exemplo)
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro ao sair:", err);
    } finally {
      // Forçar limpeza local mesmo se o servidor falhar
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
