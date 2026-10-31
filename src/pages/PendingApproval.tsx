import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'

export default function PendingApproval() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="max-w-lg w-full text-center space-y-4">
        <div className="text-5xl">⏳</div>
        <h1 className="text-2xl font-bold text-gray-900">Заявка на одобрение</h1>
        <p className="text-gray-600">
          Ваш аккаунт создан и ожидает подтверждения администратора. Вы получите доступ к панели сразу после
          одобрения. На почту придёт уведомление.
        </p>
        <Button variant="secondary" onClick={() => signOut()}>
          Выйти
        </Button>
      </Card>
    </div>
  )
}

