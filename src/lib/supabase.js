import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fuwrayxwjldtawtsljro.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1d3JheXh3amxkdGF3dHNsanJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNzU1NDEsImV4cCI6MjA2OTg1MTU0MX0.4xYmPE3OLkqduOuQk_QwZQADRVf8oVAkyUiMjf9ZRpc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})