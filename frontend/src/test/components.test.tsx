import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button, Badge, EmptyState } from '@/components/ui'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Yadda saxla</Button>)
    expect(screen.getByRole('button', { name: 'Yadda saxla' })).toBeInTheDocument()
  })

  it('calls onClick when pressed', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Təsdiqlə</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Təsdiqlə' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows a spinner and is disabled while loading', () => {
    render(<Button loading>Gözləyin</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })
})

describe('Badge', () => {
  it('renders content with a tone class', () => {
    render(<Badge tone="success">Hazır</Badge>)
    const badge = screen.getByText('Hazır')
    expect(badge).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="Məlumat yoxdur" description="Hələ heç nə əlavə edilməyib" />)
    expect(screen.getByText('Məlumat yoxdur')).toBeInTheDocument()
    expect(screen.getByText('Hələ heç nə əlavə edilməyib')).toBeInTheDocument()
  })
})
