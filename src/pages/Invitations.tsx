import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  createInvitation,
  getInvitations,
  getApprovalLogs,
  updateInvitationStatus,
  logApprovalAction,
  approveProfile,
  rejectProfile,
  getPendingProfiles,
} from '../services/invitations'
import { useAuth } from '../contexts/AuthContext'

export default function Invitations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('7')
  const [note, setNote] = useState('')

  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: getInvitations,
    refetchInterval: 60000,
  })

  const { data: pendingProfiles } = useQuery({
    queryKey: ['pending-profiles'],
    queryFn: getPendingProfiles,
    refetchInterval: 30000,
  })

  const { data: logs } = useQuery({
    queryKey: ['approval-logs'],
    queryFn: () => getApprovalLogs(25),
    refetchInterval: 60000,
  })

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      const expires_at =
        expiresInDays.trim() !== ''
          ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
          : null
      const invitation = await createInvitation({ email, expires_at, note, created_by: user?.id || null })
      await logApprovalAction({
        invitation_id: invitation.id,
        target_email: invitation.email,
        action: 'invited',
        acted_by: user?.id || null,
        details: 'Создано приглашение',
      })
      return invitation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['approval-logs'] })
      setEmail('')
      setNote('')
    },
  })

  const updateInvitationMutation = useMutation({
    mutationFn: async ({ id, status, details }: { id: string; status: any; details: string }) => {
      const invitation = await updateInvitationStatus(id, status, user?.id)
      await logApprovalAction({
        invitation_id: invitation.id,
        target_email: invitation.email,
        action: status === 'rejected' ? 'rejected' : 'revoked',
        acted_by: user?.id || null,
        details,
      })
      return invitation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['approval-logs'] })
    },
  })

  const approveProfileMutation = useMutation({
    mutationFn: async ({ userId, invitationId, email }: { userId: string; invitationId?: string | null; email?: string | null }) => {
      const profile = await approveProfile(userId)
      if (invitationId) {
        await logApprovalAction({
          invitation_id: invitationId,
          target_email: email || '',
          action: 'approved',
          acted_by: user?.id || null,
          details: 'Пользователь одобрен',
        })
      }
      return profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['approval-logs'] })
    },
  })

  const rejectProfileMutation = useMutation({
    mutationFn: async ({ userId, invitationId, email }: { userId: string; invitationId?: string | null; email?: string | null }) => {
      const profile = await rejectProfile(userId)
      if (invitationId) {
        await logApprovalAction({
          invitation_id: invitationId,
          target_email: email || '',
          action: 'rejected',
          acted_by: user?.id || null,
          details: 'Пользователь отклонён',
        })
      }
      return profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['approval-logs'] })
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Приглашения пользователей</h1>
          <p className="text-gray-600 mt-2">Управляйте доступом и статусами приглашений</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Создать приглашение</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createInvitationMutation.mutate()
            }}
            className="space-y-4"
          >
            <Input
              label="Email пользователя"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Срок действия (дней)"
                type="number"
                min="1"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
              <Input
                label="Заметка"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={createInvitationMutation.isPending}>
              {createInvitationMutation.isPending ? 'Создание...' : 'Создать приглашение'}
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Статистика</h2>
          <div className="space-y-4">
            <StatItem label="Всего приглашений" value={invitations?.length || 0} />
            <StatItem
              label="Ожидают активации"
              value={invitations?.filter((inv) => inv.status === 'pending').length || 0}
            />
            <StatItem
              label="Ожидают одобрения"
              value={pendingProfiles?.length || 0}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Приглашения</h2>
          </div>
          <div className="space-y-3">
            {invitations && invitations.length > 0 ? (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 border rounded-lg flex flex-col gap-2 bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{invitation.email}</p>
                      <p className="text-sm text-gray-500">
                        Создано: {format(new Date(invitation.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </p>
                    </div>
                    <StatusBadge status={invitation.status} />
                  </div>
                  <div className="text-xs text-gray-500 break-all">
                    Токен: <span className="font-mono">{invitation.token}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {invitation.status === 'pending' && (
                      <Button
                        variant="secondary"
                        className="text-sm"
                        onClick={() =>
                          updateInvitationMutation.mutate({
                            id: invitation.id,
                            status: 'revoked',
                            details: 'Приглашение отозвано',
                          })
                        }
                      >
                        Отозвать
                      </Button>
                    )}
                    {invitation.status === 'accepted' && (
                      <Button
                        variant="secondary"
                        className="text-sm"
                        onClick={() =>
                          updateInvitationMutation.mutate({
                            id: invitation.id,
                            status: 'rejected',
                            details: 'Приглашение помечено как отклонённое',
                          })
                        }
                      >
                        Отклонить
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-6">Приглашений нет</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Заявки на одобрение</h2>
          </div>
          <div className="space-y-3">
            {pendingProfiles && pendingProfiles.length > 0 ? (
              pendingProfiles.map((profile) => (
                <div key={profile.user_id} className="p-4 border rounded-lg bg-gray-50">
                  <p className="font-semibold text-gray-900">{profile.full_name || profile.user_email || profile.user_id}</p>
                  {profile.user_email && (
                    <p className="text-sm text-gray-500">{profile.user_email}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    С {format(new Date(profile.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() =>
                        approveProfileMutation.mutate({
                          userId: profile.user_id,
                          invitationId: profile.invitation_id,
                          email: profile.user_email,
                        })
                      }
                      className="text-sm"
                    >
                      Одобрить
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        rejectProfileMutation.mutate({
                          userId: profile.user_id,
                          invitationId: profile.invitation_id,
                          email: profile.user_email,
                        })
                      }
                      className="text-sm"
                    >
                      Отклонить
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-6">Заявок нет</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Журнал действий</h2>
        </div>
        <div className="space-y-3">
          {logs && logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="p-3 border rounded-lg flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{log.action}</p>
                  <p className="text-gray-500">{log.target_email}</p>
                </div>
                <div className="text-right text-gray-500">
                  {format(new Date(log.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-6">Записей нет</p>
          )}
        </div>
      </Card>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    revoked: 'bg-gray-200 text-gray-700',
    expired: 'bg-gray-300 text-gray-600',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-200 text-gray-700'}`}>
      {status}
    </span>
  )
}

