/**
 * Sidebar Width Control Component
 * @module codex/ui/SidebarWidthControl
 * 
 * @remarks
 * Controls for sidebar width presets and font size adjustments:
 * - Width: Small (280px) / Medium (340px) / Large (400px)
 * - Font: +/- buttons to scale text (xs/sm/base/lg)
 */

'use client'

import React from 'react'
import { Minus, Plus } from 'lucide-react'

interface SidebarWidthControlProps {
  /** Current width in pixels */
  width: number
  /** Width change handler */
  onChange: (width: number) => void
  /** Current font size scale (0 = xs, 1 = sm, 2 = base, 3 = lg) */
  fontSize?: number
  /** Font size change handler */
  onFontSizeChange?: (size: number) => void
  /** Theme */
  theme?: string
}

const PRESETS = {
  small: 280,
  medium: 340,
  large: 400,
} as const

const FONT_SIZES = ['xs', 'sm', 'base', 'lg'] as const
const MIN_FONT = 0
const MAX_FONT = 3

/**
 * Sidebar width and font size control
 */
export default function SidebarWidthControl({
  width,
  onChange,
  fontSize = 1,
  onFontSizeChange,
  theme = 'light',
}: SidebarWidthControlProps) {
  const isTerminal = theme?.includes('terminal')
  const isDark = theme?.includes('dark')
  
  // Determine which preset is currently active (closest match)
  const activePreset = 
    Math.abs(width - PRESETS.small) < 40 ? 'small'
    : Math.abs(width - PRESETS.large) < 40 ? 'large'
    : 'medium'
  
  const decreaseFont = () => {
    if (onFontSizeChange && fontSize > MIN_FONT) {
      onFontSizeChange(fontSize - 1)
    }
  }
  
  const increaseFont = () => {
    if (onFontSizeChange && fontSize < MAX_FONT) {
      onFontSizeChange(fontSize + 1)
    }
  }
  
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      {/* Width Controls */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
          W
        </span>
        <div className="inline-flex border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden rounded">
          {(['small', 'medium', 'large'] as const).map((preset) => {
            const isActive = activePreset === preset
            return (
              <button
                key={preset}
                onClick={() => onChange(PRESETS[preset])}
                className={`
                  px-1.5 py-0.5 text-[8px] font-bold uppercase
                  transition-all duration-150
                  border-r border-zinc-200 dark:border-zinc-700 last:border-r-0
                  hover:bg-zinc-100 dark:hover:bg-zinc-700
                  ${isActive
                    ? isTerminal
                      ? 'bg-green-900 text-green-300'
                      : 'bg-cyan-500 dark:bg-cyan-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400'
                  }
                `}
                title={`Width: ${PRESETS[preset]}px`}
              >
                {preset[0].toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Divider */}
      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
      
      {/* Font Size Controls */}
      {onFontSizeChange && (
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
            A
          </span>
          <div className="inline-flex items-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden rounded">
            <button
              onClick={decreaseFont}
              disabled={fontSize <= MIN_FONT}
              className={`
                p-1 transition-all duration-150
                hover:bg-zinc-100 dark:hover:bg-zinc-700
                disabled:opacity-30 disabled:cursor-not-allowed
                text-zinc-600 dark:text-zinc-400
              `}
              title="Decrease font size"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className={`
              px-1.5 text-[8px] font-mono font-bold border-x border-zinc-200 dark:border-zinc-700
              ${isTerminal ? 'text-green-400' : 'text-zinc-600 dark:text-zinc-300'}
            `}>
              {FONT_SIZES[fontSize]}
            </span>
            <button
              onClick={increaseFont}
              disabled={fontSize >= MAX_FONT}
              className={`
                p-1 transition-all duration-150
                hover:bg-zinc-100 dark:hover:bg-zinc-700
                disabled:opacity-30 disabled:cursor-not-allowed
                text-zinc-600 dark:text-zinc-400
              `}
              title="Increase font size"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

