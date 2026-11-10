import { supabase } from './supabase'

export async function logHistory(deystvie: string, chto: string, poddon_nomer: number | null, opisanie: string) {
  const { data: { user } } = await supabase.auth.getUser()
  
  await supabase.from('istoriya').insert([{
    user_email: user?.email || 'Неизвестно',
    deystvie,
    chto,
    poddon_nomer,
    opisanie
  }])
}