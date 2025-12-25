/**
 * Bookmarks and reading history panel
 * @module codex/ui/BookmarksPanel
 * 
 * @remarks
 * - Side panel showing bookmarks and recent files
 * - Toggle with keyboard shortcut 'b'
 * - Click any item to navigate
 * - Remove items individually or clear all
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bookmark, Clock, Trash2, Star } from 'lucide-react'
import type { Bookmark as BookmarkType, HistoryEntry } from '@/lib/localStorage'

interface BookmarksPanelProps {
  /** Whether panel is open */
  isOpen: boolean
  /** Close panel callback */
  onClose: () => void
  /** Bookmarks list */
  bookmarks: BookmarkType[]
  /** History list */
  history: HistoryEntry[]
  /** Navigate to a file */
  onNavigate: (path: string) => void
  /** Remove a bookmark */
  onRemoveBookmark: (path: string) => void
  /** Remove from history */
  onRemoveHistory: (path: string) => void
  /** Clear all bookmarks */
  onClearBookmarks: () => void
  /** Clear all history */
  onClearHistory: () => void
}

/**
 * Panel displaying bookmarks and reading history
 * 
 * @example
 * ```tsx
 * <BookmarksPanel
 *   isOpen={bookmarksOpen}
 *   onClose={() => setBookmarksOpen(false)}
 *   bookmarks={bookmarks}
 *   history={history}
 *   onNavigate={(path) => openFile(path)}
 *   onRemoveBookmark={removeBookmark}
 *   onRemoveHistory={removeFromHistory}
 *   onClearBookmarks={clearAllBookmarks}
 *   onClearHistory={clearAllHistory}
 * />
 * ```
 */
export default function BookmarksPanel({
  isOpen,
  onClose,
  bookmarks,
  history,
  onNavigate,
  onRemoveBookmark,
  onRemoveHistory,
  onClearBookmarks,
  onClearHistory,
}: BookmarksPanelProps) {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history'>('bookmarks')

  // Handle escape key to close panel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - works on all screen sizes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {activeTab === 'bookmarks' ? 'Bookmarks' : 'Recent'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close bookmarks panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bookmark className="w-4 h-4" />
              <span>Bookmarks ({bookmarks.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Recent ({history.length})</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'bookmarks' ? (
            <div>
              {bookmarks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No bookmarks yet</p>
                  <p className="text-xs mt-2">Press ′b′ to bookmark the current file</p>
                </div>
              ) : (
                <>
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.path}
                      className="group flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
                    >
                      <button
                        onClick={() => onNavigate(bookmark.path)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {bookmark.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {bookmark.path}
                        </div>
                        {bookmark.notes && (
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {bookmark.notes}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(bookmark.addedAt).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        onClick={() => onRemoveBookmark(bookmark.path)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                        title="Remove bookmark"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                  <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={onClearBookmarks}
                      className="w-full py-2 px-4 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Clear All Bookmarks
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div>
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No reading history</p>
                </div>
              ) : (
                <>
                  {history.map((entry) => (
                    <div
                      key={entry.path}
                      className="group flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
                    >
                      <button
                        onClick={() => onNavigate(entry.path)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {entry.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {entry.path}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(entry.viewedAt).toLocaleDateString()} • {entry.viewCount}{' '}
                          {entry.viewCount === 1 ? 'view' : 'views'}
                        </div>
                      </button>
                      <button
                        onClick={() => onRemoveHistory(entry.path)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                  <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={onClearHistory}
                      className="w-full py-2 px-4 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Clear All History
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-1.5 text-center">
          <p className="text-xs text-gray-500">
            Bookmarks & reading history are stored <strong>only in this browser</strong>. They are never sent to any server.
          </p>
          <p className="text-xs text-gray-500">
            You can pause history tracking or clear all data from <span className="font-semibold">Settings → Data&nbsp;Management</span>. Press{' '}
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">b</kbd> to toggle this panel.
          </p>
        </div>
      </motion.div>
    </>
  )
}

