import { useState } from 'react'
import { useTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher } from '../hooks/useTeachers'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { Database } from '../types/database.types'

type Teacher = Database['public']['Tables']['teachers']['Row']
type TeacherInsert = Database['public']['Tables']['teachers']['Insert']

export default function Teachers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [formData, setFormData] = useState<TeacherInsert>({
    full_name: '',
    email: '',
    phone: '',
  })

  const { data: teachers, isLoading } = useTeachers()
  const createMutation = useCreateTeacher()
  const updateMutation = useUpdateTeacher()
  const deleteMutation = useDeleteTeacher()

  const filteredTeachers = teachers?.filter((teacher) =>
    teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher)
      setFormData({
        full_name: teacher.full_name,
        email: teacher.email ?? '',
        phone: teacher.phone ?? '',
      })
    } else {
      setEditingTeacher(null)
      setFormData({
        full_name: '',
        email: '',
        phone: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTeacher(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Нормализуем данные: undefined -> null
      const normalizedData = {
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
      }
      if (editingTeacher) {
        await updateMutation.mutateAsync({
          id: editingTeacher.id,
          teacher: normalizedData,
        })
      } else {
        await createMutation.mutateAsync(normalizedData)
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving teacher:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этого преподавателя?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting teacher:', error)
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Преподаватели</h1>
        <Button onClick={() => handleOpenModal()}>Добавить преподавателя</Button>
      </div>

      <Card>
        <div className="mb-6">
          <Input
            placeholder="Поиск по имени, email, телефону..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Загрузка...</div>
        ) : filteredTeachers && filteredTeachers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{teacher.full_name}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  {teacher.email && <p>📧 {teacher.email}</p>}
                  {teacher.phone && <p>📞 {teacher.phone}</p>}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => handleOpenModal(teacher)}
                    className="text-sm flex-1"
                  >
                    Редактировать
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(teacher.id)}
                    className="text-sm flex-1"
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {searchTerm
              ? 'Преподаватели не найдены'
              : 'Нет преподавателей. Добавьте первого преподавателя.'}
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTeacher ? 'Редактировать преподавателя' : 'Добавить преподавателя'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ФИО"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Телефон"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Сохранение...'
                : editingTeacher
                ? 'Сохранить'
                : 'Добавить'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
