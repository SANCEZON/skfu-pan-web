import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import {
  searchStudentsByName,
  getStudentAbsences,
  getLeaderboard,
  type PublicStudent,
  type PublicAbsenceRecord,
  type LeaderboardEntry,
} from '../services/publicAttendance'
import { translateStatus } from '../utils/statusTranslations'

type ViewMode = 'search' | 'leaderboard'
type LeaderboardMode = 'most' | 'least'

export default function PublicAttendance() {
  const [viewMode, setViewMode] = useState<ViewMode>('search')
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>('most')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<PublicStudent | null>(null)

  // Search students
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['public-student-search', searchQuery],
    queryFn: () => searchStudentsByName(searchQuery),
    enabled: searchQuery.trim().length >= 2,
  })

  // Get absences for selected student
  const { data: absences, isLoading: isLoadingAbsences } = useQuery({
    queryKey: ['public-student-absences', selectedStudent?.id],
    queryFn: () => getStudentAbsences(selectedStudent!.id),
    enabled: !!selectedStudent && viewMode === 'search',
  })

  // Get leaderboard data
  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['public-leaderboard', leaderboardMode],
    queryFn: () => getLeaderboard(leaderboardMode, 50),
    enabled: viewMode === 'leaderboard',
  })

  // Calculate statistics
  const stats = useMemo(() => {
    if (!absences) {
      return {
        total: 0,
        week: 0,
        month: 0,
      }
    }

    const now = new Date()
    const weekStart = format(subDays(now, 7), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')

    const total = absences.length
    const week = absences.filter(
      (record) => record.session_date && record.session_date >= weekStart
    ).length
    const month = absences.filter(
      (record) => record.session_date && record.session_date >= monthStart
    ).length

    return { total, week, month }
  }, [absences])

  const handleStudentSelect = (student: PublicStudent) => {
    setSelectedStudent(student)
    setSearchQuery('')
  }

  const handleBackToSearch = () => {
    setSelectedStudent(null)
    setSearchQuery('')
  }

  const getMedalIcon = (position: number) => {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return null
  }

  const getPositionStyle = (position: number) => {
    if (position === 1) {
      return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300'
    }
    if (position === 2) {
      return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300'
    }
    if (position === 3) {
      return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300'
    }
    return 'bg-white border-gray-200'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {viewMode === 'search' ? 'Просмотр посещаемости' : 'Лидерборд'}
          </h1>
          <p className="text-gray-600">
            {viewMode === 'search'
              ? 'Найдите себя по имени и ознакомьтесь с информацией о пропусках'
              : 'Рейтинг студентов по посещаемости'}
          </p>
        </div>

        {/* Mode switcher */}
        <Card className="p-4 mb-6">
          <div className="flex gap-2 justify-center">
            <Button
              variant={viewMode === 'search' ? 'primary' : 'secondary'}
              onClick={() => {
                setViewMode('search')
                setSelectedStudent(null)
                setSearchQuery('')
              }}
              className="flex-1 max-w-xs"
            >
              Просмотр посещаемости
            </Button>
            <Button
              variant={viewMode === 'leaderboard' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('leaderboard')}
              className="flex-1 max-w-xs"
            >
              Лидерборд
            </Button>
          </div>
        </Card>

        {viewMode === 'leaderboard' ? (
          <div>
            {/* Leaderboard mode switcher */}
            <Card className="p-4 mb-6">
              <div className="flex gap-2 justify-center">
                <Button
                  variant={leaderboardMode === 'most' ? 'primary' : 'secondary'}
                  onClick={() => setLeaderboardMode('most')}
                  className="flex-1 max-w-xs"
                >
                  Больше всего пропусков
                </Button>
                <Button
                  variant={leaderboardMode === 'least' ? 'primary' : 'secondary'}
                  onClick={() => setLeaderboardMode('least')}
                  className="flex-1 max-w-xs"
                >
                  Меньше всего пропусков
                </Button>
              </div>
            </Card>

            {/* Leaderboard table */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                {leaderboardMode === 'most'
                  ? 'Лидеры по пропускам'
                  : 'Лидеры по посещаемости'}
              </h2>

              {isLoadingLeaderboard ? (
                <div className="text-center py-8 text-gray-500">Загрузка лидерборда...</div>
              ) : leaderboard && leaderboard.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Место</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Студент</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">
                          Пропусков
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry: LeaderboardEntry, index: number) => {
                        const position = index + 1
                        const medal = getMedalIcon(position)
                        const rowStyle = getPositionStyle(position)

                        return (
                          <tr
                            key={entry.student_id}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${rowStyle}`}
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                {medal ? (
                                  <span className="text-2xl">{medal}</span>
                                ) : (
                                  <span className="text-lg font-semibold text-gray-600">
                                    {position}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div>
                                <p className="font-medium text-gray-900">{entry.student_name}</p>
                                {entry.group_id && (
                                  <p className="text-sm text-gray-500">Группа: {entry.group_id}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                  leaderboardMode === 'most'
                                    ? entry.absences_count > 0
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-600'
                                    : entry.absences_count === 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {entry.absences_count}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Нет данных для отображения</p>
              )}
            </Card>
          </div>
        ) : (
          <>

        {!selectedStudent ? (
          <Card className="p-6">
            <div className="mb-4">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Поиск студента
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Введите имя студента (минимум 2 символа)..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            {isSearching && (
              <div className="text-center py-4 text-gray-500">Поиск...</div>
            )}

            {searchQuery.trim().length >= 2 && !isSearching && searchResults && (
              <div className="mt-4">
                {searchResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Студенты не найдены</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-2">Найдено студентов: {searchResults.length}</p>
                    {searchResults.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleStudentSelect(student)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all"
                      >
                        <p className="font-medium text-gray-900">{student.full_name}</p>
                        {student.group_id && (
                          <p className="text-sm text-gray-500 mt-1">Группа: {student.group_id}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {searchQuery.trim().length < 2 && (
              <p className="text-gray-400 text-center py-4 text-sm">
                Введите минимум 2 символа для начала поиска
              </p>
            )}
          </Card>
        ) : (
          <div>
            <div className="mb-4">
              <Button
                onClick={handleBackToSearch}
                variant="outline"
                className="mb-4"
              >
                ← Назад к поиску
              </Button>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedStudent.full_name}</h2>
              {selectedStudent.group_id && (
                <p className="text-gray-600">Группа: {selectedStudent.group_id}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Всего пропусков</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.total}
                  </p>
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Пропусков за неделю</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.week}
                  </p>
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Пропусков за месяц</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.month}
                  </p>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">История пропусков</h3>
              {isLoadingAbsences ? (
                <div className="text-center py-8 text-gray-500">Загрузка...</div>
              ) : absences && absences.length > 0 ? (
                <div className="space-y-3">
                  {absences.map((record: PublicAbsenceRecord) => (
                    <div
                      key={record.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {record.subject_name || 'Предмет не указан'}
                          </p>
                          {record.teacher_name && (
                            <p className="text-sm text-gray-600 mt-1">
                              Преподаватель: {record.teacher_name}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            {record.session_date &&
                              format(new Date(record.session_date), 'd MMMM yyyy', { locale: ru })}{' '}
                            • {record.start_time}
                            {record.end_time && ` - ${record.end_time}`}
                            {record.room && ` • Аудитория: ${record.room}`}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {translateStatus(record.status)}
                            </span>
                            {record.reason_name && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Причина: {record.reason_name}
                              </span>
                            )}
                          </div>
                          {record.note && (
                            <p className="text-sm text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                              <span className="font-medium">Заметка:</span> {record.note}
                            </p>
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
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}

