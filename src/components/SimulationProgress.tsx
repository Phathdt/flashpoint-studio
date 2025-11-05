import type { SimulationProgress as SimulationProgressType } from '@/hooks/types'
import { Progress } from '@/components/ui/progress'

interface SimulationProgressProps {
  progress: SimulationProgressType
}

export function SimulationProgress({ progress }: SimulationProgressProps) {
  const percentage = (progress.step / progress.totalSteps) * 100

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{progress.message}</span>
        <span className="text-slate-600 dark:text-slate-400">
          Step {progress.step} of {progress.totalSteps}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}
