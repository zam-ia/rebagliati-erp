import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info, x-kommo-secret",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const first = (value: unknown) => Array.isArray(value) ? value[0] : value;

const pickLead = (payload: Record<string, unknown>) => {
  const embedded = payload._embedded as Record<string, unknown> | undefined;
  const leads = embedded?.leads || payload.leads || payload.lead;
  return first(leads) as Record<string, unknown> | undefined;
};

const pickContact = (lead: Record<string, unknown>) => {
  const embedded = lead._embedded as Record<string, unknown> | undefined;
  return first(embedded?.contacts) as Record<string, unknown> | undefined;
};

const customValue = (lead: Record<string, unknown>, names: string[]) => {
  const fields = lead.custom_fields_values as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(fields)) return null;

  const target = fields.find((field) => names.some((name) => String(field.field_name || "").toLowerCase().includes(name.toLowerCase())));
  const values = target?.values as Array<Record<string, unknown>> | undefined;
  return values?.[0]?.value ? String(values[0].value) : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido" }, 405);
  }

  const expectedSecret = Deno.env.get("KOMMO_WEBHOOK_SECRET") ?? "";
  const receivedSecret = req.headers.get("x-kommo-secret") || new URL(req.url).searchParams.get("secret") || "";
  if (expectedSecret && expectedSecret !== receivedSecret) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  try {
    const payload = await req.json() as Record<string, unknown>;
    const lead = pickLead(payload);
    if (!lead?.id) {
      return jsonResponse({ error: "Payload KOMMO sin lead" }, 400);
    }

    const contact = pickContact(lead) || {};
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const leadId = String(lead.id);
    const contactId = contact.id ? String(contact.id) : null;
    const createdAt = Number(lead.created_at || lead.updated_at || 0);
    const updatedAt = Number(lead.updated_at || lead.created_at || 0);
    const createdIso = createdAt ? new Date(createdAt * 1000).toISOString() : new Date().toISOString();
    const updatedIso = updatedAt ? new Date(updatedAt * 1000).toISOString() : new Date().toISOString();

    const row = {
      external_id: `kommo:${leadId}`,
      kommo_lead_id: leadId,
      kommo_contact_id: contactId,
      kommo_pipeline_id: lead.pipeline_id ? String(lead.pipeline_id) : null,
      kommo_status_id: lead.status_id ? String(lead.status_id) : null,
      kommo_responsible_user_id: lead.responsible_user_id ? String(lead.responsible_user_id) : null,
      nombre: String(contact.name || lead.name || "Lead KOMMO"),
      telefono: customValue(contact, ["phone", "telefono", "celular"]) || customValue(lead, ["phone", "telefono", "celular"]),
      correo: customValue(contact, ["email", "correo"]) || customValue(lead, ["email", "correo"]),
      canal: "KOMMO",
      origen: customValue(lead, ["origen", "source", "utm_source"]) || "KOMMO",
      evento_codigo: customValue(lead, ["codigo", "evento codigo"]),
      evento_nombre: customValue(lead, ["evento", "curso", "diplomado"]),
      fase: "LEAD NUEVO",
      cierre: "ACTIVO",
      marca_temporal: createdIso,
      last_activity_at: updatedIso,
      raw_payload: payload,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("ventas_leads")
      .upsert(row, { onConflict: "external_id" })
      .select("id")
      .single();

    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, lead_id: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Solicitud invalida";
    return jsonResponse({ success: false, error: message }, 400);
  }
});
