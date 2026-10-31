import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function getStudent(id: string): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function createStudent(student: StudentInsert): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateStudent(id: string, student: StudentUpdate): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .update(student)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
