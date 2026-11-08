import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Archive,
  ArchiveRestore,
  CalendarClock,
  Download,
  FileText,
  GraduationCap,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  SearchInput,
  Skeleton,
  StatCard,
  Tabs,
  Textarea,
} from '@/components/ui'
import { RichText } from '@/components/common/RichText'
import { DeadlineLine, StatusBadge, SubmissionProgress, TypeBadge } from '@/components/assignments/AssignmentUi'
import { FileList } from '@/components/files/FileList'
import { FileViewer } from '@/components/files/FileViewer'
import { UploadZone } from '@/components/files/UploadZone'
import { api, deleteData, getData, patchData, putData, unwrap } from '@/lib/api'
import {
  cn,
  errorMessage,
  formatDateTime,
  formatSubmittedAt,
  percent,
  statusLabel,
} from '@/lib/utils'
import type {
  ApiEnvelope,
  AssignmentDetail,
  FileDto,
  GradePayload,
  SubmissionsPayload,
  SubmissionDetail,
} from '@/lib/types'

type ViewerState =
  | { context: 'attachments'; index: number }
  | { context: 'submission'; index: number }
  | null

export default function TeacherAssignmentPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [groupFilter, setGroupFilter] = useState('ALL')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null)
  const [viewer, setViewer] = useState<ViewerState>(null)
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [deleteAssignmentOpen, setDeleteAssignmentOpen] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<FileDto | null>(null)
  const [staged, setStaged] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)

  const detail = useQuery({
    queryKey: ['teacher-assignment', id],
    queryFn: () => getData<AssignmentDetail>(`/teacher/assignments/${id}`),
    enabled: Boolean(id),
  })

  const submissions = useQuery({
    queryKey: ['teacher-submissions', id],
    queryFn: () => getData<SubmissionsPayload>(`/teacher/assignments/${id}/submissions`),
    enabled: Boolean(id),
  })

  const submissionDetail = useQuery({
    queryKey: ['teacher-submission', selectedSubmission],
    queryFn: () => getData<SubmissionDetail>(`/teacher/submissions/${selectedSubmission}`),
    enabled: Boolean(selectedSubmission),
  })

  useEffect(() => {
    if (!submissionDetail.data) return
    setScore(submissionDetail.data.score === null ? '' : String(submissionDetail.data.score))
    setFeedback(submissionDetail.data.teacherFeedback ?? '')
  }, [submissionDetail.data])

  const assignment = detail.data?.assignment
  const attachments = detail.data?.attachments ?? []
  const payload = submissions.data

  const filteredRows = useMemo(() => {
    let rows = payload?.items ?? []
    if (groupFilter !== 'ALL') rows = rows.filter((row) => row.groupId === groupFilter)
    const query = studentSearch.trim().toLowerCase()
    if (query) {
      rows = rows.filter(
        (row) =>
          row.studentName.toLowerCase().includes(query) ||
          row.email.toLowerCase().includes(query),
      )
    }
    return rows
  }, [payload, groupFilter, studentSearch])

  const groupCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of payload?.items ?? []) {
      map.set(row.groupId, (map.get(row.groupId) ?? 0) + 1)
    }
    return map
  }, [payload])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['teacher-assignment', id] })
    void queryClient.invalidateQueries({ queryKey: ['teacher-submissions', id] })
    void queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] })
    void queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
  }

  const gradeMutation = useMutation({
    mutationFn: (grade: GradePayload) =>
      putData<SubmissionDetail, GradePayload>(`/teacher/submissions/${selectedSubmission}/grade`, grade),
    onSuccess: (updated) => {
      toast.success('Qiymət yadda saxlanıldı.')
      queryClient.setQueryData(['teacher-submission', selectedSubmission], updated)
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const archiveMutation = useMutation({
    mutationFn: (value: boolean) => patchData<void>(`/teacher/assignments/${id}/archive?value=${value}`),
    onSuccess: () => {
      toast.success(assignment?.archived ? 'Mövzu arxivdən çıxarıldı.' : 'Mövzu arxivləndi.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteData(`/teacher/assignments/${id}`),
    onSuccess: () => {
      toast.success('Mövzu silindi.')
      void queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] })
      void queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
      navigate('/teacher/assignments', { replace: true })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (fileId: string) => deleteData(`/teacher/assignments/${id}/attachments/${fileId}`),
    onSuccess: () => {
      toast.success('Qoşma silindi.')
      setAttachmentToDelete(null)
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      staged.forEach((file) => formData.append('files', file))
      const response = await api.post<ApiEnvelope<FileDto[]>>(
        `/teacher/assignments/${id}/attachments`,
        formData,
        {
          onUploadProgress: (event) => {
            if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100))
          },
        },
      )
      return unwrap(response.data)
    },
    onSuccess: () => {
      toast.success('Qoşmalar yükləndi.')
      setStaged([])
      setUploadProgress(0)
      invalidate()
    },
    onError: (error) => {
      setUploadProgress(0)
      toast.error(errorMessage(error))
    },
  })

  const exportExcel = async () => {
    if (!payload || !assignment) return
    const XLSX = await import('xlsx')
    const rows = filteredRows.map((row) => ({
      'Tələbə': row.studentName,
      'E-poçt': row.email,
      'Qrup': row.groupCode,
      'Status': statusLabel(row.status),
      'Təhvil vaxtı': row.submittedAt ? formatDateTime(row.submittedAt) : '',
      'Fayl sayı': row.fileCount,
      'Bal': row.score ?? '',
      'Müəllim şərhi': row.teacherFeedback ?? '',
      'Tələbə qeydi': row.comment ?? '',
    }))
    const sheet = XLSX.utils.json_to_sheet(rows)
    sheet['!cols'] = [
      { wch: 28 }, { wch: 28 }, { wch: 10 }, { wch: 16 }, { wch: 20 },
      { wch: 10 }, { wch: 8 }, { wch: 30 }, { wch: 30 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Təhvillər')
    XLSX.writeFile(workbook, `tehviller-${assignment.title.slice(0, 40)}.xlsx`)
  }

  if (detail.isLoading) {
    return (
      <div className="page-container">
        <Skeleton className="h-4 w-32" />
        <div className="surface mt-4 space-y-4 p-6">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (detail.isError || !assignment) {
    return (
      <div className="page-container max-w-3xl">
        <Card>
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="Mövzu tapılmadı"
            description="Bu mövzu silinib və ya sizə aid deyil."
            action={
              <Link to="/teacher/assignments">
                <Button variant="outline">Mövzulara qayıt</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  const submissionFiles = submissionDetail.data?.files ?? []
  const viewerFiles =
    viewer?.context === 'attachments' ? attachments : viewer?.context === 'submission' ? submissionFiles : []
  const maxScore = assignment.maxScore

  return (
    <div className="page-container">
      <Link
        to="/teacher/assignments"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mövzulara qayıt
      </Link>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-primary-50/60 via-white to-violet-50/40 px-5 py-5 dark:border-white/10 dark:from-primary-500/[0.07] dark:via-transparent dark:to-violet-500/[0.05] sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <TypeBadge type={assignment.type} />
                <Badge tone="outline">{assignment.subjectName}</Badge>
                {assignment.archived ? <Badge tone="muted">Arxivlənib</Badge> : <Badge tone="success">Aktiv</Badge>}
              </div>
              <h1 className="text-balance font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                {assignment.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {assignment.groupCodes.join(', ')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <DeadlineLine deadline={assignment.deadline} withIcon={false} />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {assignment.submittedCount} təhvil
                </span>
                {assignment.maxScore !== null && (
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Maks. bal: {assignment.maxScore}</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/teacher/assignments/${id}/edit`}>
                <Button variant="outline" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
                  Redaktə
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                loading={archiveMutation.isPending}
                leftIcon={assignment.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                onClick={() => archiveMutation.mutate(!assignment.archived)}
              >
                {assignment.archived ? 'Arxivdən çıxar' : 'Arxivlə'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/10"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setDeleteAssignmentOpen(true)}
              >
                Sil
              </Button>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <RichText html={assignment.description} />
        </div>

        <div className="border-t border-slate-100 px-5 py-5 dark:border-white/10 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-slate-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Qoşma fayllar · {attachments.length}
              </h2>
            </div>
          </div>
          {attachments.length > 0 ? (
            <FileList
              files={attachments}
              onView={(index) => setViewer({ context: 'attachments', index })}
              onRemove={(file) => setAttachmentToDelete(file)}
            />
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">Hələ qoşma fayl yoxdur.</p>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Yeni qoşma əlavə et</p>
            <UploadZone files={staged} onChange={setStaged} maxFiles={10} maxSizeMb={50} />
            {staged.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  loading={uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate()}
                >
                  {staged.length} faylı yüklə
                </Button>
                {uploadMutation.isPending && uploadProgress > 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{uploadProgress}%</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tələbə" value={payload?.total ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Təhvil verib" value={payload?.submitted ?? 0} tone="success" icon={<FileText className="h-5 w-5" />} />
        <StatCard
          label="Verməyib"
          value={Math.max(0, (payload?.total ?? 0) - (payload?.submitted ?? 0))}
          tone="danger"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Təhvil faizi"
          value={`${payload ? percent(payload.submitted, payload.total) : 0}%`}
          tone="violet"
          icon={<GraduationCap className="h-5 w-5" />}
        />
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-white/10 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Təhvil cədvəli</h2>
              {payload && payload.total > 0 && (
                <div className="mt-2 w-full max-w-md">
                  <SubmissionProgress submitted={payload.submitted} total={payload.total} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={studentSearch}
                onChange={setStudentSearch}
                placeholder="Tələbə axtar…"
                className="w-full sm:w-52"
              />
              <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => void exportExcel()}>
                Excel
              </Button>
            </div>
          </div>

          {payload && payload.groups.length > 0 && (
            <Tabs
              className="mt-3 w-fit"
              size="sm"
              items={[
                { value: 'ALL', label: 'Hamısı', count: payload.items.length },
                ...payload.groups.map((group) => ({
                  value: group.id,
                  label: group.code,
                  count: groupCounts.get(group.id) ?? 0,
                })),
              ]}
              value={groupFilter}
              onChange={setGroupFilter}
            />
          )}
        </div>

        {submissions.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredRows.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tələbə</th>
                    <th>Qrup</th>
                    <th>Status</th>
                    <th>Təhvil vaxtı</th>
                    <th>Fayl</th>
                    <th>Bal</th>
                    <th className="text-right">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.studentId}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            fileId={row.avatarFileId}
                            firstName={row.studentName.split(' ')[0]}
                            lastName={row.studentName.split(' ').slice(1).join(' ')}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{row.studentName}</p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><Badge tone="outline">{row.groupCode}</Badge></td>
                      <td><StatusBadge status={row.status} /></td>
                      <td className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{formatSubmittedAt(row.submittedAt)}</td>
                      <td>
                        <span className={cn('inline-flex items-center gap-1 text-xs', row.fileCount > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400')}>
                          <Paperclip className="h-3.5 w-3.5" />
                          {row.fileCount}
                        </span>
                      </td>
                      <td>
                        {row.score !== null ? (
                          <span className="font-bold text-primary-600 dark:text-primary-300">
                            {row.score}{maxScore ? ` / ${maxScore}` : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        {row.submissionId ? (
                          <Button variant="soft" size="sm" onClick={() => setSelectedSubmission(row.submissionId)}>
                            Bax və qiymətləndir
                          </Button>
                        ) : (
                          <span className="text-[11px] font-medium text-rose-500 dark:text-rose-400">Təhvil yoxdur</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-white/[0.06] md:hidden">
              {filteredRows.map((row) => (
                <li key={row.studentId} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar
                      fileId={row.avatarFileId}
                      firstName={row.studentName.split(' ')[0]}
                      lastName={row.studentName.split(' ').slice(1).join(' ')}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.studentName}</p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.groupCode} · {row.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatSubmittedAt(row.submittedAt)}</span>
                        <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{row.fileCount}</span>
                        {row.score !== null && (
                          <span className="font-semibold text-primary-600 dark:text-primary-300">
                            Bal: {row.score}{maxScore ? ` / ${maxScore}` : ''}
                          </span>
                        )}
                      </div>
                      {row.submissionId && (
                        <Button
                          variant="soft"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => setSelectedSubmission(row.submissionId)}
                        >
                          Bax və qiymətləndir
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="Tələbə tapılmadı"
            description={
              studentSearch
                ? 'Axtarış sözünü dəyişin.'
                : 'Bu mövzu üzrə tələbə siyahısı boşdur.'
            }
          />
        )}
      </Card>

      <Modal
        open={Boolean(selectedSubmission)}
        onClose={() => {
          setSelectedSubmission(null)
          setViewer(null)
        }}
        title={submissionDetail.data?.studentName ?? 'Təhvil'}
        description={submissionDetail.data ? `${submissionDetail.data.groupCode} · ${formatDateTime(submissionDetail.data.submittedAt)}` : undefined}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSubmission(null)
                setViewer(null)
              }}
            >
              Bağla
            </Button>
            <Button
              loading={gradeMutation.isPending}
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => {
                gradeMutation.mutate({
                  score: score.trim() ? Number(score) : null,
                  feedback: feedback.trim() ? feedback.trim() : null,
                })
              }}
            >
              Qiyməti yadda saxla
            </Button>
          </>
        }
      >
        {submissionDetail.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : submissionDetail.isError || !submissionDetail.data ? (
          <Alert tone="danger" title="Təhvil yüklənə bilmədi">
            <button className="font-semibold underline" onClick={() => void submissionDetail.refetch()}>
              Yenidən cəhd et
            </button>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-white/[0.04]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tapşırıq</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{submissionDetail.data.assignmentTitle}</p>
              </div>
              <StatusBadge status={submissionDetail.data.status} />
            </div>

            {submissionDetail.data.comment && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tələbənin qeydi</p>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-white/[0.03] dark:text-slate-300">
                  {submissionDetail.data.comment}
                </p>
              </div>
            )}

            {submissionFiles.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Fayllar · {submissionFiles.length}
                </p>
                <FileList
                  files={submissionFiles}
                  onView={(index) => setViewer({ context: 'submission', index })}
                />
              </div>
            ) : (
              <p className="text-xs text-slate-400">Fayl yüklənməyib.</p>
            )}

            <div className="grid gap-4 border-t border-slate-100 pt-4 dark:border-white/10 sm:grid-cols-[140px_1fr]">
              <Field label="Bal" htmlFor="grade-score" hint={maxScore ? `Maksimum: ${maxScore}` : undefined}>
                <Input
                  id="grade-score"
                  type="number"
                  min={0}
                  step="0.5"
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                  placeholder="—"
                />
              </Field>
              <Field label="Şərh" htmlFor="grade-feedback">
                <Textarea
                  id="grade-feedback"
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Tələbə üçün qiymətləndirmə şərhi…"
                  className="min-h-[92px]"
                />
              </Field>
            </div>

            {gradeMutation.isError && (
              <Alert tone="danger" title="Qiymət yadda saxlanılmadı">{errorMessage(gradeMutation.error)}</Alert>
            )}
          </div>
        )}
      </Modal>

      {viewer && viewerFiles.length > 0 && (
        <FileViewer
          files={viewerFiles}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onNavigate={(index) => setViewer({ ...viewer, index })}
        />
      )}

      <ConfirmDialog
        open={deleteAssignmentOpen}
        title="Mövzunu sil"
        description={assignment.title}
        confirmLabel="Mövzunu sil"
        loading={deleteMutation.isPending}
        onClose={() => setDeleteAssignmentOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ConfirmDialog
        open={Boolean(attachmentToDelete)}
        title="Qoşmanı sil"
        description={attachmentToDelete?.originalName}
        confirmLabel="Sil"
        loading={deleteAttachmentMutation.isPending}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={() => {
          if (attachmentToDelete) deleteAttachmentMutation.mutate(attachmentToDelete.id)
        }}
      />
    </div>
  )
}
