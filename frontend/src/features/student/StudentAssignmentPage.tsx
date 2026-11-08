import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Info,
  Lock,
  Paperclip,
  Send,
  Trash2,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Progress,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { RichText } from '@/components/common/RichText'
import { DeadlineLine, StatusBadge, TypeBadge } from '@/components/assignments/AssignmentUi'
import { FileList } from '@/components/files/FileList'
import { FileViewer } from '@/components/files/FileViewer'
import { UploadZone } from '@/components/files/UploadZone'
import { api, deleteData, getData, unwrap } from '@/lib/api'
import { queryClient as globalQueryClient } from '@/lib/queryClient'
import { errorMessage, formatDateTime, isOverdue, percent } from '@/lib/utils'
import type {
  ApiEnvelope,
  FileDto,
  StudentAssignmentDetail,
  Submission,
} from '@/lib/types'

type ViewerState = { context: 'attachments' | 'submission'; index: number }

export default function StudentAssignmentPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [viewer, setViewer] = useState<ViewerState | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [comment, setComment] = useState('')
  const [progress, setProgress] = useState(0)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['student-assignment', id],
    queryFn: () => getData<StudentAssignmentDetail>(`/student/assignments/${id}`),
    enabled: Boolean(id),
  })

  const detail = query.data
  const assignment = detail?.assignment
  const submission = detail?.submission ?? null
  const late = Boolean(assignment?.deadline && isOverdue(assignment.deadline))
  const locked = Boolean(late && assignment && !assignment.allowLate)
  const graded = submission?.status === 'GRADED'
  const existingFiles = submission?.files.length ?? 0
  const maxNewFiles = Math.max(0, 10 - existingFiles)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['student-assignment', id] })
    void globalQueryClient.invalidateQueries({ queryKey: ['student-dashboard'] })
    void globalQueryClient.invalidateQueries({ queryKey: ['student-subjects'] })
    void globalQueryClient.invalidateQueries({ queryKey: ['student-assignments'] })
    void globalQueryClient.invalidateQueries({ queryKey: ['student-missing'] })
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      const search = comment.trim() ? `?comment=${encodeURIComponent(comment.trim())}` : ''
      const response = await api.post<ApiEnvelope<Submission>>(
        `/student/assignments/${id}/submission${search}`,
        formData,
        {
          onUploadProgress: (event) => {
            if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
          },
        },
      )
      return unwrap(response.data)
    },
    onSuccess: () => {
      toast.success(submission ? 'Təhvil yeniləndi.' : 'İşiniz uğurla təhvil verildi.')
      setFiles([])
      setComment('')
      setProgress(0)
      invalidate()
    },
    onError: () => setProgress(0),
  })

  const deleteMutation = useMutation({
    mutationFn: (file: FileDto) =>
      deleteData(`/student/submissions/${submission?.id}/files/${file.id}`),
    onMutate: (file) => setRemovingId(file.id),
    onSuccess: () => {
      toast.success('Fayl silindi.')
      setViewer(null)
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => setRemovingId(null),
  })

  const viewerFiles = useMemo(() => {
    if (!viewer || !detail) return []
    return viewer.context === 'attachments' ? detail.attachments : submission?.files ?? []
  }, [viewer, detail, submission])

  if (query.isLoading) {
    return (
      <div className="page-container max-w-5xl">
        <Skeleton className="h-4 w-28" />
        <div className="surface mt-4 space-y-4 p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (query.isError || !detail || !assignment) {
    return (
      <div className="page-container max-w-3xl">
        <Card>
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="Tapşırıq tapılmadı"
            description="Bu tapşırıq silinib, arxivlənib və ya sizin qrupunuza aid deyil."
            action={
              <Link to="/student/assignments">
                <Button variant="outline">Tapşırıqlara qayıt</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  const canSubmit = !graded && !locked && (existingFiles > 0 || files.length > 0)
  const progressValue = submission ? 100 : 0

  return (
    <div className="page-container max-w-6xl">
      <Link
        to="/student/assignments"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tapşırıqlara qayıt
      </Link>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-[#e5dfb4] bg-gradient-to-r from-primary-50/60 via-white to-violet-50/40 px-5 py-5 dark:border-white/10 dark:from-primary-500/[0.07] dark:via-transparent dark:to-violet-500/[0.05] sm:px-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <TypeBadge type={assignment.type} />
                <Badge tone="outline">{assignment.subjectName}</Badge>
                {assignment.archived && <Badge tone="muted">Arxivlənib</Badge>}
                <StatusBadge status={submission?.status ?? assignment.myStatus} />
              </div>
              <h1 className="text-balance font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                {assignment.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" />
                  {assignment.teacherName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <DeadlineLine deadline={assignment.deadline} withIcon={false} />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {assignment.groupCodes.join(', ')}
                </span>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Tapşırıq təsviri</h2>
              <RichText html={assignment.description} />
            </div>

            {detail.attachments.length > 0 && (
              <div className="border-t border-[#e5dfb4] px-5 py-5 dark:border-white/10 sm:px-6">
                <div className="mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Müəllimin faylları · {detail.attachments.length}
                  </h2>
                </div>
                <FileList
                  files={detail.attachments}
                  onView={(index) => setViewer({ context: 'attachments', index })}
                />
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5dfb4] px-5 py-4 dark:border-white/10 sm:px-6">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Mənim təhvilim</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {submission
                    ? `Son yenilənmə: ${formatDateTime(submission.submittedAt)}`
                    : 'İşinizi fayl kimi yükləyin və qeyd əlavə edin.'}
                </p>
              </div>
              {submission && <StatusBadge status={submission.status} />}
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              {graded && (
                <Alert tone="success" title="Təhvil qiymətləndirilib">
                  Qiymətləndirilmiş təhvili dəyişmək mümkün deyil. Yeni fayl əlavə etmək üçün müəlliminizlə əlaqə saxlayın.
                </Alert>
              )}

              {!graded && locked && (
                <Alert tone="warning" title="Gecikmiş təhvil qəbul edilmir">
                  Bu tapşırıq üçün deadline keçib və gecikmiş təhvil qəbul edilmir. Müəlliminizlə əlaqə saxlayın.
                </Alert>
              )}

              {!graded && late && assignment.allowLate && (
                <Alert tone="warning" title="Gecikmiş təhvil">
                  Deadline keçib, lakin bu tapşırıq üçün gecikmiş təhvil qəbul edilir. Təhviliniz <span className="font-semibold">LATE</span> statusu ilə qeyd olunacaq.
                </Alert>
              )}

              {submission?.score !== null && submission?.score !== undefined && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 dark:border-primary-400/15 dark:bg-primary-500/10">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-300">Qiymət</p>
                    <p className="mt-1 font-display text-3xl font-extrabold text-primary-700 dark:text-primary-200">
                      {submission.score}
                      {assignment.maxScore ? <span className="text-base font-semibold text-primary-500/70"> / {assignment.maxScore}</span> : null}
                    </p>
                  </div>
                  {assignment.maxScore ? (
                    <div className="w-32">
                      <Progress value={percent(submission.score, assignment.maxScore)} />
                    </div>
                  ) : null}
                </div>
              )}

              {submission?.teacherFeedback && (
                <div className="rounded-xl border border-[#ddd6a8] bg-[#efeada]/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Müəllimin şərhi</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{submission.teacherFeedback}</p>
                </div>
              )}

              {submission?.comment && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Təhvil qeydi</p>
                  <p className="whitespace-pre-wrap rounded-xl bg-[#efeada] p-3.5 text-sm leading-6 text-slate-700 dark:bg-white/[0.03] dark:text-slate-300">
                    {submission.comment}
                  </p>
                </div>
              )}

              {submission && submission.files.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Yüklənmiş fayllar · {submission.files.length}
                  </p>
                  <FileList
                    files={submission.files}
                    removingId={removingId}
                    onView={(index) => setViewer({ context: 'submission', index })}
                    onRemove={graded ? undefined : (file) => deleteMutation.mutate(file)}
                  />
                </div>
              )}

              {!graded && !locked && (
                <div className="space-y-4 border-t border-[#e5dfb4] pt-4 dark:border-white/10">
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {submission ? 'Yeni fayl əlavə et' : 'Fayl yüklə'}
                    </p>
                    {maxNewFiles > 0 ? (
                      <UploadZone
                        files={files}
                        onChange={setFiles}
                        maxFiles={maxNewFiles}
                        maxSizeMb={50}
                        hint={`Maksimum ${maxNewFiles} yeni fayl · hər biri 50 MB-a qədər`}
                      />
                    ) : (
                      <Alert tone="warning">
                        Bu təhvil üçün maksimum 10 fayl limitinə çatmısınız. Yeni fayl üçün əvvəlcə mövcud fayllardan birini silin.
                      </Alert>
                    )}
                  </div>

                  <div>
                    <label htmlFor="submission-comment" className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                      Qeyd <span className="font-normal text-slate-400">(istəyə bağlı)</span>
                    </label>
                    <Textarea
                      id="submission-comment"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Müəllim üçün qısa izah yazın…"
                      maxLength={5000}
                    />
                  </div>

                  {submitMutation.isError && (
                    <Alert tone="danger" title="Təhvil alınmadı">{errorMessage(submitMutation.error)}</Alert>
                  )}

                  {submitMutation.isPending && progress > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Fayllar yüklənir…</span>
                        <span className="font-semibold">{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {files.length > 0
                        ? `${files.length} yeni fayl seçilib`
                        : submission
                          ? 'Fayl əlavə etmədən qeydi yeniləyə bilərsiniz.'
                          : 'Ən azı bir fayl yükləməlisiniz.'}
                    </p>
                    <Button
                      leftIcon={<Send className="h-4 w-4" />}
                      loading={submitMutation.isPending}
                      disabled={!canSubmit}
                      onClick={() => submitMutation.mutate()}
                    >
                      {submission ? 'Təhvili yenilə' : 'Təhvil ver'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Təhvil vəziyyəti</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <StatusBadge status={submission?.status ?? assignment.myStatus} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Deadline</span>
                <span className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {assignment.deadline ? formatDateTime(assignment.deadline) : 'Yoxdur'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Maks. bal</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {assignment.maxScore ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Fayl sayı</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{existingFiles}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Gecikmə</span>
                <span className={`font-semibold ${late ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {late ? 'Var' : 'Yoxdur'}
                </span>
              </div>
            </div>
            <div className="mt-4 border-t border-[#e5dfb4] pt-4 dark:border-white/10">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Tamamlanma</span>
                <span className="font-semibold">{progressValue}%</span>
              </div>
              <Progress value={progressValue} tone={submission ? 'success' : 'primary'} className="mt-1.5 h-1.5" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Info className="h-4 w-4 text-primary-500" />
              <h2 className="text-sm font-bold">Qaydalar</h2>
            </div>
            <ul className="mt-3 space-y-2.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Deadline-a qədər istənilən qədər yenidən təhvil verə bilərsiniz.
              </li>
              <li className="flex gap-2">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                Deadline keçdikdən sonra təhvil <span className="font-semibold">LATE</span> statusu alır.
              </li>
              <li className="flex gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                Qiymətləndirildikdən sonra təhvil dəyişdirilə bilməz.
              </li>
              <li className="flex gap-2">
                <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                Yüklədiyiniz faylı qiymətləndirmədən əvvəl silə bilərsiniz.
              </li>
            </ul>
          </Card>

          <Card className="border-dashed p-5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Kömək lazımdır?</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              Fayl yükləmə ilə bağlı problem yaranarsa, müəlliminizə müraciət edin. Maksimum fayl ölçüsü 50 MB-dır.
            </p>
          </Card>
        </aside>
      </div>

      {viewer && viewerFiles.length > 0 && (
        <FileViewer
          files={viewerFiles}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onNavigate={(index) => setViewer({ ...viewer, index })}
          onDelete={viewer.context === 'submission' && !graded ? (file) => deleteMutation.mutate(file) : undefined}
          deletingId={removingId}
        />
      )}
    </div>
  )
}
