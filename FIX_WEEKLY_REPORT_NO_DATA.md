# Исправление проблемы "Нет данных" в недельном отчете

## Проблема

Недельный отчет показывает "Нет данных об отсутствиях за выбранный период", хотя в консоли видно "Found sessions: 0".

## Возможные причины

1. **В базе нет сессий** в выбранном диапазоне дат
2. **RLS политики блокируют** доступ к `schedule_sessions`
3. **Сессии не созданы** для выбранного периода

## Диагностика

### Шаг 1: Проверьте консоль браузера

После обновления кода в консоли будет больше информации:
- `Can access schedule_sessions` - проверка доступа к таблице
- `Sample sessions` - примеры сессий в базе
- `Total sessions in database` - общее количество сессий

### Шаг 2: Проверьте данные в Supabase

1. Откройте **Supabase Dashboard → Table Editor → schedule_sessions**
2. Проверьте, есть ли записи в таблице
3. Проверьте даты сессий - они должны быть в формате `YYYY-MM-DD`

### Шаг 3: Проверьте RLS политики

Выполните в **SQL Editor**:

```sql
-- Проверьте, что политика существует
SELECT * FROM pg_policies 
WHERE tablename = 'schedule_sessions';

-- Проверьте, что функция работает
SELECT public.is_user_approved();

-- Проверьте доступ к сессиям
SELECT COUNT(*) FROM schedule_sessions;
```

### Шаг 4: Создайте тестовые данные

Если сессий нет, создайте их:

```sql
-- Сначала создайте расписание (schedule), если его нет
INSERT INTO schedules (subject_id, teacher_id, day_of_week, start_time, end_time, type)
VALUES (
  (SELECT id FROM subjects LIMIT 1),
  (SELECT id FROM teachers LIMIT 1),
  1, -- Понедельник
  '09:00:00',
  '10:30:00',
  'lecture'
)
RETURNING id;

-- Затем создайте сессию для текущей недели
INSERT INTO schedule_sessions (schedule_id, date, start_time, end_time, room)
VALUES (
  (SELECT id FROM schedules LIMIT 1),
  CURRENT_DATE, -- или конкретная дата, например '2025-11-24'
  '09:00:00',
  '10:30:00',
  '101'
);
```

### Шаг 5: Создайте записи посещаемости

После создания сессий создайте записи посещаемости:

```sql
-- Создайте запись об отсутствии
INSERT INTO attendance_records (session_id, student_id, status, reason_id)
VALUES (
  (SELECT id FROM schedule_sessions WHERE date >= CURRENT_DATE LIMIT 1),
  (SELECT id FROM students LIMIT 1),
  'absent',
  (SELECT id FROM absence_reasons WHERE code = 'invalid' LIMIT 1)
);
```

## Решение

### Вариант 1: Если сессий нет

1. Перейдите на страницу **"Расписание"**
2. Создайте расписание
3. Используйте функцию **"Сгенерировать сессии"** для создания сессий на период

### Вариант 2: Если RLS блокирует

1. Примените миграцию `007_fix_rls_debug.sql` (если еще не применена)
2. Проверьте, что пользователь имеет статус `approved`:
   ```sql
   SELECT status FROM user_profiles WHERE user_id = auth.uid();
   ```
3. Если статус не `approved`, обновите:
   ```sql
   UPDATE user_profiles 
   SET status = 'approved' 
   WHERE user_id = auth.uid();
   ```

### Вариант 3: Если сессии в другом диапазоне дат

1. Используйте кнопки **"← Прошлая неделя"** и **"Следующая неделя →"**
2. Проверьте, есть ли данные в других неделях

## Проверка после исправления

1. Обновите страницу приложения (F5)
2. Откройте консоль браузера (F12)
3. Проверьте логи:
   - `Can access schedule_sessions` - должно быть `true`
   - `Found sessions in range` - должно быть больше 0
   - `Total sessions in database` - должно быть больше 0

## Если проблема сохраняется

1. Проверьте логи в Supabase Dashboard → Logs
2. Убедитесь, что миграции применены
3. Проверьте, что данные есть в базе
4. Проверьте формат дат (должен быть `YYYY-MM-DD`)

