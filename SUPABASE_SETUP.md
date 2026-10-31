# Настройка Supabase проекта

Этот файл описывает минимальные шаги для подготовки облачного Supabase, чтобы панель работала без собственного backend.

## 1. Создайте проект
1. Зайдите на <https://app.supabase.com>.
2. Нажмите **New project**, выберите регион (желательно ближайший к РФ).
3. Укажите пароль для базы данных — сохраните его, он пригодится для psql/CLI.

## 2. Выполните миграции
Все SQL находится в `supabase/migrations`. Выполняем файлы по порядку (001 → 004):

1. Откройте Supabase → **SQL Editor**.
2. Скопируйте содержимое `supabase/migrations/001_initial_schema.sql`, выполните.
3. Повторите для `002_make_teacher_id_nullable.sql`, `003_add_week_schedule_system.sql`, `004_user_invites.sql`.

> Совет: если используете Supabase CLI, можно выполнить `supabase migration up` — но это опционально.

## 3. Настройте RLS политики

Таблицы уже создаются с RLS включённым, поэтому нужно добавить политики.
Примерная минимальная конфигурация:

- `students`, `teachers`, `subjects`, `schedules`, `schedule_sessions`, `attendance_records`, `reports`, `absence_reasons` — чтение/запись для участников с ролью `admin` (создаётся в Auth → Policies).
- `notes`, `activity_logs` — пользователи видят свои записи (условие `user_id = auth.uid()`).
- `user_invitations`, `user_profiles`, `approval_logs` — только администраторы (можно завести список admin UID в таблице `settings` или использовать Supabase auth roles).

Политики лучше документировать отдельно, но для старта достаточно повторить настройки из предыдущего Supabase-проекта.

## 4. Импортируйте данные (опционально)

Если есть экспорт из MySQL:

1. Сконвертируйте CSV в UTF‑8.
2. В Supabase Table Editor выберите таблицу → **Import data** → загрузите файл.
3. Для UUID столбцов укажите формат `uuid`. При необходимости используйте `gen_random_uuid()` во время импорта.

## 5. Настройка Storage / Auth

- **Auth**: включите Email/Password в разделе **Authentication → Providers**.
- **Storage**: не используется, можно пропустить.
- **SMTP** (опционально): укажите SMTP‑сервер, чтобы Supabase отправлял письма подтверждения. Если SMTP не задан, используйте magic link/OTP вручную.

## 6. Получите ключи для фронтенда

Перейдите в **Project Settings → API** и скопируйте:

- `Project URL` → `VITE_SUPABASE_URL`
- `anon key` → `VITE_SUPABASE_ANON_KEY`

Добавьте их в `.env.local` или `.env.production`:

```
VITE_SUPABASE_URL=https://xyz-company.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
```

## 7. Проверка

1. Запустите фронтенд локально (`npm run dev`) или соберите и загрузите на TimeWeb.
2. Зарегистрируйте пользователя c действительным приглашением.
3. Убедитесь, что данные (студенты, расписание, посещаемость) читаются/записываются через Supabase.

После выполнения этих шагов Supabase полностью заменяет локальный backend.

