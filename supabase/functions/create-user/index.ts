import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = ["admin@rebagliati.com", "recursoshumanosrebagliati@gmail.com"];
const ADMIN_PERMISSIONS = ["admin usuarios", "Administrar Usuarios", "Administrar usuarios", "Admin Usuarios", "admin_usuarios"];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Faltan variables de entorno de Supabase" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: "No autenticado" }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const requester = authData.user;
    if (!ADMIN_EMAILS.includes(String(requester.email || "").toLowerCase())) {
      const { data: permisoAdmin } = await supabaseAdmin
        .from("permisos_usuarios")
        .select("modulo")
        .eq("user_id", requester.id)
        .eq("puede_ver", true)
        .in("modulo", ADMIN_PERMISSIONS)
        .maybeSingle();

      if (!permisoAdmin) {
        return jsonResponse({ error: "No tienes permisos para crear usuarios" }, 403);
      }
    }

    const { email, password, nombre, cargo, rol, perfil_auto, permisos } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedName = String(nombre || "").trim();
    const normalizedCargo = String(cargo || "").trim();
    const normalizedRol = String(rol || "").trim();

    if (!normalizedEmail || !password) {
      return jsonResponse({ error: "Correo y contrasena son obligatorios" }, 400);
    }

    if (String(password).length < 6) {
      return jsonResponse({ error: "La contrasena debe tener al menos 6 caracteres" }, 400);
    }

    let { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: normalizedName ? { nombre: normalizedName } : undefined,
    });

    if (error && /already|registered|exists|User already/i.test(error.message || "")) {
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (usersError) throw usersError;
      const existingUser = usersData.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
      if (!existingUser) throw error;
      data = { user: existingUser };
    } else if (error) {
      throw error;
    }

    const profilePayload = {
      id: data.user.id,
      email: normalizedEmail,
      nombre: normalizedName || normalizedEmail.split("@")[0],
      cargo: normalizedCargo || null,
      rol: normalizedRol || null,
      perfil_auto: perfil_auto !== false,
    };

    let profileResponse = await supabaseAdmin
      .from("perfiles_usuarios")
      .upsert(profilePayload, { onConflict: "id" });

    if (
      profileResponse.error &&
      /cargo|rol|perfil_auto|schema cache|column/i.test(profileResponse.error.message || "")
    ) {
      profileResponse = await supabaseAdmin
        .from("perfiles_usuarios")
        .upsert(
          {
            id: profilePayload.id,
            email: profilePayload.email,
            nombre: profilePayload.nombre,
          },
          { onConflict: "id" },
        );
    }

    if (profileResponse.error) throw profileResponse.error;

    const permisosActivos = Array.isArray(permisos)
      ? permisos
          .map((permiso) => String(permiso || "").trim())
          .filter(Boolean)
      : [];

    if (permisosActivos.length > 0) {
      await supabaseAdmin.from("permisos_usuarios").delete().eq("user_id", data.user.id);

      const { error: permisosError } = await supabaseAdmin.from("permisos_usuarios").insert(
        permisosActivos.map((modulo) => ({
          user_id: data.user.id,
          modulo,
          puede_ver: true,
        })),
      );
      if (permisosError) throw permisosError;
    }

    return jsonResponse({ success: true, user: data.user });
  } catch (error) {
    console.error("create-user error:", error);
    return jsonResponse({ error: error.message || "Error interno" }, 400);
  }
});
