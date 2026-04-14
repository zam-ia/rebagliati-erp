import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'https://esm.sh/resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, x-client-version',
}

serve(async (req) => {
  // 1. Manejo de CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // Solo permitimos POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }

  try {
    const { email, nombre, pdfBase64, mes } = await req.json()
    
    // Validación básica de datos
    if (!email || !pdfBase64) {
      return new Response(JSON.stringify({ error: 'Faltan datos obligatorios (email o PDF)' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. Limpieza robusta del Base64
    // Eliminamos el prefijo 'data:application/pdf;base64,' si existe y cualquier espacio en blanco
    let cleanBase64 = pdfBase64;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    cleanBase64 = cleanBase64.replace(/\s/g, '');

    // 3. Envío a Resend con el dominio oficial ya verificado
    const { data, error } = await resend.emails.send({
      // Usamos el dominio que ya validaste con tu programador
      from: 'Consorcio Rebagliati <notificaciones@rebagliatidiplomados.edu.pe>', 
      to: [email],
      subject: `Boleta de Pago - ${mes} - ${nombre}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #1e40af;">Boleta de Pago Digital</h2>
          <p>Estimado(a) <strong>${nombre}</strong>,</p>
          <p>Se adjunta su boleta de pago correspondiente al periodo de <strong>${mes}</strong>.</p>
          <br>
          <hr style="border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            Este es un envío automático de la plataforma ERP de <strong>Consorcio Rebagliati Diplomados SAC</strong>.<br>
            Por favor, no responda a este correo.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `Boleta_${mes}_${nombre.replace(/\s+/g, '_')}.pdf`,
          content: cleanBase64,
        }
      ]
    })

    // Manejo de errores de la API de Resend
    if (error) {
      console.error('Error de Resend:', error)
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Éxito total
    return new Response(JSON.stringify({ success: true, data }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
    
  } catch (error) {
    console.error('Error crítico en la Edge Function:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})