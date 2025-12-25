/**
 * QuarryNavigation - Dedicated navigation for Quarry landing pages
 * @module codex/ui/QuarryNavigation
 *
 * @remarks
 * - Uses Quarry logos (light/dark mode)
 * - Navigation: Home, Features, About, FAQ
 * - Blog links to frame.dev/blog (external)
 * - "Powered by Frame.dev" badge
 * - CTA: "Try Quarry"
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ExternalLink, Sparkles, BookOpen, HelpCircle, Newspaper, Home, Layers } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'

// Custom Quarry Icon - Pickaxe with gem, matches brand
function QuarryIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Pickaxe handle */}
      <path d="M14 14L21 21" className="origin-center" />
      {/* Pickaxe head */}
      <path d="M5 5L10 3L12 5L14 3L19 5L17 10L14 12L10 12L5 5Z" className="fill-current opacity-20" />
      <path d="M5 5L10 3L12 5L14 3L19 5L17 10L14 12L10 12L5 5Z" />
      {/* Gem accent */}
      <path d="M9 8L11 6L13 8L11 10L9 8Z" className="fill-current" />
    </svg>
  )
}

// Navigation items for Quarry
// Marketing pages link to live frame.dev site, app pages are local
const navigation = [
  { name: 'Home', href: 'https://frame.dev/quarry', icon: Home, external: true },
  { name: 'Features', href: 'https://frame.dev/quarry#features', icon: Sparkles, external: true },
  { name: 'About', href: 'https://frame.dev/about', icon: BookOpen, external: true },
  { name: 'FAQ', href: 'https://frame.dev/faq', icon: HelpCircle, external: true },
  { name: 'Blog', href: 'https://frame.dev/blog', icon: Newspaper, external: true },
]

export default function QuarryNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  // Track scroll for nav background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 border-b ${
        scrolled
          ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-gray-200/50 dark:border-gray-800/50'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex h-full items-center justify-between">
          {/* Logo - Quarry */}
          <div className="flex items-center gap-3">
            <Link href="/codex" className="flex items-center gap-2.5 group">
              {/* Quarry Logo (monochromatic) */}
              <div className="relative h-[46px] w-auto flex-shrink-0">
                <Image
                  src="/quarry-logo-mono-light.svg"
                  alt="Quarry"
                  width={172}
                  height={46}
                  className="h-[46px] w-auto object-contain block dark:hidden transition-transform group-hover:scale-105"
                  priority
                />
                <Image
                  src="/quarry-logo-mono-dark.svg"
                  alt="Quarry"
                  width={172}
                  height={46}
                  className="h-[46px] w-auto object-contain hidden dark:block transition-transform group-hover:scale-105"
                  priority
                />
              </div>
              {/* By Frame.dev badge - to the right of logo */}
              <span
                className="text-[10px] tracking-[0.15em] uppercase font-medium text-gray-400/80 dark:text-gray-500/80 group-hover:text-emerald-600 dark:group-hover:text-rose-400 transition-colors duration-300"
                style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
              >
                <span className="opacity-60">by</span>{' '}
                <span className="font-semibold bg-gradient-to-r from-gray-500 to-gray-400 dark:from-gray-400 dark:to-gray-500 bg-clip-text text-transparent group-hover:from-emerald-600 group-hover:to-teal-500 dark:group-hover:from-rose-400 dark:group-hover:to-red-400 transition-all duration-300">Frame.dev</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href.includes('#') && pathname === item.href.split('#')[0])

              if (item.external) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {item.name}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-rose-900/30 text-emerald-700 dark:text-rose-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Right side: Theme toggle + CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* Powered by Frame.dev */}
            <a
              href="https://frame.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <Layers className="w-3 h-3" />
              Frame.dev
            </a>

            <ThemeToggle />

            {/* CTA Button - Animated Quarry icon, coral red in dark mode */}
            <Link
              href="/codex"
              className="group inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-rose-500 dark:to-red-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 dark:hover:from-rose-600 dark:hover:to-red-600 transition-all shadow-md hover:shadow-lg hover:shadow-emerald-500/25 dark:hover:shadow-rose-500/25"
            >
              <motion.span
                className="inline-block"
                whileHover={{ rotate: -15, scale: 1.1 }}
                whileTap={{ rotate: 15, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <QuarryIcon className="w-4 h-4" />
              </motion.span>
              <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Open Codex</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl"
          >
            <div className="space-y-1 px-4 pb-4 pt-3">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                if (item.external) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      <Icon className="w-5 h-5 text-gray-500" />
                      {item.name}
                      <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                    </a>
                  )
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl transition-colors ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-rose-900/30 text-emerald-700 dark:text-rose-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-rose-400' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                )
              })}

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-800 my-3" />

              {/* Frame.dev link */}
              <a
                href="https://frame.dev"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                <Layers className="w-5 h-5 text-gray-500" />
                Frame.dev
                <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
              </a>

              {/* CTA Button - Animated Quarry icon, coral red in dark mode */}
              <Link
                href="/codex"
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center justify-center gap-2 mx-4 mt-4 px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-rose-500 dark:to-red-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 dark:hover:from-rose-600 dark:hover:to-red-600 transition-all shadow-md"
              >
                <motion.span
                  className="inline-block"
                  whileHover={{ rotate: -15, scale: 1.1 }}
                  whileTap={{ rotate: 15, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <QuarryIcon className="w-5 h-5" />
                </motion.span>
                <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Open Codex</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
