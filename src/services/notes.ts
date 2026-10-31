import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

export type Note = Database['public']['Tables']['notes']['Row']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type NoteUpdate = Database['public']['Tables']['notes']['Update']

export async function getNotes(userId: string): Promise<Note[]> {
  if (!userId) return []

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function createNote(note: NoteInsert): Promise<Note> {
  const { data, error } = await supabase.from('notes').insert(note).select().single()
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function updateNote(id: string, note: NoteUpdate): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update(note)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
