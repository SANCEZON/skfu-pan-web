import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotes, createNote, updateNote, deleteNote } from '../services/notes'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { format } from 'date-fns'
import { Database } from '../types/database.types'

type Note = Database['public']['Tables']['notes']['Row']
type NoteInsert = Database['public']['Tables']['notes']['Insert']

export default function Notes() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<NoteInsert>({
    user_id: user?.id || '',
    title: '',
    content: '',
    is_pinned: false,
  })

  const queryClient = useQueryClient()

  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: () => getNotes(user?.id || ''),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] })
      setIsModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: any }) => updateNote(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] })
      setIsModalOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] })
    },
  })

  const togglePinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      updateNote(id, { is_pinned: isPinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] })
    },
  })

  const handleOpenModal = (note?: Note) => {
    if (note) {
      setEditingNote(note)
      setFormData({
        user_id: note.user_id,
        title: note.title,
        content: note.content,
        is_pinned: note.is_pinned,
      })
    } else {
      setEditingNote(null)
      setFormData({
        user_id: user?.id || '',
        title: '',
        content: '',
        is_pinned: false,
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Нормализуем данные: гарантируем boolean для is_pinned
    const normalizedData = {
      ...formData,
      is_pinned: formData.is_pinned ?? false,
    }
    if (editingNote) {
      await updateMutation.mutateAsync({ id: editingNote.id, note: normalizedData })
    } else {
      await createMutation.mutateAsync(normalizedData)
    }
  }

  const filteredNotes = notes?.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pinnedNotes = filteredNotes?.filter((note) => note.is_pinned) || []
  const unpinnedNotes = filteredNotes?.filter((note) => !note.is_pinned) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Заметки</h1>
        <Button onClick={() => handleOpenModal()}>Добавить заметку</Button>
      </div>

      <Card className="mb-6">
        <Input
          placeholder="Поиск по заметкам..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Закреплённые</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map((note) => (
                  <Card key={note.id}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{note.title}</h3>
                      <button
                        onClick={() =>
                          togglePinMutation.mutateAsync({ id: note.id, isPinned: false })
                        }
                        className="text-yellow-500 hover:text-yellow-600"
                      >
                        📌
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                      {format(new Date(note.created_at), 'd MMM yyyy, HH:mm')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenModal(note)}
                        className="text-sm flex-1"
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => deleteMutation.mutateAsync(note.id)}
                        className="text-sm flex-1"
                      >
                        Удалить
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Остальные</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinnedNotes.map((note) => (
                  <Card key={note.id}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{note.title}</h3>
                      <button
                        onClick={() =>
                          togglePinMutation.mutateAsync({ id: note.id, isPinned: true })
                        }
                        className="text-gray-400 hover:text-yellow-500"
                      >
                        📌
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                      {format(new Date(note.created_at), 'd MMM yyyy, HH:mm')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenModal(note)}
                        className="text-sm flex-1"
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => deleteMutation.mutateAsync(note.id)}
                        className="text-sm flex-1"
                      >
                        Удалить
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(!filteredNotes || filteredNotes.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Заметки не найдены' : 'Нет заметок. Создайте первую заметку.'}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNote ? 'Редактировать заметку' : 'Новая заметка'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Заголовок"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Содержание
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input min-h-[200px]"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinned"
              checked={formData.is_pinned}
              onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="pinned" className="text-sm text-gray-700">
              Закрепить заметку
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Сохранение...'
                : editingNote
                ? 'Сохранить'
                : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
