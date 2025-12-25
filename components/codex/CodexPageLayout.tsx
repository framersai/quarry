/**
 * Codex Page Layout - Shared layout wrapper for Codex subpages
 * @module codex/CodexPageLayout
 * 
 * @description
 * Provides consistent layout with shared header and floating mobile nav
 * for all Codex subpages (spiral-path, search, new, explore, etc.)
 * 
 * @features
 * - Shared CodexTopNav header (consistent across all codex pages)
 * - Floating mobile footer navigation with icon buttons
 * - Theme support (light/dark/sepia/terminal/oceanic)
 * - Smooth animations throughout
 */

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  Network,
  Route,
  Moon,
  Sun,
  Plus,
  MoreHorizontal,
  GraduationCap,
  Sparkles,
  ExternalLink,
  BookOpen
} from 'lucide-react'
import { useTheme } from 'next-themes'
import type { ThemeName } from '@/types/theme'
import CodexTopNav from './ui/CodexTopNav'

interface CodexPageLayoutProps {
  /** Page content */
  children: React.ReactNode
  /** Page title for header */
  title?: string
  /** Page description for header */
  description?: string
  /** Whether to show the right metadata panel area (default: false for subpages) */
  showRightPanel?: boolean
  /** Custom right panel content */
  rightPanelContent?: React.ReactNode
  /** Custom left panel content (sidebar/tree view) */
  leftPanelContent?: React.ReactNode
  /** Current theme (auto-detected if not provided) */
  theme?: ThemeName
  /** Whether sidebar should be collapsed by default */
  defaultSidebarCollapsed?: boolean
}

// Nav items for mobile bottom nav
const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '/codex', icon: Home },
  { id: 'search', label: 'Search', href: '/codex/search', icon: Search },
  { id: 'graph', label: 'Insights', href: '/codex/graph', icon: Network },
  { id: 'learn', label: 'Learn', href: '/codex/learn', icon: GraduationCap },
  { id: 'new', label: 'Create', href: '/codex/new', icon: Plus },
]

const LEARN_ITEMS = [
  { id: 'spiral', label: 'Spiral Path', href: '/codex/spiral-path', icon: Route },
  { id: 'browse', label: 'Browse', href: '/codex/browse', icon: BookOpen },
]

/**
 * Shared layout for Codex subpages
 */
export default function CodexPageLayout({
  children,
  title,
  description,
  showRightPanel = false,
  rightPanelContent,
  leftPanelContent,
  theme: propTheme,
  defaultSidebarCollapsed = false,
}: CodexPageLayoutProps) {
  const { theme: systemTheme, setTheme } = useTheme()
  const effectiveTheme = (propTheme || systemTheme || 'light') as ThemeName
  const isDark = effectiveTheme.includes('dark')
  
  const pathname = usePathname()
  
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  
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
  
  // Close mobile menu on route change
  useEffect(() => {
    setMobileMoreOpen(false)
  }, [pathname])
  
  return (
    <div className={`
      min-h-screen flex flex-col
      ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}
    `}>
      {/* Shared Top Navigation */}
      <CodexTopNav theme={effectiveTheme} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden pb-14 md:pb-0">
        {/* Left Panel (if provided) */}
        {leftPanelContent && (
          <aside className={`
            hidden md:flex flex-col w-72 lg:w-80 flex-shrink-0
            border-r ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/50'}
          `}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {leftPanelContent}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Optional page description banner */}
          {description && (
            <div className={`
              px-4 md:px-6 py-3 border-b
              ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white/50'}
            `}>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-4xl">{description}</p>
            </div>
          )}
          
          {/* Page Content */}
          {children}
        </main>
        
        {/* Right Panel (if enabled) */}
        {showRightPanel && rightPanelContent && (
          <aside className={`
            hidden lg:flex flex-col w-80 flex-shrink-0 overflow-hidden
            border-l ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/50'}
          `}>
            {rightPanelContent}
          </aside>
        )}
      </div>
      
      {/* Mobile Floating Footer Navigation */}
      <div className={`
        md:hidden fixed bottom-0 left-0 right-0 z-50
        ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-200'}
        border-t safe-area-inset-bottom backdrop-blur-sm
      `}>
        <nav className="flex items-center justify-around px-2 h-14">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeNavItem?.id === item.id
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl
                  transition-all duration-150 min-w-[48px]
                  ${isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-500 dark:text-zinc-400 active:bg-zinc-100 dark:active:bg-zinc-800'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            )
          })}
          
          {/* More Menu Button */}
          <div className="relative">
            <button
              onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
              className={`
                flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl
                transition-all duration-150 min-w-[56px]
                ${mobileMoreOpen 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-zinc-500 dark:text-zinc-400 active:bg-zinc-100 dark:active:bg-zinc-800'
                }
              `}
            >
              <MoreHorizontal className={`w-5 h-5 transition-transform ${mobileMoreOpen ? 'rotate-90' : ''}`} />
              <span className="text-[9px] font-medium">More</span>
            </button>
            
            {/* Mobile More Dropdown */}
            <AnimatePresence>
              {mobileMoreOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setMobileMoreOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    className={`
                      absolute bottom-full right-0 mb-2 w-48
                      rounded-xl shadow-xl border overflow-hidden z-50
                      ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}
                    `}
                  >
                    <div className="py-1">
                      {/* Learn Section */}
                      <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Learn
                      </div>
                      {LEARN_ITEMS.map(item => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => setMobileMoreOpen(false)}
                            className={`
                              flex items-center gap-3 px-4 py-2.5 text-sm
                              transition-colors
                              ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
                              ${pathname?.startsWith(item.href) ? 'text-emerald-600 dark:text-emerald-400' : ''}
                            `}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        )
                      })}
                      
                      <div className={`border-t my-1 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />
                      
                      <Link
                        href="/codex/landing"
                        onClick={() => setMobileMoreOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-2.5 text-sm
                          transition-colors
                          ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
                        `}
                      >
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        About Codex
                      </Link>
                      
                      <button
                        onClick={() => {
                          toggleTheme()
                          setMobileMoreOpen(false)
                        }}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left
                          transition-colors
                          ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
                        `}
                      >
                        {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
                        {isDark ? 'Light Theme' : 'Dark Theme'}
                      </button>
                      
                      <Link
                        href="https://frame.dev"
                        target="_blank"
                        onClick={() => setMobileMoreOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-2.5 text-sm
                          transition-colors
                          ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
                        `}
                      >
                        <ExternalLink className="w-4 h-4 text-cyan-500" />
                        Frame.dev
                      </Link>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </div>
    </div>
  )
}
