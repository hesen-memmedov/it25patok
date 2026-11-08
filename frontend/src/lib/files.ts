import { useQuery } from '@tanstack/react-query'
import { API_URL, getData } from './api'
import type { FileAccess } from './types'

export type FileMode = 'view' | 'download' | 'preview'

export function useFileAccess(fileId: string | null | undefined) {
  return useQuery({
    queryKey: ['file-access', fileId],
    queryFn: () => getData<FileAccess>(`/files/${fileId}/access-token`),
    enabled: Boolean(fileId),
    staleTime: 8 * 60 * 1000,
    gcTime: 9 * 60 * 1000,
    retry: 1,
  })
}

export function fileUrl(fileId: string, token: string, mode: FileMode = 'view'): string {
  return `${API_URL}/files/${fileId}/${mode}?t=${encodeURIComponent(token)}`
}

export function archiveEntryUrl(fileId: string, token: string, name: string): string {
  return `${API_URL}/files/${fileId}/archive/entry?name=${encodeURIComponent(name)}&t=${encodeURIComponent(token)}`
}

export async function triggerDownload(fileId: string, filename: string): Promise<void> {
  const access = await getData<FileAccess>(`/files/${fileId}/access-token`)
  const anchor = document.createElement('a')
  anchor.href = fileUrl(fileId, access.token, 'download')
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export function canPreviewInline(extension: string | null | undefined): boolean {
  const ext = (extension ?? '').toLowerCase()
  return [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif',
    'mp4', 'webm', 'mov', 'm4v', 'ogv',
    'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus',
    'pdf', 'docx', 'doc', 'odt', 'rtf', 'xlsx', 'xls', 'csv', 'ods',
    'pptx', 'ppt', 'odp',
    'zip', 'rar', '7z',
    'txt', 'md', 'json', 'xml', 'yml', 'yaml', 'java', 'ts', 'tsx', 'js', 'jsx', 'css',
    'html', 'sql', 'log', 'sh', 'py', 'c', 'cpp', 'cs', 'php', 'go', 'rs', 'kt', 'swift',
  ].includes(ext)
}
