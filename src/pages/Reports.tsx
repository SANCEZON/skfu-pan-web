import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReports, getReport, deleteReport, deleteAllReports } from '../services/reports'
import { getAttendanceForSession, bulkUpsertAttendanceRecords, getAbsenceReasons, type AttendanceRecordInsert } from '../services/attendance'
import { getStudents } from '../services/students'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { format } from 'date-fns'
import { exportToCSV } from '../utils/csv'
import { translateStatus } from '../utils/statusTranslations'

interface StudentAttendance {
  id: string
  full_name: string
  status: 'present' | 'absent' | 'late' | 'vacation' | 'sick'
  reason_id?: string
  note?: string
}

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [editingReport, setEditingReport] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const queryClient = useQueryClient()

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['reports', startDate, endDate],
    queryFn: () => getReports({ startDate, endDate }),
    refetchInterval: 30000, // Обновлять каждые 30 секунд
    refetchOnWindowFocus: true, // Обновлять при возврате фокуса
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      // Инвалидируем кэш недельного отчёта, чтобы изменения сразу отображались
      queryClient.invalidateQueries({ queryKey: ['weekly-report'] })
    },
  })

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllReports,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      // Инвалидируем кэш недельного отчёта, чтобы изменения сразу отображались
      queryClient.invalidateQueries({ queryKey: ['weekly-report'] })
      setShowDeleteAllModal(false)
      setDeleteConfirmText('')
    },
  })

  const { data: reportDetails } = useQuery({
    queryKey: ['report-details', selectedReport],
    queryFn: () => getReport(selectedReport!),
    enabled: !!selectedReport,
  })

  const { data: attendanceDetails } = useQuery({
    queryKey: ['report-attendance', reportDetails?.session_id],
    queryFn: () => getAttendanceForSession(reportDetails?.session_id || ''),
    enabled: !!reportDetails?.session_id,
  })

  // Данные для редактирования отчёта
  const { data: editingReportDetails } = useQuery({
    queryKey: ['editing-report-details', editingReport],
    queryFn: () => getReport(editingReport!),
    enabled: !!editingReport,
  })

  const { data: editingAttendanceDetails } = useQuery({
    queryKey: ['editing-attendance', editingReportDetails?.session_id],
    queryFn: () => getAttendanceForSession(editingReportDetails?.session_id || ''),
    enabled: !!editingReportDetails?.session_id,
  })

  const { data: allStudents } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
  })

  const { data: absenceReasons } = useQuery({
    queryKey: ['absence-reasons'],
    queryFn: getAbsenceReasons,
  })

  const [editingStudents, setEditingStudents] = useState<StudentAttendance[]>([])

  // Инициализация данных для редактирования
  useEffect(() => {
    if (editingReportDetails?.session_id && editingAttendanceDetails && allStudents) {
      const attendanceMap = new Map(
        editingAttendanceDetails.map((a: any) => [
          a.student_id,
          {
            status: a.status,
            reason_id: a.reason_id,
            note: a.note,
          },
        ])
      )

      const students: StudentAttendance[] = allStudents
        .filter((s) => s.status === 'active')
        .map((student) => ({
          id: student.id,
          full_name: student.full_name,
          status: (attendanceMap.get(student.id)?.status as any) || 'present',
          reason_id: attendanceMap.get(student.id)?.reason_id,
          note: attendanceMap.get(student.id)?.note || '',
        }))

      setEditingStudents(students)
    }
  }, [editingReportDetails?.session_id, editingAttendanceDetails, allStudents])

  const updateAttendanceMutation = useMutation({
    mutationFn: async (records: AttendanceRecordInsert[]) => {
      return bulkUpsertAttendanceRecords(records)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report-attendance'] })
      queryClient.invalidateQueries({ queryKey: ['editing-attendance'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-report'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setEditingReport(null)
      alert('Отчёт успешно обновлён!')
    },
    onError: (error: any) => {
      alert(`Ошибка при обновлении отчёта: ${error.message || 'Неизвестная ошибка'}`)
    },
  })

  const handleExport = async (report: any) => {
    if (!report.session_id) return
    
    const attendance = await getAttendanceForSession(report.session_id)
    if (!attendance) return

    const absentStudents = attendance
      .filter((a: any) => a.status !== 'present')
      .map((a: any) => ({
        'ФИО': a.student_name || '',
        'Статус': translateStatus(a.status),
        'Причина': a.reason_name || '',
        'Заметка': a.note || '',
      }))

    exportToCSV(absentStudents, `report_${report.id}_${format(new Date(report.created_at), 'yyyy-MM-dd')}.csv`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Отчёты</h1>
        <div className="flex gap-3">
          {reports && reports.length > 0 && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteAllModal(true)}
              className="text-sm"
            >
              Удалить все отчёты
            </Button>
          )}
          <Button variant="secondary" onClick={handlePrint}>
            Печать
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Дата начала"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Дата окончания"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        {(startDate || endDate) && (
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="text-sm"
            >
              Очистить фильтры
            </Button>
          </div>
        )}
      </Card>

      <Card>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Загрузка...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Ошибка загрузки отчётов: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report: any) => {
              const session = report.schedule_sessions || {
                date: report.date,
                start_time: report.start_time,
                end_time: report.end_time,
                schedules: {
                  subjects: { name: report.subject_name },
                  teachers: { full_name: report.teacher_name },
                },
              }
              return (
                <ReportItem
                  key={report.id}
                  report={report}
                  session={session}
                  onView={() => setSelectedReport(report.id)}
                  onEdit={() => setEditingReport(report.id)}
                  onExport={() => handleExport(report)}
                  onDelete={() => {
                    if (window.confirm('Вы уверены, что хотите удалить этот отчёт?')) {
                      deleteMutation.mutate(report.id)
                    }
                  }}
                />
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Нет отчётов</p>
            {startDate || endDate ? (
              <p className="text-sm mt-2 text-gray-400">
                Попробуйте изменить фильтры по датам или очистить их
              </p>
            ) : null}
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Детали отчёта"
      >
        {reportDetails && attendanceDetails && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {reportDetails.subject_name || 'Предмет'}
              </h3>
              <p className="text-sm text-gray-600">
                {reportDetails.teacher_name || 'Преподаватель'}
              </p>
              <p className="text-sm text-gray-600">
                {reportDetails.date && format(new Date(reportDetails.date), 'd MMMM yyyy')}{' '}
                • {reportDetails.start_time || ''} - {reportDetails.end_time || ''}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Отсутствующие студенты</h4>
              {attendanceDetails
                .filter((a: any) => a.status !== 'present')
                .length > 0 ? (
                <div className="space-y-2">
                  {attendanceDetails
                    .filter((a: any) => a.status !== 'present')
                    .map((record: any) => (
                      <div
                        key={record.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="font-medium text-gray-900">
                          {record.student_name || record.students?.full_name || 'Студент'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Статус: {translateStatus(record.status)} • Причина:{' '}
                          {record.reason_name || record.absence_reasons?.name || 'не указана'}
                        </div>
                        {record.note && (
                          <div className="text-sm text-gray-500 mt-1">Заметка: {record.note}</div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">Все студенты присутствовали</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showDeleteAllModal}
        onClose={() => {
          setShowDeleteAllModal(false)
          setDeleteConfirmText('')
        }}
        title="Удалить все отчёты"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium mb-2">⚠️ Внимание!</p>
            <p className="text-red-700 text-sm">
              Это действие удалит все отчёты из системы. Это действие нельзя отменить.
            </p>
            {reports && reports.length > 0 && (
              <p className="text-red-700 text-sm mt-2">
                Будет удалено отчётов: <strong>{reports.length}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Для подтверждения введите <strong>УДАЛИТЬ ВСЁ</strong>:
            </label>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="УДАЛИТЬ ВСЁ"
              className="w-full"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteAllModal(false)
                setDeleteConfirmText('')
              }}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirmText === 'УДАЛИТЬ ВСЁ') {
                  deleteAllMutation.mutate()
                }
              }}
              disabled={deleteConfirmText !== 'УДАЛИТЬ ВСЁ' || deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending ? 'Удаление...' : 'Удалить все отчёты'}
            </Button>
          </div>

          {deleteAllMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                Ошибка: {deleteAllMutation.error instanceof Error ? deleteAllMutation.error.message : 'Неизвестная ошибка'}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Модальное окно редактирования отчёта */}
      <Modal
        isOpen={!!editingReport}
        onClose={() => {
          setEditingReport(null)
          setEditingStudents([])
        }}
        title="Редактировать отчёт"
      >
        {editingReportDetails && editingStudents.length > 0 ? (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {editingReportDetails.subject_name || 'Предмет'}
              </h3>
              <p className="text-sm text-gray-600">
                {editingReportDetails.teacher_name || 'Преподаватель'}
              </p>
              <p className="text-sm text-gray-600">
                {editingReportDetails.date && format(new Date(editingReportDetails.date), 'd MMMM yyyy')}{' '}
                • {editingReportDetails.start_time || ''} - {editingReportDetails.end_time || ''}
              </p>
            </div>

            <div className="space-y-3">
              {editingStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <h4 className="font-medium text-gray-900 mb-3">{student.full_name}</h4>
                  
                  <div className="flex gap-2 mb-3">
                    {(['present', 'absent', 'late', 'vacation', 'sick'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setEditingStudents((prev) =>
                            prev.map((s) =>
                              s.id === student.id
                                ? { ...s, status, reason_id: status === 'present' ? undefined : s.reason_id }
                                : s
                            )
                          )
                        }}
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

                  {student.status !== 'present' && (
                    <div className="space-y-2">
                      <div>
                        <Select
                          label="Причина отсутствия"
                          value={student.reason_id || ''}
                          onChange={(value) => {
                            setEditingStudents((prev) =>
                              prev.map((s) =>
                                s.id === student.id ? { ...s, reason_id: value || undefined } : s
                              )
                            )
                          }}
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
                        onChange={(e) => {
                          setEditingStudents((prev) =>
                            prev.map((s) => (s.id === student.id ? { ...s, note: e.target.value } : s))
                          )
                        }}
                        placeholder="Дополнительная информация..."
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingReport(null)
                  setEditingStudents([])
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={() => {
                  if (!editingReportDetails?.session_id) return
                  
                  const records: AttendanceRecordInsert[] = editingStudents.map((sa) => ({
                    session_id: editingReportDetails.session_id,
                    student_id: sa.id,
                    status: sa.status,
                    reason_id: sa.reason_id || null,
                    note: sa.note || null,
                  }))

                  updateAttendanceMutation.mutate(records)
                }}
                disabled={updateAttendanceMutation.isPending}
              >
                {updateAttendanceMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </div>

            {updateAttendanceMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">
                  Ошибка: {updateAttendanceMutation.error instanceof Error ? updateAttendanceMutation.error.message : 'Неизвестная ошибка'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Загрузка данных...</div>
        )}
      </Modal>
    </div>
  )
}

// Компонент для отображения одного отчёта в списке
function ReportItem({ report, session, onView, onEdit, onExport, onDelete }: {
  report: any
  session: any
  onView: () => void
  onEdit: () => void
  onExport: () => void
  onDelete: () => void
}) {
  const { data: absentCount } = useQuery({
    queryKey: ['absent-count', report.session_id],
    queryFn: async () => {
      if (!report.session_id) return 0
      const attendance = await getAttendanceForSession(report.session_id)
      return attendance.filter((a: any) => a.status !== 'present').length
    },
  })

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {session?.schedules?.subjects?.name || report.subject_name || 'Предмет'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {session?.schedules?.teachers?.full_name || report.teacher_name || 'Преподаватель'} •{' '}
            {session?.date && format(new Date(session.date), 'd MMMM yyyy')}
            {report.date && format(new Date(report.date), 'd MMMM yyyy')} •{' '}
            {session?.start_time || report.start_time} - {session?.end_time || report.end_time}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Отправлен: {format(new Date(report.created_at), 'd MMM yyyy, HH:mm')} •{' '}
            Отсутствующих: {absentCount ?? '...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onView}
            className="text-sm"
          >
            Просмотр
          </Button>
          <Button
            variant="secondary"
            onClick={onEdit}
            className="text-sm"
          >
            Редактировать
          </Button>
          <Button
            variant="secondary"
            onClick={onExport}
            className="text-sm"
          >
            Экспорт CSV
          </Button>
          <Button
            variant="secondary"
            onClick={onDelete}
            className="text-sm bg-red-50 text-red-600 hover:bg-red-100"
          >
            Удалить
          </Button>
        </div>
      </div>
    </div>
  )
}