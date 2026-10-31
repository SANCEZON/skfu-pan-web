import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { format, subWeeks, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'
import { translateStatus } from '../utils/statusTranslations'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type Period = 'week' | 'month' | 'semester' | 'custom'

export default function Charts() {
  const [period, setPeriod] = useState<Period>('month')
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null)

  const { data: attendanceData } = useQuery({
    queryKey: ['attendance-charts', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_sessions')
        .select(
          `
            id,
            date,
            attendance_records:attendance_records(
              id,
              status,
              note,
              reason_id,
              students:students(full_name),
              absence_reasons(code, name)
            )
          `
        )
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) {
        throw new Error(error.message)
      }

      const flattened =
        data?.flatMap((session: any) =>
          (session.attendance_records || [])
            .filter((record: any) => record.status !== 'present')
            .map((record: any) => ({
              ...record,
              session_date: session.date,
              student_name: record.students?.full_name || 'Студент',
              reason_code: record.absence_reasons?.code || null,
              reason_name: record.absence_reasons?.name || null,
            }))
        ) || []

      return flattened
    },
  })

  const getChartData = () => {
    if (!attendanceData) return []

    if (period === 'week') {
      const weeks = eachWeekOfInterval(
        {
          start: new Date(startDate),
          end: new Date(endDate),
        },
        { weekStartsOn: 1 }
      )

      return weeks.map((week) => {
        const weekStart = startOfWeek(week, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(week, { weekStartsOn: 1 })
        const weekStartStr = format(weekStart, 'yyyy-MM-dd')
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

        const weekRecords = attendanceData.filter((record: any) => {
          const recordDate = record.session_date
          return recordDate >= weekStartStr && recordDate <= weekEndStr
        })

        // Общее количество отсутствующих
        const total = weekRecords.length

        // По болезни (status = 'sick' или reason_code = 'sick')
        const sick = weekRecords.filter(
          (record: any) => record.status === 'sick' || record.reason_code === 'sick'
        ).length

        // По отпуску (status = 'vacation' или reason_code = 'vacation')
        const vacation = weekRecords.filter(
          (record: any) => record.status === 'vacation' || record.reason_code === 'vacation'
        ).length

        return {
          week: `Неделя ${format(weekStart, 'd MMM')}`,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          absent: total,
          sick: sick,
          vacation: vacation,
        }
      })
    } else if (period === 'month') {
      const weeks = eachWeekOfInterval(
        {
          start: new Date(startDate),
          end: new Date(endDate),
        },
        { weekStartsOn: 1 }
      )

      return weeks.map((week) => {
        const weekStart = startOfWeek(week, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(week, { weekStartsOn: 1 })
        const weekStartStr = format(weekStart, 'yyyy-MM-dd')
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

        const count = attendanceData.filter((record: any) => {
          const recordDate = record.session_date
          return recordDate >= weekStartStr && recordDate <= weekEndStr
        }).length

        return {
          week: `Неделя ${format(weekStart, 'd MMM')}`,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          absent: count,
        }
      })
    } else {
      const months = eachMonthOfInterval({
        start: new Date(startDate),
        end: new Date(endDate),
      })

      return months.map((month) => {
        const monthStr = format(month, 'yyyy-MM')
        const count = attendanceData.filter((record: any) => {
          const recordDate = record.session_date
          return recordDate?.startsWith(monthStr)
        }).length

        return {
          month: format(month, 'MMM yyyy'),
          monthStr,
          absent: count,
        }
      })
    }
  }

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod)
    const now = new Date()
    if (newPeriod === 'week') {
      setStartDate(format(subWeeks(now, 1), 'yyyy-MM-dd'))
      setEndDate(format(now, 'yyyy-MM-dd'))
    } else if (newPeriod === 'month') {
      setStartDate(format(subMonths(now, 1), 'yyyy-MM-dd'))
      setEndDate(format(now, 'yyyy-MM-dd'))
    } else if (newPeriod === 'semester') {
      setStartDate(format(subMonths(now, 4), 'yyyy-MM-dd'))
      setEndDate(format(now, 'yyyy-MM-dd'))
    }
  }

  const getAbsentStudentsForPeriod = (periodData: any) => {
    if (!attendanceData || !periodData) return []

    if (period === 'week') {
      return attendanceData
        .filter((record: any) => {
          const recordDate = record.session_date
          return recordDate >= periodData.weekStart && recordDate <= periodData.weekEnd
        })
        .map((record: any) => ({
          name: record.student_name || 'Студент',
          status: record.status,
          date: record.session_date,
          reason: record.reason_name || translateStatus(record.status),
        }))
    } else if (period === 'month') {
      return attendanceData
        .filter((record: any) => {
          const recordDate = record.session_date
          return recordDate >= periodData.weekStart && recordDate <= periodData.weekEnd
        })
        .map((record: any) => ({
          name: record.student_name || 'Студент',
          status: record.status,
          date: record.session_date,
          reason: record.reason_name || translateStatus(record.status),
        }))
    } else {
      return attendanceData
        .filter((record: any) => {
          const recordDate = record.session_date
          return recordDate?.startsWith(periodData.monthStr)
        })
        .map((record: any) => ({
          name: record.student_name || 'Студент',
          status: record.status,
          date: record.session_date,
          reason: record.reason_name || translateStatus(record.status),
        }))
    }
  }

  const chartData = getChartData()
  const absentStudents = selectedDataPoint ? getAbsentStudentsForPeriod(selectedDataPoint) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Графики посещаемости</h1>
        <div className="flex gap-2">
          <Button
            variant={period === 'week' ? 'primary' : 'secondary'}
            onClick={() => handlePeriodChange('week')}
            className="text-sm"
          >
            Неделя
          </Button>
          <Button
            variant={period === 'month' ? 'primary' : 'secondary'}
            onClick={() => handlePeriodChange('month')}
            className="text-sm"
          >
            Месяц
          </Button>
          <Button
            variant={period === 'semester' ? 'primary' : 'secondary'}
            onClick={() => handlePeriodChange('semester')}
            className="text-sm"
          >
            Семестр
          </Button>
          <Button
            variant={period === 'custom' ? 'primary' : 'secondary'}
            onClick={() => setPeriod('custom')}
            className="text-sm"
          >
            Произвольный
          </Button>
        </div>
      </div>

      {period === 'custom' && (
        <Card className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Пропуски по {period === 'week' ? 'неделям' : period === 'month' ? 'неделям' : 'месяцам'}
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            onClick={(data) => {
              if (data && data.activePayload) {
                setSelectedDataPoint(data.activePayload[0].payload)
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={period === 'week' ? 'week' : period === 'month' ? 'week' : 'month'} />
            <YAxis />
            <Tooltip />
            <Legend />
            {period === 'week' ? (
              <>
                <Bar dataKey="absent" fill="#1E6FFF" name="Всего отсутствующих" />
                <Bar dataKey="sick" fill="#EF4444" name="По болезни" />
                <Bar dataKey="vacation" fill="#10B981" name="По отпуску" />
              </>
            ) : (
              <Bar dataKey="absent" fill="#1E6FFF" name="Отсутствующие" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {selectedDataPoint && absentStudents.length > 0 && (
        <Card className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Отсутствующие студенты за выбранный период
          </h3>
          <div className="space-y-2">
            {absentStudents.map((student, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="font-medium text-gray-900">{student.name}</div>
                <div className="text-sm text-gray-600">
                  Статус: {translateStatus(student.status)}
                  {student.reason && ` • Причина: ${student.reason}`}
                  {student.date && ` • Дата: ${format(new Date(student.date), 'd MMM yyyy')}`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
