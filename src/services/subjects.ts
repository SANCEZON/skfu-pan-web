import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

export type Subject = Database['public']['Tables']['subjects']['Row']
export type SubjectInsert = Database['public']['Tables']['subjects']['Insert']

export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function createSubject(subject: SubjectInsert): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').insert(subject).select().single()
  if (error) {
    throw new Error(error.message)
  }
  return data
}
