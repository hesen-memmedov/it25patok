import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import {
  Bold,
  Code2,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#e8e4c8] hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
        active && 'bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200',
      )}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Tapşırıq haqqında ətraflı yazın…',
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TiptapLink.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML()
      onChange(instance.isEmpty ? '' : html)
    },
  })

  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  if (!editor) return <div className="skeleton h-[220px] w-full" />

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link ünvanı', previous ?? 'https://')
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#ddd6a8] bg-white shadow-sm focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/10 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#e5dfb4] bg-[#efeada]/70 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
        <ToolbarButton label="Qalın" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Kursiv" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Başlıq" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
        <ToolbarButton label="Bülleten siyahısı" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Nömrəli siyahı" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Sitat" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Kod" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
        <ToolbarButton label="Geri qaytar" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Təkrar et" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="ml-auto hidden pr-1 text-[10px] text-slate-400 sm:block">Zəngin mətn</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
