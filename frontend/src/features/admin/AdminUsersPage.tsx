import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Badge,
  Input,
  Spinner,
  Modal,
  ConfirmDialog,
  Select,
} from '@/components/ui'
import { useToast } from '@/lib/toast'
import { UserPlus, Pencil, Trash2, KeyRound, Eye } from 'lucide-react'

import type { User, UserDetail, Role, CreatedUser, ResetPasswordResponse, Group } from '@/lib/types'
import { API_URL, postData, putData, deleteData, getData, apiFetch } from '@/lib/api'

interface UserFormState {
  role: Role
  username: string
  email: string
  firstName: string
  lastName: string
  phone: string
  groupId: string
}

const emptyForm: UserFormState = {
  role: 'STUDENT',
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  groupId: '',
}

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [groupFilter, setGroupFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<boolean | ''>(false)
  const [page, setPage] = useState(1)
  const [size] = useState(20)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm)
  const [created, setCreated] = useState<CreatedUser | null>(null)
  const [resetResult, setResetResult] = useState<{ label: string; password: string } | null>(null)
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, groupFilter, activeFilter, page, size],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(size))
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (groupFilter) params.set('groupId', groupFilter)
      if (activeFilter !== false && activeFilter !== '') params.set('active', String(activeFilter))
      const response = await apiFetch(`${API_URL}/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return response.json()
    },
    refetchInterval: 60_000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => getData<Group[]>('/admin/groups'),
  })

  const users = usersData?.data?.items as User[] | undefined
  const total = usersData?.data?.total ?? 0
  const groups = groupsData ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      postData<CreatedUser>('/admin/users', payload),
    onSuccess: (data) => {
      setCreated(data)
      setFormOpen(false)
      setForm(emptyForm)
      invalidate()
      toast({ title: t('common.success', 'Uğurlu'), description: t('admin.user_created', 'Hesab yaradıldı və şifrə e-poçt ilə göndərildi.') })
    },
    onError: (error: Error & { code?: string }) => {
      toast({
        title: t('common.error', 'Xəta'),
        description: error?.message || 'Hesab yaradılarkən xəta baş verdi.',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      putData<User>(`/admin/users/${id}`, patch),
    onSuccess: () => {
      setFormOpen(false)
      setEditing(null)
      invalidate()
      toast({ title: t('common.success', 'Uğurlu'), description: 'İstifadəçi yeniləndi.' })
    },
    onError: (error: Error & { code?: string }) => {
      toast({ title: t('common.error', 'Xəta'), description: error?.message || 'Yenilənərkən xəta baş verdi.' })
    },
  })

  const resetMutation = useMutation({
    mutationFn: (id: string) => postData<ResetPasswordResponse>(`/admin/users/${id}/reset-password`, {}),
    onSuccess: (data) => {
      setResetResult({ label: resetTarget ? `${resetTarget.username ?? ''} (${resetTarget.email})` : '', password: data.password })
      setResetTarget(null)
      invalidate()
    },
    onError: (error: Error & { code?: string }) => {
      toast({ title: t('common.error', 'Xəta'), description: error?.message || 'Şifrə sıfırlanarkən xəta baş verdi.' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteData<void>(`/admin/users/${id}`),
    onSuccess: () => {
      setDeleteTarget(null)
      invalidate()
      toast({ title: t('common.success', 'Uğurlu'), description: 'İstifadəçi deaktiv olundu.' })
    },
    onError: (error: Error & { code?: string }) => {
      toast({ title: t('common.error', 'Xəta'), description: error?.message || 'Silinərkən xəta baş verdi.' })
    },
  })

  const detailMutation = useMutation({
    mutationFn: (id: string) => getData<UserDetail>(`/admin/users/${id}`),
    onSuccess: (data) => setDetailUser(data),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setForm({
      role: user.role,
      username: user.username ?? '',
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      groupId: user.groupId ?? '',
    })
    setFormOpen(true)
  }

  const submitForm = () => {
    const payload: Record<string, unknown> = {
      role: form.role,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
      groupId: form.groupId || undefined,
    }
    if (editing) {
      payload.email = form.email.trim().toLowerCase()
      updateMutation.mutate({ id: editing.id, patch: payload })
    } else {
      payload.username = form.username.trim().toLowerCase()
      createMutation.mutate(payload)
    }
  }

  const filteredTotalPages = Math.max(1, Math.ceil(total / size))

  const roleBadge = (role: Role) =>
    role === 'ADMIN' ? 'danger' : role === 'TEACHER' ? 'primary' : 'success'

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('admin.users')}</h2>
          <Badge tone="muted" className="text-xs px-2 py-1">{total}</Badge>
        </div>
        <Button variant="primary" onClick={openCreate} leftIcon={<UserPlus className="h-4 w-4" />}>
          {t('admin.create_user', 'Yeni istifadəçi')}
        </Button>
      </div>

      {/* Filters */}
      <Row className="mb-4 g-3">
        <Col md={3} sm={6}>
          <Input
            type="text"
            placeholder={t('admin.search_users')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="text-sm"
          />
        </Col>
        <Col md={2} sm={4}>
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as Role | '')
              setPage(1)
            }}
            className="text-sm"
            aria-label={t('admin.role')}
          >
            <option value="">{t('common.all')} {t('admin.role')}</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TEACHER">TEACHER</option>
            <option value="STUDENT">STUDENT</option>
          </Select>
        </Col>
        <Col md={2} sm={4}>
          <Select
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value)
              setPage(1)
            }}
            className="text-sm"
            aria-label={t('admin.group')}
          >
            <option value="">{t('common.all')} {t('admin.group')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.code}</option>
            ))}
          </Select>
        </Col>
        <Col md={2} sm={4} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={activeFilter !== false}
            onChange={(e) => {
              setActiveFilter(e.target.checked)
              setPage(1)
            }}
            className="w-4 h-4 rounded border border-[#cfc799] dark:border-white/20"
            aria-label={t('admin.active_only')}
          />
          <span className="text-sm text-slate-600 dark:text-slate-300">{t('admin.active_only')}</span>
        </Col>
        <Col md={2} sm={4}>
          <Button variant="ghost" size="sm" className="text-sm text-slate-600 dark:text-slate-300" onClick={() => setSearch('')}>
            {t('common.clear')}
          </Button>
        </Col>
      </Row>

      {/* Table */}
      <Row>
        <Col md={12}>
          <Table responsive>
            <thead>
              <tr>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.id')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.username', 'İstifadəçi adı')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.email')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.role')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.group')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.active')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.created')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold" style={{ width: '160px' }}>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="bg-white dark:bg-black/30 dark:bg-black/30 border-b border-[#ddd6a8] dark:border-white/10">
                  <td className="text-xs text-slate-600 dark:text-slate-300">{u.id.substring(0, 8)}…</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">{u.username ?? '—'}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {u.email.endsWith('@no-mail.it25patok.az')
                      ? <span className="text-amber-300/90">qeyd olunmayıb</span>
                      : u.email}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    <Badge tone={roleBadge(u.role)} className="text-xs px-2 py-0.5">{u.role}</Badge>
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">{u.groupCode || t('admin.none')}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">{u.active ? t('admin.yes') : t('admin.no')}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">{new Date(u.createdAt).toLocaleString('az-AZ')}</td>
                  <td className="text-center whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="text-xs text-slate-600 dark:text-slate-300 mx-0.5" title={t('common.view', 'Bax')} aria-label={t('common.view', 'Bax')} onClick={() => detailMutation.mutate(u.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-xs text-slate-600 dark:text-slate-300 mx-0.5" title={t('common.edit')} aria-label={t('common.edit')} onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-xs text-slate-600 dark:text-slate-300 mx-0.5" title={t('admin.reset_password')} aria-label={t('admin.reset_password')} onClick={() => setResetTarget(u)}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-xs text-rose-300 mx-0.5" title={t('common.delete')} aria-label={t('common.delete')} onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {total === 0 && (
            <p className="text-center text-slate-500 mt-3">{t('admin.no_users')}</p>
          )}
        </Col>
      </Row>

      {total > size && (
        <Row className="mt-4 justify-content-center">
          <Col md={12} lg={6}>
            <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 gap-2">
              <span>{t('admin.page', { page, totalPages: filteredTotalPages })} / {filteredTotalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {t('common.back')}
                </Button>
                <Button variant="outline" size="sm" disabled={page >= filteredTotalPages} onClick={() => setPage((p) => p + 1)}>
                  {t('common.next', 'Sonrakı')}
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('admin.edit') : t('admin.create_user', 'Yeni istifadəçi')}
        description={editing ? `${editing.username ?? ''} — ${editing.email}` : t('admin.create_user_hint', 'İstifadəçi adı + parolla hesab yaradılır. İstifadəçi ilk girişdə parolu dəyişir və e-poçtunu qeyd edir.')}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={submitForm}
              disabled={
                (editing ? !form.email : !form.username) ||
                !form.firstName ||
                !form.lastName ||
                (form.role === 'STUDENT' && !form.groupId)
              }
            >
              {editing ? t('common.save') : t('common.create')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
            {t('admin.role')}
            <Select
              className="mt-1 text-sm"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role, groupId: '' }))}
            >
              <option value="STUDENT">STUDENT</option>
              <option value="TEACHER">TEACHER</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
          </label>
          {editing ? (
            <label className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
              {t('admin.email')}
              <Input className="mt-1 text-sm" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="ad.soyad@gmail.com" />
            </label>
          ) : (
            <label className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
              {t('admin.username', 'İstifadəçi adı')}
              <Input className="mt-1 text-sm" type="text" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))} placeholder="ad.soyad" />
              <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                Kiçik hərflər, rəqəmlər və . - _ simvolları (2–60). İstifadəçi bununla giriş edəcək.
              </span>
            </label>
          )}
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t('admin.first_name', 'Ad')}
            <Input className="mt-1 text-sm" type="text" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t('admin.last_name', 'Soyad')}
            <Input className="mt-1 text-sm" type="text" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t('admin.phone', 'Telefon')}
            <Input className="mt-1 text-sm" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+994 50 000 00 00" />
          </label>
          {form.role === 'STUDENT' && (
            <label className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.group')}
              <Select className="mt-1 text-sm" value={form.groupId} onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}>
                <option value="">{t('admin.select_group', 'Qrup seçin')}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                ))}
              </Select>
            </label>
          )}
        </div>
      </Modal>

      {/* Creation success — shows generated password */}
      <Modal
        open={created !== null}
        onClose={() => setCreated(null)}
        title={t('admin.user_created', 'Hesab yaradıldı')}
        size="sm"
        footer={<Button variant="primary" onClick={() => setCreated(null)}>{t('common.close')}</Button>}
      >
        {created && (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <p><span className="text-slate-500 dark:text-slate-400">{t('admin.user')}:</span> {created.user.firstName} {created.user.lastName} — istifadəçi adı: <strong>{created.user.username}</strong></p>
            <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3">
              <div className="text-xs text-amber-300 mb-1">{t('admin.initial_password', 'İlkin şifrə')} (bir dəfə göstərilir):</div>
              <code className="block text-amber-100 font-mono text-base select-all break-all">{created.initialPassword}</code>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.password_copy_hint', 'Şifrəni kopyalayın və istifadəçiyə təhlükəsiz şəkildə ötürün.')}</p>
          </div>
        )}
      </Modal>

      {/* Reset password result */}
      <Modal
        open={resetResult !== null}
        onClose={() => setResetResult(null)}
        title={t('admin.reset_password')}
        size="sm"
        footer={<Button variant="primary" onClick={() => setResetResult(null)}>{t('common.close')}</Button>}
      >
        {resetResult && (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <p><span className="text-slate-500 dark:text-slate-400">{t('admin.user')}:</span> {resetResult.label}</p>
            <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3">
              <div className="text-xs text-amber-300 mb-1">{t('admin.new_password', 'Yeni şifrə')}:</div>
              <code className="block text-amber-100 font-mono text-base select-all break-all">{resetResult.password}</code>
            </div>
          </div>
        )}
      </Modal>

      {/* User detail */}
      <Modal
        open={detailUser !== null}
        onClose={() => setDetailUser(null)}
        title={detailUser ? `${detailUser.user.firstName} ${detailUser.user.lastName}` : ''}
        description={detailUser?.user.username ?? undefined}
        size="md"
        footer={<Button variant="outline" onClick={() => setDetailUser(null)}>{t('common.close')}</Button>}
      >
        {detailUser && (
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <Row className="g-2">
              <Col sm={6}><div className="text-xs text-slate-500 dark:text-slate-400">{t('admin.role')}</div><div>{detailUser.user.role}</div></Col>
              <Col sm={6}><div className="text-xs text-slate-500 dark:text-slate-400">{t('admin.group')}</div><div>{detailUser.user.groupCode ?? t('admin.none')}</div></Col>
              <Col sm={6}><div className="text-xs text-slate-500 dark:text-slate-400">{t('admin.active')}</div><div>{detailUser.user.active ? t('admin.yes') : t('admin.no')}</div></Col>
              <Col sm={6}><div className="text-xs text-slate-500 dark:text-slate-400">{t('admin.created')}</div><div>{new Date(detailUser.user.createdAt).toLocaleString('az-AZ')}</div></Col>
              <Col sm={6}><div className="text-xs text-slate-500 dark:text-slate-400">{t('admin.username', 'İstifadəçi adı')}</div><div>{detailUser.user.username ?? '—'}</div></Col>
              <Col sm={6}><div className="text-xs text-slate-500 dark:text-slate-400">{t('admin.email')}</div><div>{detailUser.user.email.endsWith('@no-mail.it25patok.az') ? 'qeyd olunmayıb' : detailUser.user.email}</div></Col>
            </Row>
            {detailUser.teachingAssignments.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('admin.subjects')}:</div>
                <ul className="list-disc pl-5 text-xs">
                  {detailUser.teachingAssignments.map((ta) => (
                    <li key={ta.id}>{ta.subjectName} — {ta.groupCode}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('common.delete')}
        description={deleteTarget ? `${deleteTarget.username ?? deleteTarget.email} — ${t('admin.delete_user_hint', 'hesab deaktiv olunacaq (silinməyəcək).')}` : undefined}
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Reset password confirm */}
      <ConfirmDialog
        open={resetTarget !== null}
        title={t('admin.reset_password')}
        description={resetTarget ? `${resetTarget.username ?? resetTarget.email} üçün yeni şifrə yaranacaq.` : undefined}
        confirmLabel={t('admin.reset_password')}
        tone="primary"
        loading={resetMutation.isPending}
        onConfirm={() => resetTarget && resetMutation.mutate(resetTarget.id)}
        onClose={() => setResetTarget(null)}
      />
    </Container>
  )
}
