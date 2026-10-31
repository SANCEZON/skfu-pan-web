# Деплой на TimeWeb Shared Hosting (Supabase)

Бэкенд полностью заменён на Supabase, поэтому на TimeWeb размещаем только статический фронтенд. Ни Node.js, ни Docker не нужны.

## Что понадобится

- Аккаунт TimeWeb (любой shared hosting тариф)
- Supabase‑проект (Project URL + anon key)
- SQL миграции из `supabase/migrations`
- FTP/SFTP клиент или файловый менеджер TimeWeb

## 1. Настройте Supabase

1. Создайте проект на https://supabase.com и выберите регион (желательно ближайший к РФ).
2. Откройте **SQL Editor** и последовательно выполните файлы из `supabase/migrations`.
3. Включите Email/Password в разделе **Authentication → Providers**.
4. Создайте RLS‑политики:
   - авторизованные пользователи могут работать со своими заметками/логами;
   - пользователи с ролью `admin` могут управлять студентами, преподавателями, расписанием и приглашениями.
5. Скопируйте `Project URL` и `anon key` из **Project Settings → API** — они понадобятся фронтенду.

## 2. Переменные окружения

Создайте `.env.production` (или `.env.local` для разработки):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

В TimeWeb переменные окружения не поддерживаются, поэтому сборку делаем локально.

## 3. Сборка фронтенда

```bash
npm install
npm run build
```

После команды появится папка `dist/` со статическими файлами.

## 4. Загрузка на TimeWeb

1. Войдите в TimeWeb → «Файловый менеджер» (или используйте SFTP).
2. Очистите папку `public_html` (или поддомен, если используете его).
3. Загрузите **содержимое** папки `dist/` в `public_html`.
4. Добавьте `.htaccess` из корня репозитория (нужен для SPA‑роутинга).
5. При необходимости включите HTTPS и настройте домен в панели TimeWeb.

## 5. Проверка

1. Откройте сайт в браузере: `https://your-domain`.
2. Авторизуйтесь, убедитесь, что данные подтягиваются из Supabase.
3. В DevTools → Network убедитесь, что запросы идут на `https://your-project.supabase.co`.

## Ответы на частые вопросы

| Вопрос | Ответ |
| ------ | ----- |
| Где теперь база? | В Supabase (PostgreSQL + auth + storage). |
| Нужен ли backend? | Нет, логика реализована через Supabase SDK и RLS. |
| Можно ли деплоить напрямую с TimeWeb? | Да, но проще собирать локально и заливать `dist/`. |
| Что с миграциями? | Выполняйте SQL из `supabase/migrations` через Supabase SQL Editor. |
| Как обновить? | Снова `npm run build`, загрузите свежий `dist/` и замените файлы. |

## Советы

- Держите Supabase ключи только в `.env.local` / `.env.production`, не коммитьте их.
- Создайте резервную копию SQL после миграций (Supabase → Backups).
- Если нужно автоматизировать деплой, используйте GitHub Actions + SFTP Upload.

