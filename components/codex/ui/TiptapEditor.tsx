/**
 * Tiptap WYSIWYG Editor - Enhanced
 * @module codex/ui/TiptapEditor
 * 
 * @remarks
 * Full-featured WYSIWYG editor with:
 * - Bubble menu for text formatting
 * - Slash commands for quick insertion
 * - Syntax highlighted code blocks
 * - Image support with drag & drop
 * - Task lists
 * - Tables
 * - Custom styled to match Frame design system
 */

'use client'

import React, { useEffect, useCallback, useState } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import type { ThemeName } from '@/types/theme'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Link2, Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, Image as ImageIcon, Code2, Undo, Redo,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Plus
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import RadialMediaMenu to avoid SSR issues
const RadialMediaMenu = dynamic(() => import('./RadialMediaMenu'), { ssr: false })

const lowlight = createLowlight(common)

interface TiptapEditorProps {
  /** Initial content (markdown) */
  content: string
  /** Content change callback */
  onChange: (markdown: string) => void
  /** Current theme */
  theme?: ThemeName
  /** Editor ref for external control */
  editorRef?: React.MutableRefObject<Editor | null>
}

interface MenuButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
  isDark: boolean
}

const MenuButton = ({ onClick, isActive, disabled, children, title, isDark }: MenuButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      p-1.5 rounded-md transition-all duration-150
      ${isActive 
        ? isDark 
          ? 'bg-cyan-600/30 text-cyan-400' 
          : 'bg-cyan-100 text-cyan-700'
        : isDark
          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
      }
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {children}
  </button>
)

const MenuDivider = ({ isDark }: { isDark: boolean }) => (
  <div className={`w-px h-4 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
)

/**
 * Rich text editor powered by Tiptap
 * 
 * @remarks
 * - WYSIWYG editing with markdown support
 * - Bubble menu for text formatting
 * - Floating menu for block insertion
 * - Keyboard shortcuts (Cmd+B, Cmd+I, etc.)
 * - Code blocks with syntax highlighting
 * - Task lists, typography, and more
 */
export default function TiptapEditor({
  content,
  onChange,
  theme = 'light',
  editorRef,
}: TiptapEditorProps) {
  const isDark = theme.includes('dark')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  // Radial menu state
  const [radialMenuOpen, setRadialMenuOpen] = useState(false)
  const [radialMenuPosition, setRadialMenuPosition] = useState<{ x: number; y: number } | null>(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Use lowlight version instead
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'typescript',
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading...'
          }
          return 'Start writing... Use / for commands'
        },
        emptyEditorClass: 'editor-empty',
        emptyNodeClass: 'node-empty',
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto shadow-lg my-4',
        },
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-cyan-500 hover:text-cyan-400 underline decoration-cyan-500/30 hover:decoration-cyan-500/60 transition-colors',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose pl-0 list-none',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2 my-1',
        },
      }),
      Typography,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded',
        },
      }),
      Underline,
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none',
          'focus:outline-none p-6 min-h-[400px] h-full',
          // Custom prose styles
          'prose-headings:font-display prose-headings:font-bold',
          'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
          'prose-p:leading-relaxed',
          'prose-a:text-cyan-500 prose-a:no-underline hover:prose-a:underline',
          'prose-code:text-sm prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
          'prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:rounded-xl prose-pre:shadow-lg',
          'prose-blockquote:border-l-cyan-500 prose-blockquote:bg-cyan-50/50 dark:prose-blockquote:bg-cyan-950/20 prose-blockquote:rounded-r-lg prose-blockquote:py-1',
          'prose-img:rounded-xl prose-img:shadow-lg',
          'prose-hr:border-zinc-300 dark:prose-hr:border-zinc-700',
          // Theme variants
          theme === 'sepia-light' ? 'bg-[#FAF8F3] text-[#3E2723] prose-sepia' : '',
          theme === 'sepia-dark' ? 'bg-[#0F0704] text-[#D4A574]' : '',
          theme === 'terminal-light' ? 'bg-[#E8F5E9] text-[#1B5E20] font-mono' : '',
          theme === 'terminal-dark' ? 'bg-[#0D1F0D] text-[#4CAF50] font-mono' : '',
          theme === 'dark' ? 'bg-zinc-900 text-zinc-100' : '',
          theme === 'light' ? 'bg-white text-zinc-900' : '',
        ].filter(Boolean).join(' '),
      },
      handleDrop: (view, event, slice, moved) => {
        // Handle image drops
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (e) => {
              const result = e.target?.result
              if (typeof result === 'string') {
                editor?.chain().focus().setImage({ src: result }).run()
              }
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      },
      handlePaste: (view, event, slice) => {
        // Handle image paste
        const items = event.clipboardData?.items
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile()
              if (file) {
                const reader = new FileReader()
                reader.onload = (e) => {
                  const result = e.target?.result
                  if (typeof result === 'string') {
                    editor?.chain().focus().setImage({ src: result }).run()
                  }
                }
                reader.readAsDataURL(file)
                return true
              }
            }
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      // Convert HTML to Markdown
      const html = editor.getHTML()
      const markdown = htmlToMarkdown(html)
      onChange(markdown)
    },
  })

  // Update editor ref
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor
    }
  }, [editor, editorRef])

  // Update content when prop changes (but don't create infinite loop)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  // Open radial menu at a specific position
  const openRadialMenu = useCallback((x: number, y: number) => {
    setRadialMenuPosition({ x, y })
    setRadialMenuOpen(true)
  }, [])

  // Insert markdown content at cursor
  const handleInsertAtCursor = useCallback((markdown: string) => {
    if (!editor) return

    // For images, use setImage command
    const imageMatch = markdown.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (imageMatch) {
      editor.chain().focus().setImage({ src: imageMatch[2], alt: imageMatch[1] }).run()
      return
    }

    // For audio/other HTML, insert as raw HTML
    if (markdown.includes('<audio') || markdown.includes('<video')) {
      editor.chain().focus().insertContent(markdown).run()
      return
    }

    // For general markdown, insert as text (Tiptap will handle basic markdown)
    editor.chain().focus().insertContent(markdown).run()
  }, [editor])

  if (!editor) {
    return (
      <div className={`p-6 flex items-center justify-center h-full ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading editor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-1 flex flex-col overflow-hidden relative ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
      {/* Fixed Formatting Toolbar */}
      <div className={`
        flex items-center gap-0.5 px-3 py-2 border-b flex-wrap
        ${isDark ? 'bg-zinc-800/80 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
      `}>
        {/* Undo/Redo */}
        <MenuButton 
          onClick={() => editor.chain().focus().undo().run()} 
          disabled={!editor.can().undo()}
          title="Undo (Cmd+Z)"
          isDark={isDark}
        >
          <Undo className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().redo().run()} 
          disabled={!editor.can().redo()}
          title="Redo (Cmd+Shift+Z)"
          isDark={isDark}
        >
          <Redo className="w-4 h-4" />
        </MenuButton>
        
        <MenuDivider isDark={isDark} />
        
        {/* Headings */}
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1 (Cmd+Alt+1)"
          isDark={isDark}
        >
          <Heading1 className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2 (Cmd+Alt+2)"
          isDark={isDark}
        >
          <Heading2 className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3 (Cmd+Alt+3)"
          isDark={isDark}
        >
          <Heading3 className="w-4 h-4" />
        </MenuButton>
        
        <MenuDivider isDark={isDark} />
        
        {/* Text Formatting */}
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Cmd+B)"
          isDark={isDark}
        >
          <Bold className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Cmd+I)"
          isDark={isDark}
        >
          <Italic className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Cmd+U)"
          isDark={isDark}
        >
          <UnderlineIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
          isDark={isDark}
        >
          <Strikethrough className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code (Cmd+E)"
          isDark={isDark}
        >
          <Code className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
          isDark={isDark}
        >
          <Highlighter className="w-4 h-4" />
        </MenuButton>
        
        <MenuDivider isDark={isDark} />
        
        {/* Sub/Superscript */}
        <MenuButton 
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          isActive={editor.isActive('subscript')}
          title="Subscript"
          isDark={isDark}
        >
          <SubscriptIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          isActive={editor.isActive('superscript')}
          title="Superscript"
          isDark={isDark}
        >
          <SuperscriptIcon className="w-4 h-4" />
        </MenuButton>
        
        <MenuDivider isDark={isDark} />
        
        {/* Lists */}
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
          isDark={isDark}
        >
          <List className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
          isDark={isDark}
        >
          <ListOrdered className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Task List"
          isDark={isDark}
        >
          <CheckSquare className="w-4 h-4" />
        </MenuButton>
        
        <MenuDivider isDark={isDark} />
        
        {/* Blocks */}
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
          isDark={isDark}
        >
          <Quote className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
          isDark={isDark}
        >
          <Code2 className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
          isDark={isDark}
        >
          <Minus className="w-4 h-4" />
        </MenuButton>
        
        <MenuDivider isDark={isDark} />
        
        {/* Alignment */}
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
          isDark={isDark}
        >
          <AlignLeft className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
          isDark={isDark}
        >
          <AlignCenter className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
          isDark={isDark}
        >
          <AlignRight className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
          isDark={isDark}
        >
          <AlignJustify className="w-4 h-4" />
        </MenuButton>
        
        <MenuDivider isDark={isDark} />
        
        {/* Insert */}
        <MenuButton 
          onClick={() => setShowLinkInput(!showLinkInput)}
          isActive={editor.isActive('link')}
          title="Insert Link (Cmd+K)"
          isDark={isDark}
        >
          <Link2 className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={addImage}
          title="Insert Image"
          isDark={isDark}
        >
          <ImageIcon className="w-4 h-4" />
        </MenuButton>
      </div>

      {/* Link Input */}
      {showLinkInput && (
        <div className={`
          flex items-center gap-2 px-3 py-2 border-b
          ${isDark ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}
        `}>
          <Link2 className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setLink()}
            placeholder="Enter URL..."
            className={`
              flex-1 px-2 py-1 text-sm rounded border bg-transparent
              ${isDark 
                ? 'border-zinc-600 text-zinc-200 placeholder-zinc-500 focus:border-cyan-500' 
                : 'border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500'}
              focus:outline-none focus:ring-1 focus:ring-cyan-500/30
            `}
            autoFocus
          />
          <button
            onClick={setLink}
            className={`
              px-3 py-1 text-xs font-medium rounded
              ${isDark 
                ? 'bg-cyan-600 text-white hover:bg-cyan-500' 
                : 'bg-cyan-500 text-white hover:bg-cyan-600'}
            `}
          >
            Apply
          </button>
          <button
            onClick={() => { setShowLinkInput(false); setLinkUrl('') }}
            className={`
              px-2 py-1 text-xs font-medium rounded
              ${isDark 
                ? 'text-zinc-400 hover:text-zinc-200' 
                : 'text-zinc-500 hover:text-zinc-700'}
            `}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto relative group/editor">
        {/* Floating Add Button - appears on hover in left margin */}
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            openRadialMenu(rect.left + rect.width / 2, rect.top + rect.height / 2)
          }}
          className={`
            absolute left-2 top-8 z-10
            w-8 h-8 rounded-full
            flex items-center justify-center
            opacity-0 group-hover/editor:opacity-100
            transition-all duration-200
            shadow-lg hover:shadow-xl hover:scale-110
            ${isDark
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white border border-zinc-600'
              : 'bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700 border border-zinc-200'
            }
          `}
          title="Add media block (Image, Voice, Camera, Canvas)"
        >
          <Plus className="w-4 h-4" />
        </button>
        <EditorContent editor={editor} className="h-full [&>.ProseMirror]:min-h-full" />
      </div>

      {/* Radial Media Menu */}
      <RadialMediaMenu
        isOpen={radialMenuOpen}
        onClose={() => setRadialMenuOpen(false)}
        anchorPosition={radialMenuPosition}
        anchorMode="cursor"
        onInsertAtCursor={handleInsertAtCursor}
        theme={theme}
      />
      
      {/* Editor Styles */}
      <style jsx global>{`
        /* Placeholder styling */
        .ProseMirror .editor-empty:first-child::before,
        .ProseMirror .node-empty::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          color: ${isDark ? 'rgb(113, 113, 122)' : 'rgb(161, 161, 170)'};
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          color: ${isDark ? 'rgb(113, 113, 122)' : 'rgb(161, 161, 170)'};
        }
        
        /* Task list checkbox styling */
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
          margin-top: 0.25rem;
          cursor: pointer;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: rgb(6, 182, 212);
          cursor: pointer;
        }
        
        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1 1 auto;
        }
        
        /* Code block styling */
        .ProseMirror pre {
          background: ${isDark ? 'rgb(24, 24, 27)' : 'rgb(24, 24, 27)'};
          border-radius: 0.75rem;
          padding: 1rem;
          overflow-x: auto;
        }
        
        .ProseMirror pre code {
          background: transparent;
          padding: 0;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
          font-size: 0.875rem;
          line-height: 1.6;
        }
        
        /* Selection styling */
        .ProseMirror ::selection {
          background: ${isDark ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.2)'};
        }
        
        /* Image styling */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1rem 0;
        }
        
        .ProseMirror img.ProseMirror-selectednode {
          outline: 3px solid rgb(6, 182, 212);
          outline-offset: 2px;
        }
        
        /* Horizontal rule styling */
        .ProseMirror hr {
          border: none;
          border-top: 2px solid ${isDark ? 'rgb(63, 63, 70)' : 'rgb(228, 228, 231)'};
          margin: 2rem 0;
        }
        
        /* Link styling in editor */
        .ProseMirror a {
          color: rgb(6, 182, 212);
          text-decoration: underline;
          text-underline-offset: 2px;
          cursor: pointer;
        }
        
        .ProseMirror a:hover {
          color: rgb(34, 211, 238);
        }
        
        /* Focus styling */
        .ProseMirror:focus {
          outline: none;
        }
        
        /* Blockquote styling */
        .ProseMirror blockquote {
          border-left: 4px solid rgb(6, 182, 212);
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
          background: ${isDark ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0.05)'};
          border-radius: 0 0.5rem 0.5rem 0;
          padding: 0.5rem 1rem;
        }
      `}</style>
    </div>
  )
}

/**
 * Enhanced HTML to Markdown converter
 */
function htmlToMarkdown(html: string): string {
  let markdown = html
  
  // Remove wrapper tags
  markdown = markdown.replace(/<\/?p>/g, '\n')
  markdown = markdown.replace(/<br\s*\/?>/g, '\n')
  
  // Headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
  
  // Text formatting
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
  markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**')
  markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*')
  markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*')
  markdown = markdown.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
  markdown = markdown.replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
  markdown = markdown.replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~')
  markdown = markdown.replace(/<del>(.*?)<\/del>/gi, '~~$1~~')
  markdown = markdown.replace(/<code>(.*?)<\/code>/gi, '`$1`')
  markdown = markdown.replace(/<mark>(.*?)<\/mark>/gi, '==$1==')
  markdown = markdown.replace(/<sub>(.*?)<\/sub>/gi, '~$1~')
  markdown = markdown.replace(/<sup>(.*?)<\/sup>/gi, '^$1^')
  
  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
  
  // Images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
  
  // Lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_match: string, content: string) => {
    return content.replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n')
  })
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_match: string, content: string) => {
    let index = 1
    return content.replace(/<li[^>]*>(.*?)<\/li>/gis, () => `${index++}. $1\n`)
  })
  
  // Task lists
  markdown = markdown.replace(/<ul[^>]*data-type="taskList"[^>]*>(.*?)<\/ul>/gis, (_match: string, content: string) => {
    return content.replace(/<li[^>]*><label><input[^>]*type="checkbox"([^>]*)><\/label><div>(.*?)<\/div><\/li>/gis, 
      (_m: string, attrs: string, text: string) => {
        const checked = attrs.includes('checked') ? 'x' : ' '
        return `- [${checked}] ${text}\n`
      })
  })
  
  // Blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_match: string, content: string) => {
    return content.split('\n').map((line: string) => `> ${line.trim()}`).join('\n') + '\n'
  })
  
  // Code blocks
  markdown = markdown.replace(/<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>(.*?)<\/code><\/pre>/gis, '```$1\n$2\n```')
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```')
  
  // Horizontal rules
  markdown = markdown.replace(/<hr[^>]*>/gi, '\n---\n')
  
  // Clean up
  markdown = markdown.replace(/&nbsp;/g, ' ')
  markdown = markdown.replace(/&lt;/g, '<')
  markdown = markdown.replace(/&gt;/g, '>')
  markdown = markdown.replace(/&amp;/g, '&')
  markdown = markdown.replace(/&quot;/g, '"')
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  markdown = markdown.trim()
  
  return markdown
}
