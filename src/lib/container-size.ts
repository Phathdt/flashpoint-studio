import type { ContainerSize } from '@/components/Settings'

export function getContainerWidthClass(size: ContainerSize): string {
  const sizeMap: Record<ContainerSize, string> = {
    small: 'max-w-4xl',
    medium: 'max-w-7xl',
    large: 'max-w-screen-2xl',
    'extra-large': 'w-full lg:w-[95%] xl:w-[90%]',
    full: 'w-full',
  }

  return sizeMap[size] || sizeMap.large
}
