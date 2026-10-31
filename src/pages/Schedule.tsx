import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSchedulesByWeek, createSchedule, getScheduleSessions, generateSessionsForSchedule, deleteSchedule, createScheduleSession, updateSchedule, deleteAllScheduleSessions } from '../services/schedules'
import { getSubjects, createSubject } from '../services/subjects'
import { useTeachers } from '../hooks/useTeachers'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import EditableField from '../components/ui/EditableField'
import Modal from '../components/ui/Modal'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Database } from '../types/database.types'

type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']
type ScheduleUpdate = Database['public']['Tables']['schedules']['Update']

const DAYS_OF_WEEK = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
]

export default function Schedule() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [showDeleteAllSessionsModal, setShowDeleteAllSessionsModal] = useState(false)
  const [deleteSessionsConfirmText, setDeleteSessionsConfirmText] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedWeek, setSelectedWeek] = useState<1 | 2>(1)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [newSubjectName, setNewSubjectName] = useState('')
  const [formData, setFormData] = useState<ScheduleInsert>({
    subject_id: '',
    teacher_id: null,
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:30',
    room: '',
    type: 'lecture',
    is_recurring: true,
    start_date: null,
    end_date: null,
    week_number: 1,
    schedule_start_date: format(new Date(), 'yyyy-MM-dd'),
  })

  const queryClient = useQueryClient()
  const { data: schedules } = useQuery({ 
    queryKey: ['schedules', selectedWeek], 
    queryFn: () => getSchedulesByWeek(selectedWeek) 
  })
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: getSubjects })
  const { data: teachers } = useTeachers()

  const createSubjectMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setFormData({ ...formData, subject_id: data.id })
      setIsSubjectModalOpen(false)
      setNewSubjectName('')
    },
  })

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

  const { data: weekSessions } = useQuery({
    queryKey: ['schedule-sessions', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: () => getScheduleSessions(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')),
  })

  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      if (data.is_recurring && data.start_date && data.end_date) {
        await generateSessionsForSchedule(
          data.id,
          new Date(data.start_date),
          new Date(data.end_date)
        )
        queryClient.invalidateQueries({ queryKey: ['schedule-sessions'] })
        queryClient.invalidateQueries({ queryKey: ['available-sessions'] })
      }
      setIsModalOpen(false)
    },
  })

  const generateSessionsMutation = useMutation({
    mutationFn: async ({ scheduleId, startDate, endDate }: { scheduleId: string; startDate: Date; endDate: Date }) => {
      return generateSessionsForSchedule(scheduleId, startDate, endDate)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['available-sessions'] })
      alert('Сессии успешно сгенерированы!')
    },
  })

  const handleGenerateSessions = async (schedule: any) => {
    try {
      if (!schedule.is_recurring) {
        // Для разовых пар создаём одну сессию
        const sessionDate = prompt('Введите дату пары (YYYY-MM-DD):', format(new Date(), 'yyyy-MM-dd'))
        if (!sessionDate) return

        await createScheduleSession({
          schedule_id: schedule.id,
          date: sessionDate,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          room: schedule.room,
          is_cancelled: false,
        })
        
        queryClient.invalidateQueries({ queryKey: ['schedule-sessions'] })
        queryClient.invalidateQueries({ queryKey: ['available-sessions'] })
        alert('Сессия успешно создана!')
        return
      }

      // Для повторяющихся пар
      if (!schedule.start_date || !schedule.end_date) {
        const startDate = prompt('Введите дату начала (YYYY-MM-DD):', format(new Date(), 'yyyy-MM-dd'))
        const endDate = prompt('Введите дату окончания (YYYY-MM-DD):', format(addDays(new Date(), 30), 'yyyy-MM-dd'))
        
        if (!startDate || !endDate) {
          alert('Необходимо указать обе даты')
          return
        }

        // Обновляем расписание с датами
        try {
          await updateSchedule(schedule.id, { start_date: startDate, end_date: endDate })
        } catch (error) {
          console.error('Error updating schedule:', error)
          alert('Ошибка при обновлении расписания')
          return
        }

        await generateSessionsMutation.mutateAsync({
          scheduleId: schedule.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        })
      } else {
        await generateSessionsMutation.mutateAsync({
          scheduleId: schedule.id,
          startDate: new Date(schedule.start_date),
          endDate: new Date(schedule.end_date),
        })
      }
    } catch (error: any) {
      console.error('Error generating sessions:', error)
      alert(`Ошибка: ${error.message || 'Не удалось создать сессии'}`)
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ScheduleUpdate }) => updateSchedule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-sessions'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-sessions'] })
    },
  })

  const deleteAllSessionsMutation = useMutation({
    mutationFn: deleteAllScheduleSessions,
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['available-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['today-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-report'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setShowDeleteAllSessionsModal(false)
      setDeleteSessionsConfirmText('')
      alert(`Удалено сессий: ${deletedCount}. Также удалены связанные записи посещаемости и отчёты.`)
    },
    onError: (error: any) => {
      alert(`Ошибка при удалении сессий: ${error.message || 'Неизвестная ошибка'}`)
    },
  })

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule)
    setFormData({
      subject_id: schedule.subject_id,
      teacher_id: schedule.teacher_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      room: schedule.room || '',
      type: schedule.type,
      is_recurring: schedule.is_recurring,
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      week_number: schedule.week_number || 1,
      schedule_start_date: schedule.schedule_start_date || format(new Date(), 'yyyy-MM-dd'),
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSchedule) return

    const dataToSend = {
      ...formData,
      type: formData.type || 'lecture',
      week_number: formData.week_number || 1,
      start_date: formData.start_date && formData.start_date.trim() !== '' 
        ? formData.start_date 
        : null,
      end_date: formData.end_date && formData.end_date.trim() !== '' 
        ? formData.end_date 
        : null,
    }

    await updateMutation.mutateAsync({
      id: editingSchedule.id,
      updates: dataToSend,
    })
    setIsEditModalOpen(false)
    setEditingSchedule(null)
  }

  const handleInlineUpdate = async (scheduleId: string, field: string, value: any) => {
    await updateMutation.mutateAsync({
      id: scheduleId,
      updates: { [field]: value },
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить эту пару из расписания?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting schedule:', error)
        alert('Ошибка при удалении пары')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Преобразуем пустые строки в null для дат
    const dataToSend = {
      ...formData,
      type: formData.type || 'lecture',
      week_number: formData.week_number || 1,
      start_date: formData.start_date && formData.start_date.trim() !== '' 
        ? formData.start_date 
        : null,
      end_date: formData.end_date && formData.end_date.trim() !== '' 
        ? formData.end_date 
        : null,
      schedule_start_date: formData.schedule_start_date && formData.schedule_start_date.trim() !== '' 
        ? formData.schedule_start_date 
        : format(new Date(), 'yyyy-MM-dd'),
    }
    
    await createMutation.mutateAsync(dataToSend)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Расписание</h1>
        <div className="flex gap-3">
          <div className="flex border rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-l-lg transition-colors ${
                viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Список
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-r-lg transition-colors ${
                viewMode === 'calendar' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Календарь
            </button>
          </div>
          <Button
            variant="danger"
            onClick={() => setShowDeleteAllSessionsModal(true)}
            className="text-sm"
          >
            Очистить все сессии
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>Создать пару</Button>
        </div>
      </div>

      {/* Week selector */}
      <div className="mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Неделя:</span>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedWeek(1)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedWeek === 1
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Неделя 1
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedWeek(2)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedWeek === 2
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Неделя 2
              </motion.button>
            </div>
          </div>
        </Card>
      </div>

      {viewMode === 'list' ? (
        <Card>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedWeek}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {schedules?.map((schedule: any, index: number) => (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`p-4 border rounded-lg transition-all hover:shadow-lg ${
                    selectedWeek === 1
                      ? 'border-blue-200 bg-blue-50/30'
                      : 'border-green-200 bg-green-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <EditableField
                          value={schedule.subjects?.name || 'Предмет'}
                          onSave={async () => {}}
                          disabled
                          className="font-semibold text-gray-900 text-lg"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <EditableField
                          value={DAYS_OF_WEEK[schedule.day_of_week]}
                          onSave={async (value) => {
                            const dayIndex = DAYS_OF_WEEK.indexOf(value)
                            if (dayIndex !== -1) {
                              await handleInlineUpdate(schedule.id, 'day_of_week', dayIndex)
                            }
                          }}
                          type="select"
                          options={DAYS_OF_WEEK.map((day) => ({ value: day, label: day }))}
                          className="font-medium text-gray-700"
                        />
                        <span>•</span>
                        <EditableField
                          value={schedule.start_time}
                          onSave={(value) => handleInlineUpdate(schedule.id, 'start_time', value)}
                          type="time"
                          className="text-gray-600"
                        />
                        <span>-</span>
                        <EditableField
                          value={schedule.end_time}
                          onSave={(value) => handleInlineUpdate(schedule.id, 'end_time', value)}
                          type="time"
                          className="text-gray-600"
                        />
                        {schedule.room && (
                          <>
                            <span>•</span>
                            <EditableField
                              value={schedule.room}
                              onSave={(value) => handleInlineUpdate(schedule.id, 'room', value)}
                              placeholder="Аудитория"
                              className="text-gray-600"
                            />
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <EditableField
                          value={schedule.teachers?.full_name || 'Преподаватель не указан'}
                          onSave={async () => {}}
                          disabled
                        />
                        <span>•</span>
                        <EditableField
                          value={schedule.type === 'lecture' ? 'Лекция' : schedule.type === 'lab' ? 'Лабораторная' : 'Практика'}
                          onSave={async (value) => {
                            const typeMap: Record<string, 'lecture' | 'lab' | 'practice'> = {
                              'Лекция': 'lecture',
                              'Лабораторная': 'lab',
                              'Практика': 'practice',
                            }
                            if (typeMap[value]) {
                              await handleInlineUpdate(schedule.id, 'type', typeMap[value])
                            }
                          }}
                          type="select"
                          options={[
                            { value: 'Лекция', label: 'Лекция' },
                            { value: 'Лабораторная', label: 'Лабораторная' },
                            { value: 'Практика', label: 'Практика' },
                          ]}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        schedule.is_recurring 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {schedule.is_recurring ? 'Повторяется' : 'Разово'}
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(schedule)}
                        className="text-sm"
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleGenerateSessions(schedule)}
                        className="text-sm"
                        disabled={generateSessionsMutation.isPending}
                      >
                        {generateSessionsMutation.isPending 
                          ? 'Генерация...' 
                          : schedule.is_recurring 
                          ? 'Сгенерировать сессии' 
                          : 'Создать сессию'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(schedule.id)}
                        className="text-sm"
                        disabled={deleteMutation.isPending}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {(!schedules || schedules.length === 0) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-gray-500"
                >
                  <p className="text-lg">Нет расписания для недели {selectedWeek}</p>
                  <p className="text-sm mt-2">Создайте первую пару для этой недели</p>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              >
                ← Предыдущая
              </Button>
              <h2 className="font-semibold">
                {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM yyyy')}
              </h2>
              <Button
                variant="secondary"
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              >
                Следующая →
              </Button>
            </div>
            <Button variant="secondary" onClick={() => setCurrentWeek(new Date())}>
              Сегодня
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd')
              const daySessions = weekSessions?.filter((s: any) => s.date === dayStr) || []
              return (
                <div key={dayStr} className="border rounded-lg p-2 min-h-[200px]">
                  <div className="font-semibold text-sm mb-2">
                    {format(day, 'EEE d', { weekStartsOn: 1 })}
                  </div>
                  <div className="space-y-1">
                    {daySessions.map((session: any) => (
                      <div
                        key={session.id}
                        className="text-xs p-2 bg-blue-50 rounded border border-blue-200"
                      >
                        <div className="font-medium">
                          {session.schedules?.subjects?.name || 'Предмет'}
                        </div>
                        <div className="text-gray-600">
                          {session.start_time} - {session.end_time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setFormData({
            subject_id: '',
            teacher_id: null,
            day_of_week: 1,
            start_time: '09:00',
            end_time: '10:30',
            room: '',
            type: 'lecture',
            is_recurring: true,
            start_date: null,
            end_date: null,
            week_number: selectedWeek,
            schedule_start_date: format(new Date(), 'yyyy-MM-dd'),
          })
        }}
        title="Создать пару"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  label="Предмет"
                  value={formData.subject_id}
                  onChange={(value) => setFormData({ ...formData, subject_id: value })}
                  options={subjects?.map((s) => ({ value: s.id, label: s.name })) || []}
                  placeholder="Выберите предмет"
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="h-[42px]"
                >
                  + Новый
                </Button>
              </div>
            </div>
          </div>
          <Select
            label="Преподаватель"
            value={formData.teacher_id || ''}
            onChange={(value) => setFormData({ ...formData, teacher_id: value || null })}
            options={[
              { value: '', label: 'Не указан' },
              ...(teachers?.map((t) => ({ value: t.id, label: t.full_name })) || []),
            ]}
            placeholder="Выберите преподавателя (необязательно)"
          />
          <Select
            label="День недели"
            value={formData.day_of_week.toString()}
            onChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
            options={DAYS_OF_WEEK.map((day, index) => ({ value: index.toString(), label: day }))}
            placeholder="Выберите день недели"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Время начала"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
            <Input
              label="Время окончания"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>
          <Input
            label="Аудитория"
            value={formData.room || ''}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
          />
          <Select
            label="Тип пары"
            value={formData.type || 'lecture'}
            onChange={(value) => setFormData({ ...formData, type: (value || 'lecture') as 'lecture' | 'lab' | 'practice' })}
            options={[
              { value: 'lecture', label: 'Лекция' },
              { value: 'lab', label: 'Лабораторная' },
              { value: 'practice', label: 'Практика' },
            ]}
            placeholder="Выберите тип пары"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Неделя"
              value={formData.week_number?.toString() || '1'}
              onChange={(value) => setFormData({ ...formData, week_number: parseInt(value) as 1 | 2 })}
              options={[
                { value: '1', label: 'Неделя 1' },
                { value: '2', label: 'Неделя 2' },
              ]}
              required
            />
            <Input
              label="Дата начала цикла"
              type="date"
              value={formData.schedule_start_date || format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setFormData({ ...formData, schedule_start_date: e.target.value || format(new Date(), 'yyyy-MM-dd') })}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.is_recurring}
              onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="recurring" className="text-sm text-gray-700">
              Повторяющаяся пара
            </label>
          </div>
          {formData.is_recurring && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Дата начала"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
              />
              <Input
                label="Дата окончания"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingSchedule(null)
        }}
        title="Редактировать пару"
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  label="Предмет"
                  value={formData.subject_id}
                  onChange={(value) => setFormData({ ...formData, subject_id: value })}
                  options={subjects?.map((s) => ({ value: s.id, label: s.name })) || []}
                  placeholder="Выберите предмет"
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="h-[42px]"
                >
                  + Новый
                </Button>
              </div>
            </div>
          </div>
          <Select
            label="Преподаватель"
            value={formData.teacher_id || ''}
            onChange={(value) => setFormData({ ...formData, teacher_id: value || null })}
            options={[
              { value: '', label: 'Не указан' },
              ...(teachers?.map((t) => ({ value: t.id, label: t.full_name })) || []),
            ]}
            placeholder="Выберите преподавателя (необязательно)"
          />
          <Select
            label="День недели"
            value={formData.day_of_week.toString()}
            onChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
            options={DAYS_OF_WEEK.map((day, index) => ({ value: index.toString(), label: day }))}
            placeholder="Выберите день недели"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Время начала"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
            <Input
              label="Время окончания"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>
          <Input
            label="Аудитория"
            value={formData.room || ''}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
          />
          <Select
            label="Тип пары"
            value={formData.type || 'lecture'}
            onChange={(value) => setFormData({ ...formData, type: (value || 'lecture') as 'lecture' | 'lab' | 'practice' })}
            options={[
              { value: 'lecture', label: 'Лекция' },
              { value: 'lab', label: 'Лабораторная' },
              { value: 'practice', label: 'Практика' },
            ]}
            placeholder="Выберите тип пары"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Неделя"
              value={formData.week_number?.toString() || '1'}
              onChange={(value) => setFormData({ ...formData, week_number: parseInt(value) as 1 | 2 })}
              options={[
                { value: '1', label: 'Неделя 1' },
                { value: '2', label: 'Неделя 2' },
              ]}
              required
            />
            <Input
              label="Дата начала цикла"
              type="date"
              value={formData.schedule_start_date || format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setFormData({ ...formData, schedule_start_date: e.target.value || format(new Date(), 'yyyy-MM-dd') })}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-recurring"
              checked={formData.is_recurring}
              onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="edit-recurring" className="text-sm text-gray-700">
              Повторяющаяся пара
            </label>
          </div>
          {formData.is_recurring && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Дата начала"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
              />
              <Input
                label="Дата окончания"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Добавить предмет"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await createSubjectMutation.mutateAsync({
              name: newSubjectName,
            })
          }}
          className="space-y-4"
        >
          <Input
            label="Название предмета"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSubjectModalOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={createSubjectMutation.isPending}>
              {createSubjectMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
          </form>
        </Modal>

        {/* Modal for deleting all sessions */}
        <Modal
          isOpen={showDeleteAllSessionsModal}
          onClose={() => {
            setShowDeleteAllSessionsModal(false)
            setDeleteSessionsConfirmText('')
          }}
          title="Очистить все сессии"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium mb-2">⚠️ Внимание!</p>
              <p className="text-red-700 text-sm">
                Это действие удалит все сессии расписания из системы. Также будут автоматически удалены все связанные записи посещаемости и отчёты. Это действие нельзя отменить.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Для подтверждения введите <strong>ОЧИСТИТЬ СЕССИИ</strong>:
              </label>
              <Input
                type="text"
                value={deleteSessionsConfirmText}
                onChange={(e) => setDeleteSessionsConfirmText(e.target.value)}
                placeholder="ОЧИСТИТЬ СЕССИИ"
                className="w-full"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteAllSessionsModal(false)
                  setDeleteSessionsConfirmText('')
                }}
              >
                Отмена
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (deleteSessionsConfirmText === 'ОЧИСТИТЬ СЕССИИ') {
                    deleteAllSessionsMutation.mutate()
                  }
                }}
                disabled={deleteSessionsConfirmText !== 'ОЧИСТИТЬ СЕССИИ' || deleteAllSessionsMutation.isPending}
              >
                {deleteAllSessionsMutation.isPending ? 'Удаление...' : 'Очистить все сессии'}
              </Button>
            </div>

            {deleteAllSessionsMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">
                  Ошибка: {deleteAllSessionsMutation.error instanceof Error ? deleteAllSessionsMutation.error.message : 'Неизвестная ошибка'}
                </p>
              </div>
            )}
          </div>
        </Modal>
      </div>
    )
  }
