import { useState, type ReactNode } from 'react'
import { useFileAccess, fileUrl } from '@/lib/files'
import { cn, initials } from '@/lib/utils'
import type { User } from '@/lib/types'

const sizeClasses = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
}

export type AvatarSize = keyof typeof sizeClasses

export function AuthenticatedImage({
  fileId,
  alt,
  className,
  fallback,
}: {
  fileId: string | null | undefined
  alt: string
  className?: string
  fallback?: ReactNode
}) {
  const query = useFileAccess(fileId)
  const [failed, setFailed] = useState(false)

  if (!fileId || !query.data || failed) {
    return <>{fallback ?? null}</>
  }

  return (
    <img
      src={fileUrl(fileId, query.data.token, 'view')}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

interface AvatarProps {
  user?: Pick<User, 'firstName' | 'lastName' | 'avatarFileId'> | null
  fileId?: string | null
  firstName?: string
  lastName?: string
  size?: AvatarSize
  className?: string
  ring?: boolean
}

export function Avatar({
  user,
  fileId,
  firstName,
  lastName,
  size = 'md',
  className,
  ring = false,
}: AvatarProps) {
  const first = firstName ?? user?.firstName ?? ''
  const last = lastName ?? user?.lastName ?? ''
  const avatarId = fileId !== undefined ? fileId : user?.avatarFileId
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-violet-500 font-bold text-white',
        sizeClasses[size],
        ring && 'ring-2 ring-[#ebe6b0] shadow-sm dark:ring-[#1a0e12]',
        className,
      )}
      aria-hidden={!avatarId}
    >
      <AuthenticatedImage
        fileId={avatarId}
        alt={`${first} ${last}`.trim() || 'Profil'}
        className="h-full w-full object-cover"
        fallback={<span>{initials(first, last)}</span>}
      />
    </span>
  )
}
