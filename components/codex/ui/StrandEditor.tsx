/**
 * Strand Editor - Art Deco WYSIWYG markdown editor
 * @module codex/ui/StrandEditor
 * 
 * @remarks
 * The Hitchhiker's Guide to the Galaxy meets Art Deco notebook.
 * Features live preview, auto-save, and media insertion tools.
 */

'use client'

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Save, Eye, EyeOff, Type, Bold, Italic, Code, Link2,
  List, ListOrdered, Quote, Minus, Image, Mic, Camera,
  Brush, FileText, Hash, AtSign, ChevronLeft, Check,
  Sparkles, Moon, Sun, BookOpen, Edit3, Send, Info
} from 'lucide-react'
import Tooltip from './Tooltip'
import { useJobQueue } from '../hooks/useJobQueue'
import { getStoredVaultHandle } from '@/lib/vault/vaultConfig'
import type { GitHubFile, StrandMetadata } from '../types'
import type { ThemeName } from '@/types/theme'
import { stripFrontmatter } from '../utils'
import { checkDraftStatus, deleteDraft, saveDraft } from '@/lib/localStorage'
import dynamic from 'next/dynamic'
import type { RepoInfo, MediaAsset } from '@/lib/github/gitSync'
import type { Editor } from '@tiptap/react'
import { useCursorPosition } from '../hooks/useCursorPosition'
import { useMediaStorage } from '../hooks/useMediaStorage'
import type { MediaAsset as RadialMediaAsset } from './RadialMediaMenu'

// Dynamic imports for heavy editor components to avoid TDZ issues in production builds
// These components have complex initialization that can cause "Cannot access X before initialization" errors
const TiptapEditor = dynamic(() => import('./TiptapEditor'), { 
  ssr: false,
  loading: () => <div className="p-6 text-gray-500 animate-pulse">Loading editor...</div>
})
const RadialMediaMenu = dynamic(() => import('./RadialMediaMenu'), { ssr: false })
const PublishModal = dynamic(() => import('./PublishModal'), { ssr: false })
const CameraCapture = dynamic(() => import('./CameraCapture'), { ssr: false })
const VoiceRecorder = dynamic(() => import('./VoiceRecorder'), { ssr: false })

// Markdown preview - dynamically import to avoid SSR issues with syntax highlighter
const EditorMarkdownPreview = dynamic(() => import('./EditorMarkdownPreview'), { 
  ssr: false,
  loading: () => <div className="p-6 text-gray-500 animate-pulse">Loading preview...</div>
})

interface StrandEditorProps {
  /** File being edited */
  file: GitHubFile
  /** Initial content */
  content: string
  /** Initial metadata */
  metadata: StrandMetadata
  /** Whether editor is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Save callback */
  onSave: (content: string, metadata: StrandMetadata) => Promise<void>
  /** Current theme */
  theme?: ThemeName
  /** Repository info for publishing */
  repo?: RepoInfo
}

interface EditorTab {
  id: 'edit' | 'preview' | 'split'
  label: string
  icon: React.ElementType
}

const EDITOR_TABS: EditorTab[] = [
  { id: 'edit', label: 'Write', icon: Edit3 },
  { id: 'split', label: 'Split', icon: BookOpen },
  { id: 'preview', label: 'Preview', icon: Eye },
]

/**
 * Art Deco-styled WYSIWYG markdown editor
 * 
 * @remarks
 * - Auto-saves to localStorage every 5 seconds
 * - Split-pane view with live preview
 * - Typewriter sounds on keystroke
 * - Radial media insertion menu
 * - Art Deco geometric patterns
 */
export default function StrandEditor({
  file,
  content: initialContent,
  metadata: initialMetadata,
  isOpen,
  onClose,
  onSave,
  theme = 'light',
  repo,
}: StrandEditorProps) {
  // State declarations first to avoid TDZ issues
  const [activeTab, setActiveTab] = useState<EditorTab['id']>('split')
  const [content, setContent] = useState(initialContent)
  const [metadata, setMetadata] = useState<StrandMetadata>(initialMetadata)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [showCameraCapture, setShowCameraCapture] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [hasVault, setHasVault] = useState(false)

  // Job queue for local publishing
  const { enqueuePublish } = useJobQueue()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const lastSaveRef = useRef(content)

  // Cursor position tracking for radial menu placement
  const { position: cursorPosition, lastValidPosition } = useCursorPosition({
    editorRef,
    textareaRef,
  })

  // Media storage with IndexedDB and sync
  const {
    storeAsset,
    syncStatus: mediaSyncStatus,
    pendingCount: mediaPendingCount,
  } = useMediaStorage({
    strandPath: file.path,
    autoSync: true,
  })

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check if vault is configured
  useEffect(() => {
    getStoredVaultHandle().then(handle => setHasVault(!!handle))
  }, [])

  // Calculate stats
  useEffect(() => {
    const strippedContent = stripFrontmatter(content)
    setWordCount(strippedContent.split(/\s+/).filter(w => w.length > 0).length)
    setCharCount(strippedContent.length)
  }, [content])

  // Auto-save to draft storage
  useEffect(() => {
    if (!isOpen) return
    
    const saveInterval = setInterval(() => {
      if (content !== lastSaveRef.current) {
        try {
          if (content === initialContent) {
            deleteDraft(file.path)
          } else {
            saveDraft(file.path, content, initialContent)
          }
        } catch (error) {
          console.error('Failed to save draft:', error)
        }
        lastSaveRef.current = content
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    }, 5000)

    return () => clearInterval(saveInterval)
  }, [content, file.path, initialContent, isOpen])

  // Load draft when opened
  useEffect(() => {
    if (!isOpen) return
    
    const { hasDraft, hasChanges, draft } = checkDraftStatus(file.path, initialContent)
    if (hasDraft && hasChanges && draft) {
      setContent(draft.content)
      return
    }

    // Legacy migration: older editor stored drafts under a per-file key.
    try {
      const legacyKey = `codex-draft-${file.path}`
      const legacyDraft = localStorage.getItem(legacyKey)
      if (legacyDraft && legacyDraft !== initialContent) {
        saveDraft(file.path, legacyDraft, initialContent)
        localStorage.removeItem(legacyKey)
        setContent(legacyDraft)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [file.path, initialContent, isOpen])

  /**
   * Insert text at cursor position (works with both Tiptap and textarea fallback)
   */
  const insertText = useCallback((text: string) => {
    // Try Tiptap first
    if (editorRef.current) {
      editorRef.current.commands.insertContent(text)
      return
    }
    
    // Fallback to textarea
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = content.substring(0, start)
    const after = content.substring(end)
    
    setContent(before + text + after)
    
    // Restore cursor position after React re-render
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }, [content])

  /**
   * Wrap selection with markdown syntax (works with both Tiptap and textarea fallback)
   */
  const wrapSelection = useCallback((prefix: string, suffix: string = prefix) => {
    // Try Tiptap first
    if (editorRef.current) {
      const editor = editorRef.current
      
      // Map common markdown to Tiptap commands
      if (prefix === '**') {
        editor.chain().focus().toggleBold().run()
        return
      }
      if (prefix === '*') {
        editor.chain().focus().toggleItalic().run()
        return
      }
      if (prefix === '`') {
        editor.chain().focus().toggleCode().run()
        return
      }
      
      // Fallback: insert as text
      editor.commands.insertContent(prefix + suffix)
      return
    }
    
    // Fallback to textarea
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const before = content.substring(0, start)
    const after = content.substring(end)
    
    setContent(before + prefix + selectedText + suffix + after)
    
    // Select the wrapped text
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
    }, 0)
  }, [content])

  /**
   * Handle save
   */
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      await onSave(content, metadata)
      localStorage.removeItem(`codex-draft-${file.path}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle publish - writes to vault + runs NLP pipeline
   */
  const handlePublish = async () => {
    if (hasVault) {
      // Local vault mode - enqueue publish job
      setPublishing(true)
      try {
        const jobId = await enqueuePublish(file.path, content, metadata as Record<string, unknown>, {
          runNLP: true,
          updateEmbeddings: true,
        })
        if (jobId) {
          // Job queued successfully - also save locally
          await onSave(content, metadata)
          localStorage.removeItem(`codex-draft-${file.path}`)
        }
      } catch (error) {
        console.error('Failed to publish:', error)
      } finally {
        setPublishing(false)
      }
    } else {
      // No vault - fallback to GitHub PR modal
      setShowPublishModal(true)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Editor Container */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 20 }}
          className={`
            relative w-full h-full
            ${theme === 'sepia-light' ? 'bg-[#F4F1EA]' : ''}
            ${theme === 'sepia-dark' ? 'bg-[#1A0E0A]' : ''}
            ${theme === 'dark' ? 'bg-gray-950' : ''}
            ${theme === 'light' ? 'bg-white' : ''}
            flex flex-col
          `}
        >
          {/* Art Deco Header */}
          <header className={`
            relative px-6 py-4 flex items-center justify-between
            border-b-2 ${theme.includes('dark') ? 'border-amber-800' : 'border-amber-400'}
            bg-gradient-to-r
            ${theme === 'sepia-light' ? 'from-amber-50 to-amber-100' : ''}
            ${theme === 'sepia-dark' ? 'from-amber-950 to-amber-900' : ''}
            ${theme === 'dark' ? 'from-gray-900 to-gray-800' : ''}
            ${theme === 'light' ? 'from-gray-50 to-gray-100' : ''}
          `}>
            {/* Geometric Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <svg className="w-full h-full" viewBox="0 0 200 50" preserveAspectRatio="none">
                <pattern id="deco" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect x="10" y="10" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1" />
                  <circle cx="25" cy="25" r="5" fill="currentColor" />
                </pattern>
                <rect x="0" y="0" width="100%" height="100%" fill="url(#deco)" />
              </svg>
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 z-10">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5 }}
                className={`
                  p-2.5 rounded-xl shadow-inner
                  ${theme.includes('dark') ? 'bg-amber-900/50' : 'bg-amber-100'}
                `}
              >
                <FileText className="w-5 h-5 text-amber-700 dark:text-amber-300" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold tracking-wide">
                  {file.name}
                </h2>
                <div className="flex items-center gap-4 text-xs opacity-70">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{charCount} characters</span>
                  {saved && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Auto-saved
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 z-10">
              <Tooltip
                content="Save Draft"
                description="Saves locally in your browser. Drafts are temporary until you Publish. Tags and intelligence don't activate until you publish."
                placement="bottom"
              >
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-all
                    flex items-center gap-2
                    ${theme.includes('dark')
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }
                    disabled:opacity-50
                  `}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Draft
                    </>
                  )}
                </button>
              </Tooltip>
              <Tooltip
                content={hasVault ? "Publish to Vault" : "Publish to GitHub"}
                description={hasVault
                  ? "Writes to your vault folder and runs NLP analysis to generate tags, connections, and semantic search."
                  : "Creates a GitHub Pull Request with your changes."
                }
                placement="bottom"
              >
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className={`
                    px-4 py-2 rounded-lg font-bold transition-all
                    flex items-center gap-2 shadow-lg
                    ${theme.includes('dark')
                      ? 'bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-amber-100'
                      : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white'
                    }
                    disabled:opacity-50
                  `}
                >
                  {publishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Publish
                    </>
                  )}
                </button>
              </Tooltip>
              <button
                onClick={onClose}
                className={`
                  p-2 rounded-lg transition-colors
                  ${theme.includes('dark') 
                    ? 'hover:bg-gray-800' 
                    : 'hover:bg-gray-200'
                  }
                `}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Tab Bar */}
          <div className={`
            px-6 py-2 flex items-center gap-2
            border-b ${theme.includes('dark') ? 'border-gray-800' : 'border-gray-200'}
          `}>
            {EDITOR_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  flex items-center gap-2
                  ${activeTab === tab.id
                    ? theme.includes('dark')
                      ? 'bg-amber-900/30 text-amber-300 border border-amber-700'
                      : 'bg-amber-100 text-amber-700 border border-amber-300'
                    : theme.includes('dark')
                      ? 'hover:bg-gray-800 text-gray-400'
                      : 'hover:bg-gray-100 text-gray-600'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            
            <div className="flex-1" />
            
            {/* Media Menu Trigger */}
            <button
              onClick={() => setShowMediaMenu(true)}
              className={`
                p-2.5 rounded-full transition-all
                ${theme.includes('dark')
                  ? 'bg-gradient-to-br from-purple-900 to-pink-900 hover:from-purple-800 hover:to-pink-800'
                  : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                }
                text-white shadow-lg
              `}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar - Sticky on mobile */}
          {(activeTab === 'edit' || activeTab === 'split') && (
            <div className={`
              px-6 py-2 flex items-center gap-1 flex-wrap
              border-b ${theme.includes('dark') ? 'border-gray-800' : 'border-gray-200'}
              max-md:sticky max-md:bottom-0 max-md:bg-white max-md:dark:bg-gray-900 max-md:z-10 max-md:shadow-lg
            `}>
              <button
                onClick={() => wrapSelection('**')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Bold (Ctrl+B)"
                aria-label="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => wrapSelection('*')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Italic (Ctrl+I)"
                aria-label="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => wrapSelection('`')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Code"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                onClick={() => wrapSelection('[', '](url)')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Link"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <div className={`w-px h-6 ${theme.includes('dark') ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <button
                onClick={() => insertText('\n- ')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertText('\n1. ')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertText('\n> ')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertText('\n---\n')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Horizontal Rule"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className={`w-px h-6 ${theme.includes('dark') ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <button
                onClick={() => insertText('## ')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Heading 2"
              >
                <Hash className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertText('@')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Mention"
              >
                <AtSign className="w-4 h-4" />
              </button>
              <div className={`w-px h-6 ${theme.includes('dark') ? 'bg-gray-700' : 'bg-gray-300'}`} />
              
              {/* Media Capture Buttons */}
              <button
                onClick={() => setShowCameraCapture(true)}
                className={`
                  p-2 rounded transition-colors
                  ${theme.includes('dark') 
                    ? 'hover:bg-blue-900/30 text-blue-400' 
                    : 'hover:bg-blue-100 text-blue-600'
                  }
                `}
                title="Take Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowVoiceRecorder(true)}
                className={`
                  p-2 rounded transition-colors
                  ${theme.includes('dark') 
                    ? 'hover:bg-red-900/30 text-red-400' 
                    : 'hover:bg-red-100 text-red-600'
                  }
                `}
                title="Record Audio"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Editor Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Edit Panel */}
            {(activeTab === 'edit' || activeTab === 'split') && (
              <div className={`
                ${activeTab === 'split' ? 'w-1/2' : 'w-full'}
                h-full flex flex-col
                ${activeTab === 'split' ? 'border-r' : ''}
                ${theme.includes('dark') ? 'border-gray-800' : 'border-gray-300'}
              `}>
                <TiptapEditor
                  content={content}
                  onChange={setContent}
                  theme={theme}
                  editorRef={editorRef}
                />
              </div>
            )}

            {/* Preview Panel */}
            {(activeTab === 'preview' || activeTab === 'split') && (
              <div className={`
                ${activeTab === 'split' ? 'w-1/2' : 'w-full'}
                h-full overflow-y-auto
                ${theme === 'sepia-light' ? 'bg-[#FFFEF9]' : ''}
                ${theme === 'sepia-dark' ? 'bg-[#0A0503]' : ''}
                ${theme === 'dark' ? 'bg-gray-950' : ''}
                ${theme === 'light' ? 'bg-gray-50' : ''}
              `}>
                <article className="p-6 prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                  <EditorMarkdownPreview content={stripFrontmatter(content)} />
                </article>
              </div>
            )}
          </div>

          {/* Radial Media Menu - Inline positioned at cursor */}
          <RadialMediaMenu
            isOpen={showMediaMenu}
            onClose={() => setShowMediaMenu(false)}
            anchorPosition={lastValidPosition || cursorPosition}
            anchorMode={cursorPosition ? 'cursor' : 'center'}
            onInsertAtCursor={insertText}
            onInsertImage={(url) => insertText(`![Image](${url})`)}
            onInsertAudio={(url) => insertText(`<audio controls src="${url}"></audio>`)}
            onInsertDrawing={(url) => insertText(`![Drawing](${url})`)}
            onInsertCode={(lang) => insertText(`\`\`\`${lang}\n\n\`\`\``)}
            onMediaCaptured={async (asset: RadialMediaAsset) => {
              // Store in IndexedDB for offline support
              try {
                await storeAsset({
                  type: asset.type as 'photo' | 'audio' | 'drawing' | 'upload',
                  blob: asset.blob,
                  filename: asset.filename,
                  path: asset.path,
                })
              } catch (err) {
                console.error('[StrandEditor] Failed to store media:', err)
              }
              // Also track in local state for immediate upload
              setMediaAssets(prev => [...prev, asset as MediaAsset])
            }}
            strandPath={file.path}
            theme={theme}
            isMobile={isMobile}
          />

          {/* Publish Modal */}
          <PublishModal
            isOpen={showPublishModal}
            onClose={() => setShowPublishModal(false)}
            filePath={file.path}
            content={content}
            metadata={metadata}
            repo={repo || {
              owner: 'framersai',
              repo: 'codex',
              defaultBranch: 'master',
            }}
            assets={mediaAssets}
            theme={theme}
          />

          {/* Camera Capture Modal */}
          <CameraCapture
            isOpen={showCameraCapture}
            onClose={() => setShowCameraCapture(false)}
            onCaptureComplete={(blob) => {
              // Generate filename based on timestamp
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
              const filename = `photo-${timestamp}.jpg`
              const path = `assets/photos/${filename}`
              
              // Insert markdown image
              insertText(`![Photo](${path})`)
              
              // Track blob for upload
              setMediaAssets(prev => [...prev, {
                type: 'photo',
                blob,
                filename,
                path,
              }])
              
              setShowCameraCapture(false)
            }}
            theme={theme}
          />

          {/* Voice Recorder Modal */}
          <VoiceRecorder
            isOpen={showVoiceRecorder}
            onClose={() => setShowVoiceRecorder(false)}
            onRecordingComplete={(blob) => {
              // Generate filename based on timestamp
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
              const filename = `voice-${timestamp}.webm`
              const path = `assets/audio/${filename}`
              
              // Insert HTML audio player
              insertText(`<audio controls src="${path}"></audio>`)
              
              // Track blob for upload
              setMediaAssets(prev => [...prev, {
                type: 'audio',
                blob,
                filename,
                path,
              }])
              
              setShowVoiceRecorder(false)
            }}
            theme={theme}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
