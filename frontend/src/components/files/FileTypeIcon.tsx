import {
  File,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Presentation,
  type LucideIcon,
} from 'lucide-react'
import { cn, fileCategory } from '@/lib/utils'

const mapping: Record<string, { icon: LucideIcon; tone: string }> = {
  image: { icon: FileImage, tone: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  video: { icon: FileVideo, tone: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
  audio: { icon: FileAudio, tone: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  pdf: { icon: FileText, tone: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300' },
  docx: { icon: FileText, tone: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
  sheet: { icon: FileSpreadsheet, tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  slides: { icon: Presentation, tone: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' },
  archive: { icon: FileArchive, tone: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300' },
  text: { icon: FileCode2, tone: 'bg-[#e8e4c8] text-slate-600 dark:bg-white/10 dark:text-slate-300' },
  other: { icon: File, tone: 'bg-[#e8e4c8] text-slate-600 dark:bg-white/10 dark:text-slate-300' },
}

function fileIconMeta(extension: string | null | undefined, mimeType?: string | null) {
  const category = fileCategory(extension, mimeType)
  return mapping[category] ?? mapping.other
}

export function FileTypeIcon({
  extension,
  mimeType,
  className,
  size = 'md',
}: {
  extension: string | null | undefined
  mimeType?: string | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const meta = fileIconMeta(extension, mimeType)
  const Icon = meta.icon
  const sizes = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-14 w-14 rounded-2xl' }
  const icons = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }
  return (
    <span className={cn('flex shrink-0 items-center justify-center', sizes[size], meta.tone, className)}>
      <Icon className={icons[size]} aria-hidden />
    </span>
  )
}
