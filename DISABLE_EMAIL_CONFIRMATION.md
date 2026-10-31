# Отключение подтверждения email в Supabase

## Проблема

После регистрации пользователь не может войти, получая ошибку "Email not confirmed". Это происходит потому, что в Supabase включено подтверждение email.

## Решение

### Вариант 1: Отключить подтверждение email в Supabase Dashboard (Рекомендуется)

1. Откройте **Supabase Dashboard** → ваш проект
2. Перейдите в **Authentication** → **Providers** → **Email**
3. Найдите настройку **"Confirm email"** или **"Enable email confirmations"**
4. **Отключите** эту настройку
5. Сохраните изменения

### Вариант 2: Подтвердить email вручную через SQL

Если нужно подтвердить конкретного пользователя:

```sql
-- Подтвердить email пользователя
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';

-- Или по user_id
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = 'USER_UUID_HERE';
```

### Вариант 3: Подтвердить всех пользователей

Если нужно подтвердить всех пользователей сразу:

```sql
-- Подтвердить всех пользователей, у которых email не подтвержден
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;
```

## После отключения подтверждения

1. Обновите страницу приложения (F5)
2. Попробуйте войти с учетными данными
3. Вход должен работать без ошибки "Email not confirmed"

## Важно

- Отключение подтверждения email снижает безопасность
- Рекомендуется использовать подтверждение email в production
- Для внутренних систем можно отключить подтверждение

## Альтернативное решение

Если вы хотите оставить подтверждение email, но автоматически подтверждать пользователей после одобрения заявки, можно создать триггер:

```sql
-- Триггер для автоматического подтверждения email при одобрении профиля
CREATE OR REPLACE FUNCTION auto_confirm_email_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = NEW.user_id
    AND email_confirmed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER confirm_email_on_approval
AFTER UPDATE ON user_profiles
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
EXECUTE FUNCTION auto_confirm_email_on_approval();
```

Этот триггер автоматически подтвердит email пользователя, когда его профиль будет одобрен.

