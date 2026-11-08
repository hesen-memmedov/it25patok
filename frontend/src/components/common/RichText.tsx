import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'

export function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  if (!html || !html.trim()) {
    return <p className="text-sm italic text-slate-400">Təsvir əlavə edilməyib.</p>
  }
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  })
  return (
    <div
      className={cn('rich-text max-w-none', className)}
      // Məzmun backend tərəfində OWASP sanitizer ilə təmizlənir, burada ikinci qat DOMPurify tətbiq olunur.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
