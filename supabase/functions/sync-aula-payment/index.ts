import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Solo permite POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const body = await req.json();
  const { monto, metodo, referencia, fecha_pago, curso_id, api_key } = body;

  // Autenticación simple (recomendado usar una clave secreta)
  if (api_key !== Deno.env.get("AULA_WEBHOOK_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Inicializa cliente de Supabase con Service Role (para saltar RLS)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabaseAdmin.from("ingresos").insert({
    fecha: fecha_pago ? fecha_pago.split("T")[0] : new Date().toISOString().split("T")[0],
    concepto: `Pago curso: ${curso_id || "virtual"}`,
    area: "Aula Virtual",
    metodo,
    monto,
    estado: "Cobrado",
    referencia,
    origen: "aula_virtual",
  });

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});