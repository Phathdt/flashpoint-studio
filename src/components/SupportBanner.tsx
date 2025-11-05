import { Coffee, Copy, Heart, Sparkles, Zap } from 'lucide-react'
import { useCopyToClipboard } from '@/hooks'
import { useState } from 'react'

export function SupportBanner() {
  const { copyToClipboard } = useCopyToClipboard()
  const [isHovered, setIsHovered] = useState(false)
  const SUPPORT_ADDRESS = '0x19ce4dE99ce88bc4a759e8dBdEC42724eEcb666f'

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100 p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] dark:border-orange-700 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background sparkles */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 right-8 animate-pulse">
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </div>
        <div className="absolute bottom-8 left-12 animate-pulse delay-300">
          <Sparkles className="h-4 w-4 text-orange-500" />
        </div>
        <div className="absolute top-12 right-20 animate-pulse delay-500">
          <Sparkles className="h-5 w-5 text-amber-500" />
        </div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Icon Section */}
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* Animated glow effect */}
            <div
              className={`absolute inset-0 rounded-full bg-orange-400 blur-xl transition-all duration-500 ${
                isHovered ? 'scale-150 opacity-75' : 'scale-100 opacity-0'
              }`}
            />
            {/* Coffee icon with animation */}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
              <Coffee className="h-8 w-8 text-white animate-pulse" />
            </div>
            {/* Heart icon badge */}
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 shadow-md animate-bounce">
              <Heart className="h-4 w-4 fill-white text-white" />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="flex-1 space-y-3">
          {/* Title with lightning */}
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400 animate-pulse" />
            <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent dark:from-orange-400 dark:to-amber-400">
              Support Flashpoint Studio
            </h3>
            <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400 animate-pulse" />
          </div>

          {/* Description */}
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Love this tool? Help keep it free and awesome for everyone! 🚀
          </p>

          {/* Address Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                ETH
              </span>
              <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                BASE
              </span>
              <span className="text-xs text-orange-700 dark:text-orange-300">Networks</span>
            </div>

            {/* Address with copy button */}
            <div className="flex flex-wrap items-center gap-2">
              <code className="group/code relative flex-1 rounded-lg border-2 border-orange-300 bg-white px-3 py-2 font-mono text-sm font-bold text-orange-900 shadow-inner transition-all hover:border-orange-400 hover:shadow-md dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100">
                <span className="block sm:hidden">
                  {SUPPORT_ADDRESS.slice(0, 10)}...{SUPPORT_ADDRESS.slice(-8)}
                </span>
                <span className="hidden sm:block">{SUPPORT_ADDRESS}</span>
              </code>
              <button
                onClick={() => copyToClipboard(SUPPORT_ADDRESS, 'Support address')}
                className="group/btn flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2 font-semibold text-white shadow-md transition-all hover:from-orange-600 hover:to-amber-700 hover:shadow-lg active:scale-95"
                title="Copy support address"
              >
                <Copy className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                <span className="text-sm">Copy</span>
              </button>
            </div>
          </div>

          {/* Thank you message */}
          <p className="flex items-center gap-2 text-xs font-medium text-orange-700 dark:text-orange-300">
            <span>Your support keeps the ⚡ alive!</span>
            <span className="inline-flex gap-1 animate-pulse">
              <span>💖</span>
              <span>🙏</span>
              <span>✨</span>
            </span>
          </p>
        </div>
      </div>

      {/* Animated border gradient */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 opacity-0 transition-opacity duration-300 group-hover:opacity-20 -z-10 blur-md" />
    </div>
  )
}
