/**
 * Sidebar component for FABRIC Codex viewer
 * Displays file tree, knowledge tree, breadcrumbs, and search
 * @module codex/CodexSidebar
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, ChevronRight, ChevronDown, ChevronUp, ExternalLink, FileText, GitBranch, X, Moon, Sun, LifeBuoy, Tag, Hash, Folder, Sparkles, Layers, Box, Minus, Plus, Network, PlusCircle, Puzzle, Search, Bookmark, EyeOff, RotateCcw, CheckSquare, Square, PanelLeftClose, ChevronsDownUp, ChevronsUpDown, Filter, CalendarDays } from 'lucide-react'
import DynamicIcon, { isValidIconName } from './ui/DynamicIcon'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import type { GitHubFile, KnowledgeTreeNode, SidebarMode, SearchOptions, FileFilterScope, NavigationRootScope, TagsIndex, TagIndexEntry, AdvancedFilterOptions, DateFilter, DateIndex, StrandMetadata } from './types'
import { LEVEL_STYLES, REPO_CONFIG, PAGINATION, Z_INDEX } from './constants'
import { formatNodeName, shouldShowFile } from './utils'
import SearchBar from './ui/SearchBar'
import FileFilterToggle from './ui/FileFilterToggle'
import NavigationRootToggle from './ui/NavigationRootToggle'
// CalendarFilterWidget removed - now integrated in TaxonomyFilterBar
import FilterBadge from './ui/FilterBadge'
import TagMultiSelect from './ui/TagMultiSelect'
import ExcludeListManager from './ui/ExcludeListManager'
import SidebarWidthControl from './ui/SidebarWidthControl'
import RepositoryIndicator from './ui/RepositoryIndicator'
import { FileListSkeleton, KnowledgeTreeSkeleton } from './ui/Skeleton'
import HierarchyBreadcrumb from './ui/HierarchyBreadcrumb'
import WeaveCard from './ui/WeaveCard'
import LazyWeaveList from './ui/LazyWeaveList'
import OutlineTableOfContents from './ui/OutlineTableOfContents'
import SidebarGraphView from './ui/SidebarGraphView'
import { CodexTreeView } from './tree'
import PluginsSidebarView from './ui/PluginsSidebarView'
import BatchActionsBar from './ui/BatchActionsBar'
import TaxonomyFilterBar from './ui/TaxonomyFilterBar'
import QuarryBrand from './ui/QuarryBrand'
import SourceModeBadge from './ui/SourceModeBadge'
import QueryBuilderSidebarPanel from './ui/QueryBuilderSidebarPanel'
import SupertagsSidebarPanel from './ui/SupertagsSidebarPanel'
import PlannerSidebarPanel from './ui/PlannerSidebarPanel'
import type { ContentSource } from '@/lib/content/types'
import { pluginUIRegistry } from '@/lib/plugins/QuarryPluginAPI'
import { quarryPluginManager } from '@/lib/plugins/QuarryPluginManager'
import { createPluginAPI } from '@/lib/plugins/QuarryPluginAPI'

interface CodexSidebarProps {
  /** Whether sidebar is open (mobile) */
  isOpen: boolean
  /** Close sidebar callback (mobile) */
  onClose: () => void
  /** Current directory path */
  currentPath: string
  /** Files in current directory */
  files: GitHubFile[]
  /** Currently selected file */
  selectedFile: GitHubFile | null
  /** File click handler */
  onFileClick: (file: GitHubFile) => void
  /** Navigate to directory (auto-selects README if present) */
  onNavigate: (path: string) => void
  /** Browse directory without auto-selecting a file (for weave/loom exploration) */
  onBrowse?: (path: string) => void
  /** Sidebar display mode */
  mode: SidebarMode
  /** Change sidebar mode */
  onModeChange: (mode: SidebarMode) => void
  /** Knowledge tree data */
  knowledgeTree: KnowledgeTreeNode[]
  /** Knowledge tree loading state */
  knowledgeTreeLoading: boolean
  /** Knowledge tree error */
  knowledgeTreeError: string | null
  /** Total strands in tree */
  totalTreeStrands: number
  /** Total weaves in tree */
  totalTreeWeaves: number
  /** Total looms in tree */
  totalTreeLooms: number
  /** Expanded tree paths */
  expandedTreePaths: Set<string>
  /** Toggle tree path */
  onToggleTreePath: (path: string) => void
  /** Open file from tree */
  onOpenFileFromTree: (path: string) => void
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null
  /** Filtered files after search */
  filteredFiles: GitHubFile[]
  /** Current search options */
  searchOptions: SearchOptions
  /** Search query change handler */
  onSearchQueryChange: (query: string) => void
  /** Toggle searching file names */
  onToggleSearchNames: () => void
  /** Toggle full-text search */
  onToggleSearchContent: () => void
  /** Toggle case sensitivity */
  onToggleCaseSensitive: () => void
  /** Set file filter scope */
  onSetFilterScope: (scope: FileFilterScope) => void
  /** Toggle hide empty folders */
  onToggleHideEmptyFolders: () => void
  /** Set navigation root scope */
  onSetRootScope: (scope: NavigationRootScope) => void
  /** Reset search filters */
  onResetSearch: () => void
  /** Reset to home state (clear selection, reset navigation, close file) */
  onResetToHome?: () => void
  /** Open help panel */
  onOpenHelp: () => void
  /** Open bookmarks panel */
  onOpenBookmarks?: () => void
  /** Open preferences */
  onOpenPreferences?: () => void
  /** Sidebar width */
  sidebarWidth?: number
  /** Change sidebar width */
  onSidebarWidthChange?: (width: number) => void
  /** Sidebar font size scale (0=xs, 1=sm, 2=base, 3=lg) */
  sidebarFontSize?: number
  /** Change sidebar font size */
  onSidebarFontSizeChange?: (size: number) => void
  /** Expand all tree nodes */
  onExpandAll?: () => void
  /** Collapse all tree nodes */
  onCollapseAll?: () => void
  /** Whether all nodes are currently expanded */
  isAllExpanded?: boolean
  /** Current theme */
  theme?: string
  /** Tags and taxonomy index */
  tagsIndex?: TagsIndex
  /** Navigate to tag filter page */
  onTagClick?: (type: 'tag' | 'subject' | 'topic', value: string) => void
  /** Current file content for TOC outline */
  fileContent?: string
  /** Navigate to heading in content */
  onNavigateToHeading?: (slug: string) => void
  /** Currently active heading slug (from scroll position) */
  activeHeadingSlug?: string
  /** Open fabric graph view */
  onOpenGraph?: () => void
  /** Enable enhanced drag-and-drop tree (react-arborist) */
  enableDragDropTree?: boolean
  /** Callback when tree structure changes via drag-and-drop */
  onTreeChange?: (data: any[]) => void
  /** Callback when files are moved via drag-and-drop (for publish flow) */
  onMoveComplete?: (operations: import('./tree/types').MoveOperation[]) => void
  // === Advanced Filter Props ===
  /** Current advanced filter options */
  advancedFilters?: AdvancedFilterOptions
  /** Set date filter */
  onSetDateFilter?: (filter: DateFilter) => void
  /** Toggle a tag selection */
  onToggleTag?: (tag: string) => void
  /** Set all selected tags */
  onSetSelectedTags?: (tags: string[]) => void
  /** Set tag match mode */
  onSetTagMatchMode?: (mode: 'any' | 'all') => void
  /** Toggle a subject selection */
  onToggleSubject?: (subject: string) => void
  /** Set all selected subjects */
  onSetSelectedSubjects?: (subjects: string[]) => void
  /** Set all selected topics */
  onSetSelectedTopics?: (topics: string[]) => void
  /** Include a path (remove from exclusion) */
  onIncludePath?: (path: string) => void
  /** Reset all advanced filters */
  onResetAdvancedFilters?: () => void
  /** Date index for calendar */
  dateIndex?: DateIndex
  /** Metadata map for strand filtering */
  metadataMap?: Map<string, StrandMetadata>
  /** Count of active advanced filters */
  activeAdvancedFilterCount?: number
  /** Whether any advanced filters are active */
  hasAdvancedFilters?: boolean
  /** Whether there are hidden items (for position tracking) */
  hasHiddenItems?: boolean
  
  // === Multi-Selection Props ===
  /** Whether selection mode is active */
  selectionMode?: boolean
  /** Toggle selection mode */
  onToggleSelectionMode?: () => void
  /** Selected paths for multi-select */
  selectedPaths?: Set<string>
  /** Selection statistics */
  selectionStats?: { total: number; strands: number; looms: number; weaves: number }
  /** Toggle a path selection */
  onTogglePathSelection?: (path: string, level?: 'weave' | 'loom' | 'strand' | 'other') => void
  /** Check if a path is selected */
  isPathSelected?: (path: string) => boolean
  /** Select a path and all its children recursively */
  onSelectRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  /** Clear all selections */
  onClearSelection?: () => void
  /** Get all strand paths from selection */
  onGetAllStrandPaths?: () => string[]
  /** Generate flashcards from selection */
  onGenerateFlashcards?: (strandPaths: string[]) => void
  /** Generate glossary from selection */
  onGenerateGlossary?: (strandPaths: string[]) => void
  /** Generate quiz from selection */
  onGenerateQuiz?: (strandPaths: string[]) => void
  /** Current content source info */
  contentSource?: ContentSource | null
  /** Display path for filesystem/bundled modes */
  contentSourcePath?: string
  /** Callback to open content source settings */
  onOpenContentSourceSettings?: () => void
}

/**
 * Sidebar component with file browser and knowledge tree
 * 
 * @remarks
 * - Responsive: Slides in/out on mobile, fixed on desktop
 * - Two modes: Outline (current directory) and Tree (full hierarchy)
 * - Advanced search with filters
 * - Breadcrumb navigation
 * - Pagination for large directories
 * - Touch-optimized (44px+ targets)
 * 
 * @example
 * ```tsx
 * <CodexSidebar
 *   isOpen={sidebarOpen}
 *   onClose={() => setSidebarOpen(false)}
 *   currentPath="weaves/tech"
 *   files={files}
 *   selectedFile={selectedFile}
 *   onFileClick={handleFileClick}
 *   onNavigate={navigate}
 *   mode="tree"
 *   onModeChange={setMode}
 *   knowledgeTree={tree}
 *   // ... other props
 * />
 * ```
 */
export default function CodexSidebar({
  isOpen,
  onClose,
  currentPath,
  files,
  filteredFiles,
  selectedFile,
  onFileClick,
  onNavigate,
  onBrowse,
  mode,
  onModeChange,
  knowledgeTree,
  knowledgeTreeLoading,
  knowledgeTreeError,
  totalTreeStrands,
  totalTreeWeaves,
  totalTreeLooms,
  expandedTreePaths,
  onToggleTreePath,
  onOpenFileFromTree,
  loading,
  error,
  searchOptions,
  onSearchQueryChange,
  onToggleSearchNames,
  onToggleSearchContent,
  onToggleCaseSensitive,
  onSetFilterScope,
  onToggleHideEmptyFolders,
  onSetRootScope,
  onResetSearch,
  onResetToHome,
  onOpenHelp,
  onOpenBookmarks,
  onOpenPreferences,
  sidebarWidth = 320,
  onSidebarWidthChange,
  sidebarFontSize = 1,
  onSidebarFontSizeChange,
  onExpandAll,
  onCollapseAll,
  isAllExpanded = false,
  theme: propsTheme,
  tagsIndex,
  onTagClick,
  fileContent,
  onNavigateToHeading,
  activeHeadingSlug,
  onOpenGraph,
  enableDragDropTree = true, // Enhanced tree with WeaveCards, hierarchy labels, tags + drag-drop
  onTreeChange,
  onMoveComplete,
  // Advanced filters
  advancedFilters,
  onSetDateFilter,
  onToggleTag,
  onSetSelectedTags,
  onSetTagMatchMode,
  onToggleSubject,
  onSetSelectedSubjects,
  onSetSelectedTopics,
  onIncludePath,
  onResetAdvancedFilters,
  dateIndex,
  metadataMap,
  activeAdvancedFilterCount = 0,
  hasAdvancedFilters = false,
  hasHiddenItems = false,
  // Multi-selection
  selectionMode = false,
  onToggleSelectionMode,
  selectedPaths,
  selectionStats = { total: 0, strands: 0, looms: 0, weaves: 0 },
  onTogglePathSelection,
  isPathSelected,
  onSelectRecursive,
  onClearSelection,
  onGetAllStrandPaths,
  onGenerateFlashcards,
  onGenerateGlossary,
  onGenerateQuiz,
  contentSource,
  contentSourcePath,
  onOpenContentSourceSettings,
}: CodexSidebarProps) {
  const { theme, setTheme } = useTheme()
  const effectiveTheme = propsTheme || theme || 'light'
  
  // Track if we're on desktop (for SSR-safe width calculations)
  const [isDesktop, setIsDesktop] = useState(false)
  
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Quarry Plugin System: Subscribe to plugin sidebar modes
  const [pluginSidebarModes, setPluginSidebarModes] = useState<typeof pluginUIRegistry.allSidebarModes>([])
  useEffect(() => {
    setPluginSidebarModes(pluginUIRegistry.allSidebarModes)
    const unsubscribe = pluginUIRegistry.onChange(() => {
      setPluginSidebarModes([...pluginUIRegistry.allSidebarModes])
    })
    return unsubscribe
  }, [])

  // Filter for enabled plugins only
  const activeSidebarModes = pluginSidebarModes.filter(({ pluginId }) =>
    quarryPluginManager.isEnabled(pluginId)
  )

  // Auto-switch away from plugin mode if plugin gets disabled
  useEffect(() => {
    const builtInModes: Array<string> = ['tree', 'toc', 'tags', 'graph', 'plugins']
    const isPluginMode = !builtInModes.includes(mode)
    if (isPluginMode) {
      const modeStillActive = activeSidebarModes.some(({ options }) =>
        `plugin-${options.id}` === mode || options.id === mode
      )
      if (!modeStillActive) {
        onModeChange('tree')
      }
    }
  }, [mode, activeSidebarModes, onModeChange])
  
  // Font size scaling based on sidebarFontSize (0=xs, 1=sm, 2=base, 3=lg)
  const fontScale = {
    text: ['text-[9px]', 'text-[10px]', 'text-[11px]', 'text-[12px]'][sidebarFontSize] || 'text-[10px]',
    textSm: ['text-[8px]', 'text-[9px]', 'text-[10px]', 'text-[11px]'][sidebarFontSize] || 'text-[9px]',
    textXs: ['text-[7px]', 'text-[8px]', 'text-[9px]', 'text-[10px]'][sidebarFontSize] || 'text-[8px]',
    icon: ['w-2 h-2', 'w-2.5 h-2.5', 'w-3 h-3', 'w-3.5 h-3.5'][sidebarFontSize] || 'w-2.5 h-2.5',
    iconSm: ['w-1.5 h-1.5', 'w-2 h-2', 'w-2.5 h-2.5', 'w-3 h-3'][sidebarFontSize] || 'w-2 h-2',
    gap: ['gap-0.5', 'gap-0.5', 'gap-1', 'gap-1.5'][sidebarFontSize] || 'gap-0.5',
    py: ['py-0.5', 'py-0.5', 'py-1', 'py-1.5'][sidebarFontSize] || 'py-0.5',
    px: ['px-0.5', 'px-1', 'px-1.5', 'px-2'][sidebarFontSize] || 'px-1',
  }
  

  // Pagination
  const [displayLimit, setDisplayLimit] = useState<number>(PAGINATION.INITIAL_LIMIT)
  const displayedFiles = filteredFiles.slice(0, displayLimit)
  const hasMore = filteredFiles.length > displayLimit

  useEffect(() => {
    setDisplayLimit(PAGINATION.INITIAL_LIMIT)
  }, [filteredFiles])

  // Helper: Check if a strand matches the active advanced filters
  const matchesAdvancedFilters = (path: string): boolean => {
    if (!advancedFilters || !metadataMap) return true

    const metadata = metadataMap.get(path)
    if (!metadata) return true // No metadata available, don't filter out

    // Check excluded paths
    if (advancedFilters.excludedPaths?.includes(path)) {
      return false
    }

    // Check date filter
    if (advancedFilters.dateFilter && advancedFilters.dateFilter.mode !== 'none') {
      const dateValue = metadata.date || metadata.createdAt || metadata.created
      if (dateValue) {
        const dateStr = typeof dateValue === 'string' ? dateValue : new Date(dateValue).toISOString().split('T')[0]
        const { mode, startDate, endDate } = advancedFilters.dateFilter

        if (mode === 'single' && startDate) {
          if (dateStr !== startDate) return false
        } else if (mode === 'range' && startDate && endDate) {
          if (dateStr < startDate || dateStr > endDate) return false
        }
      } else {
        // No date in metadata, filter out if date filter is active
        return false
      }
    }

    // Check tags filter
    if (advancedFilters.selectedTags && advancedFilters.selectedTags.length > 0) {
      const strandTags = metadata.tags
        ? (Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags])
        : []

      if (strandTags.length === 0) return false

      const matchMode = advancedFilters.tagMatchMode || 'any'
      if (matchMode === 'all') {
        // ALL mode: strand must have all selected tags
        if (!advancedFilters.selectedTags.every(tag => strandTags.includes(tag))) {
          return false
        }
      } else {
        // ANY mode: strand must have at least one selected tag
        if (!advancedFilters.selectedTags.some(tag => strandTags.includes(tag))) {
          return false
        }
      }
    }

    // Check subjects filter
    if (advancedFilters.selectedSubjects && advancedFilters.selectedSubjects.length > 0) {
      const strandSubjects = metadata.taxonomy?.subjects || []
      if (strandSubjects.length === 0) return false

      // ANY mode for subjects (at least one match)
      if (!advancedFilters.selectedSubjects.some(subject => strandSubjects.includes(subject))) {
        return false
      }
    }

    // Check topics filter
    if (advancedFilters.selectedTopics && advancedFilters.selectedTopics.length > 0) {
      const strandTopics = metadata.taxonomy?.topics || []
      if (strandTopics.length === 0) return false

      // ANY mode for topics (at least one match)
      if (!advancedFilters.selectedTopics.some(topic => strandTopics.includes(topic))) {
        return false
      }
    }

    return true
  }

  // Helper: filter knowledge tree by current file filter scope and root scope
  const filteredTree = useMemo(() => {
    // First filter by root scope
    let treeToFilter = knowledgeTree
    if (searchOptions.rootScope === 'fabric') {
      // Only show weaves/ subtree
      const weavesNode = knowledgeTree.find(n => n.path === 'weaves')
      treeToFilter = weavesNode?.children || []
    }
    
    function filterNode(node: KnowledgeTreeNode): KnowledgeTreeNode | null {
      if (node.type === 'file') {
        // First check if file should be shown based on file type filter
        const matchesFileType = shouldShowFile(
          { name: node.name, path: node.path, type: 'file' } as any,
          searchOptions.filterScope,
          false,
          []
        )
        if (!matchesFileType) return null

        // Then check if it matches advanced filters (metadata-based)
        const matchesFilters = matchesAdvancedFilters(node.path)
        return matchesFilters ? node : null
      }

      // Directory: recursively filter children
      if (!node.children) return null

      const keptChildren = node.children
        .map(filterNode)
        .filter((c): c is KnowledgeTreeNode => c !== null)

      // If no children remain after filtering, hide this directory too (cascading hide)
      if (keptChildren.length === 0) {
        // Hide empty folders completely when filters are active, regardless of hideEmptyFolders setting
        // This implements the cascading hide: if all strands are filtered out, hide the loom/weave
        if (hasAdvancedFilters) {
          return null
        }
        return searchOptions.hideEmptyFolders ? null : { ...node, children: [] }
      }

      return { ...node, children: keptChildren }
    }
    return treeToFilter
      .map(filterNode)
      .filter((n): n is KnowledgeTreeNode => n !== null)
  }, [knowledgeTree, searchOptions.filterScope, searchOptions.hideEmptyFolders, searchOptions.rootScope, advancedFilters, metadataMap, hasAdvancedFilters])

  /**
   * Render a single tree node recursively
   */
  const renderTreeNode = (node: KnowledgeTreeNode, depth = 0): React.ReactNode => {
    const isDir = node.type === 'dir'
    const isExpanded = expandedTreePaths.has(node.path)
    const isSelected = selectedFile?.path === node.path
    const levelStyle = LEVEL_STYLES[node.level] ?? LEVEL_STYLES.folder
    const LevelIcon = levelStyle.icon

    // Special rendering for weaves at top level
    if (node.level === 'weave' && depth === 0) {
      return (
        <div key={node.path} className="space-y-2">
          <WeaveCard
            node={node}
            isActive={isSelected || currentPath.startsWith(node.path)}
            isExpanded={isExpanded}
            onToggle={() => onToggleTreePath(node.path)}
            onNavigate={(path) => {
              // Use onBrowse for folder exploration (no auto-select file)
              // Falls back to onNavigate if onBrowse not provided
              const navigateFn = onBrowse || onNavigate
              navigateFn(path)
              if (window.innerWidth < 768) onClose()
            }}
            onToggleLoom={(loomPath) => onToggleTreePath(loomPath)}
            theme={effectiveTheme}
          />
          
          {/* Render expanded weave children (looms) in the main tree */}
          <AnimatePresence>
            {isExpanded && node.children && node.children.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="ml-3 pl-2 border-l-2 border-zinc-200 dark:border-zinc-700 overflow-hidden"
              >
                {node.children.map((child) => renderTreeNode(child, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    // Special rendering for looms - ULTRA COMPACT
    if (node.level === 'loom') {
      return (
        <motion.div
          key={node.path}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className={`relative ${depth > 0 ? 'pl-2' : ''}`}>
            {depth > 0 && (
              <span
                className="pointer-events-none absolute left-0 top-0 bottom-0 border-l border-amber-300 dark:border-amber-800"
                aria-hidden
              />
            )}
            <motion.button
              onClick={() => {
                onToggleTreePath(node.path)
                const browseFn = onBrowse || onNavigate
                browseFn(node.path)
                if (window.innerWidth < 768) onClose()
              }}
              whileHover={{ x: 1 }}
              whileTap={{ scale: 0.99 }}
              className={`group w-full flex items-center gap-1 rounded px-1 py-0.5 text-left transition-all min-h-[22px] ${
                isSelected || currentPath === node.path
                  ? 'bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700'
                  : 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
              }`}
              style={node.style?.backgroundColor ? { backgroundColor: node.style.backgroundColor } : undefined}
              aria-expanded={isExpanded}
            >
              {/* Loom Icon - supports custom emoji/thumbnail/Lucide icon */}
              {node.style?.emoji ? (
                <span className={fontScale.text}>{node.style.emoji}</span>
              ) : node.style?.icon && isValidIconName(node.style.icon) ? (
                <DynamicIcon 
                  name={node.style.icon}
                  className={`${fontScale.icon} flex-shrink-0`}
                  style={{ color: node.style?.accentColor || 'rgb(217 119 6)' }}
                  aria-label={`${node.name} icon`}
                />
              ) : (
                <Box 
                  className={`${fontScale.icon} flex-shrink-0`}
                  style={{ color: node.style?.accentColor || undefined }}
                  color={node.style?.accentColor ? undefined : 'rgb(217 119 6)'}
                />
              )}
              
              {/* Name */}
              <span 
                className={`flex-1 ${fontScale.text} font-semibold truncate capitalize ${node.style?.darkText ? 'text-zinc-900' : 'text-zinc-800 dark:text-zinc-100'}`}
                style={node.style?.textColor ? { color: node.style.textColor } : undefined}
              >
                {formatNodeName(node.name)}
              </span>

              {/* Badges */}
              <div className="flex items-center gap-0.5 flex-shrink-0 ml-auto">
                <span
                  className={`${fontScale.textXs} font-bold px-1 rounded ${node.style?.accentColor ? 'text-white' : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'}`}
                  style={node.style?.accentColor ? { backgroundColor: node.style.accentColor } : undefined}
                >
                  {node.strandCount}
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <ChevronRight className={`${fontScale.iconSm} text-amber-500`} />
                </motion.div>
              </div>
            </motion.button>
          </div>
          
          {/* Loom Children */}
          <AnimatePresence>
            {isExpanded && node.children && node.children.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="ml-3 border-l border-amber-200 dark:border-amber-800/50 pl-1.5 overflow-hidden"
              >
                {node.children.map((child) => renderTreeNode(child, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )
    }

    // Default rendering for other nodes (strands, folders) - ULTRA COMPACT
    return (
      <motion.div 
        key={node.path} 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: depth * 0.01 }}
      >
        <div className={`relative ${depth > 0 ? 'pl-2' : ''}`}>
          {/* Connecting line for nested items */}
          {depth > 0 && (
            <span
              className="pointer-events-none absolute left-0 top-0 bottom-0 border-l border-dashed border-zinc-200 dark:border-zinc-700"
              aria-hidden
            />
          )}

          <motion.button
            onClick={() => {
              if (isDir) {
                onToggleTreePath(node.path)
              } else {
                onOpenFileFromTree(node.path)
                if (window.innerWidth < 768) onClose()
              }
            }}
            whileHover={{ x: isDir ? 0 : 1 }}
            whileTap={{ scale: 0.99 }}
            className={`group w-full flex items-center ${fontScale.gap} rounded ${fontScale.px} ${fontScale.py} text-left transition-all min-h-[20px] ${
              isSelected
                ? 'bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700'
                : isDir
                ? 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60'
                : 'hover:bg-emerald-50/70 dark:hover:bg-emerald-900/20'
            }`}
            aria-expanded={isDir ? isExpanded : undefined}
          >
            {/* Icon + Name */}
            <div className={`flex items-center ${fontScale.gap} flex-1 min-w-0`}>
              {isDir ? (
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <ChevronRight className={`${fontScale.iconSm} flex-shrink-0 text-zinc-500`} />
                </motion.div>
              ) : LevelIcon ? (
                <LevelIcon className={`${fontScale.iconSm} flex-shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
              ) : (
                <FileText className={`${fontScale.iconSm} flex-shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
              )}
              <span
                className={`${fontScale.text} font-medium truncate capitalize leading-tight ${
                  isSelected
                    ? 'text-emerald-800 dark:text-emerald-200 font-semibold'
                    : isDir
                    ? 'text-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-700 dark:text-zinc-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300'
                }`}
              >
                {formatNodeName(node.name)}
              </span>
            </div>

            {/* Badges - Ultra compact */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {isDir && node.strandCount > 0 && (
                <span className={`${fontScale.textXs} font-semibold px-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300`}>
                  {node.strandCount}
                </span>
              )}
            </div>
          </motion.button>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isDir && isExpanded && node.children && node.children.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="ml-2 border-l border-dashed border-zinc-200 dark:border-zinc-800 pl-1.5 overflow-hidden"
            >
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  /**
   * Render knowledge tree view
   */
  const renderKnowledgeTree = () => {
    if (knowledgeTreeLoading) {
      return <KnowledgeTreeSkeleton />
    }

    if (knowledgeTreeError) {
      return (
        <div className="text-xs text-red-600 dark:text-red-400 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          {knowledgeTreeError}
        </div>
      )
    }

    if (knowledgeTree.length === 0) {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
          Knowledge tree is still indexing…
        </div>
      )
    }

    // Separate weaves from other nodes
    const weaveNodes = filteredTree.filter(node => node.level === 'weave')
    const otherNodes = filteredTree.filter(node => node.level !== 'weave')
    
    return (
      <div className="space-y-2">
        {/* Stats Card - Ultra Compact */}
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 px-2 py-1.5">
          <div className={`flex items-center justify-between ${fontScale.gap}`}>
            <div className="flex items-center gap-3">
              <span className={`${fontScale.textXs} text-zinc-700 dark:text-zinc-300`}>
                <strong>{totalTreeStrands.toLocaleString()}</strong> strands
              </span>
              <span className={`${fontScale.textXs} text-zinc-500 dark:text-zinc-400`}>
                <strong>{totalTreeWeaves}</strong> weaves
              </span>
              <span className={`${fontScale.textXs} text-zinc-500 dark:text-zinc-400`}>
                <strong>{totalTreeLooms}</strong> looms
              </span>
            </div>
          </div>
        </div>

        {/* Weaves with lazy loading and pagination */}
        {weaveNodes.length > 0 && (
          <LazyWeaveList
            weaves={weaveNodes}
            expandedPaths={expandedTreePaths}
            onToggleExpand={onToggleTreePath}
            onNavigate={(path) => {
              const navigateFn = onBrowse || onNavigate
              navigateFn(path)
              if (window.innerWidth < 768) onClose()
            }}
            onToggleLoom={onToggleTreePath}
            theme={effectiveTheme}
            currentPath={currentPath}
            selectedPath={selectedFile?.path}
            pageSize={5}
            showPagination={weaveNodes.length > 5}
            showViewToggle={weaveNodes.length > 3}
            compact={true}
            renderChildren={(child, depth) => renderTreeNode(child, depth)}
          />
        )}

        {/* Other nodes (docs, etc.) */}
        {otherNodes.length > 0 && (
          <div className="space-y-px">{otherNodes.map((node) => renderTreeNode(node))}</div>
        )}
      </div>
    )
  }

  /**
   * Render outline (document structure / TOC) view
   * Shows document headings when a file is selected, otherwise shows directory listing
   */
  const renderOutlineList = () => {
    // Show document outline when we have file content
    if (fileContent && selectedFile) {
      return (
        <OutlineTableOfContents
          content={fileContent}
          fileName={selectedFile.name}
          filePath={selectedFile.path}
          activeSlug={activeHeadingSlug}
          onNavigate={onNavigateToHeading}
          theme={effectiveTheme}
          compact={sidebarFontSize < 2}
          showReadingTime={true}
          showProgress={true}
        />
      )
    }
    
    // Show directory listing when no file is selected
    if (loading && files.length === 0) {
      return <FileListSkeleton count={8} />
    }

    if (error) {
      return <div className="text-red-600 dark:text-red-400 text-sm p-4">{error}</div>
    }

    if (displayedFiles.length === 0) {
      return (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
          {searchOptions.query ? 'No files found' : 'No files in this directory'}
        </div>
      )
    }

    return (
      <>
        {displayedFiles.map((file) => {
          const depth = file.path.split('/').length - (file.type === 'dir' ? 0 : 1)
          const paddingLeft = depth * 16 + 12
          const isDir = file.type === 'dir'
          const cleanName = formatNodeName(file.name)

          return (
            <motion.button
              key={file.sha}
              onClick={() => {
                onFileClick(file)
                // Auto-close sidebar on mobile
                if (window.innerWidth < 768) {
                  onClose()
                }
              }}
              style={{ paddingLeft: `${paddingLeft}px` }}
              className={`w-full text-left py-3 pr-3 rounded-lg flex items-center gap-3 hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[48px] ${
                selectedFile?.path === file.path
                  ? 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500 shadow-inner'
                  : ''
              }`}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              {/* Icon */}
              {isDir ? (
                <svg
                  className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              )}
              <span
                className={`text-sm flex-1 ${
                  isDir
                    ? 'font-semibold tracking-wide uppercase text-gray-800 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {cleanName}
              </span>
            </motion.button>
          )
        })}

        {/* Load More */}
        {hasMore && (
          <button
            onClick={() => setDisplayLimit((prev) => prev + PAGINATION.LOAD_MORE_INCREMENT)}
            className="w-full mt-4 p-3 text-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
          >
            Load more ({filteredFiles.length - displayLimit} remaining)
          </button>
        )}
      </>
    )
  }

  // State for expanded tag sections
  const [expandedTagSections, setExpandedTagSections] = useState<Record<string, boolean>>({
    tags: true,
    subjects: true,
    topics: true,
  })

  const toggleTagSection = (section: string) => {
    setExpandedTagSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // State for search/filters section collapsed (hidden by default on mobile)
  const [searchFiltersCollapsed, setSearchFiltersCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false // SSR: default expanded
    return window.innerWidth < 768 // Collapsed on mobile by default
  })

  // State for footer collapsed
  // Default collapsed on mobile, otherwise check localStorage/landing page logic
  const [footerCollapsed, setFooterCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false // SSR: default open
    // Always collapsed on mobile by default
    if (window.innerWidth < 768) return true
    const savedPref = localStorage.getItem('codex-footer-collapsed')
    if (savedPref !== null) return savedPref === 'true'
    // Check if coming from landing page (referrer contains /codex/landing or first visit)
    const isFromLanding = document.referrer.includes('/codex/landing') ||
                          document.referrer.includes('/codex') ||
                          !sessionStorage.getItem('codex-visited')
    sessionStorage.setItem('codex-visited', 'true')
    return !isFromLanding // Open if from landing, collapsed otherwise
  })
  
  // Save footer preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('codex-footer-collapsed', String(footerCollapsed))
    }
  }, [footerCollapsed])

  /**
   * Render a single tag/category section
   */
  const renderTagSection = (
    title: string,
    icon: React.ReactNode,
    entries: TagIndexEntry[],
    type: 'tag' | 'subject' | 'topic',
    accentClass: string,
    sectionKey: string
  ) => {
    if (!entries || entries.length === 0) return null

    const expanded = expandedTagSections[sectionKey] ?? true
    const sortedEntries = [...entries].sort((a, b) => b.count - a.count)
    const displayEntries = expanded ? sortedEntries : sortedEntries.slice(0, 5)

    return (
      <div className="space-y-2">
        <button
          onClick={() => toggleTagSection(sectionKey)}
          className="w-full flex items-center gap-2 text-left"
        >
          <div className={`p-1.5 rounded-lg ${accentClass}`}>
            {icon}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            {title}
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-500">
            ({entries.length})
          </span>
          <ChevronRight
            className={`w-3 h-3 ml-auto text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
        <div className="flex flex-wrap gap-1.5">
          {displayEntries.map((entry) => (
            <button
              key={entry.name}
              onClick={() => {
                onTagClick?.(type, entry.name)
                if (window.innerWidth < 768) onClose()
              }}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium
                transition-all hover:scale-105 active:scale-95
                ${type === 'tag'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-800/40'
                  : type === 'subject'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-800/40'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/40'
                }
              `}
            >
              {entry.name}
              <span className="text-[9px] opacity-70 font-mono">{entry.count}</span>
            </button>
          ))}
        </div>
        {!expanded && sortedEntries.length > 5 && (
          <button
            onClick={() => toggleTagSection(sectionKey)}
            className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            Show {sortedEntries.length - 5} more…
          </button>
        )}
      </div>
    )
  }

  /**
   * Render tags & categories view
   */
  const renderTagsView = () => {
    if (!tagsIndex) {
      return (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-8">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Tags index loading…</p>
          <p className="text-[10px] mt-1 opacity-70">Browse strands to build the index</p>
        </div>
      )
    }

    const totalTags = tagsIndex.tags.length + tagsIndex.subjects.length + tagsIndex.topics.length
    if (totalTags === 0) {
      return (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-8">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No tags or categories found</p>
          <p className="text-[10px] mt-1 opacity-70">Add tags to your strand frontmatter</p>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        {/* Stats Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 p-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
                Tags & Categories
              </p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                {totalTags} total
              </p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {renderTagSection(
          'Tags',
          <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          tagsIndex.tags,
          'tag',
          'bg-emerald-100 dark:bg-emerald-900/30',
          'tags'
        )}

        {/* Subjects */}
        {renderTagSection(
          'Subjects',
          <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          tagsIndex.subjects,
          'subject',
          'bg-amber-100 dark:bg-amber-900/30',
          'subjects'
        )}

        {/* Topics */}
        {renderTagSection(
          'Topics',
          <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
          tagsIndex.topics,
          'topic',
          'bg-blue-100 dark:bg-blue-900/30',
          'topics'
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile Backdrop - darkened overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 transition-opacity"
          style={{ zIndex: Z_INDEX.SIDEBAR_BACKDROP }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container - Mobile: slide-in sheet, Desktop: animated panel */}
      <motion.div
        initial={false}
        animate={{
          width: isDesktop ? (isOpen ? sidebarWidth : 0) : undefined,
          opacity: isDesktop ? (isOpen ? 1 : 0) : 1,
        }}
        transition={{
          width: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
          opacity: { duration: isOpen ? 0.25 : 0.15, delay: isOpen ? 0.1 : 0 },
        }}
        className={`
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:relative
          inset-y-0 left-0
          /* Mobile: Compact width, Desktop: animated */
          w-[75vw] max-w-[280px] md:max-w-none
          /* Clean solid backgrounds - no transparency issues */
          bg-white dark:bg-zinc-950
          md:border-r border-zinc-200 dark:border-zinc-800
          flex flex-col flex-shrink-0
          /* Desktop: explicit viewport height for scroll to work */
          md:h-[100dvh]
          transition-transform duration-300 ease-out md:transition-none
          shadow-2xl md:shadow-none
          /* Mobile: Enable proper scrolling */
          overflow-hidden
          /* Safe area padding for notched phones */
          pt-[env(safe-area-inset-top,0px)] md:pt-0
          /* Ensure proper touch scrolling on mobile */
          touch-pan-y
        `}
        style={{ 
          zIndex: Z_INDEX.SIDEBAR,
          ...(isDesktop ? { 
            maxWidth: `min(${sidebarWidth}px, 30vw)`,
          } : {})
        }}
      >
        {/* Header - Clean with Frame Logo - responsive for mobile */}
        <div className="px-2 sm:px-3 py-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-1 min-w-0">
            {/* Quarry Codex - Brand logo - click to reset to home state */}
            <div className="flex-shrink-0 min-w-0">
              <QuarryBrand
                size="sm"
                showIcon={true}
                compact={true}
                theme={effectiveTheme}
                interactive={true}
                onClick={onResetToHome}
              />
            </div>

            {/* Right Controls - compact on mobile */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Search Toggle Button - Icon only, compact */}
              <motion.button
                onClick={() => setSearchFiltersCollapsed(!searchFiltersCollapsed)}
                className={`
                  relative flex items-center gap-0.5 p-1 sm:p-1.5 rounded-md sm:rounded-lg
                  border transition-all duration-200
                  ${!searchFiltersCollapsed
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={searchFiltersCollapsed ? 'Open search' : 'Close search'}
                title={searchFiltersCollapsed ? 'Search & filter strands' : 'Close search'}
              >
                <Search className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-colors ${!searchFiltersCollapsed ? 'text-emerald-500' : ''}`} />
                {/* Chevron indicator - hidden on very small screens */}
                <motion.div
                  animate={{ rotate: searchFiltersCollapsed ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                  className="hidden xs:block"
                >
                  <ChevronDown className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                </motion.div>
              </motion.button>
              
              {/* Quick Menu Dropdown */}
              <div className="relative group">
                <button
                  className="p-1 sm:p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md sm:rounded-lg transition-colors"
                  aria-label="Quick menu"
                  title="Quick actions"
                >
                  <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-600 dark:text-zinc-400" />
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-[9999]">
                  {/* Create New - Top action */}
                  <Link
                    href="/codex/new"
                    className="w-full px-3 py-1.5 text-left text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 flex items-center gap-2 font-medium"
                  >
                    <Plus className="w-3 h-3" /> 
                    <span>Create New Strand</span>
                    <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">n</kbd>
                  </Link>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                  {/* Bookmarks - above Help */}
                  {onOpenBookmarks && (
                    <button
                      onClick={onOpenBookmarks}
                      className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                    >
                      <svg className="w-3 h-3 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Bookmarks</span>
                      <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">b</kbd>
                    </button>
                  )}
                  <button
                    onClick={onOpenHelp}
                    className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <LifeBuoy className="w-3 h-3" /> Help & Tutorials
                    <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">?</kbd>
                  </button>
                  <button
                    onClick={onOpenPreferences}
                    className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Sparkles className="w-3 h-3" /> Preferences
                    <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">,</kbd>
                  </button>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                  <Link
                    href="/codex/landing"
                    className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                  >
                    <Image
                      src="/quarry-icon-mono-light.svg"
                      alt="Quarry"
                      width={12}
                      height={12}
                      className="flex-shrink-0 block dark:hidden opacity-60"
                    />
                    <Image
                      src="/quarry-icon-mono-dark.svg"
                      alt="Quarry"
                      width={12}
                      height={12}
                      className="flex-shrink-0 hidden dark:block opacity-60"
                    />
                    About Quarry Codex
                  </Link>
                </div>
              </div>
              
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1 sm:p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md sm:rounded-lg transition-colors"
                aria-label="Toggle theme"
                title="Toggle dark/light mode"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                ) : (
                  <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-600" />
                )}
              </button>

              {/* Close (Mobile) */}
              <button
                onClick={onClose}
                className="md:hidden p-1 sm:p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md sm:rounded-lg transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 dark:text-zinc-400" />
              </button>
            </div>
          </div>
          
        </div>

        {/* Collapsible Search & Filters Section - Controlled by header button */}
        <AnimatePresence initial={false}>
          {!searchFiltersCollapsed && (
            /* Expanded: Full search & filters - slides down from header */
            <motion.div
              key="expanded-toolbar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="border-b border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10 overflow-hidden"
            >
              <div className="px-3 py-2 space-y-2">
                {/* Search Bar - Full width, no collapse button here */}
                <SearchBar
                  options={searchOptions}
                  onQueryChange={onSearchQueryChange}
                  onToggleSearchNames={onToggleSearchNames}
                  onToggleSearchContent={onToggleSearchContent}
                  onToggleCaseSensitive={onToggleCaseSensitive}
                  onReset={onResetSearch}
                  inputId="codex-search-input"
                  placeholder="Search strands..."
                  compact={true}
                />

                {/* Quick Filters Row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <NavigationRootToggle
                    value={searchOptions.rootScope}
                    onChange={onSetRootScope}
                    compact={true}
                  />
                  <FileFilterToggle
                    value={searchOptions.filterScope}
                    onChange={onSetFilterScope}
                    hideEmptyFolders={searchOptions.hideEmptyFolders}
                    onToggleHideEmptyFolders={onToggleHideEmptyFolders}
                    compact={true}
                  />
                </div>

                {/* Advanced Filters - Unified Taxonomy Bar */}
                {advancedFilters && (
                  <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                    <TaxonomyFilterBar
                      availableSubjects={(tagsIndex?.subjects || []).map(s => s.name)}
                      selectedSubjects={advancedFilters.selectedSubjects}
                      onSubjectsChange={onSetSelectedSubjects}
                      availableTopics={(tagsIndex?.topics || []).map(t => t.name)}
                      selectedTopics={advancedFilters.selectedTopics || []}
                      onTopicsChange={onSetSelectedTopics}
                      availableTags={(tagsIndex?.tags || []).map(t => t.name)}
                      selectedTags={advancedFilters.selectedTags}
                      onTagsChange={onSetSelectedTags}
                      showCalendar={!!onSetDateFilter}
                      selectedDate={advancedFilters.dateFilter?.startDate ? new Date(advancedFilters.dateFilter.startDate) : null}
                      onDateChange={(date) => onSetDateFilter && onSetDateFilter(date ? { mode: 'single', startDate: date.toISOString().split('T')[0] } : { mode: 'none' })}
                      theme={effectiveTheme}
                      compact
                    />
                    
                    {/* Excluded Items */}
                    {advancedFilters.excludedPaths.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center gap-1.5">
                          <EyeOff className="w-3 h-3 text-zinc-500" />
                          <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                            Hidden
                          </span>
                          <span className="px-1 text-[9px] text-amber-600 dark:text-amber-400">
                            {advancedFilters.excludedPaths.length}
                          </span>
                        </div>
                        <ExcludeListManager
                          excludedPaths={advancedFilters.excludedPaths}
                          onInclude={onIncludePath || (() => {})}
                          compact
                        />
                      </div>
                    )}

                    {/* Reset All Button */}
                    {activeAdvancedFilterCount > 0 && (
                      <button
                        onClick={onResetAdvancedFilters}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 mt-2 rounded
                          border border-zinc-200 dark:border-zinc-700
                          text-[10px] text-zinc-600 dark:text-zinc-400
                          hover:bg-zinc-100 dark:hover:bg-zinc-800
                          transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset All Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hierarchical Breadcrumb Navigation - Only shows when navigating (not on home) */}
        {(currentPath || selectedFile?.path) && (
          <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <HierarchyBreadcrumb
              currentPath={currentPath}
              selectedPath={selectedFile?.path}
              onNavigate={onNavigate}
              onBrowse={onBrowse}
              theme={effectiveTheme}
              showLevelIndicators={true}
            />
          </div>
        )}

        {/* View Toggle - Compact 6-button row - responsive sizing */}
        <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="grid grid-cols-6 gap-px sm:gap-0.5 rounded-md sm:rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-px sm:p-0.5">
            <button
              onClick={() => onModeChange('tree')}
              className={`px-0.5 sm:px-1 py-1 text-[8px] sm:text-[9px] font-semibold rounded sm:rounded-md transition-all flex items-center justify-center gap-0.5 ${
                mode === 'tree'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Knowledge Tree"
            >
              <GitBranch className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline text-[8px] sm:text-[9px]">Tree</span>
            </button>
            <button
              onClick={() => onModeChange('toc')}
              className={`px-0.5 sm:px-1 py-1 text-[8px] sm:text-[9px] font-semibold rounded sm:rounded-md transition-all flex items-center justify-center gap-0.5 ${
                mode === 'toc'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Outline"
            >
              <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline text-[8px] sm:text-[9px]">TOC</span>
            </button>
            <button
              onClick={() => onModeChange('tags')}
              className={`px-0.5 sm:px-1 py-1 text-[8px] sm:text-[9px] font-semibold rounded sm:rounded-md transition-all flex items-center justify-center gap-0.5 ${
                mode === 'tags'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Tags & Categories"
            >
              <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline text-[8px] sm:text-[9px]">Tags</span>
            </button>
            <button
              onClick={() => onModeChange('graph')}
              className={`px-0.5 sm:px-1 py-1 text-[8px] sm:text-[9px] font-semibold rounded sm:rounded-md transition-all flex items-center justify-center gap-0.5 ${
                mode === 'graph'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
              title="Knowledge Graph"
            >
              <Network className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline text-[8px] sm:text-[9px]">Graph</span>
            </button>
            <button
              onClick={() => onModeChange('query')}
              className={`px-0.5 sm:px-1 py-1 text-[8px] sm:text-[9px] font-semibold rounded sm:rounded-md transition-all flex items-center justify-center gap-0.5 ${
                mode === 'query'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
              title="Query Builder"
            >
              <Filter className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline text-[8px] sm:text-[9px]">Query</span>
            </button>
            <button
              onClick={() => onModeChange('plugins')}
              className={`px-0.5 sm:px-1 py-1 text-[8px] sm:text-[9px] font-semibold rounded sm:rounded-md transition-all flex items-center justify-center gap-0.5 ${
                mode === 'plugins'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400'
              }`}
              title="Plugins"
            >
              <Puzzle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline text-[8px] sm:text-[9px]">Ext</span>
            </button>
            <button
              onClick={() => onModeChange('planner')}
              className={`px-0.5 sm:px-1 py-1 text-[8px] sm:text-[9px] font-semibold rounded sm:rounded-md transition-all flex items-center justify-center gap-0.5 ${
                mode === 'planner'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
              title="Planner"
            >
              <CalendarDays className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline text-[8px] sm:text-[9px]">Plan</span>
            </button>

            {/* Quarry Plugin System: Plugin-defined sidebar modes */}
            {activeSidebarModes.map(({ pluginId, options }) => {
              const modeId = `plugin-${options.id}`
              const plugin = quarryPluginManager.getPlugin(pluginId)
              if (!plugin) return null

              return (
                <button
                  key={modeId}
                  onClick={() => onModeChange(modeId)}
                  className={`px-1 py-1 text-[9px] font-semibold rounded-md transition-all flex items-center justify-center gap-0.5 ${
                    mode === modeId
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400'
                  }`}
                  title={options.name}
                >
                  {React.isValidElement(options.icon) ? options.icon : <Puzzle className="w-2.5 h-2.5" />}
                  <span className="hidden sm:inline">{options.name}</span>
                </button>
              )
            })}

            {/* Selection indicator - show strand count only */}
            {selectionStats.strands > 0 && (
              <span 
                className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-500 text-white"
                title={`${selectionStats.strands} strand${selectionStats.strands !== 1 ? 's' : ''} selected`}
              >
                {selectionStats.strands}
              </span>
            )}
          </div>
        </div>

        {/* File List - with font scaling - responsive padding - custom scrollbar */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-1.5 sm:p-2 md:p-3 space-y-0.5 overscroll-contain touch-pan-y codex-sidebar-scroll"
          style={{
            // Scale all text based on font size setting
            fontSize: ['8px', '9px', '10px', '11px'][sidebarFontSize] || '9px',
          }}
        >
          {mode === 'tree' && (enableDragDropTree ? (
            <CodexTreeView
              data={filteredTree}
              selectedPath={selectedFile?.path}
              onSelect={(path) => {
                // Only open files, not folders (folders use onNavigate/onBrowse)
                const hasExtension = /\.[a-zA-Z0-9]+$/.test(path)
                if (hasExtension) {
                  onOpenFileFromTree(path)
                  if (window.innerWidth < 768) onClose()
                }
              }}
              onNavigate={(path) => {
                const navigateFn = onBrowse || onNavigate
                navigateFn(path)
                if (window.innerWidth < 768) onClose()
              }}
              onOpenExternal={(path) => {
                window.open(`/codex/${path.replace(/\.md$/, '')}`, '_blank')
              }}
              isDark={effectiveTheme?.includes('dark')}
              rowHeight={sidebarFontSize < 2 ? 28 : 32}
              indent={14}
              enableDragDrop={!(selectedPaths && selectedPaths.size > 0)} // Disable drag when items are selected
              onTreeChange={onTreeChange}
              onMoveComplete={onMoveComplete}
              searchTerm={searchOptions.query}
              loading={knowledgeTreeLoading}
              compact={sidebarFontSize < 2}
              totalStrands={totalTreeStrands}
              totalWeaves={totalTreeWeaves}
              // Multi-selection props - always enabled for hover selection
              selectionMode={true}
              selectedPaths={selectedPaths}
              onToggleSelection={onTogglePathSelection}
              isPathSelected={isPathSelected}
              onSelectRecursive={onSelectRecursive}
            />
          ) : renderKnowledgeTree())}
          {mode === 'toc' && renderOutlineList()}
          {mode === 'tags' && renderTagsView()}
          {mode === 'plugins' && (
            <PluginsSidebarView theme={effectiveTheme} />
          )}
          {mode === 'query' && (
            <QueryBuilderSidebarPanel
              theme={effectiveTheme?.includes('dark') ? 'dark' : 'light'}
              onExecute={(query, queryString) => {
                console.log('[QueryBuilder] Execute:', queryString)
                // Could integrate with search/filter system here
              }}
              className="flex-1"
            />
          )}
          {mode === 'planner' && (
            <PlannerSidebarPanel
              theme={effectiveTheme}
              onNavigateToStrand={(path) => {
                onOpenFileFromTree(path)
                if (window.innerWidth < 768) onClose()
              }}
              className="flex-1"
            />
          )}

          {/* Quarry Plugin System: Render plugin-defined sidebar modes */}
          {(() => {
            const pluginMode = activeSidebarModes.find(({ options }) =>
              `plugin-${options.id}` === mode
            )

            if (pluginMode) {
              const { pluginId, options } = pluginMode
              const plugin = quarryPluginManager.getPlugin(pluginId)

              if (!plugin) return null

              const Component = options.component

              return (
                <div className="flex-1 overflow-y-auto">
                  <Component
                    api={createPluginAPI(pluginId, () => plugin.settings)}
                    settings={plugin.settings}
                    theme={effectiveTheme}
                    isDark={effectiveTheme?.includes('dark') || false}
                  />
                </div>
              )
            }

            return null
          })()}
          {mode === 'graph' && (
            <SidebarGraphView
              tree={knowledgeTree}
              selectedPath={selectedFile?.path}
              onNavigate={(path) => {
                onOpenFileFromTree(path)
                if (window.innerWidth < 768) onClose()
              }}
              theme={effectiveTheme}
            />
          )}
        </div>

        {/* Sidebar Width & Font Size Control + Tree Actions + Hide Button */}
        <div className="flex items-center gap-1 px-2 py-1 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
          {/* Expand/Collapse All */}
          {mode === 'tree' && (onExpandAll || onCollapseAll) && (
            <button
              onClick={isAllExpanded ? onCollapseAll : onExpandAll}
              className="p-1.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              title={isAllExpanded ? 'Collapse all' : 'Expand all'}
            >
              {isAllExpanded ? (
                <ChevronsDownUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronsUpDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          
          {/* Width & Font Size Control */}
          {onSidebarWidthChange && (
            <div className="flex-1">
              <SidebarWidthControl
                width={sidebarWidth}
                onChange={onSidebarWidthChange}
                fontSize={sidebarFontSize}
                onFontSizeChange={onSidebarFontSizeChange}
                theme={effectiveTheme}
              />
            </div>
          )}
          
          {/* Hide Sidebar Button */}
          <button
            onClick={onClose}
            className="hidden md:flex p-1.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            title="Hide sidebar (⌘/Ctrl+B)"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Batch Actions Bar (when items are selected) */}
        {selectedPaths && selectedPaths.size > 0 && onGetAllStrandPaths && (
          <BatchActionsBar
            stats={selectionStats}
            isVisible={selectedPaths && selectedPaths.size > 0}
            theme={effectiveTheme}
            onGenerateFlashcards={onGenerateFlashcards ? () => {
              const strandPaths = onGetAllStrandPaths()
              if (strandPaths.length > 0) onGenerateFlashcards(strandPaths)
            } : undefined}
            onGenerateGlossary={onGenerateGlossary ? () => {
              const strandPaths = onGetAllStrandPaths()
              if (strandPaths.length > 0) onGenerateGlossary(strandPaths)
            } : undefined}
            onGenerateQuiz={onGenerateQuiz ? () => {
              const strandPaths = onGetAllStrandPaths()
              if (strandPaths.length > 0) onGenerateQuiz(strandPaths)
            } : undefined}
            onClearSelection={onClearSelection}
          />
        )}

        {/* Collapsible Footer - responsive sizing */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          {/* Always Visible: Help & Bookmarks (2-column) + Expand Toggle */}
          <div className="p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2">
            {/* Help Button with custom icon */}
            <button
              onClick={() => {
                onOpenHelp()
                if (window.innerWidth < 768) {
                  onClose()
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/60 text-[8px] sm:text-[9px] font-semibold text-zinc-700 dark:text-zinc-200 py-1 sm:py-1.5 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
              title="Help & keyboard shortcuts"
            >
              {/* Custom Help SVG Icon */}
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <circle cx="12" cy="17" r="0.5" fill="currentColor" />
              </svg>
              <span className="hidden xs:inline">Help</span>
            </button>

            {/* Bookmarks Button with custom icon */}
            {onOpenBookmarks && (
              <button
                onClick={() => {
                  onOpenBookmarks()
                  if (window.innerWidth < 768) {
                    onClose()
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/60 text-[8px] sm:text-[9px] font-semibold text-zinc-700 dark:text-zinc-200 py-1 sm:py-1.5 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                title="Bookmarks & history (b)"
              >
                {/* Custom Bookmark SVG Icon */}
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="9" r="2" fill="currentColor" opacity="0.3" />
                </svg>
                <span className="hidden xs:inline">Saved</span>
              </button>
            )}

            <button
              onClick={() => setFooterCollapsed(!footerCollapsed)}
              className="p-1 sm:p-1.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
              title={footerCollapsed ? 'Expand footer links' : 'Collapse footer links'}
            >
              <motion.div
                animate={{ rotate: footerCollapsed ? 0 : 180 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-500" />
              </motion.div>
            </button>
          </div>
          
          {/* Collapsible Links Section */}
          <AnimatePresence>
            {!footerCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-2 space-y-1.5">
          {/* Source Mode Badge */}
          {contentSource && (
            <SourceModeBadge
              source={contentSource}
              displayPath={contentSourcePath}
              onSwitchMode={onOpenContentSourceSettings}
              compact={true}
              theme={effectiveTheme}
            />
          )}
          
          {/* Repository Indicator */}
          <RepositoryIndicator
            allowEdit={process.env.NEXT_PUBLIC_ENABLE_REPO_EDIT === 'true'}
            onEdit={onOpenPreferences}
            theme={effectiveTheme}
            compact={true}
          />
          
          {/* About Quarry Codex - Landing Page CTA - Premium monochrome */}
          <Link
            href="/codex/landing"
            className="flex items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 rounded transition-all group"
          >
            <Image
              src="/quarry-icon-mono-light.svg"
              alt="Quarry"
              width={12}
              height={12}
              className="flex-shrink-0 block dark:hidden opacity-70 group-hover:opacity-100 transition-opacity"
            />
            <Image
              src="/quarry-icon-mono-dark.svg"
              alt="Quarry"
              width={12}
              height={12}
              className="flex-shrink-0 hidden dark:block opacity-70 group-hover:opacity-100 transition-opacity"
            />
            <span className="text-[9px] font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
              About Quarry Codex
            </span>
            <ChevronRight className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500 ml-auto group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
          </Link>
          
          {/* Quick Stats Bar - Full Width */}
          <div className="flex items-center justify-between text-[8px] text-zinc-500 dark:text-zinc-400 pt-1">
            <span>{files.length} items</span>
            <a
              href={`https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-cyan-600 dark:hover:text-cyan-400"
            >
              GitHub
                      <ExternalLink className="w-2 h-2" />
            </a>
          </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}



