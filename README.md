# Панель учёта посещаемости

Веб-панель для управления журналом посещаемости учебной группы. Данные хранятся в облачном Supabase, а фронтенд развёртывается как статический сайт (например, на TimeWeb).

## Технологии

- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Query
- Supabase (PostgreSQL)

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Скопируйте шаблон переменных окружения и заполните его данными из Supabase:
```bash
cp env.production.template .env.local
```
Укажите `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` из **Project Settings → API**.
Подробная инструкция по созданию проекта — в `SUPABASE_SETUP.md`.

3. Примените SQL-миграции в Supabase:
   - Откройте Supabase → SQL Editor
   - Последовательно выполните файлы из `supabase/migrations`
   - При необходимости импортируйте данные (CSV/SQL) через Supabase Table Editor

4. Запустите dev сервер:
```bash
npm run dev
```

## Структура проекта

```
src/
  components/     # Переиспользуемые компоненты
  pages/          # Страницы приложения
  hooks/          # Custom hooks
  lib/            # Supabase клиент, утилиты
  types/          # TypeScript типы
  services/       # API сервисы
  contexts/       # React контексты
  utils/          # Вспомогательные функции
```

## Основные функции

- Управление студентами и преподавателями
- Расписание занятий
- Отметка посещаемости
- Отчёты и аналитика
- Экспорт данных (CSV, PDF)
- Логирование действий
- Управление приглашениями и одобрением пользователей

