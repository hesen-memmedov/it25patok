import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui'
import { useThemeStore } from '@/store/theme'

export function ThemeToggle() {
  const resolved = useThemeStore((state) => state.resolved)
  const toggle = useThemeStore((state) => state.toggle)
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={resolved === 'dark' ? 'Açıq temaya keç' : 'Tünd temaya keç'}
      title={resolved === 'dark' ? 'Açıq tema' : 'Tünd tema'}
    >
      {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
