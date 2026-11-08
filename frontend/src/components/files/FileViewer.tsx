import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileWarning,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { renderAsync } from 'docx-preview'
import DOMPurify from 'dompurify'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { API_URL, apiFetch } from '@/lib/api'
import { archiveEntryUrl, fileUrl, triggerDownload, useFileAccess } from '@/lib/files'
import { cn, errorMessage, fileCategory, formatBytes } from '@/lib/utils'
import type { ApiEnvelope, ArchiveEntry, FileDto } from '@/lib/types'
import { FileTypeIcon } from './FileTypeIcon'

interface FileViewerProps {
  files: FileDto[]
  index: number | null
  onClose: () => void
  onNavigate: (index: number) => void
  onDelete?: (file: FileDto) => void
  deletingId?: string | null
}

function ViewerLoader({ label = 'Fayl hazırlanır…' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-slate-300">
      <Loader2 className="h-7 w-7 animate-spin text-primary-400" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function ViewerError({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center text-slate-300">
      <FileWarning className="h-10 w-10 text-amber-400" />
      <p className="text-sm font-medium">{message}</p>
      <p className="max-w-sm text-xs text-slate-400">Faylı yükləyərək cihazınızda aça bilərsiniz.</p>
    </div>
  )
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await apiFetch(url, { credentials: 'omit' })
  if (!response.ok) throw new Error('Fayl açıla bilmədi.')
  return response.blob()
}

function PdfPreview({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setSrc(null)
    setError(null)
    fetchBlob(url)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError('PDF faylı yüklənə bilmədi.')
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  if (error) return <ViewerError message={error} />
  if (!src) return <ViewerLoader label="PDF hazırlanır…" />
  return (
    <iframe
      src={src}
      title="PDF önizləmə"
      className="h-full w-full rounded-xl border-0 bg-white"
    />
  )
}

function DocxPreview({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setState('loading')
    void (async () => {
      try {
        const blob = await fetchBlob(url)
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = ''
        await renderAsync(blob, containerRef.current, undefined, {
          className: 'docx',
          inWrapper: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
        })
        if (!cancelled) setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url])

  if (state === 'error') return <ViewerError message="Word sənədi açıla bilmədi." />
  return (
    <div className="h-full w-full overflow-auto rounded-xl bg-slate-200/80 p-2 dark:bg-black/30">
      {state === 'loading' && <ViewerLoader label="Word sənədi hazırlanır…" />}
      <div
        ref={containerRef}
        className={cn('docx-preview mx-auto', state !== 'ready' && 'hidden')}
      />
    </div>
  )
}

function SheetPreview({ url }: { url: string }) {
  const [sheets, setSheets] = useState<{ name: string; html: string }[]>([])
  const [active, setActive] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setSheets([])
    setActive(0)
    void (async () => {
      try {
        const blob = await fetchBlob(url)
        const buffer = await blob.arrayBuffer()
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
        const parsed = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name]
          const html = sheet ? XLSX.utils.sheet_to_html(sheet) : ''
          return { name, html: DOMPurify.sanitize(html) }
        })
        if (!cancelled) {
          setSheets(parsed)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError('Cədvəl faylı açıla bilmədi.')
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url])

  if (error) return <ViewerError message={error} />
  if (loading) return <ViewerLoader label="Cədvəl hazırlanır…" />

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {sheets.length > 1 && (
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/10 p-1 scrollbar-none">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                active === index ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10',
              )}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
      <div className="sheet-preview min-h-0 flex-1 overflow-auto rounded-xl bg-white p-3">
        <div dangerouslySetInnerHTML={{ __html: sheets[active]?.html ?? '' }} />
      </div>
    </div>
  )
}

function TextPreview({ url, name }: { url: string; name: string }) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setText(null)
    setError(null)
    fetchBlob(url)
      .then((blob) => blob.slice(0, 2 * 1024 * 1024).text())
      .then((value) => {
        if (!cancelled) setText(value)
      })
      .catch(() => {
        if (!cancelled) setError('Mətn faylı oxuna bilmədi.')
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (error) return <ViewerError message={error} />
  if (text === null) return <ViewerLoader label="Mətn oxunur…" />
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-[#0f172a]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-slate-400">
        <span className="truncate">{name}</span>
        <span>UTF-8</span>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[12.5px] leading-6 text-slate-200">
        {text}
      </pre>
    </div>
  )
}

function ArchivePreview({ file, token }: { file: FileDto; token: string }) {
  const [entries, setEntries] = useState<ArchiveEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setEntries(null)
    setError(null)
    apiFetch(`${API_URL}/files/${file.id}/archive?t=${encodeURIComponent(token)}`)
      .then((response) => response.json() as Promise<ApiEnvelope<ArchiveEntry[]>>)
      .then((payload) => {
        if (cancelled) return
        if (payload.error) {
          setError(payload.error.message)
          return
        }
        setEntries(payload.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Arxiv siyahısı oxuna bilmədi.')
      })
    return () => {
      cancelled = true
    }
  }, [file.id, token])

  if (error) return <ViewerError message={error} />
  if (!entries) return <ViewerLoader label="Arxiv siyahısı hazırlanır…" />
  return (
    <div className="h-full w-full overflow-auto rounded-xl bg-white dark:bg-[#0f172a]">
      <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 text-xs font-semibold text-slate-500 backdrop-blur dark:border-white/10 dark:bg-[#0f172a]/95 dark:text-slate-400">
        <span>{entries.length} element</span>
        <span>Arxiv siyahısı</span>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
        {entries.map((entry) => (
          <li key={entry.name} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
              {entry.name}
            </span>
            <span className="shrink-0 text-[11px] text-slate-400">
              {entry.directory ? 'Qovluq' : formatBytes(entry.size)}
            </span>
            {!entry.directory && (
              <a
                href={archiveEntryUrl(file.id, token, entry.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10"
              >
                Aç
              </a>
            )}
          </li>
        ))}
        {!entries.length && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">Arxiv boşdur.</li>
        )}
      </ul>
    </div>
  )
}

export function FileViewer({
  files,
  index,
  onClose,
  onNavigate,
  onDelete,
  deletingId,
}: FileViewerProps) {
  const file = index === null ? undefined : files[index]
  const access = useFileAccess(file?.id)
  const [zoom, setZoom] = useState(1)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setZoom(1)
    setImageError(false)
  }, [file?.id])

  useEffect(() => {
    if (index === null) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
      if (event.key === 'ArrowRight' && index < files.length - 1) onNavigate(index + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [index, files.length, onClose, onNavigate])

  if (index === null || !file) return null

  const token = access.data?.token
  const category = fileCategory(file.extension, file.mimeType)
  const viewUrl = token ? fileUrl(file.id, token, 'view') : null
  const previewUrl = token ? fileUrl(file.id, token, 'preview') : null

  const renderContent = () => {
    if (access.isError) return <ViewerError message="Fayla giriş əldə edilə bilmədi." />
    if (!token || !viewUrl) return <ViewerLoader />
    if (file.expired) return <ViewerError message="Bu faylın saxlama müddəti bitib." />

    switch (category) {
      case 'image':
        if (imageError) return <ViewerError message="Şəkil açıla bilmədi." />
        return (
          <div className="flex h-full w-full items-center justify-center overflow-auto" style={{ touchAction: 'pinch-zoom' }}>
            <img
              src={viewUrl}
              alt={file.originalName}
              onError={() => setImageError(true)}
              className="max-h-full max-w-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        )
      case 'video':
        return (
          <div className="flex h-full w-full items-center justify-center">
            <video src={viewUrl} controls playsInline className="max-h-full max-w-full rounded-xl bg-black" preload="metadata">
              Brauzeriniz videonu dəstəkləmir.
            </video>
          </div>
        )
      case 'audio':
        return (
          <div className="flex h-full w-full items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#111827]">
              <div className="mb-5 flex items-center gap-3">
                <FileTypeIcon extension={file.extension} mimeType={file.mimeType} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">{file.originalName}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.sizeBytes)}</p>
                </div>
              </div>
              <audio src={viewUrl} controls className="w-full">
                Brauzeriniz səsi dəstəkləmir.
              </audio>
            </div>
          </div>
        )
      case 'pdf':
        return <PdfPreview url={viewUrl} />
      case 'slides':
        if (!previewUrl) return <ViewerLoader />
        return (
          <div className="flex h-full w-full flex-col gap-2">
            <div className="rounded-lg bg-white/10 px-3 py-1.5 text-center text-[11px] text-slate-300">
              Təqdimat avtomatik PDF-ə çevrilir. Konversiya bir neçə saniyə çəkə bilər.
            </div>
            <div className="min-h-0 flex-1">
              <PdfPreview url={previewUrl} />
            </div>
          </div>
        )
      case 'docx':
        return <DocxPreview url={viewUrl} />
      case 'sheet':
        return <SheetPreview url={viewUrl} />
      case 'text':
        return <TextPreview url={viewUrl} name={file.originalName} />
      case 'archive':
        return <ArchivePreview file={file} token={token} />
      default:
        return (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <FileTypeIcon extension={file.extension} mimeType={file.mimeType} size="lg" />
            <div>
              <p className="font-semibold text-white">{file.originalName}</p>
              <p className="mt-1 text-sm text-slate-400">
                Bu fayl tipi brauzerdə birbaşa göstərilə bilmir. Yükləyərək açın.
              </p>
            </div>
            <Button
              variant="primary"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => {
                void triggerDownload(file.id, file.originalName).catch((error: unknown) =>
                  toast.error(errorMessage(error, 'Fayl yüklənə bilmədi')),
                )
              }}
            >
              Faylı yüklə
            </Button>
          </div>
        )
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#070b16]/95 backdrop-blur-sm" role="dialog" aria-modal="true">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <FileTypeIcon extension={file.extension} mimeType={file.mimeType} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{file.originalName}</p>
            <p className="truncate text-[11px] text-slate-400">
              {formatBytes(file.sizeBytes)}
              {files.length > 1 && ` · ${index + 1} / ${files.length}`}
            </p>
          </div>
        </div>

        {category === 'image' && (
          <div className="hidden items-center gap-0.5 rounded-lg bg-white/10 p-0.5 sm:flex">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.4, value - 0.2))}
              className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Kiçilt"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Ölçünü sıfırla"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(4, value + 0.2))}
              className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Böyüt"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
            disabled={index <= 0}
            onClick={() => onNavigate(index - 1)}
            aria-label="Əvvəlki fayl"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
            disabled={index >= files.length - 1}
            onClick={() => onNavigate(index + 1)}
            aria-label="Sonrakı fayl"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => {
              void triggerDownload(file.id, file.originalName).catch((error: unknown) =>
                toast.error(errorMessage(error, 'Fayl yüklənə bilmədi')),
              )
            }}
            aria-label="Yüklə"
          >
            <Download className="h-5 w-5" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-rose-300 hover:bg-rose-500/15 hover:text-rose-200"
              loading={deletingId === file.id}
              onClick={() => onDelete(file)}
              aria-label="Faylı sil"
            >
              {deletingId !== file.id && <Trash2 className="h-5 w-5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Bağla"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-4">{renderContent()}</div>

      <footer className="hidden shrink-0 items-center justify-center gap-3 border-t border-white/10 py-2 text-[10px] text-slate-500 sm:flex">
        <span>← / → fayllar arasında</span>
        <span>·</span>
        <span>Esc bağlayır</span>
      </footer>
    </div>,
    document.body,
  )
}
