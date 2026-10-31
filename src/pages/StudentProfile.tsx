import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudent } from '../hooks/useStudents'
import { deleteStudentAbsences } from '../services/attendance'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { format, subDays, startOfMonth } from 'date-fns'
import { translateStatus } from '../utils/statusTranslations'
import { supabase } from '../lib/supabase'

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [showResetAbsencesModal, setShowResetAbsencesModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')

  const { data: student, isLoading } = useStudent(id || '')

  const now = new Date()
  const weekStart = format(subDays(now, 7), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')

  const { data: attendanceDetails } = useQuery({
    queryKey: ['student-attendance-details', id],
    queryFn: async () => {
      if (!id) {
        return []
      }
      const { data, error } = await supabase
        .from('attendance_records')
        .select(
          `
            id,
            status,
            note,
            created_at,
            session_id,
            schedule_sessions:schedule_sessions(
              date,
              start_time,
              end_time,
              schedules:schedules(
                subjects:subjects(name)
              )
            ),
            absence_reasons(name)
          `
        )
        .eq('student_id', id)
        .neq('status', 'present')
        .order('date', { referencedTable: 'schedule_sessions', ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return (
        data?.map((record: any) => ({
          ...record,
          session_date: record.schedule_sessions?.date || null,
          start_time: record.schedule_sessions?.start_time || null,
          subject_name: record.schedule_sessions?.schedules?.subjects?.name || null,
          reason_name: record.absence_reasons?.name || null,
        })) || []
      )
    },
    enabled: !!id,
  })

  const stats = useMemo(() => {
    if (!attendanceDetails) {
      return {
        total: 0,
        week: 0,
        month: 0,
      }
    }

    const total = attendanceDetails.length
    const week = attendanceDetails.filter(
      (record: any) => record.session_date && record.session_date >= weekStart
    ).length
    const month = attendanceDetails.filter(
      (record: any) => record.session_date && record.session_date >= monthStart
    ).length

    return { total, week, month }
  }, [attendanceDetails, weekStart, monthStart])

  const deleteAbsencesMutation = useMutation({
    mutationFn: () => deleteStudentAbsences(id!),
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance-details', id] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-report'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setShowResetAbsencesModal(false)
      setResetConfirmText('')
      alert(`Удалено пропусков: ${deletedCount}`)
    },
    onError: (error: any) => {
      alert(`Ошибка при сбросе пропусков: ${error.message || 'Неизвестная ошибка'}`)
    },
  })

  if (isLoading) {
    return (
      <div>
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div>
        <div className="text-center py-8 text-gray-500">Студент не найден</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{student.full_name}</h1>
          <p className="text-gray-600 mt-2">
            {student.phone && `📞 ${student.phone}`} {student.telegram && `• 📱 ${student.telegram}`}
          </p>
        </div>
        {stats.total > 0 && (
          <Button
            variant="danger"
            onClick={() => setShowResetAbsencesModal(true)}
            className="text-sm"
          >
            Сбросить пропуски
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Всего пропусков</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.total}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Пропусков за неделю</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.week}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Пропусков за месяц</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.month}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">История пропусков</h2>
        {attendanceDetails && attendanceDetails.length > 0 ? (
          <div className="space-y-3">
            {attendanceDetails.map((record: any) => (
              <div
                key={record.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.subject_name || 'Предмет'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {record.session_date &&
                        format(new Date(record.session_date), 'd MMMM yyyy')}{' '}
                      • {record.start_time}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Статус: {translateStatus(record.status)} • Причина:{' '}
                      {record.reason_name || 'не указана'}
                    </p>
                    {record.note && (
                      <p className="text-sm text-gray-500 mt-1">Заметка: {record.note}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Нет пропусков</p>
        )}
      </Card>

      {/* Modal for resetting absences */}
      <Modal
        isOpen={showResetAbsencesModal}
        onClose={() => {
          setShowResetAbsencesModal(false)
          setResetConfirmText('')
        }}
        title="Сбросить пропуски"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium mb-2">⚠️ Внимание!</p>
            <p className="text-red-700 text-sm">
              Это действие удалит все пропуски для студента <strong>{student.full_name}</strong>. Это действие нельзя отменить.
            </p>
            {stats.total > 0 && (
              <p className="text-red-700 text-sm mt-2">
                Будет удалено пропусков: <strong>{stats.total}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Для подтверждения введите <strong>СБРОСИТЬ</strong>:
            </label>
            <Input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="СБРОСИТЬ"
              className="w-full"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowResetAbsencesModal(false)
                setResetConfirmText('')
              }}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (resetConfirmText === 'СБРОСИТЬ') {
                  deleteAbsencesMutation.mutate()
                }
              }}
              disabled={resetConfirmText !== 'СБРОСИТЬ' || deleteAbsencesMutation.isPending}
            >
              {deleteAbsencesMutation.isPending ? 'Сброс...' : 'Сбросить пропуски'}
            </Button>
          </div>

          {deleteAbsencesMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                Ошибка: {deleteAbsencesMutation.error instanceof Error ? deleteAbsencesMutation.error.message : 'Неизвестная ошибка'}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
