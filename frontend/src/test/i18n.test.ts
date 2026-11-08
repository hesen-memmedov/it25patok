import { describe, expect, it } from 'vitest'
import i18n from '@/lib/i18n'

function flatten(value: unknown, prefix = ''): string[] {
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

const az = (i18n as unknown as { store: { data: Record<string, { translation: Record<string, unknown> }> } }).store
  .data.az.translation
const en = (i18n as unknown as { store: { data: Record<string, { translation: Record<string, unknown> }> } }).store
  .data.en.translation

describe('i18n resources', () => {
  it('az and en expose identical key sets', () => {
    expect(flatten(en).sort()).toEqual(flatten(az).sort())
  })

  it('includes the namespaces referenced by the app', () => {
    for (const namespace of ['nav', 'common', 'auth', 'errors', 'admin', 'chat', 'profile']) {
      expect(az).toHaveProperty(namespace)
      expect(en).toHaveProperty(namespace)
    }
  })

  it('resolves keys used at runtime', () => {
    expect(i18n.t('auth.login_required')).toBeTruthy()
    expect(i18n.t('chat.rooms')).toBeTruthy()
    expect(i18n.t('admin.dashboard')).toBeTruthy()
    expect(i18n.t('profile.my_profile')).toBeTruthy()
  })

  it('interpolates variables', () => {
    expect(i18n.t('profile.email_change_sent_to', { email: 'test@it25patok.az' })).toContain('test@it25patok.az')
  })
})
