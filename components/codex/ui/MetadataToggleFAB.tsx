/**
 * Metadata Panel Floating Action Button
 * @module codex/ui/MetadataToggleFAB
 * 
 * @remarks
 * Minimal floating button that appears when metadata panel is closed.
 * Ultra-clean design with no background or borders — just a subtle icon.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface MetadataToggleFABProps {
  /** Whether metadata panel is open */
  isOpen: boolean
  /** Toggle handler */
  onToggle: () => void
  /** Theme */
  theme?: string
}

/**
 * Custom SVG arrow that matches Frame's aesthetic
 */
const FrameArrow = ({ direction = 'left', className = '' }: { direction?: 'left' | 'right'; className?: string }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 16 16" 
    fill="none" 
    className={className}
    style={{ transform: direction === 'right' ? 'rotate(180deg)' : 'none' }}
  >
    <path
      d="M10 2L4 8L10 14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * Floating action button for metadata panel toggle
 * Ultra-minimal: just a small arrow that hugs the edge
 */
export default function MetadataToggleFAB({
  isOpen,
  onToggle,
  theme = 'light',
}: MetadataToggleFABProps) {
  const isTerminal = theme?.includes('terminal')
  const isOceanic = theme?.includes('oceanic')
  const isDark = theme?.includes('dark')
  
  // Only show when panel is closed
  if (isOpen) return null
  
  return (
    <motion.button
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 0.6, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      whileHover={{ opacity: 1, x: -2 }}
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      className={`
        hidden md:flex
        fixed top-1/2 -translate-y-1/2 right-0 z-40
        w-5 h-10 items-center justify-center
        rounded-l-md
        transition-all duration-150
        ${isTerminal
          ? 'text-green-500 hover:bg-green-900/30'
          : isOceanic
          ? 'text-cyan-500 hover:bg-cyan-900/20'
          : isDark
          ? 'text-zinc-400 hover:bg-zinc-800/50'
          : 'text-zinc-400 hover:bg-zinc-100/80'
        }
      `}
      title="Show metadata panel (m)"
      aria-label="Show metadata panel"
    >
      <FrameArrow direction="left" className="w-3 h-3" />
    </motion.button>
  )
}

