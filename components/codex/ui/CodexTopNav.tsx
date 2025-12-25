/**
 * CodexTopNav - Shared top navigation bar for all Codex pages
 * @module codex/ui/CodexTopNav
 * 
 * @description
 * Compact, consistent navigation header used across:
 * - CodexViewer (main viewer)
 * - CodexPageLayout (subpages)
 */

'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import QuarryBrand from './QuarryBrand'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  Network,
  Route,
  Plus,
  Moon,
  Sun,
  BookOpen,
  ChevronDown,
  GraduationCap,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { useTheme } from 'next-themes'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ElementType
  description?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/codex', icon: Home, description: 'Dashboard' },
  { id: 'search', label: 'Search', href: '/codex/search', icon: Search, description: 'Find knowledge' },
  { id: 'graph', label: 'Insights', href: '/codex/graph', icon: Network, description: 'Knowledge graph' },
  { id: 'learn', label: 'Learn', href: '/codex/learn', icon: GraduationCap, description: 'Flashcards & quizzes' },
  { id: 'new', label: 'Create', href: '/codex/new', icon: Plus, description: 'New strand' },
]

const LEARN_ITEMS = [
  { id: 'spiral', label: 'Spiral Path', href: '/codex/spiral-path', icon: Route, description: 'Adaptive learning' },
  { id: 'browse', label: 'Browse', href: '/codex/browse', icon: BookOpen, description: 'Explore by category' },
]

// Animated caret component
function AnimatedCaret({ isOpen, className = '' }: { isOpen: boolean; className?: string }) {
  return (
    <motion.svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={className}
      animate={{ rotate: isOpen ? 180 : 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  )
}

// Hover dropdown
function NavDropdown({
  trigger,
  children,
  isDark,
  align = 'left',
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  isDark: boolean
  align?: 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }
  
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150)
  }
  
  return (
    <div 
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {trigger}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={`
              absolute top-full mt-1 min-w-[180px]
              ${align === 'right' ? 'right-0' : 'left-0'}
              rounded-xl shadow-xl border overflow-hidden z-[9999]
              ${isDark 
                ? 'bg-zinc-900 border-zinc-800' 
                : 'bg-white border-zinc-200'
              }
            `}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface CodexTopNavProps {
  /** Show compact version (no labels on nav items) */
  compact?: boolean
  /** Current theme override */
  theme?: string
  /** Show mobile page selector dropdown */
  showMobileSelector?: boolean
}

export default function CodexTopNav({
  compact = false,
  theme: themeProp,
  showMobileSelector = true,
}: CodexTopNavProps) {
  const { theme: systemTheme, setTheme } = useTheme()
  const effectiveTheme = themeProp || systemTheme || 'light'
  const isDark = effectiveTheme.includes('dark')
  
  const pathname = usePathname()
  const router = useRouter()
  
  // Determine active nav item
  const activeNavItem = NAV_ITEMS.find(item => {
    if (item.href === '/codex') return pathname === '/codex' || pathname === '/codex/'
    return pathname?.startsWith(item.href)
  })
  
  // Toggle through themes
  const toggleTheme = () => {
    const themes = ['light', 'dark', 'sepia-light', 'sepia-dark', 'terminal-light', 'terminal-dark', 'oceanic-light', 'oceanic-dark']
    const currentIndex = themes.indexOf(effectiveTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }
  
  return (
    <header className={`
      sticky top-0 z-40
      h-11 px-3 flex items-center justify-between gap-2
      border-b
      ${isDark ? 'border-zinc-800 bg-zinc-950/95 backdrop-blur-sm' : 'border-zinc-200 bg-white/95 backdrop-blur-sm'}
    `}>
      {/* Left: Logo - Customizable instance name */}
      <div className="flex items-center gap-2">
        <QuarryBrand
          size="sm"
          showIcon={true}
          compact={true}
          theme={effectiveTheme}
          interactive={true}
        />

        {/* Mobile Page Selector */}
        {showMobileSelector && (
          <div className="md:hidden relative">
            <select
              value={activeNavItem?.href || '/codex'}
              onChange={(e) => router.push(e.target.value)}
              className={`
                appearance-none pl-2 pr-6 py-1 rounded-lg text-xs font-medium
                border cursor-pointer
                ${isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                }
              `}
            >
              {NAV_ITEMS.map((item) => (
                <option key={item.id} value={item.href}>
                  {item.label}
                </option>
              ))}
              <option value="/codex/spiral-path">Spiral Path</option>
              <option value="/codex/browse">Browse</option>
            </select>
            <ChevronDown className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          </div>
        )}
      </div>

      {/* Center: Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeNavItem?.id === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }
              `}
              title={item.description}
            >
              <Icon className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
              }`} />
              {!compact && <span>{item.label}</span>}
            </Link>
          )
        })}
        
        {/* Learn Dropdown */}
        <NavDropdown
          isDark={isDark}
          trigger={
            <button className={`
              group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-150
              ${pathname?.startsWith('/codex/spiral') || pathname?.startsWith('/codex/browse')
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }
            `}>
              <Route className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
              {!compact && <span>Learn</span>}
              <AnimatedCaret isOpen={false} className="w-2.5 h-2.5 opacity-50" />
            </button>
          }
        >
          <div className="py-1">
            {LEARN_ITEMS.map(item => {
              const Icon = item.icon
              const isSubActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 text-xs
                    transition-colors
                    ${isSubActive
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                    }
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSubActive ? 'text-emerald-500' : ''}`} />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </NavDropdown>
      </nav>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-0.5">
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          className={`
            p-1.5 rounded-lg transition-colors
            ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
          `}
          aria-label="Toggle theme"
          title={`Theme: ${effectiveTheme}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-zinc-600" />}
        </motion.button>
        
        {/* About Link */}
        <NavDropdown
          isDark={isDark}
          align="right"
          trigger={
            <button className={`
              hidden sm:flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs
              transition-colors
              ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
            `}>
              <BookOpen className="w-3.5 h-3.5" />
              <AnimatedCaret isOpen={false} className="opacity-60" />
            </button>
          }
        >
          <div className="py-1">
            <a
              href="https://frame.dev/quarry"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex items-center gap-2.5 px-3 py-2 text-xs
                transition-colors
                ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
              `}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              About Quarry
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
            <a
              href="https://frame.dev"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex items-center gap-2.5 px-3 py-2 text-xs
                transition-colors
                ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
              `}
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-500" />
              Frame.dev Home
            </a>
          </div>
        </NavDropdown>
      </div>
    </header>
  )
}

