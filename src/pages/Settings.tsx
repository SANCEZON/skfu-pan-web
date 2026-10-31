import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import {
  getAutoDeleteSettings,
  runAutoDelete,
  type AutoDeleteSettings,
  type AutoDeleteResult,
} from '../services/autoDelete'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface AbsenceReason {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
}

export default function Settings() {
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false)
  const [editingReason, setEditingReason] = useState<AbsenceReason | null>(null)
  const [reasonForm, setReasonForm] = useState<Omit<AbsenceReason, 'id' | 'created_at'>>({
    name: '',
    code: '',
    is_active: true,
  })
  const [autoDeleteResult, setAutoDeleteResult] = useState<AutoDeleteResult | null>(null)
  const [isRunningAutoDelete, setIsRunningAutoDelete] = useState(false)

  const queryClient = useQueryClient()

  const { data: settingsRows } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*')
      if (error) {
        throw new Error(error.message)
      }
      return data || []
    },
  })

  const { data: absenceReasons } = useQuery({
    queryKey: ['absence-reasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_reasons')
        .select('*')
        .order('name', { ascending: true })
      if (error) {
        throw new Error(error.message)
      }
      return data || []
    },
  })

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, type }: { key: string; value: string; type?: string }) => {
      // Determine type if not provided
      let settingType = type || 'string'
      if (value === 'true' || value === 'false') {
        settingType = 'boolean'
      } else if (!isNaN(Number(value)) && value !== '') {
        settingType = 'number'
      }

      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            key,
            value,
            type: settingType,
          },
          {
            onConflict: 'key',
          }
        )
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['auto-delete-settings'] })
    },
  })

  const createReasonMutation = useMutation({
    mutationFn: async (reason: Omit<AbsenceReason, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('absence_reasons').insert(reason)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-reasons'] })
      setIsReasonModalOpen(false)
    },
  })

  const updateReasonMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: Partial<AbsenceReason> }) => {
      const { error } = await supabase.from('absence_reasons').update(reason).eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-reasons'] })
      setIsReasonModalOpen(false)
    },
  })

  const settings = useMemo(() => {
    const map: Record<string, string> = {}
    settingsRows?.forEach((setting) => {
      map[setting.key] = setting.value
    })
    return map
  }, [settingsRows])

  const groupName = settings['group_name'] || ''
  const timezone = settings['timezone'] || ''
  const lastRun = settings['auto_delete_last_run'] || ''

  // Load auto-delete settings
  const { data: autoDeleteSettings } = useQuery({
    queryKey: ['auto-delete-settings'],
    queryFn: getAutoDeleteSettings,
  })

  // Auto-delete settings state
  const [autoDeleteState, setAutoDeleteState] = useState<AutoDeleteSettings | null>(null)

  useEffect(() => {
    if (autoDeleteSettings) {
      setAutoDeleteState(autoDeleteSettings)
    }
  }, [autoDeleteSettings])

  // Check if auto-delete should run automatically (only once on mount)
  useEffect(() => {
    let isMounted = true

    const checkAndRunAutoDelete = async () => {
      if (!autoDeleteSettings) return

      // If no last run, skip automatic execution (user should run manually first)
      if (!lastRun) return

      try {
        const lastRunDate = new Date(lastRun)
        const now = new Date()
        const hoursSinceLastRun = (now.getTime() - lastRunDate.getTime()) / (1000 * 60 * 60)

        // Run if last run was more than 24 hours ago
        if (hoursSinceLastRun >= 24) {
          const hasEnabled = Object.values(autoDeleteSettings).some(
            (s: any) => s.enabled === true
          )
          if (hasEnabled && isMounted) {
            setIsRunningAutoDelete(true)
            const result = await runAutoDelete()
            if (isMounted) {
              setAutoDeleteResult(result)
              queryClient.invalidateQueries({ queryKey: ['settings'] })
            }
          }
        }
      } catch (error) {
        console.error('Auto-delete error:', error)
      } finally {
        if (isMounted) {
          setIsRunningAutoDelete(false)
        }
      }
    }

    checkAndRunAutoDelete()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  const handleUpdateAutoDeleteSetting = async (
    table: 'reports' | 'attendance_records' | 'activity_logs' | 'notes',
    field: string,
    value: string | number | boolean
  ) => {
    if (!autoDeleteState) return

    const key = `auto_delete_${table}_${field}`
    await updateSettingMutation.mutateAsync({
      key,
      value: String(value),
    })

    // Update local state
    setAutoDeleteState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [table]: {
          ...prev[table],
          [field]: value,
        },
      }
    })
  }

  const handleRunAutoDelete = async () => {
    try {
      setIsRunningAutoDelete(true)
      const result = await runAutoDelete()
      setAutoDeleteResult(result)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      alert(
        `Очистка завершена!\n` +
          `Отчётов удалено: ${result.reports || 0}\n` +
          `Записей посещаемости удалено: ${result.attendance_records || 0}\n` +
          `Логов активности удалено: ${result.activity_logs || 0}\n` +
          `Заметок удалено: ${result.notes || 0}`
      )
    } catch (error: any) {
      alert(`Ошибка при выполнении очистки: ${error.message || 'Неизвестная ошибка'}`)
    } finally {
      setIsRunningAutoDelete(false)
    }
  }

  const handleOpenReasonModal = (reason?: AbsenceReason) => {
    if (reason) {
      setEditingReason(reason)
      setReasonForm({
        name: reason.name,
        code: reason.code,
        is_active: reason.is_active,
      })
    } else {
      setEditingReason(null)
      setReasonForm({
        name: '',
        code: '',
        is_active: true,
      })
    }
    setIsReasonModalOpen(true)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Настройки</h1>

      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Общие настройки</h2>
        <div className="space-y-4">
          <Input
            label="Название группы"
            value={groupName}
            onChange={(e) =>
              updateSettingMutation.mutateAsync({ key: 'group_name', value: e.target.value })
            }
          />
          <Input
            label="Часовой пояс"
            value={timezone}
            onChange={(e) =>
              updateSettingMutation.mutateAsync({ key: 'timezone', value: e.target.value })
            }
          />
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Автоудаление данных</h2>
          <div className="flex gap-2">
            {lastRun && (
              <span className="text-sm text-gray-500 self-center">
                Последний запуск:{' '}
                {format(new Date(lastRun), 'd MMM yyyy, HH:mm', { locale: ru })}
              </span>
            )}
            <Button
              onClick={handleRunAutoDelete}
              disabled={isRunningAutoDelete}
              variant="secondary"
            >
              {isRunningAutoDelete ? 'Выполняется...' : 'Выполнить очистку сейчас'}
            </Button>
          </div>
        </div>
        <div className="space-y-6">
          {/* Reports */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Отчёты</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDeleteState?.reports.enabled || false}
                  onChange={(e) =>
                    handleUpdateAutoDeleteSetting('reports', 'enabled', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Включено</span>
              </label>
            </div>
            {autoDeleteState?.reports.enabled && (
              <div className="space-y-3 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Срок хранения (дней)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={autoDeleteState.reports.days}
                    onChange={(e) =>
                      handleUpdateAutoDeleteSetting('reports', 'days', parseInt(e.target.value, 10))
                    }
                    className="w-32"
                  />
                </div>
                <div>
                  <Select
                    label="Критерий удаления"
                    value={autoDeleteState.reports.criteria}
                    onChange={(value) =>
                      handleUpdateAutoDeleteSetting(
                        'reports',
                        'criteria',
                        value as 'created_at' | 'session_date'
                      )
                    }
                    options={[
                      { value: 'created_at', label: 'По дате создания отчёта' },
                      { value: 'session_date', label: 'По дате сессии' },
                    ]}
                    className="w-64"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Attendance Records */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Записи посещаемости</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDeleteState?.attendance_records.enabled || false}
                  onChange={(e) =>
                    handleUpdateAutoDeleteSetting('attendance_records', 'enabled', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Включено</span>
              </label>
            </div>
            {autoDeleteState?.attendance_records.enabled && (
              <div className="space-y-3 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Срок хранения (дней)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={autoDeleteState.attendance_records.days}
                    onChange={(e) =>
                      handleUpdateAutoDeleteSetting(
                        'attendance_records',
                        'days',
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="w-32"
                  />
                </div>
                <div>
                  <Select
                    label="Критерий удаления"
                    value={autoDeleteState.attendance_records.criteria}
                    onChange={(value) =>
                      handleUpdateAutoDeleteSetting(
                        'attendance_records',
                        'criteria',
                        value as 'created_at' | 'session_date'
                      )
                    }
                    options={[
                      { value: 'created_at', label: 'По дате создания записи' },
                      { value: 'session_date', label: 'По дате сессии' },
                    ]}
                    className="w-64"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Activity Logs */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Логи активности</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDeleteState?.activity_logs.enabled || false}
                  onChange={(e) =>
                    handleUpdateAutoDeleteSetting('activity_logs', 'enabled', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Включено</span>
              </label>
            </div>
            {autoDeleteState?.activity_logs.enabled && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Срок хранения (дней)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={autoDeleteState.activity_logs.days}
                  onChange={(e) =>
                    handleUpdateAutoDeleteSetting(
                      'activity_logs',
                      'days',
                      parseInt(e.target.value, 10)
                    )
                  }
                  className="w-32"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Заметки</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDeleteState?.notes.enabled || false}
                  onChange={(e) =>
                    handleUpdateAutoDeleteSetting('notes', 'enabled', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Включено</span>
              </label>
            </div>
            {autoDeleteState?.notes.enabled && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Срок хранения (дней)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={autoDeleteState.notes.days}
                  onChange={(e) =>
                    handleUpdateAutoDeleteSetting('notes', 'days', parseInt(e.target.value, 10))
                  }
                  className="w-32"
                />
              </div>
            )}
          </div>
        </div>
        {autoDeleteResult && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">Результат последней очистки:</p>
            <div className="text-sm text-blue-800 space-y-1">
              {autoDeleteResult.reports !== undefined && (
                <p>Отчётов удалено: {autoDeleteResult.reports}</p>
              )}
              {autoDeleteResult.attendance_records !== undefined && (
                <p>Записей посещаемости удалено: {autoDeleteResult.attendance_records}</p>
              )}
              {autoDeleteResult.activity_logs !== undefined && (
                <p>Логов активности удалено: {autoDeleteResult.activity_logs}</p>
              )}
              {autoDeleteResult.notes !== undefined && (
                <p>Заметок удалено: {autoDeleteResult.notes}</p>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Причины отсутствия</h2>
          <Button onClick={() => handleOpenReasonModal()}>Добавить причину</Button>
        </div>
        {absenceReasons && absenceReasons.length > 0 ? (
          <div className="space-y-2">
            {absenceReasons.map((reason) => (
              <div
                key={reason.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">{reason.name}</span>
                  <span className="text-sm text-gray-500 ml-2">({reason.code})</span>
                  {!reason.is_active && (
                    <span className="ml-2 text-xs text-gray-400">(неактивна)</span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenReasonModal(reason)}
                  className="text-sm"
                >
                  Редактировать
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Нет причин отсутствия</p>
        )}
      </Card>

      <Modal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        title={editingReason ? 'Редактировать причину' : 'Добавить причину'}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (editingReason) {
              await updateReasonMutation.mutateAsync({
                id: editingReason.id,
                reason: reasonForm,
              })
            } else {
              await createReasonMutation.mutateAsync(reasonForm)
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Название"
            value={reasonForm.name}
            onChange={(e) => setReasonForm({ ...reasonForm, name: e.target.value })}
            required
          />
          <Input
            label="Код"
            value={reasonForm.code}
            onChange={(e) => setReasonForm({ ...reasonForm, code: e.target.value })}
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={reasonForm.is_active}
              onChange={(e) => setReasonForm({ ...reasonForm, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="active" className="text-sm text-gray-700">
              Активна
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReasonModalOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={createReasonMutation.isPending || updateReasonMutation.isPending}
            >
              {createReasonMutation.isPending || updateReasonMutation.isPending
                ? 'Сохранение...'
                : editingReason
                ? 'Сохранить'
                : 'Добавить'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
