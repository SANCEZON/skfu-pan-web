import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudents, getStudent, createStudent, updateStudent, deleteStudent } from '../services/students'
import { Database } from '../types/database.types'

type StudentInsert = Database['public']['Tables']['students']['Insert']
type StudentUpdate = Database['public']['Tables']['students']['Update']

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
  })
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id),
    enabled: !!id,
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (student: StudentInsert) => {
      // Нормализуем данные: undefined -> null
      const normalized: StudentInsert = {
        ...student,
        status: student.status || 'active',
        telegram: student.telegram ?? null,
        phone: student.phone ?? null,
        group_id: student.group_id ?? null,
      }
      return createStudent(normalized)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

export function useUpdateStudent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, student }: { id: string; student: StudentUpdate }) =>
      updateStudent(id, student),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] })
    },
  })
}

export function useDeleteStudent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

