import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

export type Teacher = Database['public']['Tables']['teachers']['Row']
export type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
export type TeacherUpdate = Database['public']['Tables']['teachers']['Update']

export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function getTeacher(id: string): Promise<Teacher> {
  const { data, error } = await supabase.from('teachers').select('*').eq('id', id).single()
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function createTeacher(teacher: TeacherInsert): Promise<Teacher> {
  const { data, error } = await supabase.from('teachers').insert(teacher).select().single()
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function updateTeacher(id: string, teacher: TeacherUpdate): Promise<Teacher> {
  const { data, error } = await supabase
    .from('teachers')
    .update(teacher)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteTeacher(id: string): Promise<void> {
  const { error } = await supabase.from('teachers').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
