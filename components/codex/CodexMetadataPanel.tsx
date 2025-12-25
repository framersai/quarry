/**
 * Metadata and relations panel for Quarry Codex viewer
 * Displays frontmatter metadata, backlinks, and graph controls
 * @module codex/CodexMetadataPanel
 */

'use client'

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Hash, Link2, Clock, Search, Filter, FileText, Tags, BookOpen, User, GitCommit, Calendar, Copy, Check, Plus, Minus, Pencil, Trash2, Save, XCircle, NotebookPen, Sparkles, KeyRound, Eye, EyeOff, Download, Share2, FileJson, FileCode, ChevronDown, Network, Scroll, Bookmark, Star, BarChart3, Route, Code, Image, List, Quote, Table2, FileSignature, ExternalLink, ListTodo } from 'lucide-react'
import ExpandableSection from './ui/ExpandableSection'
import CopyButton, { CopyIcons } from './ui/CopyButton'
import PaperLabel from './ui/PaperLabel'
import MiniGraph from './ui/MiniGraph'
import CompactRelationGraph from './ui/CompactRelationGraph'
import { getStrandNotesText, saveStrandNotes, getPersonalTags, savePersonalTags, getBookmarks, addBookmark, removeBookmark, isBookmarked, type Bookmark as BookmarkType, DEFAULT_TTS_PREFERENCES } from '@/lib/localStorage'
import type { StrandMetadata, GitHubFile } from './types'
import type { SaveResult } from '@/lib/content/saveStrandMetadata'
// Use isolated loader to prevent framer-motion contamination (fixes React #311)
import ReaderModePanel from './ui/ReaderModePanelLoader'
import ReaderModeErrorBoundary from './ui/ReaderModeErrorBoundary'
import MetadataEditor from './ui/MetadataEditor'
import LearningPathPopup from './ui/LearningPathPopup'
import StrandRatingDisplay from './ui/StrandRatingDisplay'
import BacklinkList from '../backlink-list'
import { useSwipeGesture } from './hooks/useSwipeGesture'
import { usePreferences } from './hooks/usePreferences'
import { REPO_CONFIG } from './constants'
import ReaderSettingsPanel from './ui/ReaderSettingsPanel'
import StrandTasksPanel from './ui/StrandTasksPanel'
import { Settings } from 'lucide-react'

type PanelTab = 'metadata' | 'paper' | 'reader' | 'edit' | 'tasks'

interface CodexMetadataPanelProps {
  /** Whether panel is open */
  isOpen: boolean
  /** Close panel callback */
  onClose: () => void
  /** Current file metadata */
  metadata: StrandMetadata
  /** Current file */
  currentFile: GitHubFile | null
  /** All files (for backlink detection) */
  allFiles: GitHubFile[]
  /** Pre-computed extractive summary + last indexed date from Codex index */
  summaryInfo?: {
    summary?: string
    lastIndexed?: string
  }
  /** Raw markdown content for the current file (for TOC & search) */
  content?: string
  /** Preferred width */
  panelSize?: 's' | 'm' | 'l'
  /** Size change handler */
  onPanelSizeChange?: (size: 's' | 'm' | 'l') => void
  /** Current file path for navigation context */
  currentPath?: string
  /** Navigate to a different strand */
  onNavigate?: (path: string) => void
  /** Whether to auto-expand backlinks section when backlinks are detected */
  autoExpandBacklinks?: boolean
  /** Reference to the content scroll container for Reader Mode sync */
  contentRef?: React.RefObject<HTMLElement>
  /** Current theme */
  theme?: string
  /** Callback to save metadata changes (for edit tab) */
  onMetadataSave?: (metadata: StrandMetadata) => Promise<void>
  /** Active heading slug from scroll position (for reader mode sync) */
  activeHeadingSlug?: string
  /** Result of the last save operation */
  saveResult?: SaveResult | null
  /** Whether metadata save is in progress */
  isSavingMetadata?: boolean
}

interface GitMetadata {
  author?: string
  authorEmail?: string
  lastCommit?: string
  lastCommitMessage?: string
  lastModified?: string
  commitUrl?: string
}

interface TocItem {
  id: string
  text: string
  level: number
}

interface DocMatch {
  index: number
  match: string
  contextBefore: string
  contextAfter: string
}

const MAX_MATCHES = 30

const normalizeNotes = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((note) => String(note).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((note) => String(note).trim()).filter(Boolean)
      }
    } catch {
      // Not JSON
    }
    return trimmed
      .split(/\r?\n|,/)
      .map((note) => note.trim())
      .filter(Boolean)
  }
  return []
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const formatDifficultyLabel = (key: string): string =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default function CodexMetadataPanel({
  isOpen,
  onClose,
  metadata,
  currentFile,
  allFiles,
  summaryInfo,
  content,
  panelSize = 's',
  onPanelSizeChange,
  currentPath = '',
  onNavigate,
  autoExpandBacklinks = true,
  contentRef,
  theme = 'light',
  onMetadataSave,
  activeHeadingSlug,
  saveResult,
  isSavingMetadata = false,
}: CodexMetadataPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('metadata')
  const [graphExpanded, setGraphExpanded] = useState(false)
  const [learningPathOpen, setLearningPathOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [regexMode, setRegexMode] = useState(false)
  const [preset, setPreset] = useState<'none' | 'email' | 'phone' | 'todo'>('none')
  const [gitMetadata, setGitMetadata] = useState<GitMetadata>({})
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [notes, setNotes] = useState<string[]>([])
  const [newNote, setNewNote] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [personalTags, setPersonalTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const { preferences, updateMultiple } = usePreferences()
  // Only show user-saved PAT, never env vars
  const [patValue, setPatValue] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [patSaved, setPatSaved] = useState(false)
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [exportDropdownPosition, setExportDropdownPosition] = useState({ top: 0, right: 0 })
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  const exportTriggerRef = useRef<HTMLButtonElement>(null)
  const [paperLabelCopied, setPaperLabelCopied] = useState(false)
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false)

  // Check if a PAT is saved (user-provided only, not from env)
  const hasSavedPat = Boolean(preferences.githubPAT && preferences.githubPAT.length > 0)
  
  // Obfuscate PAT for display
  const obfuscatedPat = useMemo(() => {
    if (!preferences.githubPAT) return ''
    const pat = preferences.githubPAT
    if (pat.length <= 8) return '••••••••'
    return `${pat.slice(0, 4)}${'•'.repeat(Math.min(pat.length - 8, 32))}${pat.slice(-4)}`
  }, [preferences.githubPAT])

  const panelRef = useRef<HTMLDivElement>(null)
  const normalizedContent = (content || '').replace(/```[\s\S]*?```/g, '')
  const summaryText = summaryInfo?.summary ?? metadata.autoGenerated?.summary
  const aiSummary = metadata.aiSummary ?? metadata.autoGenerated?.aiSummary
  const difficultyValue = metadata.difficulty
  const difficultyEntries = useMemo(() => {
    if (!difficultyValue || typeof difficultyValue !== 'object' || Array.isArray(difficultyValue)) {
      return null
    }
    return Object.entries(difficultyValue).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  }, [difficultyValue])
  
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(label)
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Build comprehensive export data
  const buildExportData = () => {
    const exportObj: Record<string, unknown> = {
      path: currentFile?.path,
      title: metadata.title || currentFile?.name?.replace('.md', ''),
      ...metadata,
    }

    if (summaryText) exportObj.extractiveSummary = summaryText
    if (aiSummary) exportObj.aiSummary = aiSummary
    if (notes.length > 0) exportObj.personalNotes = notes
    if (personalTags.length > 0) exportObj.personalTags = personalTags
    if (gitMetadata.author) exportObj.git = gitMetadata
    if (readingTime) exportObj.readingTimeMinutes = readingTime
    if (complexityScore) exportObj.complexityScore = complexityScore

    return exportObj
  }

  // Copy all metadata as JSON
  const handleCopyAllJSON = async () => {
    const data = buildExportData()
    await copyToClipboard(JSON.stringify(data, null, 2), 'all-json')
  }

  // Copy all as formatted text
  const handleCopyAllText = async () => {
    const data = buildExportData()
    const lines: string[] = []
    
    lines.push(`# ${data.title || 'Untitled'}`)
    lines.push(`Path: ${data.path}`)
    lines.push('')
    
    if (data.extractiveSummary) {
      lines.push('## Summary')
      lines.push(String(data.extractiveSummary))
      lines.push('')
    }
    
    if (data.aiSummary) {
      lines.push('## AI Summary')
      lines.push(String(data.aiSummary))
      lines.push('')
    }
    
    if (metadata.tags) {
      const tags = Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags]
      lines.push(`Tags: ${tags.join(', ')}`)
    }
    
    if (metadata.taxonomy?.subjects?.length) {
      lines.push(`Subjects: ${metadata.taxonomy.subjects.join(', ')}`)
    }
    
    if (metadata.taxonomy?.topics?.length) {
      lines.push(`Topics: ${metadata.taxonomy.topics.join(', ')}`)
    }
    
    if (metadata.difficulty) {
      if (typeof metadata.difficulty === 'string') {
        lines.push(`Difficulty: ${metadata.difficulty}`)
      } else if (typeof metadata.difficulty === 'object') {
        lines.push(`Difficulty: ${JSON.stringify(metadata.difficulty)}`)
      }
    }
    
    if (notes.length > 0) {
      lines.push('')
      lines.push('## Personal Notes')
      notes.forEach((note, i) => lines.push(`${i + 1}. ${note}`))
    }

    if (personalTags.length > 0) {
      lines.push('')
      lines.push('## Personal Tags')
      lines.push(personalTags.join(', '))
    }
    
    if (gitMetadata.author) {
      lines.push('')
      lines.push('## Git Info')
      lines.push(`Author: ${gitMetadata.author}`)
      if (gitMetadata.lastModified) {
        lines.push(`Last Modified: ${new Date(gitMetadata.lastModified).toLocaleString()}`)
      }
    }
    
    lines.push('')
    lines.push(`Reading Time: ${readingTime} min | Complexity: ${complexityScore}/100`)
    
    await copyToClipboard(lines.join('\n'), 'all-text')
  }

  // Download as JSON file
  const handleDownloadJSON = () => {
    const data = buildExportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(currentFile?.name || 'strand').replace('.md', '')}-metadata.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setCopiedItem('downloaded')
    setTimeout(() => setCopiedItem(null), 2000)
  }

  // Copy markdown content
  const handleCopyContent = async () => {
    if (content) {
      await copyToClipboard(content, 'content')
    }
  }

  // Copy everything (metadata + content)
  const handleCopyEverything = async () => {
    const data = buildExportData()
    const metaYaml = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n')
    
    const fullExport = `---\n${metaYaml}\n---\n\n${content || ''}`
    await copyToClipboard(fullExport, 'everything')
  }

  const updatePatPreference = (value: string) => {
    const trimmed = value.trim()
    updateMultiple({ githubPAT: trimmed || undefined })
    setPatSaved(!!trimmed)
    setTimeout(() => setPatSaved(false), 2000)
  }

  const handleSavePat = () => {
    updatePatPreference(patValue)
  }

  const handleClearPat = () => {
    setPatValue('')
    updatePatPreference('')
  }
  
  useSwipeGesture({
    onSwipeDown: () => {
      if (window.innerWidth < 768 && isOpen) {
        onClose()
      }
    },
    threshold: 60,
    element: panelRef.current,
  })
  
  // Update export dropdown position
  const updateExportDropdownPosition = useCallback(() => {
    if (exportTriggerRef.current) {
      const rect = exportTriggerRef.current.getBoundingClientRect()
      setExportDropdownPosition({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right), // 8px min from edge
      })
    }
  }, [])
  
  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        exportDropdownRef.current && 
        !exportDropdownRef.current.contains(e.target as Node) &&
        exportTriggerRef.current &&
        !exportTriggerRef.current.contains(e.target as Node)
      ) {
        setExportDropdownOpen(false)
      }
    }
    
    const handleScroll = () => {
      if (exportDropdownOpen) updateExportDropdownPosition()
    }
    
    if (exportDropdownOpen) {
      updateExportDropdownPosition()
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', updateExportDropdownPosition)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', updateExportDropdownPosition)
      }
    }
  }, [exportDropdownOpen, updateExportDropdownPosition])
  
  const readingTime = useMemo(() => {
    if (!content) return 0
    const words = content.trim().split(/\s+/).length
    return Math.ceil(words / 200)
  }, [content])
  
  const complexityScore = useMemo(() => {
    if (!content) return 0
    
    const words = content.trim().split(/\s+/).length
    const codeBlocks = (content.match(/```/g) || []).length / 2
    const headings = (content.match(/^#+\s/gm) || []).length
    const links = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length
    const avgWordLength = content.split(/\s+/).reduce((sum, w) => sum + w.length, 0) / (words || 1)
    
    let score = 0
    score += Math.min(words / 50, 30)
    score += Math.min(codeBlocks * 10, 25)
    score += Math.min((avgWordLength - 4) * 5, 15)
    score += Math.min(links / 5, 15)
    score += Math.min(headings / 3, 15)
    
    return Math.min(Math.round(score), 100)
  }, [content])
  
  // Detailed content statistics
  const contentStats = useMemo(() => {
    if (!content) return null
    
    const text = content.trim()
    const words = text.split(/\s+/).filter(Boolean)
    const wordCount = words.length
    const charCount = text.length
    const charNoSpaces = text.replace(/\s/g, '').length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
    const codeBlocks = (text.match(/```[\s\S]*?```/g) || []).length
    const inlineCode = (text.match(/`[^`]+`/g) || []).length
    const links = (text.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length
    const images = (text.match(/!\[([^\]]*)\]\([^)]+\)/g) || []).length
    const lists = (text.match(/^[\s]*[-*+]\s/gm) || []).length
    const orderedLists = (text.match(/^[\s]*\d+\.\s/gm) || []).length
    const tables = (text.match(/\|.*\|/g) || []).length > 2 ? Math.floor((text.match(/\|.*\|/g) || []).length / 2) : 0
    const blockquotes = (text.match(/^>\s/gm) || []).length
    
    // Heading distribution
    const h1 = (text.match(/^#\s/gm) || []).length
    const h2 = (text.match(/^##\s/gm) || []).length
    const h3 = (text.match(/^###\s/gm) || []).length
    const h4Plus = (text.match(/^#{4,6}\s/gm) || []).length
    
    // Average metrics
    const avgWordLength = wordCount > 0 
      ? Math.round((words.reduce((sum, w) => sum + w.length, 0) / wordCount) * 10) / 10
      : 0
    const avgSentenceLength = sentences > 0 ? Math.round(wordCount / sentences) : 0
    
    // Flesch-Kincaid Reading Level estimate (simplified)
    const syllables = words.reduce((sum, word) => {
      const w = word.toLowerCase().replace(/[^a-z]/g, '')
      if (w.length <= 3) return sum + 1
      const vowelGroups = w.match(/[aeiouy]+/g) || []
      return sum + Math.max(1, vowelGroups.length)
    }, 0)
    const fleschKincaid = sentences > 0 && wordCount > 0
      ? Math.round(0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59)
      : 0
    
    return {
      wordCount,
      charCount,
      charNoSpaces,
      sentences,
      paragraphs,
      codeBlocks,
      inlineCode,
      links,
      images,
      lists: lists + orderedLists,
      tables,
      blockquotes,
      headings: { h1, h2, h3, h4Plus, total: h1 + h2 + h3 + h4Plus },
      avgWordLength,
      avgSentenceLength,
      readingLevel: Math.max(1, Math.min(20, fleschKincaid)),
    }
  }, [content])
  
  // Calculate backlinks count for auto-expand logic
  const backlinksCount = useMemo(() => {
    if (!currentFile?.path || !allFiles.length) return 0
    return allFiles.filter((f) => 
      f.path !== currentFile.path && 
      f.type === 'file' &&
      (f.name.endsWith('.md') || f.name.endsWith('.mdx'))
    ).slice(0, 10).length
  }, [currentFile?.path, allFiles])
  
  useEffect(() => {
    if (!currentFile?.path) {
      setGitMetadata({})
      return
    }
    
    const fetchGitInfo = async () => {
      try {
        const owner = process.env.NEXT_PUBLIC_CODEX_REPO_OWNER || REPO_CONFIG.OWNER
        const repo = process.env.NEXT_PUBLIC_CODEX_REPO_NAME || REPO_CONFIG.NAME
        const branch = REPO_CONFIG.BRANCH

        // SECURITY: Only use user-provided PAT from localStorage, NEVER from env vars
        // NEXT_PUBLIC_* vars are bundled into client JS and would expose tokens publicly
        const pat = (preferences.githubPAT || '').trim()

        const url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${currentFile.path}&sha=${branch}&per_page=1`
        const headers: HeadersInit = {}
        if (pat) headers['Authorization'] = `token ${pat}`
        
        const response = await fetch(url, { headers })
        
        if (response.ok) {
          const commits = await response.json()
          if (commits && commits.length > 0) {
            const latest = commits[0]
            setGitMetadata({
              author: latest.commit?.author?.name,
              authorEmail: latest.commit?.author?.email,
              lastCommit: latest.sha,
              lastCommitMessage: latest.commit?.message,
              lastModified: latest.commit?.author?.date,
              commitUrl: latest.html_url,
            })
          }
        }
      } catch (error) {
        console.warn('Failed to fetch Git metadata:', error)
      }
    }
    
    fetchGitInfo()
  }, [currentFile?.path, preferences.githubPAT])

  const toc: TocItem[] = useMemo(() => {
    if (!normalizedContent) return []
    const lines = normalizedContent.split('\n')
    const items: TocItem[] = []

    for (const line of lines) {
      const match = /^(#{1,6})\s+(.+)$/.exec(line.trim())
      if (!match) continue
      const level = match[1].length
      const text = match[2].trim()
      const id = text.toLowerCase().replace(/\s+/g, '-')
      items.push({ id, text, level })
    }
    return items
  }, [normalizedContent])

  const matches: DocMatch[] = useMemo(() => {
    if (!searchQuery || !normalizedContent) return []

    let pattern = searchQuery
    let flags = caseSensitive ? 'g' : 'gi'
    let regex: RegExp

    if (preset === 'email') {
      pattern = '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}'
      flags = caseSensitive ? 'g' : 'gi'
    } else if (preset === 'phone') {
      pattern = '\\+?\\d[\\d\\s().-]{7,}\\d'
    } else if (preset === 'todo') {
      pattern = '\\b(TODO|FIXME|NOTE)\\b'
      flags = caseSensitive ? 'g' : 'gi'
    }

    try {
      regex = new RegExp(regexMode || preset !== 'none' ? pattern : escapeRegExp(pattern), flags)
    } catch {
      return []
    }

    const results: DocMatch[] = []
    let match: RegExpExecArray | null
    const contextRadius = 40

    while ((match = regex.exec(normalizedContent)) && results.length < MAX_MATCHES) {
      const index = match.index
      const matchText = match[0]
      const start = Math.max(0, index - contextRadius)
      const end = Math.min(normalizedContent.length, index + matchText.length + contextRadius)
      const before = normalizedContent.slice(start, index)
      const after = normalizedContent.slice(index + matchText.length, end)
      results.push({
        index,
        match: matchText,
        contextBefore: before,
        contextAfter: after,
      })
    }

    return results
  }, [searchQuery, caseSensitive, regexMode, preset, normalizedContent])

  useEffect(() => {
    if (!currentFile?.path) {
      setNotes([])
      setNewNote('')
      setEditingIndex(null)
      setEditingValue('')
      setPersonalTags([])
      setNewTag('')
      return
    }

    // Load notes
    const stored = getStrandNotesText(currentFile.path)
    if (stored.length > 0) {
      setNotes(stored)
    } else {
      const baseNotes = normalizeNotes(metadata.notes)
      setNotes(baseNotes)
      if (baseNotes.length > 0) {
        saveStrandNotes(currentFile.path, baseNotes)
      }
    }
    setNewNote('')
    setEditingIndex(null)
    setEditingValue('')
    
    // Load personal tags
    const storedTags = getPersonalTags(currentFile.path)
    setPersonalTags(storedTags)
    setNewTag('')
    
    // Load bookmarks state
    setBookmarks(getBookmarks())
    setIsCurrentBookmarked(isBookmarked(currentFile.path))
  }, [currentFile?.path, metadata.notes])

  const persistNotes = (updated: string[]) => {
    if (!currentFile?.path) return
    setNotes(updated)
    saveStrandNotes(currentFile.path, updated)
  }

  const persistPersonalTags = (updated: string[]) => {
    if (!currentFile?.path) return
    setPersonalTags(updated)
    savePersonalTags(currentFile.path, updated)
  }

  const toggleBookmark = () => {
    if (!currentFile?.path) return
    if (isCurrentBookmarked) {
      removeBookmark(currentFile.path)
    } else {
      addBookmark(currentFile.path, metadata.title || currentFile.name || currentFile.path)
    }
    setIsCurrentBookmarked(!isCurrentBookmarked)
    setBookmarks(getBookmarks())
  }

  const handleRemoveBookmark = (path: string) => {
    removeBookmark(path)
    setBookmarks(getBookmarks())
    if (currentFile?.path === path) {
      setIsCurrentBookmarked(false)
    }
  }

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase()
    if (!tag || personalTags.includes(tag)) return
    persistPersonalTags([...personalTags, tag])
    setNewTag('')
  }

  const handleRemoveTag = (tag: string) => {
    persistPersonalTags(personalTags.filter((t) => t !== tag))
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    const updated = [...notes, newNote.trim()]
    persistNotes(updated)
    setNewNote('')
  }

  const handleDeleteNote = (index: number) => {
    const updated = notes.filter((_, idx) => idx !== index)
    persistNotes(updated)
    if (editingIndex === index) {
      setEditingIndex(null)
      setEditingValue('')
    }
  }

  const handleSaveEdit = () => {
    if (editingIndex === null || !editingValue.trim()) return
    const updated = notes.map((note, idx) => (idx === editingIndex ? editingValue.trim() : note))
    persistNotes(updated)
    setEditingIndex(null)
    setEditingValue('')
  }

  if (!isOpen || !currentFile) return null

  // Dynamic text sizing based on panel size
  const textSizeClasses = {
    base: panelSize === 'l' ? 'text-[12px]' : panelSize === 'm' ? 'text-[11px]' : 'text-[10px]',
    sm: panelSize === 'l' ? 'text-[11px]' : panelSize === 'm' ? 'text-[10px]' : 'text-[9px]',
    xs: panelSize === 'l' ? 'text-[10px]' : panelSize === 'm' ? 'text-[9px]' : 'text-[8px]',
    label: panelSize === 'l' ? 'text-[12px]' : panelSize === 'm' ? 'text-[11px]' : 'text-[10px]',
  }

  return (
      <div
        ref={panelRef}
        className="w-full h-full min-h-0 flex flex-col overflow-hidden"
      >
      
      {/* ═══════════════════════════════════════════════════════════════════════
          TOP HEADER - Tab Bar - Compact, matches toolbar typography
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center h-9">
          <button
            onClick={() => setActiveTab('metadata')}
            className={`
              flex-1 h-full flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wide transition-all
              ${activeTab === 'metadata'
                ? 'text-cyan-600 dark:text-cyan-400 bg-white dark:bg-zinc-800 border-b-2 border-cyan-500'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/50'
              }
            `}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Info</span>
          </button>
          <button
            onClick={() => setActiveTab('paper')}
            className={`
              flex-1 h-full flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wide transition-all
              ${activeTab === 'paper'
                ? 'text-amber-600 dark:text-amber-400 bg-white dark:bg-zinc-800 border-b-2 border-amber-500'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/50'
              }
            `}
          >
            <Scroll className="w-3.5 h-3.5" />
            <span>Card</span>
          </button>
          <button
            onClick={() => setActiveTab('reader')}
            className={`
              flex-1 h-full flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wide transition-all
              ${activeTab === 'reader'
                ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-800 border-b-2 border-emerald-500'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/50'
              }
            `}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reader</span>
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`
              flex-1 h-full flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wide transition-all
              ${activeTab === 'edit'
                ? 'text-violet-600 dark:text-violet-400 bg-white dark:bg-zinc-800 border-b-2 border-violet-500'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/50'
              }
            `}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`
              flex-1 h-full flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wide transition-all
              ${activeTab === 'tasks'
                ? 'text-rose-600 dark:text-rose-400 bg-white dark:bg-zinc-800 border-b-2 border-rose-500'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/50'
              }
            `}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Tasks</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className={`flex-1 overflow-y-auto px-3 py-3 space-y-3 overscroll-contain ${textSizeClasses.base} leading-snug touch-pan-y`}>
        
        {/* ══════════════════════════════════════════════════════════════════
            TAB: PAPER - Index card / pen & paper view
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'paper' && (
          <PaperLabel
            metadata={metadata}
            currentFile={currentFile}
            currentPath={currentPath}
            copied={paperLabelCopied}
            onCopy={async () => {
              const text = `${metadata.title || currentFile?.name}\n${metadata.summary || ''}\nTags: ${Array.isArray(metadata.tags) ? metadata.tags.join(', ') : metadata.tags || 'none'}`
              await navigator.clipboard.writeText(text)
              setPaperLabelCopied(true)
              setTimeout(() => setPaperLabelCopied(false), 2000)
            }}
          />
        )}


        {/* ══════════════════════════════════════════════════════════════════
            TAB: READER - Block-by-block summaries with scroll sync + View Settings
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'reader' && content && (
          <div className="flex flex-col gap-3">
            <ReaderModeErrorBoundary>
              <ReaderModePanel
                content={content}
                metadata={metadata}
                contentRef={contentRef}
                theme={theme}
                panelSize={panelSize}
                activeHeadingSlug={activeHeadingSlug}
                onBlockClick={(blockId, _startLine) => {
                  // Scroll to block in main content when clicked in reader panel
                  if (contentRef?.current) {
                    const blockElement = contentRef.current.querySelector(`[data-block-id="${blockId}"]`)
                    if (blockElement) {
                      blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }
                }}
              />
            </ReaderModeErrorBoundary>

            {/* View Settings - Collapsible at bottom of Reader tab */}
            <ExpandableSection
              title="View Settings"
              icon={<Settings className="w-3.5 h-3.5" />}
              defaultExpanded={false}
              className="border-t border-zinc-200 dark:border-zinc-700 pt-3"
            >
              <ReaderSettingsPanel
                preferences={preferences}
                onThemeChange={(newTheme) => updateMultiple({ theme: newTheme })}
                onFontSizeChange={(size) => updateMultiple({ fontSize: size })}
                panelSize={panelSize}
                ttsSupported={typeof window !== 'undefined' && 'speechSynthesis' in window}
                onTTSRateChange={(rate) => updateMultiple({ tts: {
                  rate,
                  volume: preferences.tts?.volume ?? DEFAULT_TTS_PREFERENCES.volume,
                  pitch: preferences.tts?.pitch ?? DEFAULT_TTS_PREFERENCES.pitch,
                  voiceURI: preferences.tts?.voiceURI
                } })}
                onTTSVolumeChange={(volume) => updateMultiple({ tts: {
                  rate: preferences.tts?.rate ?? DEFAULT_TTS_PREFERENCES.rate,
                  volume,
                  pitch: preferences.tts?.pitch ?? DEFAULT_TTS_PREFERENCES.pitch,
                  voiceURI: preferences.tts?.voiceURI
                } })}
              />
            </ExpandableSection>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: EDIT - Metadata/Schema/Tags Editor (NOT content)
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'edit' && (
          <MetadataEditor
            metadata={metadata}
            onSave={onMetadataSave || (async () => {})}
            theme={theme}
            filePath={currentFile?.path}
            compact
            saveResult={saveResult}
            isSaving={isSavingMetadata}
          />
        )}


        {/* ══════════════════════════════════════════════════════════════════
            TAB: METADATA - Main metadata view (default)
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'metadata' && (
          <>
        {/* Subjects / Topics / Tags - Prominent at the top */}
        {(metadata.taxonomy?.subjects?.length || metadata.taxonomy?.topics?.length || metadata.tags) && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-50/80 to-cyan-50/80 dark:from-emerald-950/30 dark:to-cyan-950/30 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Tags className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} style={{ color: 'rgb(16 185 129)' }} />
                <span className={`${textSizeClasses.base} font-semibold text-zinc-700 dark:text-zinc-200`}>Classification</span>
              </div>
            </div>
            <div className="p-2.5 space-y-2.5">
              {/* Subjects - Generalized */}
              {metadata.taxonomy?.subjects && metadata.taxonomy.subjects.length > 0 && (
                <div>
                  <div className={`flex items-center gap-1 mb-1.5 ${textSizeClasses.xs} uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold`}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    Subjects
                    <span className="text-[9px] text-zinc-400 font-normal lowercase ml-1">(general)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.taxonomy.subjects.map((subject) => (
                      <button
                        key={subject}
                        onClick={() => onNavigate?.(`/codex/browse?subject=${encodeURIComponent(subject)}`)}
                        className={`inline-flex items-center gap-1 px-2 py-1 ${textSizeClasses.sm} rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors font-medium`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Topics - More specific */}
              {metadata.taxonomy?.topics && metadata.taxonomy.topics.length > 0 && (
                <div>
                  <div className={`flex items-center gap-1 mb-1.5 ${textSizeClasses.xs} uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold`}>
                    <Hash className="w-2.5 h-2.5" />
                    Topics
                    <span className="text-[9px] text-zinc-400 font-normal lowercase ml-1">(specific)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.taxonomy.topics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => onNavigate?.(`/codex/browse?topic=${encodeURIComponent(topic)}`)}
                        className={`inline-flex items-center gap-1 px-2 py-1 ${textSizeClasses.sm} rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors font-medium`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tags - Most specific */}
              {metadata.tags && (
                <div>
                  <div className={`flex items-center gap-1 mb-1.5 ${textSizeClasses.xs} uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold`}>
                    <Tags className="w-2.5 h-2.5" />
                    Tags
                    <span className="text-[9px] text-zinc-400 font-normal lowercase ml-1">(detailed)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(metadata.tags) ? metadata.tags : String(metadata.tags).split(',')).map((tag: string) => (
                      <button
                        key={tag}
                        onClick={() => onNavigate?.(`/codex/browse?tag=${encodeURIComponent(tag.trim())}`)}
                        className={`inline-flex items-center gap-1 px-2 py-1 ${textSizeClasses.sm} rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors font-medium`}
                      >
                        {tag.trim()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reading Stats + Export */}
        {content && (
          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className={`flex items-center gap-2 ${textSizeClasses.sm}`}>
              <span className="flex items-center gap-1" title="Reading time">
                <BookOpen className={panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} style={{ color: 'rgb(8 145 178)' }} />
                <span className="font-bold text-cyan-700 dark:text-cyan-300">{readingTime}m</span>
              </span>
              <span className="flex items-center gap-1" title={`Complexity: ${complexityScore}/100`}>
                <span className={`${panelSize === 'l' ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full ${complexityScore < 33 ? 'bg-green-500' : complexityScore < 67 ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400">{complexityScore}</span>
              </span>
            </div>
            
            <div className="relative">
              <button
                ref={exportTriggerRef}
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className={`
                  flex items-center gap-0.5 px-1.5 py-0.5 rounded ${textSizeClasses.sm}
                  ${exportDropdownOpen
                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }
                `}
                title="Export"
              >
                <Share2 className={panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
                <ChevronDown className={`${panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Export dropdown - rendered via portal for z-index escape */}
              {exportDropdownOpen && typeof document !== 'undefined' && createPortal(
                <div 
                  ref={exportDropdownRef}
                  className="fixed z-[9999] w-36 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-0.5"
                  style={{ top: exportDropdownPosition.top, right: exportDropdownPosition.right }}
                >
                  <button onClick={() => { handleCopyEverything(); setExportDropdownOpen(false) }} className={`w-full flex items-center gap-1.5 px-2 py-1.5 ${textSizeClasses.base} text-left hover:bg-zinc-100 dark:hover:bg-zinc-800`}>
                    <Copy className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} style={{ color: 'rgb(8 145 178)' }} />
                    <span>Copy All</span>
                    {copiedItem === 'everything' && <Check className={`${panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} text-emerald-500 ml-auto`} />}
                  </button>
                  <button onClick={() => { handleDownloadJSON(); setExportDropdownOpen(false) }} className={`w-full flex items-center gap-1.5 px-2 py-1.5 ${textSizeClasses.base} text-left hover:bg-zinc-100 dark:hover:bg-zinc-800`}>
                    <Download className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} style={{ color: 'rgb(113 113 122)' }} />
                    <span>Download</span>
                    {copiedItem === 'downloaded' && <Check className={`${panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} text-emerald-500 ml-auto`} />}
                  </button>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-0.5" />
                  <button onClick={() => { handleCopyAllJSON(); setExportDropdownOpen(false) }} className={`w-full flex items-center gap-1.5 px-2 py-1.5 ${textSizeClasses.base} text-left hover:bg-zinc-100 dark:hover:bg-zinc-800`}>
                    <FileJson className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} style={{ color: 'rgb(161 161 170)' }} />
                    <span>JSON</span>
                    {copiedItem === 'all-json' && <Check className={`${panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} text-emerald-500 ml-auto`} />}
                  </button>
                  <button onClick={() => { handleCopyContent(); setExportDropdownOpen(false) }} className={`w-full flex items-center gap-1.5 px-2 py-1.5 ${textSizeClasses.base} text-left hover:bg-zinc-100 dark:hover:bg-zinc-800`}>
                    <FileCode className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} style={{ color: 'rgb(161 161 170)' }} />
                    <span>Content</span>
                    {copiedItem === 'content' && <Check className={`${panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} text-emerald-500 ml-auto`} />}
                  </button>
                </div>,
                document.body
              )}
            </div>
          </div>
        )}

        {/* Statistics Section - Detailed Analytics */}
        {contentStats && (
          <ExpandableSection
            title="Statistics"
            icon={<BarChart3 className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
            defaultExpanded={false}
          >
            <div className="space-y-3">
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/50">
                  <FileText className="w-3 h-3 text-cyan-500" />
                  <div className="flex-1">
                    <div className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400`}>Words</div>
                    <div className={`${textSizeClasses.base} font-bold text-zinc-700 dark:text-zinc-200`}>
                      {contentStats.wordCount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/50">
                  <Hash className="w-3 h-3 text-blue-500" />
                  <div className="flex-1">
                    <div className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400`}>Characters</div>
                    <div className={`${textSizeClasses.base} font-bold text-zinc-700 dark:text-zinc-200`}>
                      {contentStats.charNoSpaces.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/50">
                  <List className="w-3 h-3 text-emerald-500" />
                  <div className="flex-1">
                    <div className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400`}>Paragraphs</div>
                    <div className={`${textSizeClasses.base} font-bold text-zinc-700 dark:text-zinc-200`}>
                      {contentStats.paragraphs}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/50">
                  <BookOpen className="w-3 h-3 text-amber-500" />
                  <div className="flex-1">
                    <div className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400`}>Sentences</div>
                    <div className={`${textSizeClasses.base} font-bold text-zinc-700 dark:text-zinc-200`}>
                      {contentStats.sentences}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Elements */}
              <div>
                <div className={`${textSizeClasses.xs} font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5`}>Content Elements</div>
                <div className="flex flex-wrap gap-1.5">
                  {contentStats.headings.total > 0 && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${textSizeClasses.xs} bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300`}>
                      <Hash className="w-2.5 h-2.5" />
                      {contentStats.headings.total} headings
                    </span>
                  )}
                  {contentStats.codeBlocks > 0 && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${textSizeClasses.xs} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300`}>
                      <Code className="w-2.5 h-2.5" />
                      {contentStats.codeBlocks} code blocks
                    </span>
                  )}
                  {contentStats.links > 0 && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${textSizeClasses.xs} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
                      <Link2 className="w-2.5 h-2.5" />
                      {contentStats.links} links
                    </span>
                  )}
                  {contentStats.images > 0 && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${textSizeClasses.xs} bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300`}>
                      <Image className="w-2.5 h-2.5" />
                      {contentStats.images} images
                    </span>
                  )}
                  {contentStats.lists > 0 && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${textSizeClasses.xs} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300`}>
                      <List className="w-2.5 h-2.5" />
                      {contentStats.lists} list items
                    </span>
                  )}
                  {contentStats.tables > 0 && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${textSizeClasses.xs} bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300`}>
                      <Table2 className="w-2.5 h-2.5" />
                      {contentStats.tables} tables
                    </span>
                  )}
                  {contentStats.blockquotes > 0 && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${textSizeClasses.xs} bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300`}>
                      <Quote className="w-2.5 h-2.5" />
                      {contentStats.blockquotes} quotes
                    </span>
                  )}
                </div>
              </div>

              {/* Readability Metrics */}
              <div>
                <div className={`${textSizeClasses.xs} font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5`}>Readability</div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400`}>Avg word length</span>
                    <span className={`${textSizeClasses.base} font-mono font-bold text-zinc-700 dark:text-zinc-200`}>{contentStats.avgWordLength} chars</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400`}>Avg sentence</span>
                    <span className={`${textSizeClasses.base} font-mono font-bold text-zinc-700 dark:text-zinc-200`}>{contentStats.avgSentenceLength} words</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400`}>Reading level</span>
                    <span className={`${textSizeClasses.base} font-mono font-bold ${
                      contentStats.readingLevel <= 8 ? 'text-emerald-600 dark:text-emerald-400' :
                      contentStats.readingLevel <= 12 ? 'text-amber-600 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      Grade {contentStats.readingLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Heading Distribution */}
              {contentStats.headings.total > 0 && (
                <div>
                  <div className={`${textSizeClasses.xs} font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5`}>Heading Structure</div>
                  <div className="flex items-center gap-1">
                    {contentStats.headings.h1 > 0 && (
                      <div className="flex-1 text-center px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30">
                        <div className={`${textSizeClasses.xs} text-violet-500`}>H1</div>
                        <div className={`${textSizeClasses.base} font-bold text-violet-700 dark:text-violet-300`}>{contentStats.headings.h1}</div>
                      </div>
                    )}
                    {contentStats.headings.h2 > 0 && (
                      <div className="flex-1 text-center px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30">
                        <div className={`${textSizeClasses.xs} text-blue-500`}>H2</div>
                        <div className={`${textSizeClasses.base} font-bold text-blue-700 dark:text-blue-300`}>{contentStats.headings.h2}</div>
                      </div>
                    )}
                    {contentStats.headings.h3 > 0 && (
                      <div className="flex-1 text-center px-1 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30">
                        <div className={`${textSizeClasses.xs} text-cyan-500`}>H3</div>
                        <div className={`${textSizeClasses.base} font-bold text-cyan-700 dark:text-cyan-300`}>{contentStats.headings.h3}</div>
                      </div>
                    )}
                    {contentStats.headings.h4Plus > 0 && (
                      <div className="flex-1 text-center px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                        <div className={`${textSizeClasses.xs} text-zinc-500`}>H4+</div>
                        <div className={`${textSizeClasses.base} font-bold text-zinc-700 dark:text-zinc-300`}>{contentStats.headings.h4Plus}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </ExpandableSection>
        )}

        {/* Summary Section */}
        {summaryText && (
          <ExpandableSection
            title="Summary"
            icon={<FileText className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
            defaultExpanded={true}
          >
            <div className="space-y-1.5">
              <p className={`${textSizeClasses.base} text-zinc-700 dark:text-zinc-300 leading-relaxed`}>
                {summaryText}
              </p>
              <div className="flex items-center justify-between">
                {summaryInfo?.lastIndexed && (
                  <span className={`${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500`}>
                    {new Date(summaryInfo.lastIndexed).toLocaleDateString()}
                  </span>
                )}
                <CopyButton
                  primary={{ id: 'summary', label: 'Copy summary', getData: () => summaryText }}
                  options={[
                    { id: 'summary-md', label: 'Markdown', icon: CopyIcons.markdown, getData: () => `## Summary\n\n${summaryText}` },
                    { id: 'summary-json', label: 'JSON', icon: CopyIcons.json, getData: () => JSON.stringify({ summary: summaryText }, null, 2) },
                  ]}
                />
              </div>
            </div>
          </ExpandableSection>
        )}

        {aiSummary && (
          <ExpandableSection
            title="AI Summary"
            icon={<Sparkles className={`${panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-amber-500`} />}
            defaultExpanded={false}
          >
            <div className="space-y-1.5">
              <p className={`${textSizeClasses.base} text-zinc-700 dark:text-zinc-300 leading-relaxed`}>
                {aiSummary}
              </p>
              <CopyButton
                primary={{ id: 'ai-summary', label: 'Copy AI summary', getData: () => aiSummary }}
                options={[
                  { id: 'ai-md', label: 'Markdown', icon: CopyIcons.markdown, getData: () => `## AI Summary\n\n${aiSummary}` },
                  { id: 'ai-json', label: 'JSON', icon: CopyIcons.json, getData: () => JSON.stringify({ aiSummary }, null, 2) },
                ]}
              />
            </div>
          </ExpandableSection>
        )}

        {/* Document Ratings Section */}
        {currentFile && (
          <ExpandableSection
            title="Ratings"
            icon={<Star className={`${panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-amber-500`} />}
            defaultExpanded={false}
          >
            <StrandRatingDisplay
              strandId={currentFile.sha || currentFile.path}
              strandPath={currentFile.path}
              strandTitle={metadata.title || currentFile.name || 'Untitled'}
              content={content || ''}
              metadata={metadata as Record<string, unknown>}
              theme={preferences?.theme}
              compact={panelSize === 's'}
              showLLMRating={true}
              showUserRating={true}
              editable={true}
            />
          </ExpandableSection>
        )}

        {/* Inline Graph - Collapsible (after summaries) */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <button
            onClick={() => setGraphExpanded(!graphExpanded)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-gradient-to-r from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/30 dark:to-blue-950/30 hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-950/50 dark:hover:to-blue-950/50 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Network className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} style={{ color: 'rgb(8 145 178)' }} />
              <span className={`${textSizeClasses.base} font-semibold text-zinc-700 dark:text-zinc-200`}>Relationships</span>
              {(metadata.relationships?.prerequisites?.length || 0) + (metadata.relationships?.references?.length || 0) > 0 && (
                <span className={`${textSizeClasses.xs} px-1 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300`}>
                  {(metadata.relationships?.prerequisites?.length || 0) + (metadata.relationships?.references?.length || 0)}
                </span>
              )}
            </div>
            <ChevronDown className={`${panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-zinc-400 transition-transform ${graphExpanded ? 'rotate-180' : ''}`} />
          </button>
          {graphExpanded && (
            <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 space-y-2">
              {/* Interactive Visual Graph */}
              <CompactRelationGraph
                metadata={metadata}
                currentFile={currentFile}
                allFiles={allFiles}
                onNavigate={onNavigate}
                theme={preferences?.theme}
              />
              
              {/* List view fallback/alternative */}
              <details className="group">
                <summary className={`${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1`}>
                  <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                  Show list view
                </summary>
                <div className="mt-2">
                  <MiniGraph
                    metadata={metadata}
                    currentFile={currentFile}
                    currentPath={currentPath}
                    allFiles={allFiles}
                    onNavigate={onNavigate}
                    panelSize={panelSize}
                  />
                </div>
              </details>
              {((metadata.relationships?.prerequisites?.length || 0) + (metadata.relationships?.references?.length || 0) > 0) && (
                <div className="flex justify-end pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <CopyButton
                    primary={{ 
                      id: 'relationships', 
                      label: 'Copy relationships', 
                      getData: () => {
                        const prereqs = metadata.relationships?.prerequisites || []
                        const refs = metadata.relationships?.references || []
                        let text = ''
                        if (prereqs.length) text += `Prerequisites: ${prereqs.join(', ')}\n`
                        if (refs.length) text += `References: ${refs.join(', ')}`
                        return text.trim()
                      }
                    }}
                    options={[
                      { id: 'rel-json', label: 'JSON', icon: CopyIcons.json, getData: () => JSON.stringify(metadata.relationships || {}, null, 2) },
                      { id: 'rel-yaml', label: 'YAML', icon: CopyIcons.code, getData: () => {
                        const prereqs = metadata.relationships?.prerequisites || []
                        const refs = metadata.relationships?.references || []
                        let yaml = 'relationships:\n'
                        if (prereqs.length) yaml += `  prerequisites:\n${prereqs.map(p => `    - ${p}`).join('\n')}\n`
                        if (refs.length) yaml += `  references:\n${refs.map(r => `    - ${r}`).join('\n')}`
                        return yaml.trim()
                      }},
                    ]}
                  />
                </div>
              )}
              
              {/* Learning Path Button - Opens popover */}
              <button
                onClick={() => setLearningPathOpen(true)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors ${textSizeClasses.sm} w-full mt-2`}
              >
                <Route className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="text-cyan-700 dark:text-cyan-300 font-medium">Explore Learning Path</span>
                {((metadata.relationships?.prerequisites?.length || 0) + (metadata.relationships?.references?.length || 0)) > 0 && (
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full bg-cyan-200 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300`}>
                    {(metadata.relationships?.prerequisites?.length || 0) + (metadata.relationships?.references?.length || 0)}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
        
        {toc.length > 0 && (
          <ExpandableSection
            title="Contents"
            icon={<Hash className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
            defaultExpanded={true}
          >
            <div className="space-y-1.5">
              <nav className="space-y-0 -mx-1 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      const el = document.getElementById(item.id)
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                    className={`
                      block w-full text-left ${textSizeClasses.base} truncate px-2 py-1
                      hover:bg-zinc-100 dark:hover:bg-zinc-800
                      transition-colors rounded
                      ${item.level === 1 ? 'font-semibold text-zinc-800 dark:text-zinc-200' : ''}
                      ${item.level === 2 ? 'pl-4 text-zinc-600 dark:text-zinc-400' : ''}
                      ${item.level > 2 ? 'pl-6 text-zinc-500 dark:text-zinc-500' : ''}
                    `}
                    title={item.text}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
              <CopyButton
                primary={{ 
                  id: 'toc', 
                  label: 'Copy TOC', 
                  getData: () => toc.map(t => `${'  '.repeat(t.level - 1)}- ${t.text}`).join('\n') 
                }}
                options={[
                  { 
                    id: 'toc-md', 
                    label: 'Markdown', 
                    icon: CopyIcons.markdown, 
                    getData: () => toc.map(t => `${'#'.repeat(t.level)} ${t.text}`).join('\n\n') 
                  },
                  { 
                    id: 'toc-json', 
                    label: 'JSON', 
                    icon: CopyIcons.json, 
                    getData: () => JSON.stringify(toc, null, 2) 
                  },
                ]}
              />
            </div>
          </ExpandableSection>
        )}

        <ExpandableSection
          title="Search"
          icon={<Search className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
          defaultExpanded={false}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find..."
                  className={`w-full px-2 py-1 ${textSizeClasses.base} rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500`}
                />
                <Search className={`${panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} absolute right-2 top-1.5 text-zinc-400`} />
              </div>
              <button
                type="button"
                onClick={() => setRegexMode((v) => !v)}
                className={`
                  px-1.5 py-1 rounded ${textSizeClasses.sm} border
                  ${regexMode
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200'
                    : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'}
                `}
                title="Regex mode"
              >
                .*
              </button>
            </div>
            <div className={`flex items-center justify-between ${textSizeClasses.base} text-gray-500 dark:text-gray-400`}>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className={`${panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} rounded border-gray-300 text-cyan-600 focus:ring-cyan-500`}
                />
                Case sensitive
              </label>
              <div className="flex items-center gap-1">
                <span className="opacity-70">Presets:</span>
                {(
                  [
                    { id: 'email', label: 'Email' },
                    { id: 'phone', label: 'Phone' },
                    { id: 'todo', label: 'TODO' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPreset(p.id)
                      setRegexMode(true)
                    }}
                    className={`
                      px-1.5 py-0.5 rounded-full border ${textSizeClasses.base}
                      ${preset === p.id
                        ? 'border-cyan-500 text-cyan-600 dark:border-cyan-400 dark:text-cyan-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'}
                    `}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {searchQuery && (
              <div className="mt-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 border border-gray-200 dark:border-gray-800 rounded-lg p-2 space-y-1 bg-white/70 dark:bg-gray-950/60">
                {matches.length === 0 ? (
                  <p className={`${textSizeClasses.base} text-gray-500 dark:text-gray-400 italic`}>No matches in this strand.</p>
                ) : (
                  matches.map((m, idx) => (
                    <button
                      key={`${m.match}-${idx}`}
                      type="button"
                      onClick={() => {
                        try {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          ;(window as any).find(m.match, caseSensitive, false, true, false, false, false)
                        } catch {
                          // ignore
                        }
                      }}
                      className={`block w-full text-left ${textSizeClasses.base} px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800`}
                    >
                      <span className={`${textSizeClasses.sm} uppercase tracking-wide text-gray-400 dark:text-gray-500`}>
                        Match {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="text-gray-500 dark:text-gray-400">{m.contextBefore}</span>
                        <mark className="bg-yellow-200 text-gray-900 dark:bg-yellow-500/70 dark:text-gray-900 px-0.5 rounded">
                          {m.match}
                        </mark>
                        <span className="text-gray-500 dark:text-gray-400">{m.contextAfter}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </ExpandableSection>

        <ExpandableSection
          title="Notes"
          icon={<NotebookPen className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
          defaultExpanded={notes.length > 0}
        >
          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className={`${textSizeClasses.base} text-zinc-500 dark:text-zinc-400 italic`}>No notes yet.</p>
            ) : (
              <div className="flex justify-end mb-1">
                <CopyButton
                  primary={{ 
                    id: 'notes-all', 
                    label: 'Copy all notes', 
                    getData: () => notes.join('\n\n---\n\n') 
                  }}
                  options={[
                    { 
                      id: 'notes-md', 
                      label: 'Markdown list', 
                      icon: CopyIcons.markdown, 
                      getData: () => notes.map((n, i) => `${i + 1}. ${n}`).join('\n') 
                    },
                    { 
                      id: 'notes-json', 
                      label: 'JSON', 
                      icon: CopyIcons.json, 
                      getData: () => JSON.stringify({ notes, strandPath: currentFile?.path }, null, 2) 
                    },
                  ]}
                />
              </div>
            )}
            {notes.map((note, idx) => (
              <div
                key={`${note}-${idx}`}
                className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 shadow-inner space-y-2"
              >
                {editingIndex === idx ? (
                  <>
                    <textarea
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(null)
                          setEditingValue('')
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">
                      {note}
                    </p>
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(idx)
                          setEditingValue(note)
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(idx)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/40"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            <div className="space-y-2">
              <textarea
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                placeholder="Capture a new note for this strand..."
                rows={3}
                className="w-full rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>Notes are stored locally per strand.</span>
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className={`
                    inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                    ${newNote.trim()
                      ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                      : 'bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500'}
                  `}
                >
                  <Plus className="w-3 h-3" />
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </ExpandableSection>

        <ExpandableSection
          title="Metadata"
          icon={<Tags className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
          defaultExpanded={true}
        >
          {Object.keys(metadata).length === 0 ? (
            <p className={`${textSizeClasses.base} text-zinc-500 dark:text-zinc-400 italic`}>No metadata available</p>
          ) : (
            <div className="space-y-3">
              {metadata.tags && (
                <div>
                  <p className={`${textSizeClasses.base} font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5`}>
                    <Tags className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} style={{ color: 'rgb(113 113 122)' }} />
                    <span>Tags</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(metadata.tags) ? metadata.tags : String(metadata.tags).split(',')).map(
                      (tag: string) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 ${textSizeClasses.base} rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-medium`}
                          title="Source tag from YAML frontmatter"
                        >
                          {tag.trim()}
                        </span>
                      )
                    )}
                  </div>
                  <p className={`mt-1.5 ${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500 italic`}>
                    Edit via PR to source repository
                  </p>
                </div>
              )}

              {/* Personal Tags - User-editable */}
              <div>
                <p className={`${textSizeClasses.base} font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5`}>
                  <span>Your Tags</span>
                  <span className={`${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500 font-normal`}>(editable)</span>
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {personalTags.map((tag) => (
                    <span
                      key={tag}
                      className={`group inline-flex items-center gap-1 px-2 py-0.5 ${textSizeClasses.base} rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium`}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="opacity-50 hover:opacity-100 transition-opacity"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <XCircle className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
                      </button>
                    </span>
                  ))}
                  {personalTags.length === 0 && (
                    <span className={`${textSizeClasses.base} text-zinc-400 dark:text-zinc-500 italic`}>No personal tags</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                    className={`flex-1 px-2 py-1 ${textSizeClasses.base} rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder:text-zinc-400`}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className={`px-2 py-1 ${textSizeClasses.base} font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <Plus className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
                  </button>
                </div>
              </div>

        {difficultyValue && (
                <div>
                  <p className={`${textSizeClasses.base} font-semibold text-zinc-700 dark:text-zinc-300 mb-1`}>Difficulty</p>
            {difficultyEntries ? (
              <div className={`grid grid-cols-2 gap-2 ${textSizeClasses.base}`}>
                {difficultyEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  >
                    <span className="text-zinc-500 dark:text-zinc-400">{formatDifficultyLabel(key)}</span>
                    <span className="font-mono text-blue-800 dark:text-blue-200">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
                  <span className={`inline-block px-2 py-0.5 ${textSizeClasses.base} rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 font-medium capitalize`}>
                {typeof difficultyValue === 'string' ? difficultyValue : ''}
                  </span>
            )}
                </div>
              )}

              {metadata.version && (
                <div>
                  <p className={`${textSizeClasses.base} font-semibold text-zinc-700 dark:text-zinc-300 mb-1`}>Version</p>
                  <span className={`inline-block px-2 py-0.5 ${textSizeClasses.base} font-mono rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700`}>
                    v{metadata.version}
                  </span>
                </div>
              )}

              {/* Taxonomy subjects/topics are displayed in the Classification section above */}

              {metadata.contentType && (
                <div>
                  <p className={`${textSizeClasses.base} font-semibold text-gray-700 dark:text-gray-300 mb-1.5`}>Content Type</p>
                  <span className={`inline-block px-2.5 py-1 ${textSizeClasses.base} rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800 font-medium capitalize`}>
                    {metadata.contentType}
                  </span>
                </div>
              )}

              {(metadata.skip_ai === 'true' || metadata.skip_ai === true || 
                metadata.skip_index === 'true' || metadata.skip_index === true || 
                metadata.manual_tags === 'true' || metadata.manual_tags === true) && (
                <div>
                  <p className={`${textSizeClasses.base} font-semibold text-gray-700 dark:text-gray-300 mb-1.5`}>Control Flags</p>
                  <div className="space-y-1">
                    {(metadata.skip_ai === 'true' || metadata.skip_ai === true) && (
                      <div className={`flex items-center gap-1.5 ${textSizeClasses.base}`}>
                        <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800 font-mono">
                          skip_ai
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">Excluded from AI analysis</span>
                      </div>
                    )}
                    {(metadata.skip_index === 'true' || metadata.skip_index === true) && (
                      <div className={`flex items-center gap-1.5 ${textSizeClasses.base}`}>
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 font-mono">
                          skip_index
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">Not in search index</span>
                      </div>
                    )}
                    {(metadata.manual_tags === 'true' || metadata.manual_tags === true) && (
                      <div className={`flex items-center gap-1.5 ${textSizeClasses.base}`}>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800 font-mono">
                          manual_tags
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">Manual tag curation</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Copy metadata section */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <CopyButton
                  primary={{ 
                    id: 'metadata-tags', 
                    label: 'Copy tags', 
                    getData: () => {
                      const tags = Array.isArray(metadata.tags) ? metadata.tags : (metadata.tags?.split(',') || [])
                      return tags.map((t: string) => t.trim()).join(', ')
                    }
                  }}
                  options={[
                    { 
                      id: 'metadata-yaml', 
                      label: 'YAML frontmatter', 
                      icon: CopyIcons.code, 
                      getData: () => {
                        const lines = ['---']
                        if (metadata.title) lines.push(`title: "${metadata.title}"`)
                        if (metadata.tags) {
                          const tags = Array.isArray(metadata.tags) ? metadata.tags : metadata.tags.split(',')
                          lines.push(`tags: [${tags.map((t: string) => `"${t.trim()}"`).join(', ')}]`)
                        }
                        if (metadata.taxonomy?.subjects?.length) {
                          lines.push(`subjects: [${metadata.taxonomy.subjects.map(s => `"${s}"`).join(', ')}]`)
                        }
                        if (metadata.difficulty) {
                          lines.push(`difficulty: "${typeof metadata.difficulty === 'string' ? metadata.difficulty : JSON.stringify(metadata.difficulty)}"`)
                        }
                        lines.push('---')
                        return lines.join('\n')
                      }
                    },
                    { 
                      id: 'metadata-json', 
                      label: 'JSON', 
                      icon: CopyIcons.json, 
                      getData: () => JSON.stringify(metadata, null, 2) 
                    },
                  ]}
                />
              </div>
            </div>
          )}
        </ExpandableSection>

        {Object.keys(metadata).length > 0 && (
          <ExpandableSection
            title="Raw JSON"
            icon={<FileCode className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
            defaultExpanded={false}
          >
            <div className="space-y-2">
              <CopyButton
                primary={{ 
                  id: 'raw-json', 
                  label: 'Copy JSON', 
                  getData: () => JSON.stringify(metadata, null, 2) 
                }}
                options={[
                  { 
                    id: 'raw-minified', 
                    label: 'Minified', 
                    icon: CopyIcons.json, 
                    getData: () => JSON.stringify(metadata) 
                  },
                ]}
              />
              <pre className={`${textSizeClasses.xs} font-mono bg-zinc-900 dark:bg-black text-emerald-400 p-2 rounded overflow-x-auto border border-zinc-700 select-text max-h-40 scrollbar-thin scrollbar-thumb-zinc-600`}>
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>
          </ExpandableSection>
        )}

        {(gitMetadata.author || gitMetadata.lastModified) && (
          <ExpandableSection
            title="Git History"
            icon={<GitCommit className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
            defaultExpanded={false}
          >
            <div className="space-y-2">
              {gitMetadata.author && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Author</span>
                    <p className={`${textSizeClasses.base} font-medium text-zinc-800 dark:text-zinc-200`}>{gitMetadata.author}</p>
                  </div>
                </div>
              )}

              {gitMetadata.lastModified && (
                <div>
                  <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Modified</span>
                  <p className={`${textSizeClasses.base} text-zinc-700 dark:text-zinc-300`}>
                    {new Date(gitMetadata.lastModified).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}

              {gitMetadata.lastCommit && (
                <div>
                  <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Commit</span>
                  <div className="flex items-center gap-2">
                    {gitMetadata.commitUrl ? (
                      <a
                        href={gitMetadata.commitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${textSizeClasses.base} font-mono text-cyan-600 dark:text-cyan-400 hover:underline`}
                      >
                        {gitMetadata.lastCommit.slice(0, 7)}
                      </a>
                    ) : (
                      <span className={`${textSizeClasses.base} font-mono text-zinc-700 dark:text-zinc-300`}>{gitMetadata.lastCommit.slice(0, 7)}</span>
                    )}
                  </div>
                  {gitMetadata.lastCommitMessage && (
                    <p className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1`}>
                      {gitMetadata.lastCommitMessage.split('\n')[0]}
                    </p>
                  )}
                </div>
              )}

              {/* Copy git info */}
              <CopyButton
                primary={{
                  id: 'git-info',
                  label: 'Copy git info',
                  getData: () => `Author: ${gitMetadata.author || 'Unknown'}\nCommit: ${gitMetadata.lastCommit?.slice(0, 7) || 'N/A'}\nDate: ${gitMetadata.lastModified ? new Date(gitMetadata.lastModified).toISOString() : 'N/A'}`
                }}
                options={[
                  {
                    id: 'git-json',
                    label: 'JSON',
                    icon: CopyIcons.json,
                    getData: () => JSON.stringify(gitMetadata, null, 2)
                  },
                ]}
              />
            </div>
          </ExpandableSection>
        )}

        {/* Source Information */}
        {metadata.source && (
          <ExpandableSection
            title="Source Information"
            icon={<FileSignature className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
            defaultExpanded={false}
          >
            <div className="space-y-2">
              {/* Source Type */}
              <div>
                <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Type</span>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 ${textSizeClasses.xs} rounded-full ${
                    metadata.source.sourceType === 'upload' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                    metadata.source.sourceType === 'scrape' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                    metadata.source.sourceType === 'template' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {metadata.source.sourceType}
                  </span>
                </div>
              </div>

              {/* Creator */}
              <div>
                <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Creator</span>
                <div className="flex items-center gap-2 mt-1">
                  <p className={`${textSizeClasses.base} font-medium text-zinc-800 dark:text-zinc-200`}>
                    {metadata.source.creator}
                  </p>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                    metadata.source.creatorType === 'git'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}>
                    {metadata.source.creatorType}
                  </span>
                </div>
              </div>

              {/* Source URL */}
              {metadata.source.sourceUrl && (
                <div>
                  <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Source URL</span>
                  <a
                    href={metadata.source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${textSizeClasses.base} text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 mt-1 break-all`}
                  >
                    {metadata.source.sourceUrl.length > 60
                      ? metadata.source.sourceUrl.slice(0, 60) + '...'
                      : metadata.source.sourceUrl}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* Filename */}
              {metadata.source.sourceFilename && (
                <div>
                  <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Original File</span>
                  <p className={`${textSizeClasses.base} font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded mt-1 break-all`}>
                    {metadata.source.sourceFilename}
                  </p>
                </div>
              )}

              {/* Created */}
              <div>
                <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Created</span>
                <p className={`${textSizeClasses.base} text-zinc-700 dark:text-zinc-300`}>
                  {new Date(metadata.source.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Uploaded */}
              {metadata.source.uploadedAt && (
                <div>
                  <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Uploaded</span>
                  <p className={`${textSizeClasses.base} text-zinc-700 dark:text-zinc-300`}>
                    {new Date(metadata.source.uploadedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {/* Uploader (if different from creator) */}
              {metadata.source.uploader && metadata.source.uploader !== metadata.source.creator && (
                <div>
                  <span className={`${textSizeClasses.xs} uppercase tracking-wider text-zinc-500 dark:text-zinc-400`}>Uploader</span>
                  <p className={`${textSizeClasses.base} text-zinc-700 dark:text-zinc-300`}>
                    {metadata.source.uploader}
                  </p>
                </div>
              )}

              {/* Copy source info */}
              <CopyButton
                primary={{
                  id: 'source-info',
                  label: 'Copy source info',
                  getData: () => {
                    let info = `Type: ${metadata.source!.sourceType}\nCreator: ${metadata.source!.creator} (${metadata.source!.creatorType})`
                    if (metadata.source!.sourceUrl) info += `\nURL: ${metadata.source!.sourceUrl}`
                    if (metadata.source!.sourceFilename) info += `\nFile: ${metadata.source!.sourceFilename}`
                    info += `\nCreated: ${new Date(metadata.source!.createdAt).toISOString()}`
                    if (metadata.source!.uploadedAt) info += `\nUploaded: ${new Date(metadata.source!.uploadedAt).toISOString()}`
                    return info
                  }
                }}
                options={[
                  {
                    id: 'source-json',
                    label: 'JSON',
                    icon: CopyIcons.json,
                    getData: () => JSON.stringify(metadata.source, null, 2)
                  },
                ]}
              />
            </div>
          </ExpandableSection>
        )}

        {/* Backlinks - Auto-expand when backlinks are found (configurable) */}
        <ExpandableSection
          title={`Backlinks${backlinksCount > 0 ? ` (${backlinksCount})` : ''}`}
          icon={<Link2 className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
          defaultExpanded={autoExpandBacklinks && backlinksCount > 0}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800/50">
              <span className={`font-mono ${textSizeClasses.xs} text-zinc-600 dark:text-zinc-400 truncate flex-1`}>{currentFile.path}</span>
              <CopyButton
                primary={{ 
                  id: 'path', 
                  label: 'Copy path', 
                  getData: () => currentFile.path 
                }}
                options={[
                  { 
                    id: 'path-md-link', 
                    label: 'MD Link', 
                    icon: CopyIcons.markdown, 
                    getData: () => `[${metadata.title || currentFile.name}](${currentFile.path})` 
                  },
                  { 
                    id: 'path-url', 
                    label: 'GitHub URL', 
                    icon: CopyIcons.text, 
                    getData: () => `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/blob/${REPO_CONFIG.BRANCH}/${currentFile.path}` 
                  },
                ]}
              />
            </div>
            <BacklinkList currentPath={currentFile.path} files={allFiles} />
          </div>
        </ExpandableSection>

        {/* GitHub API Access - at the end */}
        <ExpandableSection
          title="API Access"
          icon={<KeyRound className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
          defaultExpanded={false}
        >
          <div className={`space-y-1.5 ${textSizeClasses.base} text-zinc-600 dark:text-zinc-300`}>
            {hasSavedPat ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <Check className={panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} style={{ color: 'rgb(22 163 74)' }} />
                  <p className={`${textSizeClasses.xs} font-mono text-emerald-600 dark:text-emerald-400 truncate flex-1`}>
                    {showPat ? preferences.githubPAT : obfuscatedPat}
                  </p>
                  <button type="button" onClick={() => setShowPat(p => !p)} className="text-emerald-600">
                    {showPat ? <EyeOff className={panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} /> : <Eye className={panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} />}
                  </button>
                </div>
                <button type="button" onClick={handleClearPat} className={`w-full ${textSizeClasses.xs} text-zinc-500 hover:text-red-500`}>
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="password"
                  value={patValue}
                  onChange={(e) => setPatValue(e.target.value)}
                  placeholder="ghp_..."
                  className={`w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 font-mono ${textSizeClasses.xs}`}
                />
                <button
                  type="button"
                  onClick={handleSavePat}
                  disabled={!patValue.trim()}
                  className={`w-full rounded px-2 py-1 ${textSizeClasses.xs} font-medium text-white disabled:opacity-50 ${
                    patSaved ? 'bg-emerald-600' : 'bg-cyan-600 hover:bg-cyan-500'
                  }`}
                >
                  {patSaved ? 'Saved!' : 'Save'}
                </button>
              </div>
            )}
            <p className={`${textSizeClasses.xs} text-zinc-400`}>Browser-only</p>
          </div>
        </ExpandableSection>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: TASKS - Extracted tasks from strand markdown + linked tasks
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'tasks' && currentFile && (
          <StrandTasksPanel
            strandPath={currentFile.path}
            content={content}
            theme={theme}
          />
        )}
        {/* End of tab content */}

      </div>

      {/* Bottom Bar - Size Controls + Scroll to Top */}
      {onPanelSizeChange && (
        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm px-3 py-2">
          <div className="flex items-center justify-between">
            {/* Keyboard shortcuts */}
            <div className={`flex gap-1.5 ${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500`}>
              <span><kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[9px] font-mono">m</kbd></span>
              <span><kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[9px] font-mono">/</kbd></span>
            </div>
            
            {/* Size Controls + Scroll to Top */}
            <div className="flex items-center gap-2">
              {/* Scroll to Top button */}
              <button
                onClick={() => {
                  // Scroll main content area to top
                  const contentArea = document.querySelector('.codex-content-scroll')
                  if (contentArea) {
                    contentArea.scrollTo({ top: 0, behavior: 'smooth' })
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                className="p-1.5 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/40 text-zinc-400 hover:text-cyan-600 dark:text-zinc-500 dark:hover:text-cyan-400 transition-colors border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800"
                title="Scroll to top"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 15l-6-6-6 6"/>
                  <path d="M18 9l-6-6-6 6" opacity="0.5"/>
                </svg>
              </button>
              
              {/* Size Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const sizes: ('s' | 'm' | 'l')[] = ['s', 'm', 'l']
                    const idx = sizes.indexOf(panelSize)
                    if (idx > 0) onPanelSizeChange(sizes[idx - 1])
                  }}
                  disabled={panelSize === 's'}
                  className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-500 dark:text-zinc-400 transition-colors"
                  title="Decrease size"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-700">
                  {(['s', 'm', 'l'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => onPanelSizeChange(size)}
                      className={`
                        px-2 py-1 font-bold uppercase rounded transition-all text-[10px]
                        ${panelSize === size
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }
                      `}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => {
                    const sizes: ('s' | 'm' | 'l')[] = ['s', 'm', 'l']
                    const idx = sizes.indexOf(panelSize)
                    if (idx < 2) onPanelSizeChange(sizes[idx + 1])
                  }}
                  disabled={panelSize === 'l'}
                  className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-500 dark:text-zinc-400 transition-colors"
                  title="Increase size"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Path Popup */}
      <LearningPathPopup
        isOpen={learningPathOpen}
        onClose={() => setLearningPathOpen(false)}
        metadata={metadata}
        currentPath={currentFile?.path || currentPath}
        onNavigate={onNavigate}
        theme={theme}
      />
    </div>
  )
}
