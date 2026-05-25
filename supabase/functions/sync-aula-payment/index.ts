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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { monto, metodo, referencia, fecha_pago, curso_id, api_key } = body;

    if (api_key !== Deno.env.get("AULA_WEBHOOK_SECRET")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const montoNumber = Number(monto);
    if (!Number.isFinite(montoNumber) || montoNumber <= 0) {
      return jsonResponse({ error: "Monto invalido" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { error } = await supabaseAdmin.from("ingresos").insert({
      fecha: fecha_pago ? String(fecha_pago).split("T")[0] : new Date().toISOString().split("T")[0],
      concepto: `Pago curso: ${curso_id || "virtual"}`,
      area: "Aula Virtual",
      metodo: metodo || "No especificado",
      monto: montoNumber,
      estado: "Cobrado",
      referencia: referencia || null,
      origen: "aula_virtual",
    });

    if (error) {
      return jsonResponse({ success: false, error: error.message }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message || "Invalid request" }, 400);
  }
});
