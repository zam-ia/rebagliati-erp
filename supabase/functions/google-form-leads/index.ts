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

const extractSheetId = (url: string | null) => {
  const match = String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || null;
};

const parseCsv = (csv: string) => {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
};

const rowsFromCsv = (csv: string) => {
  const rows = parseCsv(csv);
  const headers = rows.shift() || [];
  return rows.map((row) =>
    headers.reduce<Record<string, string>>((acc, header, index) => {
      if (String(header || "").trim()) acc[header] = row[index] || "";
      return acc;
    }, {})
  );
};

const buildLead = (
  fields: Record<string, unknown>,
  source: Record<string, unknown> | null,
  sourceId: number | null,
  body: Record<string, unknown>,
) => {
  const marcaTemporal = getValue(fields, ["Marca temporal", "timestamp", "fecha registro", "created_at"]);
  const telefono = getValue(fields, ["numero de telefono", "telefono", "celular", "whatsapp"]);
  const correo = getValue(fields, ["correo electronico", "email", "correo"]);
  const nombre = getValue(fields, ["NOMBRES Y APELLIDOS COMPLETOS", "nombre", "nombres", "cliente"]);
  const externalId = String(body.external_id || `${sourceId || "sin-fuente"}:${marcaTemporal || ""}:${telefono || ""}:${correo || ""}`);

  return {
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
    canal: getValue(fields, ["canal", "campana", "medio"]) || source?.canal_default || "Google Sheets",
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
    const action = String(body.action || "upsert_lead");
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

    if (action === "sync_sheet") {
      if (!source) return jsonResponse({ error: "Fuente no encontrada" }, 404);
      const sheetId = extractSheetId(String(source.sheet_url || body.sheet_url || ""));
      if (!sheetId) return jsonResponse({ error: "La fuente no tiene un enlace valido de Google Sheets" }, 400);

      const gid = String(source.sheet_gid || body.sheet_gid || "0");
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;
      const csvResponse = await fetch(csvUrl);
      if (!csvResponse.ok) {
        return jsonResponse({ error: `No se pudo leer Google Sheets (${csvResponse.status})` }, 502);
      }

      const rows = rowsFromCsv(await csvResponse.text());
      const leads = rows
        .map((row, index) => buildLead(row, source, sourceId, { ...body, external_id: `${sourceId}:${index + 2}:${getValue(row, ["Marca temporal"]) || ""}:${getValue(row, ["numero de telefono", "telefono"]) || ""}` }))
        .filter((lead) => lead.telefono || lead.correo);

      if (!leads.length) return jsonResponse({ success: true, inserted: 0, skipped: rows.length });

      const { error } = await supabaseAdmin
        .from("ventas_leads")
        .upsert(leads, { onConflict: "fuente_id,external_id" });

      if (error) return jsonResponse({ success: false, error: error.message }, 500);

      await supabaseAdmin
        .from("ventas_formularios_google")
        .update({ estado: "activo", ultima_sincronizacion: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", source.id);

      return jsonResponse({ success: true, inserted: leads.length, skipped: rows.length - leads.length });
    }

    const lead = buildLead(fields, source, sourceId, body);

    if (!lead.telefono && !lead.correo) {
      return jsonResponse({ error: "El lead necesita telefono o correo" }, 400);
    }

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
