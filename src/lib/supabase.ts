import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  throw new Error(
    `Отсутствуют переменные окружения: ${missing.join(', ')}. ` +
    `Проверьте файл .env.local или .env в корне проекта.`
  )
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch {
  throw new Error(`Неверный формат VITE_SUPABASE_URL: ${supabaseUrl}`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})


