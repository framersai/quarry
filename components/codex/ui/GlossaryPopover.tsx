/**
 * Glossary Popover - Quick vocabulary access from any strand
 * @module codex/ui/GlossaryPopover
 *
 * @remarks
 * Provides quick access to auto-generated glossary terms:
 * - NLP-powered term extraction
 * - Definition detection
 * - Acronym expansion
 * - Category grouping
 */

'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Book, BookOpen, Sparkles } from 'lucide-react'
import GlossaryPanel from './GlossaryPanel'
import { useModalAccessibility } from '../hooks/useModalAccessibility'

interface GlossaryPopoverProps {
  /** Whether popover is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current strand slug */
  strandSlug?: string
  /** Current strand content for generation */
  content?: string
  /** Theme */
  theme?: string
}

export default function GlossaryPopover({
  isOpen,
  onClose,
  strandSlug,
  content,
  theme = 'light',
}: GlossaryPopoverProps) {
  const [mounted, setMounted] = useState(false)
  const isDark = theme?.includes('dark')

  // Accessibility features
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'glossary-popover',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          {/* Modal */}
          <motion.div
            ref={contentRef}
            {...modalProps}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl
              ${isDark ? 'bg-zinc-900/95 border border-zinc-700/50' : 'bg-white/95 border border-zinc-200/50'}
            `}
          >
            {/* Header */}
            <div className={`
              px-6 py-4 border-b flex items-center justify-between
              ${isDark ? 'border-zinc-800 bg-gradient-to-r from-cyan-950/30 to-zinc-900' : 'border-zinc-200 bg-gradient-to-r from-cyan-50 to-white'}
            `}>
              <div className="flex items-center gap-3">
                <div className={`
                  p-2.5 rounded-xl
                  ${isDark ? 'bg-cyan-900/50 ring-1 ring-cyan-700/50' : 'bg-cyan-100 ring-1 ring-cyan-200'}
                `}>
                  <Book className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    Glossary
                  </h2>
                  {strandSlug && (
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {strandSlug.split('/').pop()?.replace(/\.md$/, '')}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
              {content && content.length > 50 ? (
                <GlossaryPanel
                  content={content}
                  isDark={isDark}
                />
              ) : (
                <div className={`text-center py-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                    <BookOpen className={`w-8 h-8 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  </div>
                  <p className={`text-base font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    No Content Available
                  </p>
                  <p className="text-sm max-w-xs mx-auto">
                    Select a strand to generate glossary terms from its content
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(popoverContent, document.body)
}
