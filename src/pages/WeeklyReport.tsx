import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getWeeklyAttendanceReport, clearWeeklyAttendanceReport, WeeklyAttendanceRecord } from '../services/reports'
import { getWeekRange } from '../utils/dateRanges'
import { translateStatus } from '../utils/statusTranslations'
import { exportToCSV } from '../utils/csv'

interface DayGroup {
  date: string
  sessions: SessionGroup[]
}

interface SessionGroup {
  id: string
  subject: string
  teacher: string
  time: string
  room?: string | null
  absences: {
    student: string
    status: string
    reason: string
    note?: string | null
  }[]
}

export default function WeeklyReport() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState('')
  const weekRange = getWeekRange(weekOffset)
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['weekly-report', weekRange.start, weekRange.end],
    queryFn: () => getWeeklyAttendanceReport(weekRange.start, weekRange.end),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  })

  const clearMutation = useMutation({
    mutationFn: () => clearWeeklyAttendanceReport(weekRange.start, weekRange.end),
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-report'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setShowClearModal(false)
      setClearConfirmText('')
      alert(`Удалено записей: ${deletedCount}`)
    },
    onError: (error: any) => {
      alert(`Ошибка при очистке: ${error.message || 'Неизвестная ошибка'}`)
    },
  })

  const grouped = useMemo(() => groupWeeklyData(data || []), [data])
  const summary = useMemo(() => buildSummary(data || []), [data])

  const handleExport = () => {
    if (!data || data.length === 0) return

    const rows = data.map((record) => ({
      Дата: record.session_date ? format(new Date(record.session_date), 'dd.MM.yyyy') : '—',
      Предмет: record.subject_name || '—',
      Преподаватель: record.teacher_name || '—',
      Время:
        record.start_time && record.end_time
          ? `${record.start_time} - ${record.end_time}`
          : '—',
      Студент: record.student_name || '—',
      Статус: translateStatus(record.status),
      Причина: record.reason_name || 'не указана',
      Заметка: record.note || '',
    }))

    exportToCSV(rows, `weekly_report_${weekRange.start}_${weekRange.end}.csv`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Недельный отчёт</h1>
          <p className="text-gray-600 mt-2">
            Период: {weekRange.displayRange} (пн–сб)
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refetch()}>
            🔄 Обновить
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            Экспорт CSV
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            Печать
          </Button>
          {data && data.length > 0 && (
            <Button variant="danger" onClick={() => setShowClearModal(true)}>
              Очистить недельный отчёт
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setWeekOffset((prev) => prev + 1)}
          >
            ← Прошлая неделя
          </Button>
          <Button
            variant="secondary"
            onClick={() => setWeekOffset((prev) => Math.max(prev - 1, 0))}
            disabled={weekOffset === 0}
          >
            Следующая неделя →
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Всего пропусков: <span className="font-semibold text-gray-900">{summary.totalAbsences}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gray-500">Дней с пропусками</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{summary.daysWithAbsences}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Студентов в отчёте</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{summary.uniqueStudents}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Средний пропусков в день</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {summary.averagePerDay.toFixed(1)}
          </p>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-12">Загрузка...</div>
      ) : grouped.length === 0 ? (
        <Card>
          <div className="text-center text-gray-500 py-12">
            Нет данных об отсутствиях за выбранный период.
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((day) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <Card className="border-l-4 border-primary">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {format(new Date(day.date), 'EEEE, d MMMM', { locale: ru })}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Отсутствующих: {day.sessions.reduce((sum, session) => sum + session.absences.length, 0)}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {day.sessions.map((session) => (
                    <Card key={session.id} className="bg-gray-50">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{session.subject}</p>
                          <p className="text-sm text-gray-500">
                            {session.teacher} • {session.time}
                            {session.room ? ` • ауд. ${session.room}` : ''}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          Отсутствующих: <span className="font-semibold text-gray-900">{session.absences.length}</span>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {session.absences.map((absence, index) => (
                          <div
                            key={`${session.id}-${index}`}
                            className="p-3 bg-white rounded border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{absence.student}</p>
                              <p className="text-sm text-gray-500">
                                {translateStatus(absence.status)} • {absence.reason || 'не указана'}
                              </p>
                            </div>
                            {absence.note && (
                              <p className="text-sm text-gray-500 italic">“{absence.note}”</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showClearModal}
        onClose={() => {
          setShowClearModal(false)
          setClearConfirmText('')
        }}
        title="Очистить недельный отчёт"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium mb-2">⚠️ Внимание!</p>
            <p className="text-red-700 text-sm">
              Это действие удалит все записи посещаемости (отсутствия) за период{' '}
              <strong>{weekRange.displayRange}</strong>. Это действие нельзя отменить.
            </p>
            {data && data.length > 0 && (
              <p className="text-red-700 text-sm mt-2">
                Будет удалено записей: <strong>{data.length}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Для подтверждения введите <strong>ОЧИСТИТЬ</strong>:
            </label>
            <Input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="ОЧИСТИТЬ"
              className="w-full"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowClearModal(false)
                setClearConfirmText('')
              }}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (clearConfirmText === 'ОЧИСТИТЬ') {
                  clearMutation.mutate()
                }
              }}
              disabled={clearConfirmText !== 'ОЧИСТИТЬ' || clearMutation.isPending}
            >
              {clearMutation.isPending ? 'Очистка...' : 'Очистить недельный отчёт'}
            </Button>
          </div>

          {clearMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                Ошибка: {clearMutation.error instanceof Error ? clearMutation.error.message : 'Неизвестная ошибка'}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

function groupWeeklyData(records: WeeklyAttendanceRecord[]): DayGroup[] {
  const map = new Map<string, Map<string, SessionGroup>>()

  records.forEach((record) => {
    if (!record.session_date || !record.session_id) return

    if (!map.has(record.session_date)) {
      map.set(record.session_date, new Map())
    }
    const sessionsMap = map.get(record.session_date)!
    if (!sessionsMap.has(record.session_id)) {
      sessionsMap.set(record.session_id, {
        id: record.session_id,
        subject: record.subject_name || 'Предмет',
        teacher: record.teacher_name || 'Преподаватель',
        time:
          record.start_time && record.end_time
            ? `${record.start_time} - ${record.end_time}`
            : '—',
        room: record.room,
        absences: [],
      })
    }
    sessionsMap.get(record.session_id)!.absences.push({
      student: record.student_name || 'Студент',
      status: record.status,
      reason: record.reason_name || 'не указана',
      note: record.note,
    })
  })

  const result: DayGroup[] = []
  Array.from(map.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .forEach(([date, sessionsMap]) => {
      result.push({
        date,
        sessions: Array.from(sessionsMap.values()),
      })
    })

  return result
}

function buildSummary(records: WeeklyAttendanceRecord[]) {
  const totalAbsences = records.length
  const daySet = new Set<string>()
  const studentSet = new Set<string>()

  records.forEach((record) => {
    const date = record.session_date
    if (date) daySet.add(date)
    const student = record.student_name
    if (student) studentSet.add(student)
  })

  return {
    totalAbsences,
    daysWithAbsences: daySet.size,
    uniqueStudents: studentSet.size,
    averagePerDay: daySet.size ? totalAbsences / daySet.size : 0,
  }
}

