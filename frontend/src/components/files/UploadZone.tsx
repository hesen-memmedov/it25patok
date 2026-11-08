import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { CloudUpload, FileUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatBytes } from '@/lib/utils'
import { FileTypeIcon } from './FileTypeIcon'

interface UploadZoneProps {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
  maxSizeMb?: number
  disabled?: boolean
  hint?: string
  className?: string
}

export function UploadZone({
  files,
  onChange,
  maxFiles = 10,
  maxSizeMb = 50,
  disabled,
  hint,
  className,
}: UploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejected: readonly { file: File; errors: readonly { message: string }[] }[]) => {
      if (rejected.length) {
        const first = rejected[0]
        const tooLarge = first.errors.some((error) => error.message.toLowerCase().includes('larger'))
        toast.error(
          tooLarge
            ? `Fayl ${maxSizeMb} MB-dan böyük ola bilməz.`
            : `${first.file.name} qəbul edilmədi.`,
        )
      }
      if (!accepted.length) return
      const merged = [...files]
      for (const file of accepted) {
        if (merged.length >= maxFiles) {
          toast.error(`Maksimum ${maxFiles} fayl yükləmək olar.`)
          break
        }
        if (!merged.some((item) => item.name === file.name && item.size === file.size)) {
          merged.push(file)
        }
      }
      onChange(merged)
    },
    [files, maxFiles, maxSizeMb, onChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: maxFiles > 1,
    disabled,
    noClick: false,
  })

  return (
    <div className={cn('space-y-3', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition',
          isDragActive
            ? 'border-primary-400 bg-primary-50/70 dark:border-primary-400 dark:bg-primary-500/10'
            : 'border-[#cfc799] bg-[#efeada]/50 hover:border-primary-300 hover:bg-primary-50/40 dark:border-white/15 dark:bg-white/[0.025] dark:hover:border-primary-400/40 dark:hover:bg-primary-500/5',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <input {...getInputProps()} />
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-sm ring-1 ring-slate-200/70 dark:bg-white/10 dark:text-primary-300 dark:ring-white/10">
          {isDragActive ? <CloudUpload className="h-6 w-6" /> : <FileUp className="h-6 w-6" />}
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {isDragActive ? 'Faylları buraya buraxın' : 'Fayl yükləmək üçün klikləyin və ya sürüşdürün'}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {hint ?? `Maksimum ${maxFiles} fayl · hər biri ${maxSizeMb} MB-a qədər`}
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-[#ddd6a8] bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <FileTypeIcon
                extension={file.name.split('.').pop()}
                mimeType={file.type}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{file.name}</p>
                <p className="text-[11px] text-slate-500">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`${file.name} faylını çıxar`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
