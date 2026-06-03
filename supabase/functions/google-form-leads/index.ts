import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeKey = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getValue = (payload: Record<string, unknown>, aliases: string[]) => {
  const normalized = new Map(
    Object.entries(payload).map(([key, value]) => [normalizeKey(key), value]),
  );

  for (const alias of aliases) {
    const value = normalized.get(normalizeKey(alias));
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return null;
};

const toDate = (value: string | null) => {
  if (!value) return null;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 30000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + asNumber * 24 * 60 * 60 * 1000).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toDateOnly = (value: string | null) => {
  const iso = toDate(value);
  return iso ? iso.slice(0, 10) : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido" }, 405);
  }

  try {
    const body = await req.json();
    const sourceId = body.source_id ? Number(body.source_id) : null;
    const apiKey = String(body.api_key || body.secret || "");
    const fields = (body.fields && typeof body.fields === "object" ? body.fields : body) as Record<string, unknown>;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Faltan variables de entorno de Supabase" }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let source = null;
    if (sourceId) {
      const { data, error } = await supabaseAdmin
        .from("ventas_formularios_google")
        .select("*")
        .eq("id", sourceId)
        .maybeSingle();

      if (error) return jsonResponse({ error: error.message }, 500);
      source = data;
    }

    const globalSecret = Deno.env.get("GOOGLE_FORM_LEADS_SECRET") ?? "";
    const sourceSecret = source?.webhook_secret ?? "";
    const validSecret = [globalSecret, sourceSecret].filter(Boolean).some((secret) => secret === apiKey);
    if (!validSecret) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }

    const marcaTemporal = getValue(fields, ["Marca temporal", "timestamp", "fecha registro", "created_at"]);
    const telefono = getValue(fields, ["numero de telefono", "telefono", "celular", "whatsapp"]);
    const correo = getValue(fields, ["correo electronico", "email", "correo"]);
    const nombre = getValue(fields, ["NOMBRES Y APELLIDOS COMPLETOS", "nombre", "nombres", "cliente"]);
    const externalId = String(body.external_id || `${sourceId || "sin-fuente"}:${marcaTemporal || ""}:${telefono || ""}:${correo || ""}`);

    if (!telefono && !correo) {
      return jsonResponse({ error: "El lead necesita telefono o correo" }, 400);
    }

    const lead = {
      fuente_id: source?.id ?? sourceId,
      external_id: externalId,
      evento_codigo: body.evento_codigo || source?.evento_codigo || null,
      evento_nombre: body.evento_nombre || source?.evento_nombre || null,
      marca_temporal: toDate(marcaTemporal),
      nombre,
      telefono,
      documento: getValue(fields, ["dni o cedula de identidad o carnet de extranjeria", "dni", "documento"]),
      correo,
      profesion: getValue(fields, ["profesion", "profesion u ocupacion", "ocupacion", "cargo"]),
      departamento: getValue(fields, ["en que departamento te encuentras", "departamento"]),
      provincia: getValue(fields, ["provincia", "distrito", "ciudad"]),
      institucion: getValue(fields, ["institucion", "centro laboral", "entidad"]),
      canal: getValue(fields, ["canal", "campana", "medio"]) || source?.canal_default || "Google Forms",
      origen: getValue(fields, ["ORIGEN", "origen"]) || source?.origen_default || "FORMULARIO",
      fase: getValue(fields, ["FASE", "fase"]) || "LEAD NUEVO",
      observacion: getValue(fields, ["OBSERVACION", "observaciones"]),
      cierre: getValue(fields, ["CIERRE", "cierre"]) || "ACTIVO",
      fecha_contacto: toDateOnly(getValue(fields, ["FECHA DE CONTACTO", "fecha contacto"])),
      comentario_1: getValue(fields, ["COMENTARIO 1", "comentario 1"]),
      comentario_2: getValue(fields, ["COMENTARIO 2", "comentario 2"]),
      raw_payload: fields,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("ventas_leads")
      .upsert(lead, { onConflict: "fuente_id,external_id" })
      .select("id")
      .single();

    if (error) {
      return jsonResponse({ success: false, error: error.message }, 500);
    }

    if (source?.id) {
      await supabaseAdmin
        .from("ventas_formularios_google")
        .update({ estado: "activo", ultima_sincronizacion: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", source.id);
    }

    return jsonResponse({ success: true, lead_id: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Solicitud invalida";
    return jsonResponse({ success: false, error: message }, 400);
  }
});
