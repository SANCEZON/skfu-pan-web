# Быстрый старт деплоя (Supabase + TimeWeb)

- ✅ Фронтенд (React/Vite) → TimeWeb (shared hosting).
- ✅ Бэкенд → Supabase (PostgreSQL + Auth).
- ❌ Никакого Node.js/Express/Docker не нужно.

## 3 шага

1. **Supabase**  
   - Создайте проект.  
   - Выполните SQL из `supabase/migrations`.  
   - Скопируйте `Project URL` и `anon key`.

2. **Сборка**  
   ```bash
   cp env.production.template .env.production
   # Заполните VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
   npm install
   npm run build
   ```

3. **Загрузка на TimeWeb**  
   - Откройте `public_html`.  
   - Очистите каталог и загрузите содержимое `dist/`.  
   - Добавьте `.htaccess` из репозитория.

Готово! Остальные подробности — в `DEPLOY_SHARED_HOSTING.md` и `DEPLOY_STEPS.md`.

