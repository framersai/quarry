/**
 * FABRIC Codex components barrel export
 * @module codex
 */

export { default as CodexViewer } from './CodexViewer'
export { default as CodexSidebar } from './CodexSidebar'
export { default as CodexContent } from './CodexContent'
export { default as CodexMetadataPanel } from './CodexMetadataPanel'
export { default as CodexToolbar } from './CodexToolbar'
export { default as CodexPageLayout } from './CodexPageLayout'

// UI components
export { default as SearchBar } from './ui/SearchBar'
export { default as PaperCard } from './ui/PaperCard'
export { default as PaperLabel } from './ui/PaperLabel'
export { default as StrandPrintExport } from './ui/StrandPrintExport'
export { default as MobileToggle } from './ui/MobileToggle'
export { default as OutlineTableOfContents } from './ui/OutlineTableOfContents'
export { default as FabricGraphView } from './ui/FabricGraphView'
export { default as KnowledgeGraphView } from './ui/KnowledgeGraphView'
export { default as StableKnowledgeGraph } from './ui/StableKnowledgeGraph'
export { default as StrandCreationWizard, shouldShowWizard, markWizardCompleted, setWizardNeverShow, resetWizard, isWizardDisabled } from './ui/StrandCreationWizard'
export { default as StrandPreviewPanel } from './ui/StrandPreviewPanel'
export { default as ReaderModePanel } from './ui/ReaderModePanel'
export { default as MetadataEditor } from './ui/MetadataEditor'
export { default as CreateNodeWizard } from './ui/CreateNodeWizard'
export { default as MobileKnowledgeSheet } from './ui/MobileKnowledgeSheet'

// Hooks
export { useGithubTree } from './hooks/useGithubTree'
export { useCodexHotkeys } from './hooks/useCodexHotkeys'
export { useSearchFilter } from './hooks/useSearchFilter'
export { useTreeSync } from './tree/hooks/useTreeSync'
export { useDeviceCapabilities } from './hooks/useDeviceCapabilities'
export { useSmartAutofill } from './hooks/useSmartAutofill'
export { useModalAccessibility } from './hooks/useModalAccessibility'
export type { SmartAutofillConfig, SmartAutofillResult, Suggestion } from './hooks/useSmartAutofill'

// Database hooks (SQL-backed offline storage)
export {
  useReadingProgress,
  useBookmarks,
  useBookmark,
  useSearchHistory,
  useDrafts,
  useDatabaseStats,
  useRecentlyRead,
} from './hooks/useCodexDatabase'

// Audit logging & undo/redo hooks
export {
  useAuditLog,
  useNavigationLogger,
  useContentLogger,
  useFileLogger,
} from './hooks/useAuditLog'

export {
  useUndoRedo,
  useUndoRedoContext,
  UndoRedoProvider,
  useUndoableContent,
  useUndoableFileOps,
} from './hooks/useUndoRedo'

// Touch device detection hooks
export {
  useIsTouchDevice,
  useIsTablet,
  useTouchTargetSize,
} from './hooks/useIsTouchDevice'

// Types
export type {
  GitHubFile,
  GitTreeItem,
  KnowledgeTreeNode,
  StrandMetadata,
  SearchOptions,
  SidebarMode,
  ViewerMode,
  NodeLevel,
  LevelStyle,
  FrameCodexViewerProps,
  TagIndexEntry,
  TagsIndex,
  NodeStyle,
} from './types'

// Constants
export {
  REPO_CONFIG,
  API_ENDPOINTS,
  IGNORED_SEGMENTS,
  MARKDOWN_EXTENSIONS,
  LEVEL_STYLES,
  DEFAULT_SEARCH_OPTIONS,
  PAGINATION,
  BREAKPOINTS,
  HOTKEYS,
  // Public docs & SEO (new)
  PUBLIC_DOCS_CONFIG,
  pathToPublicUrl,
  publicUrlToPath,
  isStrandIndexable,
} from './constants'

// Utils
export {
  shouldIgnorePath,
  isMarkdownFile,
  determineNodeLevel,
  buildKnowledgeTree,
  parseWikiMetadata,
  formatNodeName,
  rewriteImageUrl,
  filterFiles,
  debounce,
} from './utils'
