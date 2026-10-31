# Решение проблем

## Проблема: Экран "Загрузка..." не исчезает

### Причины:
1. **Отсутствуют переменные окружения**
   - Проверьте наличие файла `.env.local` или `.env` в корне проекта
   - Убедитесь, что в файле есть:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Перезапустите dev-сервер после изменения `.env` файла

2. **Неверный формат URL или ключа**
   - URL должен начинаться с `https://`
   - Ключ должен быть `anon` ключом из Supabase Dashboard

3. **Проблемы с сетью или Supabase**
   - Проверьте консоль браузера (F12) на наличие ошибок
   - Проверьте, что Supabase проект активен
   - Проверьте Network tab в DevTools на наличие запросов к Supabase

4. **Пользователь не имеет профиля**
   - Если пользователь существует в Auth, но нет профиля в `user_profiles`, он увидит экран "Заявка на одобрение"
   - Создайте профиль через SQL:
     ```sql
     INSERT INTO public.user_profiles (user_id, status, full_name)
     VALUES ('USER_UUID', 'approved', 'Имя')
     ```

5. **RLS политики блокируют доступ**
   - Убедитесь, что миграции RLS применены (005_enable_rls_policies.sql)
   - Проверьте, что пользователь имеет статус `approved` в `user_profiles`

## Диагностика

### Шаг 1: Проверьте консоль браузера
Откройте DevTools (F12) → Console и найдите:
- `Initializing auth...` - должно появиться при загрузке
- `Session retrieved: exists` или `none` - показывает наличие сессии
- `User found, fetching profile...` - показывает, что пользователь найден
- `Profile fetched successfully:` - показывает успешную загрузку профиля
- Любые ошибки (красным цветом)

### Шаг 2: Проверьте переменные окружения
В консоли должны быть логи:
- `Supabase URL: Set` или `MISSING`
- `Supabase Key: Set` или `MISSING`

Если видите `MISSING`, создайте файл `.env.local` в корне проекта.

### Шаг 3: Проверьте Network tab
В DevTools → Network найдите запросы к Supabase:
- Должны быть запросы к `your-project.supabase.co`
- Проверьте статус ответов (должны быть 200 или 201)
- Если видите 401/403, проверьте RLS политики

### Шаг 4: Проверьте Supabase Dashboard
1. Откройте ваш проект в Supabase Dashboard
2. Перейдите в **Authentication → Users**
3. Убедитесь, что пользователь существует
4. Перейдите в **Table Editor → user_profiles**
5. Проверьте, что есть запись с `user_id` вашего пользователя
6. Проверьте, что `status = 'approved'`

## Быстрое решение

Если ничего не помогает:

1. **Очистите кэш браузера и localStorage:**
   ```javascript
   // В консоли браузера:
   localStorage.clear()
   sessionStorage.clear()
   ```

2. **Перезапустите dev-сервер:**
   ```bash
   # Остановите сервер (Ctrl+C)
   npm run dev
   ```

3. **Проверьте файл `.env.local`:**
   - Убедитесь, что файл в корне проекта (не в `src/`)
   - Убедитесь, что нет лишних пробелов
   - Убедитесь, что значения в кавычках (если есть пробелы)

4. **Создайте первого администратора:**
   ```sql
   -- В Supabase SQL Editor:
   INSERT INTO public.user_profiles (user_id, status, full_name)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
     'approved',
     'Администратор'
   )
   ON CONFLICT (user_id) 
   DO UPDATE SET status = 'approved';
   ```

## Контакты для помощи

Если проблема не решена:
1. Сделайте скриншот консоли браузера
2. Сделайте скриншот Network tab
3. Проверьте логи в Supabase Dashboard → Logs
4. Сообщите о проблеме с этими данными

