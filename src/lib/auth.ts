import { supabase } from "@/lib/supabaseClient";
import { hasSupabaseConfig } from "@/lib/supabaseClient";
import { getDemoSession, signInDemo, signOutDemo } from "@/lib/demoData";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile() {
  if (!hasSupabaseConfig) {
    return { ...getDemoSession(), error: null };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null, error: userError };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile, error };
}

export async function signInWithAccount(account: string, password: string) {
  if (!hasSupabaseConfig) {
    const { profile, error } = signInDemo(account, password);
    return { profile, error };
  }

  const email = account.includes("@") ? account : `${account}@daka.local`;
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { profile: null, error: error.message };
  }

  const { profile, error: profileError } = await getCurrentProfile();

  if (!profile || profileError) {
    return {
      profile: null,
      error: "已登录，但没有找到 profiles 角色记录。请先执行 seed SQL。"
    };
  }

  return { profile, error: null };
}

export async function signOutCurrentUser() {
  if (!hasSupabaseConfig) {
    signOutDemo();
    return;
  }

  await supabase.auth.signOut();
}

export function getRoleHome(role: Profile["role"]) {
  return role === "admin" ? "/admin" : "/app";
}
