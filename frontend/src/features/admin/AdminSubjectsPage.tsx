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
} from '@/components/ui'
import { useToast } from '@/lib/toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import type { Subject, TeachingAssignment } from '@/lib/types'
import { API_URL, apiFetch } from '@/lib/api'

interface SubjectWithAssignmentsApi {
  subject: Subject
  assignments: TeachingAssignment[]
}

type SubjectView = Subject & { assignedCount: number }

interface SubjectForm {
  name: string
  code: string
  description: string
}

const emptyForm: SubjectForm = { name: '', code: '', description: '' }

export default function AdminSubjectsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const accessToken = useAuthStore.getState().accessToken
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [form, setForm] = useState<SubjectForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)

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

  const subjects = (subjectsData?.data as SubjectWithAssignmentsApi[] | undefined)?.map<SubjectView>(
    (entry) => ({
      ...entry.subject,
      assignedCount: entry.assignments?.length ?? 0,
    }),
  )
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-subjects'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
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

  const openEdit = (subject: Subject) => {
    setEditing(subject)
    setForm({
      name: subject.name,
      code: subject.code ?? '',
      description: subject.description ?? '',
    })
    setFormOpen(true)
  }

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
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.assignments')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold" style={{ width: '120px' }}>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {subjects?.map((s) => (
                <tr key={s.id} className="bg-white dark:bg-black/30 dark:bg-black/30 border-b border-slate-200 dark:border-white/10">
                  <td className="text-xs text-slate-600 dark:text-slate-300">{s.name}</td>
                  <td className="text-xs font-medium text-slate-600 dark:text-slate-300">{s.code || t('admin.none')}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300 s-break-all">{s.description || t('admin.none')}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">{s.assignedCount ?? 0} {t('admin.assignments')}</td>
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
              disabled={!form.name.trim()}
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
