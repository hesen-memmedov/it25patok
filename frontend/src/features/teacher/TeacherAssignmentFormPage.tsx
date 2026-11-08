import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, BookOpen, CalendarClock, Paperclip, Save, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Progress,
  Select,
  Skeleton,
  Switch,
} from '@/components/ui'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { FileList } from '@/components/files/FileList'
import { FileViewer } from '@/components/files/FileViewer'
import { UploadZone } from '@/components/files/UploadZone'
import { api, deleteData, getData, postData, putData, unwrap } from '@/lib/api'
import { queryClient as globalQueryClient } from '@/lib/queryClient'
import { assignmentTypeLabel, cn, errorMessage, fromDateTimeInput, toDateTimeInput } from '@/lib/utils'
import type {
  ApiEnvelope,
  AssignmentDetail,
  AssignmentType,
  CreateAssignmentPayload,
  FileDto,
  TeacherSubject,
  UpdateAssignmentPayload,
} from '@/lib/types'

const schema = z.object({
  type: z.enum(['SERBEST_ISH', 'KOLLOKVIUM', 'LABORATORIYA']),
  subjectId: z.string().min(1, 'Fənn seçin'),
  title: z.string().trim().min(2, 'Başlıq ən azı 2 simvol olmalıdır').max(200, 'Başlıq 200 simvoldan çox ola bilməz'),
  description: z.string().optional(),
  deadline: z.string().optional(),
  maxScore: z
    .string()
    .optional()
    .refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), 'Bal mənfi ola bilməz'),
  allowLate: z.boolean(),
  groupIds: z.array(z.string()).min(1, 'Ən azı bir qrup seçin'),
})

type FormValues = z.infer<typeof schema>

const typeOptions: { value: AssignmentType; label: string }[] = [
  { value: 'SERBEST_ISH', label: 'Sərbəst iş' },
  { value: 'KOLLOKVIUM', label: 'Kollokvium' },
  { value: 'LABORATORIYA', label: 'Laboratoriya işi' },
]

export default function TeacherAssignmentFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [staged, setStaged] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [attachmentToDelete, setAttachmentToDelete] = useState<FileDto | null>(null)
  const initialized = useRef(false)

  const subjects = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => getData<TeacherSubject[]>('/teacher/subjects'),
  })

  const detail = useQuery({
    queryKey: ['teacher-assignment', id],
    queryFn: () => getData<AssignmentDetail>(`/teacher/assignments/${id}`),
    enabled: isEdit,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'SERBEST_ISH',
      subjectId: '',
      title: '',
      description: '',
      deadline: '',
      maxScore: '',
      allowLate: true,
      groupIds: [],
    },
  })
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = form

  const subjectId = watch('subjectId')
  const groupIds = watch('groupIds')
  const title = watch('title') ?? ''
  const availableGroups = useMemo(
    () => subjects.data?.find((item) => item.subject.id === subjectId)?.groups ?? [],
    [subjects.data, subjectId],
  )

  useEffect(() => {
    if (isEdit || !subjects.data?.length || getValues('subjectId')) return
    const first = subjects.data[0]
    setValue('subjectId', first.subject.id)
    setValue('groupIds', first.groups.map((group) => group.id))
  }, [subjects.data, isEdit, getValues, setValue])

  useEffect(() => {
    if (!isEdit || !detail.data || initialized.current) return
    const assignment = detail.data.assignment
    reset({
      type: assignment.type,
      subjectId: assignment.subjectId,
      title: assignment.title,
      description: assignment.description ?? '',
      deadline: toDateTimeInput(assignment.deadline),
      maxScore: assignment.maxScore === null ? '' : String(assignment.maxScore),
      allowLate: assignment.allowLate,
      groupIds: assignment.groupIds,
    })
    initialized.current = true
  }, [detail.data, isEdit, reset])

  const uploadStaged = async (assignmentId: string) => {
    if (!staged.length) return
    const formData = new FormData()
    staged.forEach((file) => formData.append('files', file))
    const response = await api.post<ApiEnvelope<FileDto[]>>(
      `/teacher/assignments/${assignmentId}/attachments`,
      formData,
      {
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
        },
      },
    )
    unwrap(response.data)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const base: CreateAssignmentPayload = {
        type: values.type,
        subjectId: values.subjectId,
        title: values.title.trim(),
        description: values.description?.trim() ? values.description : null,
        deadline: fromDateTimeInput(values.deadline ?? ''),
        maxScore: values.maxScore && values.maxScore.trim() ? Number(values.maxScore) : null,
        allowLate: values.allowLate,
        groupIds: values.groupIds,
      }
      let result: AssignmentDetail
      if (isEdit) {
        const payload: UpdateAssignmentPayload = {
          ...base,
          archived: detail.data?.assignment.archived,
        }
        result = await putData<AssignmentDetail, UpdateAssignmentPayload>(`/teacher/assignments/${id}`, payload)
      } else {
        result = await postData<AssignmentDetail, CreateAssignmentPayload>('/teacher/assignments', base)
      }
      await uploadStaged(result.assignment.id)
      return result
    },
    onSuccess: (result) => {
      toast.success(isEdit ? 'Mövzu yeniləndi.' : 'Yeni mövzu yaradıldı.')
      void queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] })
      void queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['teacher-assignment', result.assignment.id] })
      void globalQueryClient.invalidateQueries({ queryKey: ['student-assignments'] })
      navigate(`/teacher/assignments/${result.assignment.id}`)
    },
    onError: () => setProgress(0),
  })

  const deleteAttachment = useMutation({
    mutationFn: (fileId: string) => deleteData(`/teacher/assignments/${id}/attachments/${fileId}`),
    onSuccess: () => {
      toast.success('Qoşma silindi.')
      setAttachmentToDelete(null)
      void detail.refetch()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const attachments = detail.data?.attachments ?? []

  if (isEdit && detail.isLoading) {
    return (
      <div className="page-container max-w-4xl">
        <Skeleton className="h-4 w-28" />
        <div className="surface mt-4 space-y-4 p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (isEdit && (detail.isError || !detail.data)) {
    return (
      <div className="page-container max-w-3xl">
        <Card>
          <EmptyState
            icon={<BookOpen className="h-7 w-7" />}
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

  return (
    <div className="page-container max-w-4xl">
      <Link
        to={isEdit ? `/teacher/assignments/${id}` : '/teacher/assignments'}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {isEdit ? 'Mövzuya qayıt' : 'Mövzulara qayıt'}
      </Link>

      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {isEdit ? 'Mövzunu redaktə et' : 'Yeni mövzu paylaş'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tip, fənn və qrupları seçin, başlıq və təsvir əlavə edin, deadline təyin edin.
        </p>
      </div>

      <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate>
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-base font-bold text-slate-900 dark:text-white">Əsas məlumat</h2>

            <div className="space-y-4">
              <Field label="Tapşırıq tipi" required>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {typeOptions.map((option) => {
                    const active = watch('type') === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setValue('type', option.value, { shouldValidate: true })}
                        className={cn(
                          'flex min-h-[52px] items-center justify-center rounded-xl border px-3 text-sm font-semibold transition',
                          active
                            ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-500/15 dark:border-primary-400/50 dark:bg-primary-500/15 dark:text-primary-200'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20',
                        )}
                      >
                        {assignmentTypeLabel(option.value)}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fənn" htmlFor="subjectId" error={errors.subjectId?.message} required>
                  <Controller
                    name="subjectId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        id="subjectId"
                        value={field.value}
                        invalid={Boolean(errors.subjectId)}
                        onChange={(event) => {
                          field.onChange(event)
                          const groups = subjects.data?.find((item) => item.subject.id === event.target.value)?.groups ?? []
                          setValue('groupIds', groups.map((group) => group.id), { shouldValidate: true })
                        }}
                      >
                        <option value="">Fənn seçin</option>
                        {(subjects.data ?? []).map((item) => (
                          <option key={item.subject.id} value={item.subject.id}>
                            {item.subject.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                </Field>

                <Field label="Başlıq" htmlFor="title" error={errors.title?.message} required>
                  <Input
                    id="title"
                    placeholder="Məsələn: 3-cü laboratoriya işi"
                    invalid={Boolean(errors.title)}
                    maxLength={200}
                    {...register('title')}
                  />
                </Field>
              </div>

              {title.length > 160 && (
                <p className="text-right text-[11px] text-slate-400">{title.length}/200</p>
              )}

              <Field
                label="Qruplar"
                error={errors.groupIds?.message}
                hint={availableGroups.length === 0 ? 'Seçilmiş fənn üzrə sizə qrup təyin olunmayıb.' : 'Tapşırıq yalnız seçilmiş qruplara görünəcək.'}
                required
              >
                <div className="flex flex-wrap gap-2">
                  {availableGroups.map((group) => {
                    const active = groupIds.includes(group.id)
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? groupIds.filter((value) => value !== group.id)
                            : [...groupIds, group.id]
                          setValue('groupIds', next, { shouldValidate: true })
                        }}
                        className={cn(
                          'inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition',
                          active
                            ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-400/50 dark:bg-primary-500/15 dark:text-primary-200'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300',
                        )}
                        aria-pressed={active}
                      >
                        <Users className="h-4 w-4" />
                        {group.name}
                        <span className="text-[11px] font-normal opacity-70">({group.studentCount})</span>
                      </button>
                    )
                  })}
                  {!availableGroups.length && (
                    <p className="text-xs text-slate-400">Fənn seçdikdən sonra qruplar görünəcək.</p>
                  )}
                </div>
              </Field>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-base font-bold text-slate-900 dark:text-white">Təsvir</h2>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <RichTextEditor value={field.value ?? ''} onChange={field.onChange} />
              )}
            />
            <p className="mt-2 text-[11px] text-slate-400">
              Başlıq, siyahı, link və kod blokları əlavə edə bilərsiniz. Təsvir sayt daxilində təhlükəsiz göstərilir.
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-base font-bold text-slate-900 dark:text-white">Deadline və qiymət</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Deadline"
                htmlFor="deadline"
                hint="Boş buraxsanız deadline təyin olunmaz."
                error={errors.deadline?.message}
              >
                <Input id="deadline" type="datetime-local" leftIcon={<CalendarClock className="h-4 w-4" />} {...register('deadline')} />
              </Field>
              <Field
                label="Maksimum bal"
                htmlFor="maxScore"
                hint="İstəyə bağlı. Məsələn: 100"
                error={errors.maxScore?.message}
              >
                <Input
                  id="maxScore"
                  type="number"
                  min={0}
                  step="0.5"
                  placeholder="100"
                  invalid={Boolean(errors.maxScore)}
                  {...register('maxScore')}
                />
              </Field>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-white/10 dark:bg-white/[0.025]">
              <Controller
                name="allowLate"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    label="Gecikmiş təhvili qəbul et"
                    description="Aktiv olduqda deadline keçdikdən sonra yüklənən iş LATE statusu ilə qəbul edilir."
                  />
                )}
              />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-slate-400" />
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Qoşma fayllar</h2>
            </div>

            {isEdit && attachments.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mövcud qoşmalar · {attachments.length}
                </p>
                <FileList
                  files={attachments}
                  onView={setViewerIndex}
                  onRemove={(file) => setAttachmentToDelete(file)}
                />
              </div>
            )}

            <UploadZone
              files={staged}
              onChange={setStaged}
              maxFiles={10}
              maxSizeMb={50}
              hint="Maksimum 10 fayl · hər biri 50 MB-a qədər · PPTX/PDF/DOCX/XLSX və s."
            />
            {isEdit && (
              <p className="mt-2 text-[11px] text-slate-400">
                Yeni fayllar yadda saxladıqdan sonra yüklənəcək.
              </p>
            )}
          </Card>

          {saveMutation.isError && (
            <Alert tone="danger" title="Yadda saxlamaq alınmadı">
              {errorMessage(saveMutation.error)}
            </Alert>
          )}

          {saveMutation.isPending && progress > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Fayllar yüklənir…</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEdit ? `/teacher/assignments/${id}` : '/teacher/assignments')}
            >
              Ləğv et
            </Button>
            <Button type="submit" loading={saveMutation.isPending} leftIcon={<Save className="h-4 w-4" />}>
              {isEdit ? 'Dəyişiklikləri saxla' : 'Mövzunu yarat'}
            </Button>
          </div>
        </div>
      </form>

      {viewerIndex !== null && attachments.length > 0 && (
        <FileViewer
          files={attachments}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNavigate={setViewerIndex}
          onDelete={(file) => {
            setViewerIndex(null)
            setAttachmentToDelete(file)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(attachmentToDelete)}
        title="Qoşmanı sil"
        description={attachmentToDelete?.originalName}
        confirmLabel="Sil"
        loading={deleteAttachment.isPending}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={() => {
          if (attachmentToDelete) deleteAttachment.mutate(attachmentToDelete.id)
        }}
      />
    </div>
  )
}
