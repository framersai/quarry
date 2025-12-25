/**
 * Mobile bottom navigation bar
 * @module codex/ui/MobileBottomNav
 * 
 * @remarks
 * - Only visible on mobile (< 768px)
 * - Fixed at bottom with safe-area-inset support
 * - 5 main actions: Home, Search, Ask, Bookmarks, Settings
 * - Sleek minimal design - all items flush and consistent
 * - Ask uses vibrant color but no gradient background
 */

'use client'

import React from 'react'
import { Home, Search, Settings, Sparkles, PanelRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Z_INDEX } from '../constants'

interface MobileBottomNavProps {
  /** Current active tab */
  activeTab?: 'home' | 'search' | 'ask' | 'info' | 'settings'
  /** Navigate to home */
  onHome: () => void
  /** Open search */
  onSearch: () => void
  /** Open Ask interface */
  onAsk: () => void
  /** Open info/metadata panel */
  onInfo: () => void
  /** Open settings */
  onSettings: () => void
  /** Theme for Ask icon */
  theme?: 'light' | 'dark'
}

/**
 * Bottom navigation bar for mobile devices
 * Sleek, minimal design - all items flush and consistent
 */
export default function MobileBottomNav({
  activeTab,
  onHome,
  onSearch,
  onAsk,
  onInfo,
  onSettings,
}: MobileBottomNavProps) {
  const items = [
    { id: 'home' as const, icon: Home, label: 'Home', onClick: onHome, color: 'cyan' },
    { id: 'search' as const, icon: Search, label: 'Search', onClick: onSearch, color: 'cyan' },
    { id: 'ask' as const, icon: Sparkles, label: 'Ask', onClick: onAsk, color: 'violet' },
    { id: 'info' as const, icon: PanelRight, label: 'Info', onClick: onInfo, color: 'cyan' },
    { id: 'settings' as const, icon: Settings, label: 'More', onClick: onSettings, color: 'cyan' },
  ]

  const colorClasses = {
    cyan: {
      active: 'text-cyan-500 dark:text-cyan-400',
      inactive: 'text-zinc-400 dark:text-zinc-500',
      dot: 'bg-cyan-500 dark:bg-cyan-400',
    },
    violet: {
      active: 'text-violet-500 dark:text-violet-400',
      inactive: 'text-violet-400/60 dark:text-violet-400/50',
      dot: 'bg-violet-500 dark:bg-violet-400',
    },
  }

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200/80 dark:border-zinc-800/80"
      style={{ 
        zIndex: Z_INDEX.MOBILE_BOTTOM_NAV,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around px-1 h-14">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          const colors = colorClasses[item.color as keyof typeof colorClasses]

          return (
            <motion.button
              key={item.id}
              onClick={item.onClick}
              className="relative flex-1 flex flex-col items-center justify-center py-2 touch-manipulation"
              whileTap={{ scale: 0.9 }}
            >
              {/* Active dot indicator */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-dot"
                  className={`absolute top-1 w-1 h-1 rounded-full ${colors.dot}`}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Icon */}
              <Icon
                className={`w-[22px] h-[22px] transition-colors stroke-[1.5] ${
                  isActive ? colors.active : colors.inactive
                }`}
              />

              {/* Label */}
              <span
                className={`mt-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? colors.active : colors.inactive
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

