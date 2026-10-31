import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent } from '../hooks/useStudents'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { exportToCSV, parseCSV } from '../utils/csv'
import { Database } from '../types/database.types'

type Student = Database['public']['Tables']['students']['Row']
type StudentInsert = Database['public']['Tables']['students']['Insert']

export default function Students() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expelled'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState<StudentInsert>({
    full_name: '',
    telegram: '',
    phone: '',
    status: 'active',
    group_id: '',
  })

  const { data: students, isLoading } = useStudents()
  const createMutation = useCreateStudent()
  const updateMutation = useUpdateStudent()
  const deleteMutation = useDeleteStudent()

  const filteredStudents = students?.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.telegram?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student)
      setFormData({
        full_name: student.full_name,
        telegram: student.telegram ?? '',
        phone: student.phone ?? '',
        status: student.status,
        group_id: student.group_id ?? '',
      })
    } else {
      setEditingStudent(null)
      setFormData({
        full_name: '',
        telegram: '',
        phone: '',
        status: 'active',
        group_id: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingStudent(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Нормализуем данные: undefined -> null
      const normalizedData = {
        ...formData,
        telegram: formData.telegram || null,
        phone: formData.phone || null,
        group_id: formData.group_id || null,
      }
      if (editingStudent) {
        await updateMutation.mutateAsync({
          id: editingStudent.id,
          student: normalizedData,
        })
      } else {
        await createMutation.mutateAsync(normalizedData)
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving student:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этого студента?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting student:', error)
      }
    }
  }

  const handleExport = () => {
    if (!students) return
    exportToCSV(
      students.map((s) => ({
        'ФИО': s.full_name,
        'Телефон': s.phone || '',
        'Telegram': s.telegram || '',
        'Статус': s.status === 'active' ? 'Активен' : 'Отчислен',
        'Группа': s.group_id || '',
      })),
      `students_${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await parseCSV<StudentInsert>(file, ['full_name', 'phone', 'telegram', 'status', 'group_id'])
      for (const student of data) {
        await createMutation.mutateAsync({
          ...student,
          status: (student.status as any) || 'active',
        })
      }
      alert(`Импортировано ${data.length} студентов`)
    } catch (error) {
      console.error('Error importing students:', error)
      alert('Ошибка при импорте файла')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Студенты</h1>
        <div className="flex gap-3">
          <label className="btn-secondary cursor-pointer">
            Импорт CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <Button onClick={handleExport} variant="secondary">
            Экспорт CSV
          </Button>
          <Button onClick={() => handleOpenModal()}>Добавить студента</Button>
        </div>
      </div>

      <Card>
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Поиск по имени, телефону, telegram..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as any)}
            options={[
              { value: 'all', label: 'Все статусы' },
              { value: 'active', label: 'Активные' },
              { value: 'expelled', label: 'Отчисленные' },
            ]}
            className="w-auto min-w-[150px]"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Загрузка...</div>
        ) : filteredStudents && filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">ФИО</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Телефон</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Telegram</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Статус</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Группа</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{student.full_name}</td>
                    <td className="py-3 px-4">{student.phone || '-'}</td>
                    <td className="py-3 px-4">{student.telegram || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          student.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {student.status === 'active' ? 'Активен' : 'Отчислен'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{student.group_id || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Link to={`/students/${student.id}`}>
                          <Button variant="secondary" className="text-sm">
                            Профиль
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          onClick={() => handleOpenModal(student)}
                          className="text-sm"
                        >
                          Редактировать
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => handleDelete(student.id)}
                          className="text-sm"
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Студенты не найдены'
              : 'Нет студентов. Добавьте первого студента.'}
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingStudent ? 'Редактировать студента' : 'Добавить студента'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ФИО"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
          <Input
            label="Телефон"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Telegram"
            value={formData.telegram || ''}
            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
          />
          <div>
            <Select
              label="Статус"
              value={formData.status || 'active'}
              onChange={(value) =>
                setFormData({ ...formData, status: value as any })
              }
              options={[
                { value: 'active', label: 'Активен' },
                { value: 'expelled', label: 'Отчислен' },
              ]}
            />
          </div>
          <Input
            label="Группа"
            value={formData.group_id || ''}
            onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Сохранение...'
                : editingStudent
                ? 'Сохранить'
                : 'Добавить'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
