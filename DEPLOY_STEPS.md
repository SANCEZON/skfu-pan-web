# Пошаговая инструкция по деплою (Supabase + TimeWeb)

## 1. Понимание инфраструктуры

- **Фронтенд**: React/Vite, разворачивается как статический сайт на TimeWeb (`public_html`).
- **Бэкенд**: Supabase (PostgreSQL + Auth + Storage). Никакого Node.js/Docker на TimeWeb не нужно.
- **Авторизация**: Supabase Authentication (email/password + приглашения).

## 2. Настройка Supabase

1. Создайте проект на https://supabase.com.
2. Скопируйте `supabase/migrations/*.sql` и выполните их через Supabase → SQL Editor.
3. Включите Email/Password в **Authentication → Providers**.
4. Настройте RLS‑политики (минимум для `students`, `teachers`, `schedules`, `attendance_records`, `user_invitations`, `user_profiles`, `notes`, `activity_logs`).
5. Запомните:
   - `Project URL`
   - `anon key`

## 3. Переменные окружения

Создайте `.env.production` (или `.env.local` для dev):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Файл не коммитьте в репозиторий.

## 4. Сборка фронтенда

```bash
npm install
npm run build
```

В результате появится папка `dist/` с готовыми файлами.

## 5. Загрузка на TimeWeb

1. Откройте панель TimeWeb → «Сайты» → нужный домен.
2. Через файловый менеджер (или SFTP) очистите `public_html`.
3. Загрузите **содержимое** `dist/` в `public_html`.
4. Добавьте `.htaccess` (лежит в корне репозитория) для SPA‑роутинга.
5. Проверьте права на файлы (644) и каталоги (755).

## 6. Проверка

1. Откройте сайт → убедитесь, что грузится SPA.
2. В DevTools → Network посмотрите, что запросы идут на `https://your-project.supabase.co`.
3. Пройдите полный сценарий: вход, создание студента, отметка посещаемости, отчёт, приглашение.

## 7. Типичные проблемы

| Симптом | Решение |
| ------- | ------- |
| Пустая страница | Проверьте, что загрузили **содержимое** `dist/`, а не саму папку. |
| 404 при обновлении страницы | Убедитесь, что `.htaccess` скопирован из репозитория. |
| Ошибки Supabase (401/403) | Проверьте `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` и RLS‑политики. |
| Медленный отклик | Убедитесь, что проект Supabase не в паузе; рассмотреть более близкий регион. |

## 8. Поддержка

- Для обновлений повторяйте шаги 4–5 (сборка + загрузка).
- Резервные копии БД доступны в Supabase → Backups.
- При необходимости автоматизируйте деплой через GitHub Actions + SFTP.

## 9. Что дальше

1. Настройте домен/SSL в TimeWeb.
2. Создайте admin-пользователя, одобрите его в разделе «Приглашения».
3. Задокументируйте роли и RLS‑политики, чтобы новые участники могли быстро подключиться.

