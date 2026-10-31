import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getActivityLogs } from '../services/activityLogs'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

export default function Logs() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [actionTypeFilter, setActionTypeFilter] = useState('')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['activity-logs', startDate, endDate, actionTypeFilter],
    queryFn: async () => {
      const allLogs = await getActivityLogs(200)
      
      // Фильтруем на клиенте (можно перенести на сервер позже)
      let filtered = allLogs
      
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`)
        filtered = filtered.filter((log: any) => new Date(log.created_at) >= start)
      }
      
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59`)
        filtered = filtered.filter((log: any) => new Date(log.created_at) <= end)
      }
      
      if (actionTypeFilter) {
        filtered = filtered.filter((log: any) => log.action_type === actionTypeFilter)
      }
      
      return filtered
    },
  })

  const actionTypes: { value: string; label: string }[] = [
    { value: 'student_created', label: 'Создание студента' },
    { value: 'student_updated', label: 'Изменение студента' },
    { value: 'student_deleted', label: 'Удаление студента' },
    { value: 'schedule_created', label: 'Создание пары' },
    { value: 'schedule_updated', label: 'Изменение пары' },
    { value: 'schedule_deleted', label: 'Удаление пары' },
    { value: 'attendance_updated', label: 'Посещаемость' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Логи действий</h1>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Дата начала"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Дата окончания"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div>
            <Select
              label="Тип действия"
              value={actionTypeFilter}
              onChange={(value) => setActionTypeFilter(value)}
              options={[
                { value: '', label: 'Все действия' },
                ...actionTypes.map((type) => ({
                  value: type.value,
                  label: type.label,
                })),
              ]}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              alert('Функция очистки логов будет доступна в будущем. Используйте phpMyAdmin для очистки данных.')
            }}
          >
            Очистить логи
          </Button>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Загрузка...</div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {logs.map((log: any) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {actionTypes.find((a) => a.value === log.action_type)?.label || log.action_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Пользователь: {log.user_email || log.user_id || 'неизвестно'}
                      </p>
                      {log.details && (
                        <p className="text-sm text-gray-500 mt-1">
                          Детали: {formatDetails(log.details)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(log.created_at), 'd MMM yyyy, HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Нет логов</div>
        )}
      </Card>
    </div>
  )
}

function formatDetails(details: any) {
  if (!details) return '—'
  if (typeof details !== 'object') return String(details)
  return Object.entries(details)
    .filter(([key]) => key !== 'автор' && key !== 'author')
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ')
}