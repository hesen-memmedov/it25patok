import { Download, Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { triggerDownload } from '@/lib/files'
import { cn, errorMessage, formatBytes, formatDate } from '@/lib/utils'
import type { FileDto } from '@/lib/types'
import { FileTypeIcon } from './FileTypeIcon'

interface FileListProps {
  files: FileDto[]
  onView: (index: number) => void
  onRemove?: (file: FileDto) => void
  removingId?: string | null
  compact?: boolean
  className?: string
}

export function FileList({ files, onView, onRemove, removingId, compact, className }: FileListProps) {
  if (!files.length) return null
  return (
    <ul className={cn('space-y-2', className)}>
      {files.map((file, index) => (
        <li
          key={file.id}
          className="group flex items-center gap-3 rounded-xl border border-[#ddd6a8]/80 bg-white p-2.5 transition hover:border-primary-200 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-primary-400/30"
        >
          <button
            type="button"
            onClick={() => onView(index)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={`${file.originalName} faylına bax`}
          >
            <FileTypeIcon extension={file.extension} mimeType={file.mimeType} size={compact ? 'sm' : 'md'} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {file.originalName}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                {formatBytes(file.sizeBytes)} · {formatDate(file.createdAt)}
              </span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(index)} aria-label="Bax">
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Yüklə"
              onClick={() => {
                void triggerDownload(file.id, file.originalName).catch((error: unknown) =>
                  toast.error(errorMessage(error, 'Fayl yüklənə bilmədi')),
                )
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                aria-label="Sil"
                loading={removingId === file.id}
                onClick={() => onRemove(file)}
              >
                {removingId !== file.id && <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
