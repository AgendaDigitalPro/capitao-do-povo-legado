import { supabase } from "@/integrations/supabase/client";

export async function trackEtapa(etapa: string) {
  try {
    const sessionId = localStorage.getItem('foto_camarada_session_id') ?? 'anonimo';
    
    await supabase.from('funil_analytics' as any).insert({
      etapa,
      session_id: sessionId,
      created_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      dispositivo: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    });
  } catch (error) {
    console.error('Erro ao trackear etapa:', error);
  }
}
