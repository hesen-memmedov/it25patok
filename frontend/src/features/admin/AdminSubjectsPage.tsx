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
  Spinner,
  Modal,
  ConfirmDialog,
  Input,
  Textarea,
  Select,
  Badge,
} from '@/components/ui'
import { useToast } from '@/lib/toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import type { Subject, TeachingAssignment, User, Group } from '@/lib/types'
import { apiFetch, API_URL } from '@/lib/api'

interface SubjectWithAssignmentsApi {
  subject: Subject
  assignments: TeachingAssignment[]
}

type SubjectView = Subject & { assignments: TeachingAssignment[] }

interface SubjectForm {
  name: string
  code: string
  description: string
  teacherId: string
  groupIds: string[]
}

const emptyForm: SubjectForm = { name: '', code: '', description: '', teacherId: '', groupIds: [] }

export default function AdminSubjectsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const accessToken = useAuthStore.getState().accessToken
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SubjectView | null>(null)
  const [form, setForm] = useState<SubjectForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<SubjectView | null>(null)

  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: async () => {
      const response = await apiFetch(`${API_URL}/admin/subjects`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return response.json()
    },
    refetchInterval: 60_000,
  })

  const { data: teachersData } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => {
      const response = await apiFetch(`${API_URL}/admin/users?role=TEACHER&active=true&size=200&page=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await response.json()
      return (data?.data?.items ?? []) as User[]
    },
    refetchInterval: 60_000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: async () => {
      const response = await apiFetch(`${API_URL}/admin/groups`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return (await response.json())?.data as Group[] | undefined
    },
    refetchInterval: 60_000,
  })

  const subjects = (subjectsData?.data as SubjectWithAssignmentsApi[] | undefined)?.map<SubjectView>(
    (entry) => ({
      ...entry.subject,
      assignments: entry.assignments ?? [],
    }),
  )
  const teachers = teachersData ?? []
  const groups = groupsData ?? []
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-subjects'] })

  const toggleGroup = (groupId: string) => {
    setForm((f) => ({
      ...f,
      groupIds: f.groupIds.includes(groupId)
        ? f.groupIds.filter((id) => id !== groupId)
        : [...f.groupIds, groupId],
    }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const teacherId = form.teacherId || null
      const body = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        teacherId,
        groupIds: teacherId ? form.groupIds : [],
      }
      const isEdit = Boolean(editing)
      const url = isEdit ? `${API_URL}/admin/subjects/${editing!.id}` : `${API_URL}/admin/subjects`
      const response = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.message || 'Xəta baş verdi.')
      }
      return data
    },
    onSuccess: () => {
      setFormOpen(false)
      setEditing(null)
      setForm(emptyForm)
      invalidate()
      toast({ title: t('common.save'), description: editing ? 'Fənn yeniləndi.' : 'Fənn əlavə edildi.' })
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`${API_URL}/admin/subjects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.message || 'Silinərkən xəta baş verdi.')
      }
      return data
    },
    onSuccess: () => {
      setDeleteTarget(null)
      invalidate()
      toast({ title: t('common.success', 'Uğurlu'), description: 'Fənn silindi.' })
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message })
    },
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (subject: SubjectView) => {
    setEditing(subject)
    const teacherId = subject.assignments[0]?.teacherId ?? ''
    setForm({
      name: subject.name,
      code: subject.code ?? '',
      description: subject.description ?? '',
      teacherId,
      groupIds: subject.assignments.map((a) => a.groupId),
    })
    setFormOpen(true)
  }

  const canSave = form.name.trim().length > 0 && (!form.teacherId || form.groupIds.length > 0)

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
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('admin.subjects')}</h2>
        <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          {t('admin.add_subject', 'Yeni fənn')}
        </Button>
      </div>

      <Row className="g-4">
        <Col md={12}>
          <Table responsive>
            <thead>
              <tr>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.name')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.code')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.description')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.teachers', 'Müəllim')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.group')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold" style={{ width: '120px' }}>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {subjects?.map((s) => (
                <tr key={s.id} className="bg-white dark:bg-black/30 dark:bg-black/30 border-b border-[#ddd6a8] dark:border-white/10">
                  <td className="text-xs text-slate-600 dark:text-slate-300">{s.name}</td>
                  <td className="text-xs font-medium text-slate-600 dark:text-slate-300">{s.code || t('admin.none')}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300 s-break-all">{s.description || t('admin.none')}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {s.assignments.length
                      ? [...new Set(s.assignments.map((a) => a.teacherName))].join(', ')
                      : <span className="text-amber-500">təyin olunmayıb</span>}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {s.assignments.length
                      ? [...new Set(s.assignments.map((a) => a.groupCode))].map((code) => (
                          <Badge key={code} tone="muted" className="mr-1 text-[10px] px-1.5 py-0.5">{code}</Badge>
                        ))
                      : t('admin.none')}
                  </td>
                  <td className="text-center whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="text-xs text-slate-600 dark:text-slate-300 mx-0.5" title={t('common.edit')} aria-label={t('common.edit')} onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-xs text-rose-300 mx-0.5" title={t('common.delete')} aria-label={t('common.delete')} onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {subjects?.length === 0 && (
            <p className="text-center text-slate-500 mt-3">{t('admin.no_subjects')}</p>
          )}
        </Col>
      </Row>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('admin.edit') : t('admin.add_subject', 'Yeni fənn')}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              disabled={!canSave}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs text-slate-500 dark:text-slate-400">
            {t('admin.name')}
            <Input className="mt-1 text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Məsələn: Riyaziyyat" />
          </label>
          <label className="block text-xs text-slate-500 dark:text-slate-400">
            {t('admin.code')}
            <Input className="mt-1 text-sm" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Məsələn: MATH" />
          </label>
          <label className="block text-xs text-slate-500 dark:text-slate-400">
            {t('admin.description')}
            <Textarea className="mt-1 text-sm" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>

          <label className="block text-xs text-slate-500 dark:text-slate-400">
            {t('admin.teachers', 'Müəllim')}
            <Select
              className="mt-1 text-sm"
              value={form.teacherId}
              onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value, groupIds: e.target.value ? f.groupIds : [] }))}
            >
              <option value="">{t('admin.select_teacher', 'Müəllim seçin (məcburi deyil)')}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}{teacher.username ? ` (${teacher.username})` : ''}
                </option>
              ))}
            </Select>
          </label>

          {form.teacherId && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="mb-1.5 block">{t('admin.groups')}</span>
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => {
                  const checked = form.groupIds.includes(group.id)
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        checked
                          ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-500/15 dark:border-primary-400/50 dark:bg-primary-500/15 dark:text-primary-200'
                          : 'border-[#ddd6a8] bg-white text-slate-600 hover:border-primary-200 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      {group.code}
                    </button>
                  )
                })}
              </div>
              {form.groupIds.length === 0 && (
                <p className="mt-1.5 text-amber-500">{t('admin.groups_required_hint', 'Müəllim seçildisə, heç olmasa bir qrup seçin.')}</p>
              )}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('common.delete')}
        description={deleteTarget ? `${deleteTarget.name} — ${t('admin.delete_subject_hint', 'fənn silinəcək. Fənnə tapşırıq bağlıdırsa silinməyəcək.')}` : undefined}
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </Container>
  )
}
