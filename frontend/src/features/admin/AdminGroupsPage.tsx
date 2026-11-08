import { useMemo, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Input,
  Spinner,
  Modal,
  ConfirmDialog,
} from '@/components/ui'
import { useToast } from '@/lib/toast'
import { Plus, Trash2, MoveRight } from 'lucide-react'

import type { Group, User } from '@/lib/types'
import { API_URL, apiFetch } from '@/lib/api'

export default function AdminGroupsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const accessToken = useAuthStore.getState().accessToken
  const queryClient = useQueryClient()

  const [moveTarget, setMoveTarget] = useState<Group | null>(null)
  const [moveSearch, setMoveSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: async () => {
      const response = await apiFetch(`${API_URL}/admin/groups`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return response.json()
    },
    refetchInterval: 60_000,
  })

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-all-students'],
    queryFn: async () => {
      const response = await apiFetch(`${API_URL}/admin/users?role=STUDENT&active=true&size=500&page=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return response.json()
    },
    enabled: moveTarget !== null,
    refetchInterval: 30_000,
  })

  const moveMutation = useMutation({
    mutationFn: async ({ groupId, studentId }: { groupId: string; studentId: string }) => {
      const response = await apiFetch(`${API_URL}/admin/groups/${groupId}/students/${studentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await response.json()
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.message || 'Köçürülərkən xəta baş verdi.')
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-students'] })
      toast({ title: t('common.success', 'Uğurlu'), description: 'Tələbə qrupa köçürüldü.' })
    },
    onError: (error: Error) => {
      toast({ title: t('common.error', 'Xəta'), description: error.message })
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(`${API_URL}/admin/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ code: newCode.trim(), name: newName.trim() }),
      })
      const data = await response.json()
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.message || 'Qrup yaradılarkən xəta baş verdi.')
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      setCreateOpen(false)
      setNewCode('')
      setNewName('')
      toast({ title: t('admin.group_created', 'Qrup yaradıldı'), description: '' })
    },
    onError: (error: Error) => {
      toast({ title: t('common.error', 'Xəta'), description: error.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`${API_URL}/admin/groups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.message || 'Qrup silinərkən xəta baş verdi.')
      }
      return data
    },
    onSuccess: () => {
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      toast({ title: t('common.success', 'Uğurlu'), description: 'Qrup silindi.' })
    },
    onError: (error: Error) => {
      toast({ title: t('common.error', 'Xəta'), description: error.message })
    },
  })

  const groups = groupsData?.data as Group[] | undefined
  const students = studentsData?.data?.items as User[] | undefined

  const candidates = useMemo(() => {
    if (!students || !moveTarget) return []
    const q = moveSearch.trim().toLowerCase()
    return students.filter(
      (s) =>
        s.groupId !== moveTarget.id &&
        (!q || s.email.toLowerCase().includes(q) || s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q)),
    )
  }, [students, moveTarget, moveSearch])

  if (isLoading) {
    return (
      <Container className="min-h-screen flex items-center justify-center py-8">
        <div className="min-h-[300px] flex items-center justify-center text-slate-900 dark:text-white">
          <Spinner className="h-6 w-6 mr-3" />
          <span>{t('admin.loading')}</span>
        </div>
      </Container>
    )
  }

  return (
    <Container className="min-h-screen py-4">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('admin.groups')}</h2>
        <Button variant="primary" onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          {t('admin.add_group', 'Yeni qrup')}
        </Button>
      </div>

      <Row className="g-4">
        <Col md={12}>
          <Table responsive>
            <thead>
              <tr>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.code')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.name')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.students')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold" style={{ width: '160px' }}>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {groups?.map((g) => (
                <tr key={g.id} className="bg-white dark:bg-black/30 dark:bg-black/30 border-b border-[#ddd6a8] dark:border-white/10">
                  <td className="text-xs font-medium text-slate-600 dark:text-slate-300">{g.code}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">{g.name}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">{g.studentCount} {t('admin.students')}</td>
                  <td className="text-center whitespace-nowrap">
                    <Button
                      variant="soft"
                      size="sm"
                      className="text-xs mx-0.5"
                      leftIcon={<MoveRight className="h-4 w-4" />}
                      onClick={() => setMoveTarget(g)}
                    >
                      {t('admin.move_students', 'Köçür')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-rose-300 mx-0.5"
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                      onClick={() => setDeleteTarget(g)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* Create group modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('admin.add_group', 'Yeni qrup')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              disabled={!newCode.trim() || !newName.trim()}
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs text-slate-500 dark:text-slate-400">
            {t('admin.code')} <span className="text-rose-400">*</span>
            <Input
              className="mt-1 text-sm"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="Məsələn: IT26A1"
              autoFocus
            />
          </label>
          <label className="block text-xs text-slate-500 dark:text-slate-400">
            {t('admin.name')} <span className="text-rose-400">*</span>
            <Input
              className="mt-1 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Məsələn: İT26A1"
            />
          </label>
          <p className="text-[11px] text-slate-500">{t('admin.group_hint', 'Kod avtomatik böyük hərflərlə saxlanılır.')}</p>
        </div>
      </Modal>

      {/* Delete group confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('common.delete')}
        description={deleteTarget ? `${deleteTarget.code} — ${deleteTarget.name}. ${t('admin.delete_group_hint', 'Qrup silinəcək. Qrupda tələbə varsa əməliyyat bloklanır.')}` : undefined}
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />

      <Modal
        open={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        title={moveTarget ? `${moveTarget.code} — ${moveTarget.name}` : ''}
        description={t('admin.move_students_hint', 'Seçilən qrupa köçürülür: başqa qrupda və ya qrupsuz olan tələbələr.')}
        size="lg"
      >
        <div className="mb-3">
          <Input
            type="text"
            placeholder={t('admin.search_users')}
            value={moveSearch}
            onChange={(e) => setMoveSearch(e.target.value)}
            className="text-sm"
            autoFocus
          />
        </div>
        {studentsLoading ? (
          <div className="py-8 flex justify-center"><Spinner /></div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">{t('admin.no_users')}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-white/10">
            {candidates.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm text-slate-800 dark:text-slate-100 truncate">{s.firstName} {s.lastName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {s.email}{s.groupCode ? ` · ${s.groupCode}` : ` · ${t('admin.none')}`}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={moveMutation.isPending}
                  onClick={() => moveMutation.mutate({ groupId: moveTarget!.id, studentId: s.id })}
                >
                  {t('admin.move_students', 'Köçür')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </Container>
  )
}
