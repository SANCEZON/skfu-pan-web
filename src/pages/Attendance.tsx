import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScheduleSessions } from '../services/schedules'
import { getStudents } from '../services/students'
import { getAttendanceForSession, bulkUpsertAttendanceRecords, getAbsenceReasons } from '../services/attendance'
import { createReport } from '../services/reports'
import { useAuth } from '../contexts/AuthContext'
import { logActivity } from '../services/activityLogs'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { format, addDays, subDays } from 'date-fns'
import type { AttendanceRecordInsert } from '../services/attendance'
import type { Student } from '../services/students'

interface StudentAttendance extends Omit<Student, 'status'> {
  status: 'present' | 'absent' | 'late' | 'vacation' | 'sick'
  reason_id?: string
  note?: string
}

export default function Attendance() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const [searchTerm, setSearchTerm] = useState('')
  const [studentsAttendance, setStudentsAttendance] = useState<StudentAttendance[]>([])
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  const weekEnd = format(addDays(new Date(), 30), 'yyyy-MM-dd')

  const { data: availableSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['available-sessions', weekStart, weekEnd],
    queryFn: () => getScheduleSessions(weekStart, weekEnd),
  })

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId || !availableSessions) return null
      return availableSessions.find((s: any) => s.id === sessionId) || null
    },
    enabled: !!sessionId && !!availableSessions,
  })

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
  })

  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance', sessionId],
    queryFn: () => getAttendanceForSession(sessionId!),
    enabled: !!sessionId,
  })

  const { data: absenceReasons } = useQuery({
    queryKey: ['absence-reasons'],
    queryFn: getAbsenceReasons,
  })

  useEffect(() => {
    if (students) {
      const attendanceMap = new Map(
        existingAttendance?.map((a: any) => [
          a.student_id,
          {
            status: a.status,
            reason_id: a.reason_id,
            note: a.note,
          },
        ]) || []
      )

      const initialAttendance: StudentAttendance[] = students
        .filter((s) => s.status === 'active')
        .map((student) => ({
          ...student,
          status: (attendanceMap.get(student.id)?.status as any) || 'present',
          reason_id: attendanceMap.get(student.id)?.reason_id,
          note: attendanceMap.get(student.id)?.note,
        }))

      setStudentsAttendance(initialAttendance)
    }
  }, [students, existingAttendance])

  const saveMutation = useMutation({
    mutationFn: async (records: AttendanceRecordInsert[]) => {
      return bulkUpsertAttendanceRecords(records)
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', sessionId] })
      // Инвалидируем кэш недельного отчёта, чтобы изменения сразу отображались
      queryClient.invalidateQueries({ queryKey: ['weekly-report'] })
      if (sessionId && user) {
        await logActivity({
          userId: user.id,
          action: 'attendance_updated',
          entityType: 'session',
          entityId: sessionId,
          details: { записей: variables.length, статус: 'черновик' },
        })
      }
    },
  })

  const submitReportMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !user) throw new Error('Missing session or user')
      
      const records: AttendanceRecordInsert[] = studentsAttendance.map((sa) => ({
        session_id: sessionId,
        student_id: sa.id,
        status: sa.status,
        reason_id: sa.reason_id || null,
        note: sa.note || null,
      }))

      await bulkUpsertAttendanceRecords(records)
      await createReport({
        session_id: sessionId,
        created_by: user.id,
      })
      return records.length
    },
    onSuccess: async (count) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['attendance', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      // Инвалидируем кэш недельного отчёта, чтобы изменения сразу отображались
      queryClient.invalidateQueries({ queryKey: ['weekly-report'] })
      if (sessionId && user) {
        await logActivity({
          userId: user.id,
          action: 'attendance_updated',
          entityType: 'session',
          entityId: sessionId,
          details: { записей: count, статус: 'отчёт отправлен' },
        })
      }
      alert('Отчёт успешно отправлен!')
    },
    onError: (error: any) => {
      console.error('Error submitting report:', error)
      alert(`Ошибка при отправке отчёта: ${error.message || 'Неизвестная ошибка'}`)
    },
  })

  const handleStatusChange = (studentId: string, status: StudentAttendance['status']) => {
    setStudentsAttendance((prev) =>
      prev.map((sa) =>
        sa.id === studentId
          ? { ...sa, status, reason_id: status === 'present' ? undefined : sa.reason_id }
          : sa
      )
    )
  }

  const handleReasonChange = (studentId: string, reasonId: string) => {
    setStudentsAttendance((prev) =>
      prev.map((sa) => (sa.id === studentId ? { ...sa, reason_id: reasonId } : sa))
    )
  }

  const handleNoteChange = (studentId: string, note: string) => {
    setStudentsAttendance((prev) =>
      prev.map((sa) => (sa.id === studentId ? { ...sa, note } : sa))
    )
  }

  const handleMarkAll = (status: 'present' | 'absent') => {
    setStudentsAttendance((prev) =>
      prev.map((sa) => ({
        ...sa,
        status,
        reason_id: status === 'present' ? undefined : sa.reason_id,
      }))
    )
  }

  const handleSave = async () => {
    if (!sessionId) return

    const records: AttendanceRecordInsert[] = studentsAttendance.map((sa) => ({
      session_id: sessionId,
      student_id: sa.id,
      status: sa.status,
      reason_id: sa.reason_id || null,
      note: sa.note || null,
    }))

    await saveMutation.mutateAsync(records)
    alert('Изменения сохранены!')
  }

  const filteredStudents = studentsAttendance.filter((sa) =>
    sa.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const absentCount = studentsAttendance.filter((sa) => sa.status !== 'present').length

  if (!sessionId) {
    const todaySessions = availableSessions?.filter((s: any) => s.date === today) || []
    const upcomingSessions = availableSessions?.filter((s: any) => s.date > today) || []
    const pastSessions = availableSessions?.filter((s: any) => s.date < today) || []

    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Проверка посещаемости</h1>
        
        {todaySessions.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Сегодняшние пары</h2>
            <div className="space-y-3">
              {todaySessions.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.subject_name || 'Предмет'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {session.teacher_name ? session.teacher_name : 'Преподаватель не указан'} • {session.start_time} - {session.end_time}
                      {session.room && ` • ${session.room}`}
                    </p>
                  </div>
                  <Link to={`/attendance?session=${session.id}`}>
                    <Button>Отметить</Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        )}

        {upcomingSessions.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ближайшие пары</h2>
            <div className="space-y-3">
              {upcomingSessions.slice(0, 10).map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.subject_name ? session.subject_name : 'Предмет не указан'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(new Date(session.date), 'd MMMM yyyy')} • {session.start_time} - {session.end_time}
                      {session.room && ` • ${session.room}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {session.teacher_name ? session.teacher_name : 'Преподаватель не указан'}
                    </p>
                  </div>
                  <Link to={`/attendance?session=${session.id}`}>
                    <Button>Отметить</Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        )}

        {pastSessions.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Прошедшие пары</h2>
            <div className="space-y-3">
              {pastSessions.slice(-10).reverse().map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.subject_name ? session.subject_name : 'Предмет не указан'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(new Date(session.date), 'd MMMM yyyy')} • {session.start_time} - {session.end_time}
                      {session.room && ` • ${session.room}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {session.teacher_name ? session.teacher_name : 'Преподаватель не указан'}
                    </p>
                  </div>
                  <Link to={`/attendance?session=${session.id}`}>
                    <Button variant="secondary">Отметить</Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        )}

        {sessionsLoading ? (
          <Card>
            <p className="text-gray-600 text-center py-8">Загрузка пар...</p>
          </Card>
        ) : (!availableSessions || availableSessions.length === 0) ? (
          <Card>
            <p className="text-gray-600 text-center py-8">
              Нет доступных пар для отметки посещаемости.
            </p>
            <div className="space-y-2 text-sm text-gray-500 text-center mb-4">
              <p>Чтобы пары появились:</p>
              <p>1. Создайте расписание в разделе "Расписание"</p>
              <p>2. Для повторяющихся пар укажите даты начала и окончания</p>
              <p>3. Нажмите "Сгенерировать сессии" для каждой пары</p>
            </div>
            <div className="text-center">
              <Link to="/schedule">
                <Button>Перейти к расписанию</Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Проверка посещаемости</h1>
          {session && (
            <p className="text-gray-600 mt-2">
              {session.subject_name ? session.subject_name : 'Предмет не указан'} •{' '}
              {format(new Date(session.date), 'd MMMM yyyy')} • {session.start_time} - {session.end_time}
              {session.teacher_name && ` • ${session.teacher_name}`}
              {!session.teacher_name && ' • Преподаватель не указан'}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => handleMarkAll('present')}>
            Все присутствуют
          </Button>
          <Button variant="secondary" onClick={() => handleMarkAll('absent')}>
            Все отсутствуют
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={saveMutation.isPending}>
            Сохранить
          </Button>
          <Button onClick={() => submitReportMutation.mutate()} disabled={submitReportMutation.isPending}>
            Отправить отчёт
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-6">
          <Input
            placeholder="Поиск по имени студента..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Отсутствующих: <span className="font-semibold">{absentCount}</span> из{' '}
          {studentsAttendance.length}
        </div>

        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{student.full_name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex gap-2">
                      {(['present', 'absent', 'late', 'vacation', 'sick'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(student.id, status)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            student.status === status
                              ? status === 'present'
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {status === 'present'
                            ? 'Присутствует'
                            : status === 'absent'
                            ? 'Отсутствует'
                            : status === 'late'
                            ? 'Опоздание'
                            : status === 'vacation'
                            ? 'Отпуск'
                            : 'Болезнь'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {student.status !== 'present' && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <Select
                          label="Причина отсутствия"
                          value={student.reason_id || ''}
                          onChange={(value) => handleReasonChange(student.id, value)}
                          options={[
                            { value: '', label: 'Выберите причину' },
                            ...(absenceReasons?.map((reason) => ({
                              value: reason.id,
                              label: reason.name,
                            })) || []),
                          ]}
                          className="text-sm"
                        />
                      </div>
                      <Input
                        label="Заметка"
                        value={student.note || ''}
                        onChange={(e) => handleNoteChange(student.id, e.target.value)}
                        placeholder="Дополнительная информация..."
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}