import { useState, useEffect } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTheme } from 'next-themes'
import { useApiExecutionStrategy } from '@/hooks'
import type { ApiExecutionStrategy } from '@/lib/types'

export type ContainerSize = 'small' | 'medium' | 'large' | 'extra-large' | 'full'

interface SettingsProps {
  onSizeChange?: (size: ContainerSize) => void
}

const SIZE_OPTIONS: { value: ContainerSize; label: string; description: string }[] = [
  { value: 'small', label: 'Small', description: 'Compact view (896px max)' },
  { value: 'medium', label: 'Medium', description: 'Balanced view (1280px max)' },
  { value: 'large', label: 'Large', description: 'Wide view (1536px max)' },
  { value: 'extra-large', label: 'Extra Large', description: 'Very wide (95% width)' },
  { value: 'full', label: 'Full Width', description: 'Maximum width (100%)' },
]

const API_STRATEGY_OPTIONS: {
  value: ApiExecutionStrategy
  label: string
  description: string
}[] = [
  {
    value: 'parallel',
    label: 'Parallel (Recommended)',
    description: 'Fetch multiple contracts simultaneously with rate limiting (faster)',
  },
  {
    value: 'sequential',
    label: 'Sequential',
    description: 'Fetch contracts one at a time (slower, more conservative)',
  },
]

export function Settings({ onSizeChange }: SettingsProps) {
  const [open, setOpen] = useState(false)
  const [containerSize, setContainerSize] = useState<ContainerSize>('large')
  const { theme, setTheme } = useTheme()
  const { strategy: apiStrategy, updateStrategy: setApiStrategy } = useApiExecutionStrategy()

  // Load size preference from localStorage
  useEffect(() => {
    const savedSize = localStorage.getItem('container-size') as ContainerSize | null
    if (savedSize && SIZE_OPTIONS.find((opt) => opt.value === savedSize)) {
      setContainerSize(savedSize)
      onSizeChange?.(savedSize)
    }
  }, [onSizeChange])

  const handleSizeChange = (size: ContainerSize) => {
    setContainerSize(size)
    localStorage.setItem('container-size', size)
    onSizeChange?.(size)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full shadow-lg"
          title="Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize your Flashpoint Studio experience</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Theme Setting */}
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
          </div>

          {/* Container Size Setting */}
          <div className="space-y-2">
            <Label htmlFor="size">Container Size</Label>
            <Select value={containerSize} onValueChange={handleSizeChange}>
              <SelectTrigger id="size">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {SIZE_OPTIONS.find((opt) => opt.value === containerSize)?.description}
            </p>
          </div>

          {/* API Execution Strategy Setting */}
          <div className="space-y-2">
            <Label htmlFor="api-strategy">API Execution Strategy</Label>
            <Select value={apiStrategy} onValueChange={setApiStrategy}>
              <SelectTrigger id="api-strategy">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                {API_STRATEGY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {API_STRATEGY_OPTIONS.find((opt) => opt.value === apiStrategy)?.description}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
