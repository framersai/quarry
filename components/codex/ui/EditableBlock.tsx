/**
 * EditableBlock - Click-to-edit block wrapper
 * @module codex/ui/EditableBlock
 *
 * Wraps individual content blocks (paragraph, heading, list, etc.)
 * - View mode: Renders as normal HTML
 * - Edit mode: Replaces with inline Tiptap editor on click
 */

'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { InlineFloatingToolbar } from './InlineFloatingToolbar'
import { markdownToHtml, htmlToMarkdown } from '../utils/markdownConversion'

const lowlight = createLowlight(common)

export type BlockType = 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'hr'

export interface EditableBlockProps {
  /** Unique block identifier */
  blockId: string
  /** Markdown content for this block */
  content: string
  /** Block type for appropriate rendering */
  type: BlockType
  /** Whether this block is currently being edited */
  isEditing: boolean
  /** Called when user clicks to start editing */
  onStartEdit: (blockId: string) => void
  /** Called when editing ends with new content */
  onEndEdit: (blockId: string, newContent: string) => void
  /** Whether editing is enabled */
  editable: boolean
  /** Theme name */
  theme: string
}

/**
 * Editable block with click-to-edit functionality
 */
export function EditableBlock({
  blockId,
  content,
  type,
  isEditing,
  onStartEdit,
  onEndEdit,
  editable,
  theme,
}: EditableBlockProps) {
  const isDark = theme.includes('dark')
  const blockRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef(content)

  // Keep content ref updated
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Initialize Tiptap editor for edit mode
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'typescript',
      }),
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      Highlight.configure({
        multicolor: true,
      }),
      // Note: Link and Underline removed to avoid duplicate extension warnings
      // Use the full TiptapEditor for comprehensive editing features
    ],
    content: isEditing ? markdownToHtml(content) : '',
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none',
          'focus:outline-none min-h-[1.5em] p-2 rounded-md',
          isDark ? 'bg-zinc-800/50' : 'bg-zinc-50',
        ].join(' '),
      },
    },
    onUpdate: ({ editor }) => {
      contentRef.current = htmlToMarkdown(editor.getHTML())
    },
    editable: isEditing,
  }, [isEditing])

  // Set content when entering edit mode
  useEffect(() => {
    if (isEditing && editor) {
      const html = markdownToHtml(content)
      editor.commands.setContent(html)
      // Delay focus to ensure editor view is mounted
      requestAnimationFrame(() => {
        if (editor.view) {
          editor.commands.focus('end')
        }
      })
    }
  }, [isEditing, editor, content])

  // Handle click outside to end editing
  useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (e: MouseEvent) => {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
        onEndEdit(blockId, contentRef.current)
      }
    }

    // Delay to avoid immediate trigger
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing, blockId, onEndEdit])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isEditing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to save and exit
      if (e.key === 'Escape') {
        e.preventDefault()
        onEndEdit(blockId, contentRef.current)
      }
      // Cmd+Enter to save and exit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        onEndEdit(blockId, contentRef.current)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, blockId, onEndEdit])

  // Handle block click to start editing
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!editable || isEditing) return
    e.preventDefault()
    e.stopPropagation()
    onStartEdit(blockId)
  }, [editable, isEditing, onStartEdit, blockId])

  // Render view mode (normal HTML)
  if (!isEditing) {
    const viewClassName = [
      'group relative transition-all duration-150',
      editable ? 'cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 rounded-md -mx-2 px-2' : '',
    ].filter(Boolean).join(' ')

    const hintClassName = [
      'text-xs px-2 py-0.5 rounded-full',
      isDark ? 'bg-zinc-700/80 text-zinc-300' : 'bg-zinc-200/80 text-zinc-600',
    ].join(' ')

    return (
      <div
        ref={blockRef}
        data-block-id={blockId}
        onClick={handleClick}
        onMouseDown={(e) => {
          // Prevent text selection when clicking to edit
          if (editable && !isEditing) {
            e.preventDefault()
          }
        }}
        className={viewClassName}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
      >
        {/* Clickable overlay when editable - captures clicks before text selection */}
        {editable && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              if (!isEditing) {
                onStartEdit(blockId)
              }
            }}
          />
        )}
        {/* Edit hint overlay */}
        {editable && (
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className={hintClassName}>
              Click to edit
            </span>
          </div>
        )}
        {/* Render content as HTML */}
        <div
          className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
        />
      </div>
    )
  }

  // Render edit mode (Tiptap editor)
  const editClassName = [
    'relative ring-2 rounded-md -mx-2 px-2',
    isDark ? 'ring-cyan-500/50' : 'ring-cyan-400/50',
  ].join(' ')

  const saveHintClassName = [
    'absolute -bottom-6 left-0 text-xs',
    isDark ? 'text-zinc-500' : 'text-zinc-400',
  ].join(' ')

  return (
    <div
      ref={blockRef}
      data-block-id={blockId}
      className={editClassName}
    >
      {/* Floating toolbar */}
      {editor && <InlineFloatingToolbar editor={editor} isDark={isDark} />}

      {/* Editor */}
      <EditorContent editor={editor} className="[&>.ProseMirror]:outline-none" />

      {/* Save hint */}
      <div className={saveHintClassName}>
        Press <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">Esc</kbd> or click outside to save
      </div>
    </div>
  )
}

export default EditableBlock
