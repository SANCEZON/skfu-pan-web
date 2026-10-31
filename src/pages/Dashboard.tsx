import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getScheduleSessions } from '../services/schedules'
import { getStudents } from '../services/students'
import { getReports } from '../services/reports'
import { supabase } from '../lib/supabase'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { translateStatus } from '../utils/statusTranslations'

export default function Dashboard() {
  const navigate = useNavigate()
  // Используем состояние для даты, чтобы она обновлялась
  const [today, setToday] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  
  // Обновляем дату каждую минуту (на случай смены дня)
  useEffect(() => {
    const interval = setInterval(() => {
      const newToday = format(new Date(), 'yyyy-MM-dd')
      if (newToday !== today) {
        setToday(newToday)
      }
    }, 60000) // Проверяем каждую минуту
    
    return () => clearInterval(interval)
  }, [today])
  
  const { data: todaySessions } = useQuery({
    queryKey: ['today-sessions', today],
    queryFn: async () => {
      const sessions = await getScheduleSessions(today, today)
      // Фильтруем по дате и не отменённым, затем дедуплицируем по уникальной комбинации
      const filtered = sessions.filter((s: any) => s.date === today && !s.is_cancelled)
      
      // Дедупликация: оставляем только уникальные сессии
      // Используем id сессии как основной ключ, но также проверяем дубликаты по schedule_id + время
      const uniqueSessions = new Map<string, any>()
      const seenKeys = new Set<string>()
      
      filtered.forEach((session: any) => {
        // Создаём ключ для дедупликации
        // Если есть schedule_id, используем его + время
        // Если нет schedule_id, используем subject_name + teacher_name + время (если доступны)
        // Иначе используем id сессии
        let key: string
        if (session.schedule_id) {
          key = `${session.schedule_id}-${session.start_time}-${session.end_time}`
        } else if (session.subject_name && session.teacher_name) {
          key = `${session.subject_name}-${session.teacher_name}-${session.start_time}-${session.end_time}`
        } else {
          // Если нет schedule_id и нет subject_name, используем id сессии (каждая сессия уникальна)
          key = session.id
        }
        
        // Если такой ключ уже есть, пропускаем (это дубликат)
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          uniqueSessions.set(session.id, session)
        }
      })
      
      return Array.from(uniqueSessions.values())
        .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
    },
    refetchInterval: 30000, // Обновлять каждые 30 секунд
    refetchOnWindowFocus: true, // Обновлять при возврате фокуса
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [students, reports] = await Promise.all([
        getStudents(),
        getReports(),
      ])
      
      return {
        activeStudents: students.filter((s: any) => s.status === 'active').length,
        totalReports: reports.length,
      }
    },
    refetchInterval: 60000, // Обновлять статистику каждую минуту
    refetchOnWindowFocus: true,
  })

  // Получаем отсутствующих студентов за сегодня
  const { data: todayAbsences } = useQuery({
    queryKey: ['today-absences', today, todaySessions?.length],
    queryFn: async () => {
      if (!todaySessions || todaySessions.length === 0) {
        return []
      }

      const sessionIds = todaySessions.map((s: any) => s.id)
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select(
          `
            id,
            status,
            note,
            student_id,
            session_id,
            students:students(full_name),
            absence_reasons(name),
            schedule_sessions:schedule_sessions(
              date,
              start_time,
              end_time,
              schedules:schedules(
                subjects:subjects(name)
              )
            )
          `
        )
        .in('session_id', sessionIds)
        .neq('status', 'present')

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    },
    enabled: !!todaySessions && todaySessions.length > 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

  // Группируем отсутствующих по студентам
  const absentStudentsGrouped = useMemo(() => {
    if (!todayAbsences) return []
    
    const studentMap = new Map<string, {
      student_id: string
      student_name: string
      absences: Array<{
        status: string
        reason_name: string | null
        note: string | null
        session_info: string
      }>
    }>()

    todayAbsences.forEach((record: any) => {
      const studentId = record.student_id
      const studentName = record.students?.full_name || 'Студент'
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_name: studentName,
          absences: [],
        })
      }

      const sessionInfo = record.schedule_sessions
        ? `${record.schedule_sessions.schedules?.subjects?.name || 'Предмет'} (${record.schedule_sessions.start_time || ''} - ${record.schedule_sessions.end_time || ''})`
        : 'Сессия'

      studentMap.get(studentId)!.absences.push({
        status: record.status,
        reason_name: record.absence_reasons?.name || null,
        note: record.note || null,
        session_info: sessionInfo,
      })
    })

    return Array.from(studentMap.values())
  }, [todayAbsences])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Главная</h1>
        <p className="text-gray-600 mt-2">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ru })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/students')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Активных студентов</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.activeStudents || 0}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/reports')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Всего отчётов</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.totalReports || 0}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/schedule')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Пар сегодня</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {todaySessions?.length || 0}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/weekly-report')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Отсутствующих сегодня</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {absentStudentsGrouped.length || 0}
              </p>
            </div>
            <div className="text-4xl">❌</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Сегодняшние пары</h2>
          <Link to="/schedule">
            <Button variant="secondary">Все расписание</Button>
          </Link>
        </div>
        {todaySessions && todaySessions.length > 0 ? (
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
                    {session.teacher_name || 'Преподаватель'} • {session.start_time} - {session.end_time}
                    {session.room && ` • ${session.room}`}
                  </p>
                </div>
                <Link to={`/attendance?session=${session.id}`}>
                  <Button>Отметить</Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Нет пар на сегодня</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Отсутствующие сегодня</h2>
          <Link to="/weekly-report">
            <Button variant="secondary">Недельный отчёт</Button>
          </Link>
        </div>
        {absentStudentsGrouped && absentStudentsGrouped.length > 0 ? (
          <div className="space-y-3">
            {absentStudentsGrouped.map((student) => (
              <div
                key={student.student_id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">{student.student_name}</h3>
                    <div className="space-y-1">
                      {student.absences.map((absence, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          <span className="font-medium">{absence.session_info}</span>
                          {' • '}
                          <span className="text-red-600">{translateStatus(absence.status)}</span>
                          {absence.reason_name && ` • ${absence.reason_name}`}
                          {absence.note && (
                            <span className="text-gray-500 italic"> • "{absence.note}"</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 ml-4">
                    {student.absences.length} {student.absences.length === 1 ? 'пропуск' : 'пропусков'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Нет отсутствующих студентов на сегодня</p>
        )}
      </Card>
    </div>
  )
}