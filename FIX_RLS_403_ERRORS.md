# Исправление ошибок 403 (Forbidden) в RLS

## Проблема

В консоли браузера видны ошибки:
- `403 (Forbidden)` на запросы к `user_invitations`
- `403 (Forbidden)` на запросы к `user_profiles`
- `Found sessions: 0` - возможно, RLS блокирует доступ к `schedule_sessions`

## Причина

RLS политики могут конфликтовать или функция `is_user_approved()` не работает правильно из-за циклической зависимости.

## Решение

### Шаг 1: Применить миграцию исправления

1. Откройте **Supabase Dashboard → SQL Editor**
2. Скопируйте содержимое файла `supabase/migrations/007_fix_rls_debug.sql`
3. Вставьте в SQL Editor и выполните

Эта миграция:
- Пересоздаст политики RLS без конфликтов
- Убедится, что функция `is_user_approved()` доступна
- Исправит политики для `user_profiles`, `user_invitations`, `schedule_sessions`, `attendance_records`

### Шаг 2: Проверить статус пользователя

Убедитесь, что ваш пользователь имеет статус `approved`:

```sql
-- Проверьте свой статус
SELECT user_id, status, full_name 
FROM user_profiles 
WHERE user_id = auth.uid();

-- Если статус не 'approved', обновите:
UPDATE user_profiles 
SET status = 'approved' 
WHERE user_id = auth.uid();
```

### Шаг 3: Проверить функцию

Проверьте, что функция `is_user_approved()` работает:

```sql
-- Должно вернуть true, если вы approved
SELECT public.is_user_approved();
```

### Шаг 4: Проверить данные

Убедитесь, что есть данные в базе:

```sql
-- Проверьте сессии
SELECT COUNT(*) FROM schedule_sessions 
WHERE date >= '2025-11-24' AND date <= '2025-11-29';

-- Проверьте записи посещаемости
SELECT COUNT(*) FROM attendance_records 
WHERE status != 'present';
```

## После исправления

1. Обновите страницу приложения (F5)
2. Откройте консоль браузера (F12)
3. Проверьте, что ошибки 403 исчезли
4. Проверьте, что недельный отчет загружается

## Если проблема сохраняется

1. Проверьте логи в Supabase Dashboard → Logs
2. Убедитесь, что миграция `007_fix_rls_debug.sql` применена
3. Проверьте, что пользователь имеет статус `approved`
4. Проверьте, что функция `is_user_approved()` возвращает `true`

## Диагностика

В консоли браузера теперь будет больше информации:
- `Error fetching invitations:` - детали ошибки при загрузке приглашений
- `Error fetching pending profiles:` - детали ошибки при загрузке профилей
- `Pending profiles fetched:` - количество загруженных профилей

Используйте эту информацию для диагностики проблем.

