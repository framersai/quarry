/**
 * Content display area for Quarry Codex viewer
 * Renders markdown files with syntax highlighting and wiki features
 * @module codex/CodexContent
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import ImageLightbox from './ui/ImageLightbox'
import MediaViewer from './ui/MediaViewer'
import CodePreview from './ui/CodePreview'
import CoverImageBanner from './ui/CoverImageBanner'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { ExternalLink, Book, FileText, Code, Edit3, CloudOff, Send, GitBranch, Network, Sparkles } from 'lucide-react'
import CopyButton, { CopyIcons } from './ui/CopyButton'
import CodeBlock from './ui/CodeBlock'
import StrandDownloadDropdown from './ui/StrandDownloadDropdown'
import { pathToPublicUrl } from './constants'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import type { GitHubFile, StrandMetadata, FileFilterScope } from './types'
import { pluginUIRegistry } from '@/lib/plugins/QuarryPluginAPI'
import { quarryPluginManager } from '@/lib/plugins/QuarryPluginManager'
import { visit } from 'unist-util-visit'

// Dynamic import for InlineMermaid to avoid SSR issues with mermaid
const InlineMermaid = dynamic(() => import('./ui/MermaidDiagram').then(mod => ({ default: mod.InlineMermaid })), {
  ssr: false,
  loading: () => (
    <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse">
      <div className="h-4 w-32 bg-zinc-300 dark:bg-zinc-700 rounded mb-2" />
      <div className="h-24 bg-zinc-200 dark:bg-zinc-600 rounded" />
    </div>
  )
})

// Dynamic import for MarkmapViewer to avoid SSR issues
const MarkmapViewer = dynamic(() => import('./ui/MarkmapViewer'), {
  ssr: false,
  loading: () => (
    <div className="p-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse">
      <div className="h-4 w-40 bg-zinc-300 dark:bg-zinc-700 rounded mb-4" />
      <div className="h-64 bg-zinc-200 dark:bg-zinc-600 rounded" />
    </div>
  )
})

// Dynamic import for GraphViewer to avoid SSR issues with D3
const GraphViewer = dynamic(() => import('./ui/GraphViewer'), {
  ssr: false,
  loading: () => (
    <div className="p-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse">
      <div className="h-4 w-40 bg-zinc-300 dark:bg-zinc-700 rounded mb-4" />
      <div className="h-64 bg-zinc-200 dark:bg-zinc-600 rounded" />
    </div>
  )
})

// Dynamic import for ConceptMapViewer
const ConceptMapViewer = dynamic(() => import('./ui/ConceptMapViewer'), {
  ssr: false,
  loading: () => (
    <div className="p-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse">
      <div className="h-4 w-40 bg-zinc-300 dark:bg-zinc-700 rounded mb-4" />
      <div className="h-64 bg-zinc-200 dark:bg-zinc-600 rounded" />
    </div>
  )
})
import { isMarkdownFile, isPreviewableTextFile, rewriteImageUrl, stripFrontmatter, shouldShowFile } from './utils'
import { extractConcepts } from '@/lib/mindmap/conceptExtractor'
import { remarkStripControlFlags } from '@/lib/remark/remarkStripControlFlags'
import { remarkAssetGallery } from '@/lib/remark/remarkAssetGallery'
import { remarkExecutableCode } from '@/lib/remark/remarkExecutableCode'
import { REPO_CONFIG } from './constants'
import { toast } from './ui/Toast'
import { ContentSkeleton } from './ui/Skeleton'
import { getScrollPosition, saveScrollPosition, checkDraftStatus, getDraft, deleteDraft } from '@/lib/localStorage'
import { useActiveHeading } from './hooks/useActiveHeading'

// Block indices are tracked within MarkdownWithBlockIds component
// for Reader Mode scroll synchronization

/**
 * Simple hash for content memoization (djb2 algorithm)
 * Faster than comparing entire strings
 */
function hashContent(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return hash >>> 0
}

/**
 * Heading CSS classes - defined once outside component to avoid recreation
 */
const HEADING_CLASSES: Record<number, string> = {
  1: 'text-4xl font-black bg-gradient-to-r from-zinc-900 via-cyan-700 to-zinc-900 dark:from-zinc-100 dark:via-cyan-400 dark:to-zinc-100 bg-clip-text text-transparent',
  2: 'text-3xl font-bold text-zinc-900 dark:text-white',
  3: 'text-2xl font-bold text-zinc-800 dark:text-zinc-100',
  4: 'text-xl font-semibold text-zinc-800 dark:text-zinc-200',
  5: 'text-lg font-semibold text-zinc-700 dark:text-zinc-300',
  6: 'text-base font-semibold text-zinc-600 dark:text-zinc-400',
}

/**
 * Remark/Rehype plugins array - defined once to prevent recreation
 */
const REMARK_PLUGINS = [remarkGfm, remarkStripControlFlags, remarkAssetGallery, remarkExecutableCode]
const REHYPE_PLUGINS = [rehypeRaw]

/**
 * MarkdownWithBlockIds component
 * Renders markdown with data-block-id attributes for Reader Mode scroll sync
 *
 * PERFORMANCE: Wrapped in React.memo with custom comparison
 * - Only re-renders when content hash changes, not on every parent render
 * - Components object is memoized to prevent ReactMarkdown re-parsing
 */
interface MarkdownWithBlockIdsProps {
  content: string
  currentPath: string
  onNavigate: (path: string) => void
  onFetchFile: (file: GitHubFile) => void
}

const MarkdownWithBlockIds = React.memo(function MarkdownWithBlockIds({
  content,
  currentPath,
  onNavigate,
  onFetchFile
}: MarkdownWithBlockIdsProps) {
  // Track block index for generating unique IDs
  const blockIndexRef = useRef(0)

  // Reset block index on content change
  useEffect(() => {
    blockIndexRef.current = 0
  }, [content])

  // Quarry Plugin System: Subscribe to plugin renderers
  const [pluginRenderers, setPluginRenderers] = useState<typeof pluginUIRegistry.allRenderers>([])
  const pluginComponentCacheRef = useRef<Map<string, { Component: React.ComponentType<any>; props: any }>>(new Map())

  useEffect(() => {
    setPluginRenderers(pluginUIRegistry.allRenderers)
    const unsubscribe = pluginUIRegistry.onChange(() => {
      setPluginRenderers([...pluginUIRegistry.allRenderers])
      pluginComponentCacheRef.current.clear() // Clear cache on renderer changes
    })
    return unsubscribe
  }, [])

  // Clear component cache when content changes
  useEffect(() => {
    pluginComponentCacheRef.current.clear()
  }, [content])

  // Memoize the block ID generator
  const getNextBlockId = useCallback(() => {
    const id = `block-${blockIndexRef.current}`
    blockIndexRef.current++
    return id
  }, [])

  // Create heading factory - memoized
  const createHeading = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    const Tag = `h${level}` as const
    return function HeadingComponent({ children, ...props }: any) {
      // Extract text content from children (handles nested elements like <code>, <strong>, etc.)
      const getTextContent = (node: any): string => {
        if (typeof node === 'string') return node
        if (Array.isArray(node)) return node.map(getTextContent).join('')
        if (node?.props?.children) return getTextContent(node.props.children)
        return ''
      }
      
      const textContent = getTextContent(children)
      const slug = textContent
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      const blockId = getNextBlockId()

      return React.createElement(Tag, {
        id: slug,
        'data-heading-slug': slug, // Add data attribute for TOC navigation
        'data-block-id': blockId,
        'data-block-type': 'heading',
        'data-heading-level': level,
        className: HEADING_CLASSES[level],
        ...props,
      }, children)
    }
  }, [getNextBlockId])

  // Quarry Plugin System: Create remark plugin for plugin renderers
  const pluginRenderersRemarkPlugin = useMemo(() => {
    return () => (tree: any) => {
      const activeRenderers = pluginRenderers.filter(({ pluginId }) =>
        quarryPluginManager.isEnabled(pluginId)
      )

      // Sort by priority (higher first)
      activeRenderers.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0))

      // Walk the markdown AST looking for text nodes
      visit(tree, 'text', (node: any, index: number | null | undefined, parent: any) => {
        if (!parent || index == null) return

        let value = node.value as string

        // Try each renderer in priority order
        for (const { pluginId, options } of activeRenderers) {
          try {
            const matches = value.match(options.pattern)
            if (matches) {
              // Generate unique component ID
              const componentId = `plugin-render-${pluginId}-${Math.random().toString(36).substr(2, 9)}`

              // Store component and props in cache
              pluginComponentCacheRef.current.set(componentId, {
                Component: options.component,
                props: {
                  match: matches,
                  content: value,
                  pluginId
                }
              })

              // Replace text node with HTML placeholder
              parent.children[index] = {
                type: 'html',
                value: `<span data-plugin-component="${componentId}"></span>`
              }

              break // First match wins (by priority)
            }
          } catch (error) {
            console.error(`[Plugin:${pluginId}] Renderer error:`, error)
          }
        }
      })
    }
  }, [pluginRenderers])

  // Memoize the components object to prevent ReactMarkdown re-parsing
  // This is critical for performance - ReactMarkdown re-parses when components change
  // Track executable info from pre element to pass to code child
  const preExecutableInfoRef = useRef<{ isExecutable: boolean; execId?: string; meta?: string } | null>(null)

  const components = useMemo(() => ({
          // Allow raw HTML (for divs, images, etc.)
          div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
          img: ({ src = '', alt = '', ...imgProps }: any) => {
            const fixedSrc = rewriteImageUrl(src, REPO_CONFIG.OWNER, REPO_CONFIG.NAME, REPO_CONFIG.BRANCH)
            return <img src={fixedSrc} alt={alt} {...imgProps} />
          },
          // Pre element handler - extracts executable info for the child code element
          pre: ({ children, node, className, ...props }: any) => {
            // Extract executable info from pre element and store in ref
            const hProps = node?.data?.hProperties || node?.properties || {}
            const meta = node?.data?.meta || hProps['data-meta'] || ''
            const preClassName = className || hProps.className || ''

            const isExecutable = (
              String(preClassName).includes('executable') ||
              hProps['data-executable'] === 'true' ||
              /\bexec\b/.test(String(meta))
            )
            const execIdMatch = /exec-id-(exec-\d+)/.exec(String(preClassName))
            const execId = execIdMatch?.[1] || (hProps['data-exec-id'] as string) || undefined

            // Store for the code child to access
            preExecutableInfoRef.current = { isExecutable, execId, meta: String(meta) }

            // Just render children (the code element will handle display)
            return <>{children}</>
          },
          // Paragraphs with data-block-id for Reader Mode
          p: ({ children, ...props }: any) => {
            const blockId = getNextBlockId()
            return (
              <p data-block-id={blockId} data-block-type="paragraph" {...props}>
                {children}
              </p>
            )
          },
          // Code blocks with syntax highlighting, copy button, and language selector
          // Supports executable code blocks with `exec` attribute in markdown
          code: function CodeBlockRenderer(codeProps: any) {
            const { inline, className, children, node, ...props } = codeProps as {
              inline?: boolean
              className?: string
              children?: React.ReactNode
              node?: { data?: { hProperties?: Record<string, unknown>; meta?: string }; meta?: string }
            } & React.HTMLAttributes<HTMLElement>

            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const codeString = String(children ?? '').replace(/\n$/, '')

            // Check for executable code block from multiple sources:
            // 1. preExecutableInfoRef (set by parent pre element - most reliable)
            // 2. className (from hProperties via rehype)
            // 3. node.data.hProperties (from remark plugin)
            // 4. node.meta or node.data.meta (raw meta string containing "exec")
            const preInfo = preExecutableInfoRef.current
            const hProps = node?.data?.hProperties || {}
            const meta = node?.meta || node?.data?.meta || preInfo?.meta || ''
            const isExecutable = (
              preInfo?.isExecutable ||
              className?.includes('executable') ||
              hProps['data-executable'] === 'true' ||
              /\bexec\b/.test(String(meta))
            )
            const execIdMatch = /exec-id-(exec-\d+)/.exec(className || '')
            const execId = execIdMatch?.[1] || (hProps['data-exec-id'] as string) || preInfo?.execId || undefined

            // Clear the ref after reading (for the next code block)
            if (preInfo) {
              preExecutableInfoRef.current = null
            }

            if (!inline && (match || codeString.includes('\n'))) {
              const blockId = getNextBlockId()

              // Render Mermaid diagrams with InlineMermaid component
              if (language === 'mermaid') {
                return (
                  <div data-block-id={blockId} data-block-type="mermaid">
                    <InlineMermaid code={codeString} />
                  </div>
                )
              }

              return (
                <CodeBlock
                  code={codeString}
                  language={language}
                  blockId={blockId}
                  execId={execId}
                  executable={isExecutable}
                />
              )
            }
            // Inline code
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[0.9em] font-mono border border-zinc-200 dark:border-zinc-700"
                {...props}
              >
                {children}
              </code>
            )
          },
          // Styled headings with anchor IDs and data-block-id
          h1: createHeading(1),
          h2: createHeading(2),
          h3: createHeading(3),
          h4: createHeading(4),
          h5: createHeading(5),
          h6: createHeading(6),
          // Styled blockquotes with data-block-id
          blockquote: ({ children, ...props }: any) => {
            const blockId = getNextBlockId()
            return (
              <blockquote
                data-block-id={blockId}
                data-block-type="blockquote"
                className="border-l-4 border-cyan-500 pl-4 py-2 bg-cyan-50/30 dark:bg-cyan-900/10 rounded-r-lg my-4"
                {...props}
              >
                {children}
              </blockquote>
            )
          },
          // Lists with data-block-id
          ul: ({ children, ...props }: any) => {
            const blockId = getNextBlockId()
            return (
              <ul data-block-id={blockId} data-block-type="list" {...props}>
                {children}
              </ul>
            )
          },
          ol: ({ children, ...props }: any) => {
            const blockId = getNextBlockId()
            return (
              <ol data-block-id={blockId} data-block-type="list" {...props}>
                {children}
              </ol>
            )
          },
          // Tables with data-block-id
          table: ({ children, ...props }: any) => {
            const blockId = getNextBlockId()
            return (
              <div data-block-id={blockId} data-block-type="table" className="overflow-x-auto">
                <table {...props}>{children}</table>
              </div>
            )
          },
          // Handle internal wiki links
          a: ({ href, children, ...props }: any) => {
            // Internal wiki links
            if (href?.startsWith('./') || href?.startsWith('../')) {
              const linkedPath = currentPath + '/' + href
              return (
                <button
                  onClick={() => {
                    const normalizedPath = linkedPath
                      .replace(/\/\./g, '/')
                      .replace(/\/[^/]+\/\.\./g, '/')
                    if (normalizedPath.endsWith('.md')) {
                      onFetchFile({
                        path: normalizedPath,
                        name: normalizedPath.split('/').pop() || '',
                        type: 'file',
                        download_url: `https://raw.githubusercontent.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/${REPO_CONFIG.BRANCH}/${normalizedPath}`,
                        html_url: `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/blob/${REPO_CONFIG.BRANCH}/${normalizedPath}`,
                        sha: '',
                        url: '',
                      })
                    } else {
                      onNavigate(normalizedPath)
                    }
                  }}
                  className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 underline"
                >
                  {children}
                </button>
              )
            }
            // In-page anchor links (e.g., citations, TOC links)
            if (href?.startsWith('#')) {
              return (
                <a
                  href={href}
                  onClick={e => {
                    e.preventDefault()
                    const rawId = decodeURIComponent(href.slice(1))

                    // Helper to slugify an ID the same way headings are processed
                    const slugify = (text: string) => text
                      .toLowerCase()
                      .replace(/[^\w\s-]/g, '')
                      .replace(/\s+/g, '-')
                      .replace(/-+/g, '-')
                      .trim()

                    // Try multiple strategies to find the target element
                    let el: Element | null = null

                    // 1. Try exact ID match
                    el = document.getElementById(rawId)

                    // 2. Try slugified version of the ID
                    if (!el) {
                      const slugifiedId = slugify(rawId)
                      el = document.getElementById(slugifiedId)
                    }

                    // 3. Try finding by data-heading-slug attribute
                    if (!el) {
                      const slugifiedId = slugify(rawId)
                      el = document.querySelector(`[data-heading-slug="${slugifiedId}"]`)
                    }

                    // 4. Try case-insensitive search through all headings
                    if (!el) {
                      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
                      const normalizedTarget = rawId.toLowerCase().replace(/[-_\s]+/g, '')
                      for (const heading of headings) {
                        const headingText = heading.textContent?.toLowerCase().replace(/[-_\s]+/g, '') || ''
                        if (headingText === normalizedTarget || heading.id.toLowerCase().replace(/[-_\s]+/g, '') === normalizedTarget) {
                          el = heading
                          break
                        }
                      }
                    }

                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      // Optionally update the hash in the URL
                      if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, '', href)
                      } else {
                        window.location.hash = href
                      }
                    }
                  }}
                  className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 underline"
                  {...props}
                >
                  {children}
                </a>
              )
            }
            // Default external or absolute links
            return (
              <a href={href} className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 underline" {...props}>
                {children}
              </a>
            )
          },
          // Quarry Plugin System: Custom span component for plugin renderers
          span: ({ children, ...props }: any) => {
            const componentId = props['data-plugin-component']
            if (componentId && pluginComponentCacheRef.current.has(componentId)) {
              const { Component, props: componentProps } = pluginComponentCacheRef.current.get(componentId)!
              return (
                <span className="plugin-renderer-wrapper">
                  <Component {...componentProps} />
                </span>
              )
            }
            return <span {...props}>{children}</span>
          },
  }), [createHeading, currentPath, getNextBlockId, onFetchFile, onNavigate, pluginRenderers])

  // Memoize stripped content to avoid re-processing on every render
  const strippedContent = useMemo(() => stripFrontmatter(content), [content])

  // Quarry Plugin System: Combine built-in and plugin remark plugins
  const allRemarkPlugins = useMemo(() => {
    return [...REMARK_PLUGINS, pluginRenderersRemarkPlugin]
  }, [pluginRenderersRemarkPlugin])

  return (
    <article className="prose prose-codex prose-sm sm:prose-base lg:prose-lg max-w-none prose-img:rounded-xl">
      <ReactMarkdown
        remarkPlugins={allRemarkPlugins}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {strippedContent}
      </ReactMarkdown>
    </article>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if content hash changes or callbacks change
  // This prevents re-renders when parent state changes but content is the same
  return (
    hashContent(prevProps.content) === hashContent(nextProps.content) &&
    prevProps.currentPath === nextProps.currentPath &&
    prevProps.onNavigate === nextProps.onNavigate &&
    prevProps.onFetchFile === nextProps.onFetchFile
  )
})

// Lazy load inline editor to keep initial bundle small
const InlineEditor = dynamic(() => import('./ui/InlineEditor'), {
  ssr: false,
  loading: () => <div className="p-4 text-zinc-500 animate-pulse">Loading editor...</div>
})

// Lazy load inline WYSIWYG editor (Medium-style)
const InlineWYSIWYGEditor = dynamic(() => import('./ui/InlineWYSIWYGEditor'), {
  ssr: false,
  loading: () => <div className="p-4 text-zinc-500 animate-pulse">Loading editor...</div>
})

// Lazy load publish modal
const PublishModal = dynamic(() => import('./ui/PublishModal'), { ssr: false })

// Directory explorer for clean folder navigation
import DirectoryExplorer from './ui/DirectoryExplorer'

interface CodexContentProps {
  /** Currently selected file */
  file: GitHubFile | null
  /** File content */
  content: string
  /** Parsed metadata */
  metadata: StrandMetadata
  /** Loading state */
  loading: boolean
  /** Current directory path */
  currentPath: string
  /** Navigate to path */
  onNavigate: (path: string) => void
  /** Fetch file content */
  onFetchFile: (file: GitHubFile) => void
  /** Current pathname (for URL building) */
  pathname: string
  /** Whether to remember scroll position (from preferences) */
  rememberScrollPosition?: boolean
  /** Current theme */
  theme?: string
  /** Callback when user wants to publish changes */
  onPublish?: (content: string, metadata: StrandMetadata) => void
  /** Files in current directory (for folder browser view) */
  files?: GitHubFile[]
  /** Handle file click in folder browser view */
  onFileClick?: (file: GitHubFile) => void
  /** Current file filter scope */
  filterScope?: FileFilterScope
  /** Callback when active heading changes (for TOC sync) */
  onActiveHeadingChange?: (slug: string | null) => void
  /** Whether to show GitHub options in export (only for GitHub backend) */
  showGitHubOptions?: boolean
  /** All files in the knowledge base (for resolving related strands in export) */
  allFiles?: GitHubFile[]
  /** Total strand count (dynamic) */
  totalStrands?: number
  /** Total weave count (dynamic) */
  totalWeaves?: number
  /** Total loom count (dynamic) */
  totalLooms?: number
}

/**
 * Main content display area with markdown rendering
 * 
 * @remarks
 * - Renders markdown with syntax highlighting
 * - Handles internal wiki links (relative paths)
 * - Rewrites image URLs to raw GitHub
 * - Shows empty state with quick guide
 * - Analog styling: Paper texture, inner shadow
 * - Mobile responsive typography
 * 
 * @example
 * ```tsx
 * <CodexContent
 *   file={selectedFile}
 *   content={fileContent}
 *   metadata={fileMetadata}
 *   loading={loading}
 *   currentPath={currentPath}
 *   onNavigate={navigate}
 *   onFetchFile={fetchFile}
 *   pathname={pathname}
 * />
 * ```
 */
export default function CodexContent({
  file,
  content,
  metadata,
  loading,
  currentPath,
  onNavigate,
  onFetchFile,
  pathname,
  rememberScrollPosition = true,
  theme = 'light',
  onPublish,
  files = [],
  onFileClick,
  filterScope = 'all',
  onActiveHeadingChange,
  showGitHubOptions = false,
  allFiles = [],
  totalStrands = 0,
  totalWeaves = 0,
  totalLooms = 0,
}: CodexContentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<any[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastSavedScrollRef = useRef<number>(0)
  const isRestoringScrollRef = useRef(false)
  
  // Inline editing state - 'read' | 'inline' (WYSIWYG) | 'full' (raw markdown)
  type EditMode = 'read' | 'inline' | 'full'
  const [editMode, setEditMode] = useState<EditMode>('read')
  const isEditing = editMode !== 'read' // Backward compatibility
  const [editContent, setEditContent] = useState(content)
  const [hasDraft, setHasDraft] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)

  // Mind map view toggle and type
  const [showMindmap, setShowMindmap] = useState(false)
  const [mindmapType, setMindmapType] = useState<'hierarchy' | 'graph' | 'concept'>('hierarchy')
  
  const isDark = theme.includes('dark')
  
  // Track active heading for TOC synchronization
  // contentKey ensures re-observation when navigating to different files
  const { setContentRef: setActiveHeadingRef, recalculatePositions } = useActiveHeading({
    onActiveChange: onActiveHeadingChange,
    scrollOffset: 120, // Heading is "active" when within 120px of scroll top
    contentKey: file?.path || '', // Re-observe when file changes
    debug: process.env.NODE_ENV === 'development', // Enable debug logging in dev
  })
  
  // Memoized ref callback to prevent infinite re-renders
  // DO NOT use inline arrow function for refs that trigger state updates
  const scrollContentRef = useCallback((node: HTMLDivElement | null) => {
    (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    setActiveHeadingRef(node)
  }, [setActiveHeadingRef])

  // Filter files based on current filter scope
  const filteredFiles = useMemo(() => {
    if (!files.length) return []
    return files.filter(f => shouldShowFile(f, filterScope, false, files))
  }, [files, filterScope])

  // Memoize concept extraction for concept map view
  const conceptData = useMemo(() => {
    if (mindmapType !== 'concept') return { nodes: [], edges: [] }
    const textContent = hasDraft ? editContent : content
    return extractConcepts(textContent, { minFrequency: 1, maxConcepts: 30 })
  }, [mindmapType, hasDraft, editContent, content])

  // Check for existing draft when file changes
  useEffect(() => {
    if (file?.path) {
      const { hasDraft: draftExists, draft } = checkDraftStatus(file.path, content)
      setHasDraft(draftExists)
      if (draftExists && draft) {
        setEditContent(draft.content)
      } else {
        setEditContent(content)
      }
    }
  }, [file?.path, content])

  // Update edit content when original content changes (unless editing)
  useEffect(() => {
    if (!isEditing && !hasDraft) {
      setEditContent(content)
    }
  }, [content, isEditing, hasDraft])

  // Handle content change from editor
  const handleContentChange = (newContent: string) => {
    setEditContent(newContent)
    // Update hasDraft status
    setHasDraft(newContent !== content)
  }

  // Handle publish
  const handlePublish = (publishContent: string) => {
    if (onPublish) {
      onPublish(publishContent, metadata)
    }
  }

  // Ref to store scroll position when entering edit mode
  const editModeScrollRef = useRef<number>(0)

  // Handle edit mode changes with scroll position preservation
  const handleEditModeChange = useCallback((newMode: EditMode) => {
    // Save current scroll position before changing mode
    if (scrollContainerRef.current) {
      editModeScrollRef.current = scrollContainerRef.current.scrollTop
    }

    setEditMode(newMode)

    // Restore scroll position after DOM updates
    requestAnimationFrame(() => {
      if (scrollContainerRef.current && editModeScrollRef.current > 0) {
        scrollContainerRef.current.scrollTop = editModeScrollRef.current
      }
    })
  }, [])

  // Restore original content and exit edit mode
  const handleRestoreDraft = () => {
    if (file?.path) {
      const draft = getDraft(file.path)
      if (draft) {
        setEditContent(draft.content)
        handleEditModeChange('full') // Open full editor for drafts
        toast.success('Draft restored')
      }
    }
  }

  // Dismiss draft notification
  const handleDismissDraft = () => {
    if (file?.path) {
      deleteDraft(file.path)
      setHasDraft(false)
      setEditContent(content)
      toast.success('Draft discarded')
    }
  }

  // Debounced scroll position save
  const saveScrollDebounced = useCallback(
    (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      if (!file?.path || !rememberScrollPosition || isRestoringScrollRef.current) return
      
      const scrollPercent = scrollHeight > clientHeight
        ? Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
        : 0
      
      // Only save if position changed significantly (> 50px or > 5%)
      if (
        Math.abs(scrollTop - lastSavedScrollRef.current) > 50 ||
        scrollPercent === 0 ||
        scrollPercent === 100
      ) {
        lastSavedScrollRef.current = scrollTop
        saveScrollPosition(file.path, scrollTop, scrollPercent)
      }
    },
    [file?.path, rememberScrollPosition]
  )

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !rememberScrollPosition) return

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        saveScrollDebounced(container.scrollTop, container.scrollHeight, container.clientHeight)
      }, 300)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [saveScrollDebounced, rememberScrollPosition])

  // Restore scroll position when file changes
  useEffect(() => {
    if (!file?.path || !rememberScrollPosition || loading) return

    const container = scrollContainerRef.current
    if (!container) return

    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(() => {
      const savedPosition = getScrollPosition(file.path)
      if (savedPosition && savedPosition.scrollTop > 0) {
        isRestoringScrollRef.current = true
        container.scrollTo({
          top: savedPosition.scrollTop,
          behavior: 'auto', // Use instant scroll for restoration
        })
        lastSavedScrollRef.current = savedPosition.scrollTop
        
        // Reset flag after a short delay
        setTimeout(() => {
          isRestoringScrollRef.current = false
        }, 100)
      } else {
        // Reset to top for new files
        container.scrollTo({ top: 0, behavior: 'auto' })
        lastSavedScrollRef.current = 0
      }
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [file?.path, rememberScrollPosition, loading])

  // Set up lightbox handler on mount
  useEffect(() => {
    (window as any).openLightbox = (index: number) => {
      // Extract all gallery images from the page
      const galleryItems = document.querySelectorAll('[data-lightbox="true"]')
      const images = Array.from(galleryItems).map((item: any) => ({
        filename: item.dataset.lightboxUrl?.split('/').pop() || 'image',
        url: item.dataset.lightboxUrl || '',
        alt: item.dataset.lightboxAlt || '',
      }))
      
      setLightboxImages(images)
      setLightboxIndex(index)
      setLightboxOpen(true)
    }

    return () => {
      delete (window as any).openLightbox
    }
  }, [])

  return (
    <div className="codex-content flex-1 bg-white dark:bg-zinc-900 overflow-x-hidden flex flex-col relative min-h-0">
      {/* Analog Paper Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Inner Shadow for Depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06), inset 0 -2px 8px rgba(0,0,0,0.03)',
        }}
      />

      {file ? (
        <>
          {/* File Header - Elegant Document Title */}
          <div className={`
            relative border-b
            ${isDark
              ? 'bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 border-zinc-800/60'
              : 'bg-gradient-to-b from-zinc-50 to-white/80 border-zinc-200/80'
            }
          `}>
            {/* Subtle top accent line */}
            <div className={`
              absolute top-0 left-0 right-0 h-[2px]
              bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent
            `} />

            <div className="px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-start sm:items-center justify-between gap-4 sm:gap-6">
                {/* Title Section - Enhanced Typography */}
                <div className="flex-1 min-w-0">
                  {/* Document Type Icon + Title */}
                  <div className="flex items-start sm:items-center gap-2.5 mb-1">
                    <div className={`
                      flex-shrink-0 p-1.5 rounded-lg
                      ${isDark
                        ? 'bg-zinc-800/80'
                        : 'bg-zinc-100'
                      }
                    `}>
                      <FileText className={`
                        w-4 h-4 sm:w-5 sm:h-5
                        ${isDark ? 'text-cyan-400' : 'text-cyan-600'}
                      `} />
                    </div>
                    <h1 className={`
                      font-semibold tracking-tight leading-snug
                      text-base sm:text-lg md:text-xl
                      ${isDark
                        ? 'text-white'
                        : 'text-zinc-900'
                      }
                    `}>
                      <span className="line-clamp-2 sm:line-clamp-1">
                        {metadata.title || file.name.replace(/\.md$/, '').replace(/-/g, ' ')}
                      </span>
                    </h1>
                  </div>

                  {/* Meta badges - Below title */}
                  <div className="flex items-center gap-2 ml-9 sm:ml-10 flex-wrap">
                    {metadata.id && (
                      <span className={`
                        text-[10px] px-1.5 py-0.5 rounded font-mono
                        ${isDark
                          ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }
                      `}>
                        {metadata.id.substring(0, 8)}
                      </span>
                    )}
                    {metadata.version && (
                      <span className={`
                        text-[10px] px-1.5 py-0.5 rounded font-medium
                        ${isDark
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }
                      `}>
                        v{metadata.version}
                      </span>
                    )}
                    {metadata.status && (
                      <span className={`
                        text-[10px] px-1.5 py-0.5 rounded font-medium capitalize
                        ${metadata.status === 'draft'
                          ? isDark
                            ? 'bg-amber-900/40 text-amber-400 border border-amber-800/50'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          : metadata.status === 'published'
                            ? isDark
                              ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-800/50'
                              : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : isDark
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }
                      `}>
                        {metadata.status}
                      </span>
                    )}
                  </div>
                </div>
              
              {/* Actions - Touch-optimized (min 40px touch targets) */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                {/* Draft indicator */}
                {hasDraft && !isEditing && (
                  <div className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium
                    min-h-[36px] sm:min-h-[32px]
                    ${isDark
                      ? 'bg-amber-900/30 text-amber-400 border border-amber-800/40'
                      : 'bg-amber-100 text-amber-600 border border-amber-200'
                    }
                  `}>
                    <CloudOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Draft</span>
                  </div>
                )}

                {/* Edit toggle with mode dropdown */}
                {isMarkdownFile(file.name) && (
                  <div className="relative group">
                    <button
                      onClick={() => {
                        if (isEditing) {
                          handleEditModeChange('read')
                        } else {
                          // Default to inline WYSIWYG mode
                          handleEditModeChange('inline')
                        }
                      }}
                      className={`
                        flex items-center justify-center
                        w-8 h-8 rounded-lg
                        transition-all duration-150
                        active:scale-95
                        ${isEditing
                          ? editMode === 'inline'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-cyan-600 text-white shadow-sm'
                          : isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                        }
                      `}
                      title={isEditing ? 'Exit edit mode' : 'Edit this strand'}
                      aria-label={isEditing ? 'Exit edit mode' : 'Edit this strand'}
                    >
                      {/* Custom Edit Icon */}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      >
                        {isEditing ? (
                          /* Check mark when editing */
                          <>
                            <path d="M20 6L9 17l-5-5" />
                          </>
                        ) : (
                          /* Pencil icon for edit */
                          <>
                            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </>
                        )}
                      </svg>
                    </button>
                    {/* Mode dropdown - shows on hover when not editing */}
                    {!isEditing && (
                      <div className={`
                        absolute right-0 top-full mt-1 py-1 rounded-lg shadow-xl border z-50
                        opacity-0 invisible group-hover:opacity-100 group-hover:visible
                        transition-all duration-150 min-w-[160px]
                        ${isDark
                          ? 'bg-zinc-800 border-zinc-700'
                          : 'bg-white border-zinc-200'
                        }
                      `}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditModeChange('inline') }}
                          className={`
                            w-full px-3 py-2 text-left text-sm flex items-center gap-2
                            ${isDark ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-700'}
                          `}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                          <span>Inline Edit</span>
                          <span className={`text-xs ml-auto ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>WYSIWYG</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditModeChange('full') }}
                          className={`
                            w-full px-3 py-2 text-left text-sm flex items-center gap-2
                            ${isDark ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-700'}
                          `}
                        >
                          <Code className="w-4 h-4" />
                          <span>Full Editor</span>
                          <span className={`text-xs ml-auto ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Markdown</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* View Mode Dropdown - Markdown / Mindmap toggle */}
                {isMarkdownFile(file.name) && !isEditing && (
                  <div className="relative group">
                    <button
                      className={`
                        flex items-center justify-center gap-1
                        px-2 h-8 rounded-lg
                        transition-all duration-150
                        active:scale-95
                        ${showMindmap
                          ? 'bg-violet-600 text-white shadow-sm'
                          : isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                        }
                      `}
                      title={showMindmap ? 'Viewing as mind map' : 'Viewing markdown'}
                      aria-label="Toggle view mode"
                    >
                      {/* Custom icon based on current mode */}
                      {showMindmap ? (
                        /* Mindmap icon - interconnected nodes */
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <circle cx="12" cy="12" r="2.5" />
                          <circle cx="5" cy="6" r="1.5" />
                          <circle cx="19" cy="6" r="1.5" />
                          <circle cx="5" cy="18" r="1.5" />
                          <circle cx="19" cy="18" r="1.5" />
                          <path d="M10 10.5L6 7.5" />
                          <path d="M14 10.5L18 7.5" />
                          <path d="M10 13.5L6 16.5" />
                          <path d="M14 13.5L18 16.5" />
                        </svg>
                      ) : (
                        /* Markdown icon - document lines */
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M4 6h16" />
                          <path d="M4 10h12" />
                          <path d="M4 14h16" />
                          <path d="M4 18h8" />
                        </svg>
                      )}
                      {/* Dropdown chevron */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-60">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {/* Dropdown menu */}
                    <div className={`
                      absolute right-0 top-full mt-1 py-1 rounded-lg shadow-xl border z-50
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-150 min-w-[140px]
                      ${isDark
                        ? 'bg-zinc-800 border-zinc-700'
                        : 'bg-white border-zinc-200'
                      }
                    `}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowMindmap(false) }}
                        className={`
                          w-full px-3 py-2 text-left text-sm flex items-center gap-2.5
                          ${!showMindmap
                            ? isDark ? 'bg-zinc-700/50 text-zinc-100' : 'bg-zinc-100 text-zinc-900'
                            : isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                          }
                        `}
                      >
                        {/* Markdown icon */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4">
                          <path d="M4 6h16" />
                          <path d="M4 10h12" />
                          <path d="M4 14h16" />
                          <path d="M4 18h8" />
                        </svg>
                        <span>Markdown</span>
                        {!showMindmap && (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 ml-auto text-emerald-500">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowMindmap(true) }}
                        className={`
                          w-full px-3 py-2 text-left text-sm flex items-center gap-2.5
                          ${showMindmap
                            ? isDark ? 'bg-zinc-700/50 text-zinc-100' : 'bg-zinc-100 text-zinc-900'
                            : isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                          }
                        `}
                      >
                        {/* Mindmap icon */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4">
                          <circle cx="12" cy="12" r="2.5" />
                          <circle cx="5" cy="6" r="1.5" />
                          <circle cx="19" cy="6" r="1.5" />
                          <circle cx="5" cy="18" r="1.5" />
                          <circle cx="19" cy="18" r="1.5" />
                          <path d="M10 10.5L6 7.5" />
                          <path d="M14 10.5L18 7.5" />
                          <path d="M10 13.5L6 16.5" />
                          <path d="M14 13.5L18 16.5" />
                        </svg>
                        <span>Mindmap</span>
                        {showMindmap && (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 ml-auto text-violet-500">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Copy Link - Minimal */}
                <CopyButton
                  primary={{
                    id: 'canonical-url',
                    label: 'Copy URL',
                    getData: () => `${window.location.origin}${pathToPublicUrl(file.path)}`,
                  }}
                  options={[
                    {
                      id: 'query-url',
                      label: 'Query URL',
                      icon: CopyIcons.code,
                      getData: () => `${window.location.origin}${pathname}?path=${currentPath}&file=${file.path}`,
                    },
                    {
                      id: 'relative-path',
                      label: 'Path',
                      icon: CopyIcons.text,
                      getData: () => file.path,
                    },
                  ]}
                  size="xs"
                />
                {/* Export Dropdown - Advanced with all formats */}
                <StrandDownloadDropdown
                  filePath={file.path}
                  fileName={file.name}
                  theme={theme}
                  owner={REPO_CONFIG.OWNER}
                  repo={REPO_CONFIG.NAME}
                  branch={REPO_CONFIG.BRANCH}
                  showGitHubOptions={showGitHubOptions}
                  content={content}
                  metadata={metadata}
                  allFiles={allFiles}
                />
              </div>
              </div>
            </div>
          </div>
          
          {/* Draft notification banner */}
          {hasDraft && !isEditing && (
            <div className={`
              relative px-4 py-3 flex items-center justify-between gap-4
              ${isDark 
                ? 'bg-amber-900/20 border-b border-amber-800/50' 
                : 'bg-amber-50 border-b border-amber-200'
              }
            `}>
              <div className="flex items-center gap-3">
                <CloudOff className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                    You have an unpublished draft
                  </p>
                  <p className={`text-xs ${isDark ? 'text-amber-400/70' : 'text-amber-600/70'}`}>
                    Your changes are saved locally. Click Edit to continue or Publish to submit.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDismissDraft}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${isDark 
                      ? 'text-amber-400 hover:bg-amber-900/30' 
                      : 'text-amber-700 hover:bg-amber-100'
                    }
                  `}
                >
                  Discard
                </button>
                <button
                  onClick={handleRestoreDraft}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${isDark 
                      ? 'bg-amber-700 hover:bg-amber-600 text-white' 
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }
                  `}
                >
                  Continue editing
                </button>
                <button
                  onClick={() => setShowPublishModal(true)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${isDark 
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    }
                  `}
                >
                  <Send className="w-3 h-3" />
                  Publish
                </button>
              </div>
            </div>
          )}

          {/* Cover Image Banner */}
          {metadata.coverImage && (
            <div className="px-4 pt-4">
              <CoverImageBanner
                src={rewriteImageUrl(metadata.coverImage, REPO_CONFIG.OWNER, REPO_CONFIG.NAME, REPO_CONFIG.BRANCH)}
                alt={metadata.title || file.name}
                theme={theme}
                height="md"
                showOverlay={false}
              />
            </div>
          )}

          {/* File Content */}
          <div
            ref={scrollContentRef}
            className="codex-content-scroll flex-1 overflow-y-auto overscroll-contain relative touch-pan-y pb-20 md:pb-4 bg-white dark:bg-zinc-900"
            style={{
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 5rem, 5rem)'
            }}
          >
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
              {loading ? (
                <ContentSkeleton />
              ) : editMode === 'full' && isMarkdownFile(file.name) ? (
                /* Full Editor Mode - raw markdown with split/preview layout */
                <InlineEditor
                  filePath={file.path}
                  originalContent={content}
                  onContentChange={handleContentChange}
                  onPublish={onPublish ? handlePublish : undefined}
                  isEditing={true}
                  onToggleEdit={() => handleEditModeChange('read')}
                  theme={theme}
                  defaultLayout="split-horizontal"
                  metadata={{
                    title: metadata.title,
                    summary: metadata.summary,
                    tags: Array.isArray(metadata.tags) ? metadata.tags : metadata.tags ? [metadata.tags] : undefined,
                    author: metadata.author,
                    difficulty: typeof metadata.difficulty === 'string' ? metadata.difficulty : typeof metadata.difficulty === 'object' && metadata.difficulty?.overall ? String(metadata.difficulty.overall) : undefined,
                    contentType: metadata.content_type,
                  }}
                  renderPreview={(previewContent) => (
                    <article className="prose prose-sm sm:prose-base lg:prose-lg prose-zinc dark:prose-invert max-w-none prose-img:rounded-xl">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkStripControlFlags, remarkAssetGallery, remarkExecutableCode]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
                          img: ({ src = '', alt = '', ...imgProps }: any) => {
                            const fixedSrc = rewriteImageUrl(src, REPO_CONFIG.OWNER, REPO_CONFIG.NAME, REPO_CONFIG.BRANCH)
                            return <img src={fixedSrc} alt={alt} {...imgProps} />
                          },
                          code(codeProps) {
                            const { inline, className, children, ...props } = codeProps as {
                              inline?: boolean
                              className?: string
                              children?: React.ReactNode
                            } & React.HTMLAttributes<HTMLElement>
                            const match = /language-(\w+)/.exec(className || '')
                            const language = match ? match[1] : ''
                            const codeString = String(children ?? '').replace(/\n$/, '')
                            const isBlock = !inline && (match || codeString.includes('\n'))
                            // Check for executable code block from className
                            const isExecutable = className?.includes('executable') ?? false
                            const execIdMatch = /exec-id-(exec-\d+)/.exec(className || '')
                            const execId = execIdMatch ? execIdMatch[1] : undefined
                            return isBlock ? (
                              <CodeBlock
                                code={codeString}
                                language={language}
                                execId={execId}
                                executable={isExecutable}
                              />
                            ) : (
                              <code className="px-1.5 py-0.5 mx-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[0.9em] font-mono border border-zinc-200 dark:border-zinc-700" {...props}>
                                {children}
                              </code>
                            )
                          },
                        }}
                      >
                        {stripFrontmatter(previewContent)}
                      </ReactMarkdown>
                    </article>
                  )}
                />
              ) : editMode === 'inline' && isMarkdownFile(file.name) ? (
                /* Inline WYSIWYG Mode - Medium-style block editing */
                <InlineWYSIWYGEditor
                  content={stripFrontmatter(hasDraft ? editContent : content)}
                  filePath={file.path}
                  onContentChange={handleContentChange}
                  onPublish={onPublish ? handlePublish : undefined}
                  editable={true}
                  theme={theme}
                  originalContent={stripFrontmatter(content)}
                />
              ) : isMarkdownFile(file.name) ? (
                showMindmap ? (
                  /* Mind Map View - Interactive visualization with mode selector */
                  <div className="flex flex-col h-full">
                    {/* Mindmap Mode Selector */}
                    <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}`}>
                      <span className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>View:</span>
                      <div className={`flex gap-1 p-1 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                        <button
                          onClick={() => setMindmapType('hierarchy')}
                          className={`
                            px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-sm font-medium
                            ${mindmapType === 'hierarchy'
                              ? isDark ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'bg-white text-zinc-900 shadow-sm'
                              : isDark ? 'text-zinc-400 hover:bg-zinc-700/50' : 'text-zinc-600 hover:bg-zinc-50'
                            }
                          `}
                          title="Hierarchy view based on markdown headings"
                        >
                          <GitBranch className="w-4 h-4" />
                          <span>Hierarchy</span>
                        </button>
                        <button
                          onClick={() => setMindmapType('graph')}
                          className={`
                            px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-sm font-medium
                            ${mindmapType === 'graph'
                              ? isDark ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'bg-white text-zinc-900 shadow-sm'
                              : isDark ? 'text-zinc-400 hover:bg-zinc-700/50' : 'text-zinc-600 hover:bg-zinc-50'
                            }
                          `}
                          title="Knowledge graph showing relationships"
                        >
                          <Network className="w-4 h-4" />
                          <span>Graph</span>
                        </button>
                        <button
                          onClick={() => setMindmapType('concept')}
                          className={`
                            px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-sm font-medium
                            ${mindmapType === 'concept'
                              ? isDark ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'bg-white text-zinc-900 shadow-sm'
                              : isDark ? 'text-zinc-400 hover:bg-zinc-700/50' : 'text-zinc-600 hover:bg-zinc-50'
                            }
                          `}
                          title="Concept map extracted from content"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Concept</span>
                        </button>
                      </div>
                    </div>

                    {/* Mindmap Display based on selected type */}
                    <div className="flex-1 min-h-0">
                      {mindmapType === 'hierarchy' ? (
                        <MarkmapViewer
                          markdown={hasDraft ? editContent : content}
                          theme={theme as any}
                          height="calc(100vh - 300px)"
                          showToolbar={true}
                          autoFit={true}
                        />
                      ) : mindmapType === 'graph' ? (
                        <GraphViewer
                          graphData={{
                            nodes: [
                              { id: file?.name || 'current', name: file?.name?.replace('.md', '') || 'Current', type: 'current', path: file?.path || '', weight: 1 },
                              ...(metadata?.prerequisites?.map((p: string) => ({
                                id: p,
                                name: p.split('/').pop()?.replace('.md', '') || p,
                                type: 'prerequisite' as const,
                                path: p,
                                weight: 0.8
                              })) || []),
                              ...(metadata?.related?.map((r: string) => ({
                                id: r,
                                name: r.split('/').pop()?.replace('.md', '') || r,
                                type: 'sibling' as const,
                                path: r,
                                weight: 0.6
                              })) || [])
                            ],
                            links: [
                              ...(metadata?.prerequisites?.map((p: string) => ({
                                source: p,
                                target: file?.name || 'current',
                                strength: 0.8,
                                type: 'prerequisite' as const
                              })) || []),
                              ...(metadata?.related?.map((r: string) => ({
                                source: file?.name || 'current',
                                target: r,
                                strength: 0.5,
                                type: 'reference' as const
                              })) || [])
                            ]
                          }}
                          isDark={isDark}
                          height={600}
                        />
                      ) : (
                        /* Concept Map - Local NLP extraction */
                        conceptData.nodes.length > 0 ? (
                          <ConceptMapViewer
                            conceptData={conceptData}
                            isDark={isDark}
                            height={500}
                          />
                        ) : (
                          <div className={`flex flex-col items-center justify-center p-12 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`} style={{ minHeight: '400px' }}>
                            <Sparkles className={`w-12 h-12 mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                            <p className={`text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                              No Concepts Found
                            </p>
                            <p className={`text-xs max-w-md text-center ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              Not enough content to extract meaningful concepts. Try adding more text with distinct topics, entities, and relationships.
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <MarkdownWithBlockIds content={hasDraft ? editContent : content} currentPath={currentPath} onNavigate={onNavigate} onFetchFile={onFetchFile} />
                )
              ) : isPreviewableTextFile(file.name) ? (
                <CodePreview file={file} content={content} />
              ) : (
                // Non-markdown files: use MediaViewer for images, videos, PDFs, etc.
                <MediaViewer file={file} metadata={metadata} />
              )}
            </div>
          </div>
        </>
      ) : filteredFiles.length > 0 && currentPath ? (
        // Folder Browser View - Clean directory explorer (no cards)
        <DirectoryExplorer
          files={filteredFiles}
          currentPath={currentPath}
          onItemClick={(item) => onFileClick?.(item)}
          filterScope={filterScope}
          theme={theme}
        />
      ) : (
        // Empty State - Welcome screen
        <div className="flex-1 flex items-center justify-center text-zinc-500 dark:text-zinc-400 p-4 bg-white dark:bg-zinc-900">
          <div className="text-center max-w-2xl">
            {/* Fabric Logo */}
            <Link
              href="https://frame.dev/fabric"
              className="inline-block mb-6 group"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl"></div>
                <Image
                  src="/quarry-icon-mono-light.svg"
                  alt="Quarry"
                  width={120}
                  height={120}
                  className="relative transition-transform group-hover:scale-110 block dark:hidden"
                />
                <Image
                  src="/quarry-icon-mono-dark.svg"
                  alt="Quarry"
                  width={120}
                  height={120}
                  className="relative transition-transform group-hover:scale-110 hidden dark:block"
                />
              </div>
            </Link>
            <h2 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
              Don&apos;t Panic
            </h2>
            <p className="text-xl mb-2 font-semibold">Welcome to the Quarry Codex</p>
            <p className="text-base mb-4 text-zinc-600 dark:text-zinc-300">
              Your forever second brain. Automatic connections, semantic search, 100% offline, 100% yours.
            </p>
            
            {/* Navigation Links */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6 text-sm">
              <Link
                href="/"
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2 decoration-zinc-300 dark:decoration-zinc-600 hover:decoration-zinc-500 dark:hover:decoration-zinc-400 transition-colors"
              >
                ← Back to Frame.dev
              </Link>
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <Link
                href="/codex/landing"
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-2 decoration-emerald-300 dark:decoration-emerald-600 hover:decoration-emerald-500 dark:hover:decoration-emerald-400 transition-colors"
              >
                About Codex
              </Link>
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <Link
                href="/codex/architecture"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline underline-offset-2 decoration-purple-300 dark:decoration-purple-600 hover:decoration-purple-500 dark:hover:decoration-purple-400 transition-colors"
              >
                View Architecture
              </Link>
            </div>

            {/* Technical Overview */}
            <div className="text-left max-w-xl mx-auto mb-8 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3">How It Works</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>
                    <strong>Organic hierarchy:</strong> Every weave lives at <code>weaves/&lt;slug&gt;</code>, every folder
                    inside a weave is a loom, and every file (any depth) is a strand—no more <code>/looms</code> or
                    <code>/strands</code> scaffolding.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
                  <span>
                    <strong>SQL-cached indexing:</strong> 85-95% faster incremental updates (30s → 2-5s)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                  <span>
                    <strong>Static NLP pipeline:</strong> TF-IDF, n-grams, auto-categorization ($0 cost)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 dark:text-violet-400 font-bold">•</span>
                  <span>
                    <strong>GitHub Actions automation:</strong> Validation, indexing, optional AI enhancement
                  </span>
                </li>
              </ul>
              <pre className="mt-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-xs font-mono text-zinc-700 dark:text-zinc-200">
{`weaves/
  frame/
    weave.yaml
    overview.md
    research/
      roadmap.md
      glossary/
        terms.md
  wiki/
    weave.yaml
    architecture/
      systems.md`}
              </pre>
              <Link
                href="/codex/architecture"
                className="inline-flex items-center gap-1 mt-3 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold"
              >
                Read full architecture →
              </Link>
            </div>

            {/* Quick Stats - Dynamic */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 rounded-lg p-3 border border-amber-500/20 dark:border-amber-400/20">
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{totalWeaves || '–'}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Weaves</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/10 rounded-lg p-3 border border-purple-500/20 dark:border-purple-400/20">
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{totalLooms || '–'}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Looms</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 rounded-lg p-3 border border-emerald-500/20 dark:border-emerald-400/20">
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalStrands || '–'}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Strands</div>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 rounded-lg p-3 border border-cyan-500/20 dark:border-cyan-400/20">
                <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">∞</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Connections</div>
              </div>
            </div>

            {/* Quick Guide */}
            <div className="text-left space-y-2 text-sm">
              <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Knowledge Hierarchy:</h3>
              <p className="flex items-start gap-2">
                <Book className="w-4 h-4 text-zinc-900 dark:text-zinc-100 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  <strong>Fabric</strong> - Collection of weaves (FABRIC Codex itself is a fabric)
                </span>
              </p>
              <p className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-zinc-600 dark:text-zinc-400">
                  <strong>Weaves</strong> - Complete knowledge universes (self-contained, no cross-dependencies)
                </span>
              </p>
              <p className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  <strong>Looms</strong> - Any folder inside a weave (nested folders allowed, auto-detected)
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Code className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  <strong>Strands</strong> - Individual markdown files at any depth (atomic knowledge units)
                </span>
              </p>
            </div>

            <div className="mt-6 pt-4">
              <Link href="/codex/api-playground" className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium text-sm">
                <span>Try the API Playground</span>
                <span className="text-xs opacity-60">→</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxIndex}
      />

      {/* Publish Modal */}
      {file && (
        <PublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          filePath={file.path}
          content={editContent}
          metadata={metadata}
          repo={{
            owner: REPO_CONFIG.OWNER,
            repo: REPO_CONFIG.NAME,
            defaultBranch: REPO_CONFIG.BRANCH,
          }}
          theme={theme as 'light' | 'dark' | 'sepia-light' | 'sepia-dark' | 'terminal-light' | 'terminal-dark'}
        />
      )}
    </div>
  )
}
