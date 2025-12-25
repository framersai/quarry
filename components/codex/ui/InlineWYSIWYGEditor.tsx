/**
 * InlineWYSIWYGEditor - Medium-style inline WYSIWYG editor
 * @module codex/ui/InlineWYSIWYGEditor
 *
 * Main component that orchestrates block-level editing:
 * 1. Parse markdown into blocks
 * 2. Render each block with EditableBlock
 * 3. Track which block (if any) is being edited
 * 4. On block edit complete, reconstruct full markdown
 * 5. Auto-save draft to localStorage
 */

'use client'

import React, { useMemo, useCallback, useEffect, useState } from 'react'
import { EditableBlock, type BlockType } from './EditableBlock'
import { useInlineEditor } from '../hooks/useInlineEditor'
import { parseMarkdownBlocks, blocksToMarkdown } from '../utils/markdownConversion'
import { Save, RotateCcw, AlertCircle, Check } from 'lucide-react'

export interface InlineWYSIWYGEditorProps {
  /** Full markdown content */
  content: string
  /** File path for draft storage */
  filePath: string
  /** Callback when content changes */
  onContentChange: (markdown: string) => void
  /** Callback to publish/save content - can be sync or async */
  onPublish?: (content: string) => void | Promise<void>
  /** Whether editing is enabled */
  editable: boolean
  /** Theme name */
  theme: string
  /** Original content for conflict detection */
  originalContent: string
}

/**
 * Inline WYSIWYG editor with block-level editing
 */
export function InlineWYSIWYGEditor({
  content,
  filePath,
  onContentChange,
  onPublish,
  editable,
  theme,
  originalContent,
}: InlineWYSIWYGEditorProps) {
  const isDark = theme.includes('dark')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Initialize inline editor hook
  const {
    state,
    startEditing,
    stopEditing,
    updateBlockContent,
    setContent,
    loadDraft,
    hasDraft,
    clearDraft,
    resetContent,
    markSaved,
  } = useInlineEditor({
    filePath,
    initialContent: content,
    onContentChange,
  })

  // Parse content into blocks
  const blocks = useMemo(() => {
    return parseMarkdownBlocks(state.content)
  }, [state.content])

  // Check for draft on mount
  useEffect(() => {
    if (hasDraft()) {
      const draft = loadDraft()
      if (draft && draft !== content) {
        // Show draft recovery option
        setContent(draft)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle block edit start
  const handleStartEdit = useCallback((blockId: string) => {
    if (!editable) return
    startEditing(blockId)
  }, [editable, startEditing])

  // Handle block edit end
  const handleEndEdit = useCallback((blockId: string, newContent: string) => {
    updateBlockContent(blockId, newContent)
    stopEditing()
  }, [updateBlockContent, stopEditing])

  // Handle publish
  const handlePublish = useCallback(async () => {
    if (!onPublish || isPublishing) return

    setIsPublishing(true)
    setPublishStatus('idle')

    try {
      await onPublish(state.content)
      markSaved()
      setPublishStatus('success')
      setTimeout(() => setPublishStatus('idle'), 2000)
    } catch (error) {
      console.error('[InlineWYSIWYGEditor] Publish failed:', error)
      setPublishStatus('error')
    } finally {
      setIsPublishing(false)
    }
  }, [onPublish, isPublishing, state.content, markSaved])

  // Handle reset
  const handleReset = useCallback(() => {
    if (window.confirm('Discard all changes and reset to original content?')) {
      resetContent()
      setContent(originalContent)
    }
  }, [resetContent, setContent, originalContent])

  // Determine block type from content
  const getBlockType = (blockContent: string): BlockType => {
    if (blockContent.startsWith('#')) return 'heading'
    if (blockContent.startsWith('```')) return 'code'
    if (blockContent.startsWith('>')) return 'blockquote'
    if (blockContent.startsWith('-') || blockContent.startsWith('*') || blockContent.startsWith('+')) return 'list'
    if (/^\d+\./.test(blockContent)) return 'list'
    if (blockContent === '---' || blockContent === '***') return 'hr'
    return 'paragraph'
  }

  return (
    <div className={`inline-wysiwyg-editor relative ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      {/* Floating action bar */}
      {editable && (
        <div className={[
          'sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2 mb-4 rounded-lg border',
          isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-zinc-200',
          'backdrop-blur-sm shadow-sm',
        ].join(' ')}>
          {/* Status */}
          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {state.hasChanges ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Unsaved changes</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span>All changes saved</span>
              </>
            )}
            {state.lastSaved && (
              <span className="text-xs opacity-60">
                Last saved: {state.lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Reset button */}
            <button
              onClick={handleReset}
              disabled={!state.hasChanges}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                state.hasChanges
                  ? isDark
                    ? 'text-zinc-300 hover:bg-zinc-700'
                    : 'text-zinc-600 hover:bg-zinc-100'
                  : 'opacity-50 cursor-not-allowed',
              ].join(' ')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            {/* Publish button */}
            {onPublish && (
              <button
                onClick={handlePublish}
                disabled={isPublishing || !state.hasChanges}
                className={[
                  'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                  publishStatus === 'success'
                    ? 'bg-green-500 text-white'
                    : publishStatus === 'error'
                      ? 'bg-red-500 text-white'
                      : state.hasChanges
                        ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                        : 'bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400',
                ].join(' ')}
              >
                {isPublishing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : publishStatus === 'success' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Published!
                  </>
                ) : publishStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Failed
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Publish
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Draft recovery banner */}
      {hasDraft() && state.content !== originalContent && (
        <div className={[
          'flex items-center justify-between gap-3 px-4 py-2 mb-4 rounded-lg border',
          isDark ? 'bg-amber-900/30 border-amber-700/50' : 'bg-amber-50 border-amber-200',
        ].join(' ')}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
              You have unsaved changes from a previous session
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                clearDraft()
                setContent(originalContent)
              }}
              className={[
                'px-2 py-1 text-xs rounded',
                isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900',
              ].join(' ')}
            >
              Discard
            </button>
            <button
              onClick={() => clearDraft()}
              className="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600"
            >
              Keep Draft
            </button>
          </div>
        </div>
      )}

      {/* Content blocks */}
      <div className="space-y-4">
        {blocks.map((block) => (
          <EditableBlock
            key={block.id}
            blockId={block.id}
            content={block.content}
            type={getBlockType(block.content)}
            isEditing={state.activeBlockId === block.id}
            onStartEdit={handleStartEdit}
            onEndEdit={handleEndEdit}
            editable={editable}
            theme={theme}
          />
        ))}
      </div>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div
          onClick={() => {
            if (editable) {
              setContent('Start writing...')
              handleStartEdit('block-0')
            }
          }}
          className={[
            'py-12 text-center rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            isDark
              ? 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
              : 'border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-500',
          ].join(' ')}
        >
          <p className="text-lg">Click to start writing...</p>
          <p className="text-sm mt-1 opacity-60">Your content will appear here</p>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {editable && state.activeBlockId && (
        <div className={[
          'fixed bottom-4 right-4 px-3 py-2 rounded-lg shadow-lg border text-xs',
          isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500',
        ].join(' ')}>
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">Esc</kbd>
              {' '}to save & exit
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">Cmd</kbd>
              +
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">B</kbd>
              {' '}bold
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">Cmd</kbd>
              +
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">I</kbd>
              {' '}italic
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default InlineWYSIWYGEditor
