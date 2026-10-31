import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher } from '../services/teachers'
import { Database } from '../types/database.types'

type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
type TeacherUpdate = Database['public']['Tables']['teachers']['Update']

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: getTeachers,
  })
}

export function useTeacher(id: string) {
  return useQuery({
    queryKey: ['teacher', id],
    queryFn: () => getTeacher(id),
    enabled: !!id,
  })
}

export function useCreateTeacher() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (teacher: TeacherInsert) => createTeacher(teacher),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
    },
  })
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, teacher }: { id: string; teacher: TeacherUpdate }) =>
      updateTeacher(id, teacher),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      queryClient.invalidateQueries({ queryKey: ['teacher', variables.id] })
    },
  })
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
    },
  })
}

