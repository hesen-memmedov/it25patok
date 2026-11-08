import { describe, expect, it } from 'vitest'
import {
  cn,
  errorMessage,
  fileCategory,
  formatDateTime,
  formatSubmittedAt,
  initials,
  percent,
  roleHome,
  roleLabel,
  safeFileDownloadName,
} from '@/lib/utils'

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
    expect(cn('text-white', undefined, false && 'hidden', 'block')).toBe('text-white block')
  })
})

describe('formatDateTime', () => {
  it('returns a dash for empty input', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('')).toBe('—')
  })

  it('returns a dash for invalid dates', () => {
    expect(formatDateTime('not-a-date')).toBe('—')
    expect(formatDateTime(NaN)).toBe('—')
  })

  it('formats timestamps', () => {
    const ts = Date.UTC(2024, 0, 15, 10, 30)
    expect(formatDateTime(ts)).toMatch(/\d+:\d{2}/)
  })
})

describe('formatSubmittedAt', () => {
  it('returns a dash when unset', () => {
    expect(formatSubmittedAt(null)).toBe('—')
  })
})

describe('percent', () => {
  it('handles zero totals', () => {
    expect(percent(0, 0)).toBe(0)
  })

  it('computes a rounded ratio', () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(3, 3)).toBe(100)
  })
})

describe('role helpers', () => {
  it('maps roles to home routes', () => {
    expect(roleHome('ADMIN')).toBe('/admin')
    expect(roleHome('TEACHER')).toBe('/teacher')
    expect(roleHome('STUDENT')).toBe('/student')
    expect(roleHome('UNKNOWN')).toBe('/student')
  })

  it('provides localized role labels', () => {
    expect(roleLabel('ADMIN')).toBe('Admin')
    expect(roleLabel('TEACHER')).toBe('Müəllim')
    expect(roleLabel('STUDENT')).toBe('Tələbə')
    expect(roleLabel('OTHER')).toBe('OTHER')
  })
})

describe('file helpers', () => {
  it('detects categories from extension', () => {
    expect(fileCategory('pdf')).toBe('pdf')
    expect(fileCategory('PNG')).toBe('image')
    expect(fileCategory('xlsx')).toBe('sheet')
    expect(fileCategory(null, 'image/png')).toBe('image')
    expect(fileCategory(null, 'application/pdf')).toBe('pdf')
    expect(fileCategory('xyz')).toBe('other')
  })

  it('strips unsafe characters from download names', () => {
    expect(safeFileDownloadName('a/b\\c:d*e?f"g<h>i|j.txt')).toBe('a_b_c_d_e_f_g_h_i_j.txt')
    expect(safeFileDownloadName('normal.pdf')).toBe('normal.pdf')
  })
})

describe('initials', () => {
  it('builds avatar initials', () => {
    expect(initials('Hesen', 'Ibrahimli')).toBe('HI')
    expect(initials('A', 'B')).toBe('AB')
    expect(initials('', '')).toBe('İP')
  })
})

describe('errorMessage', () => {
  it('extracts api error messages', () => {
    expect(
      errorMessage({ response: { data: { error: { message: 'Bundan sonra' } } } } as unknown),
    ).toBe('Bundan sonra')
  })

  it('falls back to the message property', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('plain string')).toBe('plain string')
  })

  it('uses the fallback for anything else', () => {
    expect(errorMessage(null)).toBe('Xəta baş verdi.')
    expect(errorMessage(undefined, 'fallback')).toBe('fallback')
  })
})
