/**
 * Type definitions for FABRIC Codex viewer components
 * @module codex/types
 */

import type { LucideIcon } from 'lucide-react'
import type { SourceMetadata } from '@/types/sourceMetadata'

/**
 * GitHub API file/directory item
 */
export interface GitHubFile {
  /** File or directory name */
  name: string
  /** Full path from repo root */
  path: string
  /** Item type */
  type: 'file' | 'dir'
  /** Git SHA hash */
  sha: string
  /** File size in bytes (files only) */
  size?: number
  /** GitHub API URL */
  url: string
  /** GitHub web URL */
  html_url: string
  /** Raw content download URL (files only) */
  download_url?: string
}

/**
 * GitHub Git Tree API item
 */
export interface GitTreeItem {
  /** Full path from repo root */
  path: string
  /** Item type */
  type: 'blob' | 'tree'
  /** Git SHA hash */
  sha: string
  /** File size in bytes (blobs only) */
  size?: number
}

/**
 * Knowledge hierarchy level in FABRIC Codex schema
 * - **Fabric**: Collection of weaves (the entire FABRIC Codex repository is a fabric containing multiple weaves)
 * - **Weave**: Top-level knowledge universe (e.g., `weaves/technology/`) - complete, self-contained, no cross-weave dependencies
 * - **Loom**: Any subdirectory inside a weave - curated topic collection or module
 * - **Strand**: Atomic knowledge unit - can be EITHER:
 *   - A single markdown file with frontmatter (file-strand)
 *   - A folder with strand.yml schema (folder-strand) containing multiple files
 * - **Folder**: Generic directory outside the weaves hierarchy (not part of OpenStrand schema)
 * 
 * @remarks
 * A folder becomes a Strand (instead of a Loom) when it contains a strand.yml or strand.yaml file.
 * This allows grouping related content: images, notes, illustrations, media all belonging to one strand.
 */
export type NodeLevel = 'fabric' | 'weave' | 'loom' | 'strand' | 'folder'

/**
 * Strand type - distinguishes between file and folder strands
 */
export type StrandType = 'file' | 'folder'

/**
 * File inclusion configuration for folder-strands
 */
export interface StrandIncludes {
  /** Markdown/MDX content files */
  content?: string[]
  /** Image files (illustrations, diagrams) */
  images?: string[]
  /** Video, audio, other media */
  media?: string[]
  /** JSON, YAML, CSV data files */
  data?: string[]
  /** Supplementary note files */
  notes?: string[]
}

/** Media asset types */
export type MediaAssetType = 'image' | 'audio' | 'video' | 'drawing' | 'document'

/** Asset source types */
export type MediaAssetSource = 'camera' | 'upload' | 'voice' | 'whiteboard' | 'external'

/**
 * Detailed media asset metadata for strand schema
 * Used to track captured/uploaded media with sync status
 */
export interface StrandMediaAsset {
  /** Relative path within strand folder */
  path: string
  /** Asset type */
  type: MediaAssetType
  /** How the asset was created/captured */
  source: MediaAssetSource
  /** When the asset was captured/uploaded (ISO timestamp) */
  capturedAt?: string
  /** Sync status with remote storage */
  syncStatus?: 'local' | 'synced' | 'pending' | 'error'
  /** Original filename before rename */
  originalName?: string
  /** File size in bytes */
  size?: number
  /** MIME type */
  mimeType?: string
  /** SHA checksum for deduplication */
  checksum?: string
}

/**
 * Custom styling for tree nodes
 * Also exported as NodeVisualStyle for backwards compatibility
 */
export interface NodeStyle {
  /** Background color */
  backgroundColor?: string
  /** Text color */
  textColor?: string
  /** Accent color for badges/icons */
  accentColor?: string
  /** Custom emoji icon */
  emoji?: string
  /** Lucide icon name */
  icon?: string
  /** Use dark text (for light backgrounds) */
  darkText?: boolean
  /** Thumbnail image URL */
  thumbnail?: string
  /** Cover image URL */
  coverImage?: string
  /** Background image URL */
  backgroundImage?: string
  /** Border color */
  borderColor?: string
  /** Background gradient CSS value */
  backgroundGradient?: string
  /** Background overlay opacity (0-1) */
  backgroundOpacity?: number
}

/** Alias for backwards compatibility */
export type NodeVisualStyle = NodeStyle

/**
 * Hierarchical knowledge tree node
 */
export interface KnowledgeTreeNode {
  /** Display name */
  name: string
  /** Full path from repo root */
  path: string
  /** Node type */
  type: 'file' | 'dir'
  /** Child nodes (directories only) */
  children?: KnowledgeTreeNode[]
  /** Total markdown files in subtree */
  strandCount: number
  /** Codex hierarchy level */
  level: NodeLevel
  /** Custom styling from loom.yaml */
  style?: NodeStyle
  /** Description from loom.yaml or weave.yaml */
  description?: string
}

/**
 * Parsed YAML frontmatter metadata
 */
type DifficultyScale = 'beginner' | 'intermediate' | 'advanced'

type DifficultyBreakdown = {
  overall?: string | number
  cognitive?: number
  prerequisites?: number
  conceptual?: number
  [key: string]: string | number | undefined
}

export interface StrandMetadata {
  /** Unique identifier (UUID) */
  id?: string
  /** URL-safe slug */
  slug?: string
  /** Display title */
  title?: string
  /** Semantic version */
  version?: string
  
  /** 
   * Strand type - file or folder
   * - file: Traditional single markdown file with frontmatter
   * - folder: Directory with strand.yml containing multiple files
   */
  strandType?: StrandType
  
  /**
   * Entry file for folder-strands (e.g., 'index.md', 'README.md')
   * Only used when strandType is 'folder'
   */
  entryFile?: string
  
  /**
   * File inclusions for folder-strands
   * Specifies which files belong to this strand
   */
  includes?: StrandIncludes
  
  /**
   * Glob patterns to exclude from folder-strands
   * Default: ['*.draft.md', '*.wip.*', '_*']
   */
  excludes?: string[]
  
  /**
   * All files belonging to this strand (computed at index time)
   * For file-strands: just the file itself
   * For folder-strands: all included files
   */
  strandFiles?: Array<{
    path: string
    type: 'content' | 'image' | 'media' | 'data' | 'note'
    role?: 'entry' | 'supplementary' | 'illustration' | 'reference'
  }>
  
  /** Content difficulty level */
  difficulty?: DifficultyScale | DifficultyBreakdown
  /** Taxonomy classification */
  taxonomy?: {
    /** High-level subjects */
    subjects?: string[]
    /** Specific topics */
    topics?: string[]
  }
  /** Auto-generated metadata from NLP analysis */
  autoGenerated?: {
    /** Extracted keywords */
    keywords?: string[]
    /** Extracted key phrases */
    phrases?: string[]
    /** Auto-detected subjects */
    subjects?: string[]
    /** Auto-detected topics */
    topics?: string[]
    /** Auto-detected skills (learning prerequisites) */
    skills?: string[]
    /** Auto-detected difficulty */
    difficulty?: string
    /** Confidence scores for classifications */
    confidence?: Record<string, number>
    /** Reading level metrics */
    readingLevel?: number
    /** Extracted entities */
    entities?: {
      people?: string[]
      places?: string[]
      organizations?: string[]
      topics?: string[]
    }
    /** Auto-generated summary */
    summary?: string
    /** AI-generated summary */
    aiSummary?: string
    /** Timestamp of last indexing */
    lastIndexed?: string
  }
  /** Freeform tags */
  tags?: string | string[]
  /**
   * Skills required to understand this strand
   * 
   * @remarks
   * Skills are like tags but specifically for spiral learning prerequisites.
   * They represent generalized, transferable competencies (e.g., "typescript", 
   * "javascript", "react", "git") that a reader should have before tackling this strand.
   * 
   * Skills differ from tags:
   * - **Skills**: Prerequisites for learning (what you need to know)
   * - **Tags**: Categorization (what the content is about)
   * 
   * Skills should be as generalized as possible to enable path planning across
   * multiple strands. The spiral learning algorithm uses skills to calculate
   * prerequisite paths.
   * 
   * @example
   * ```yaml
   * skills:
   *   - typescript
   *   - react-hooks
   *   - state-management
   * ```
   */
  skills?: string[]
  /** Content type - 'collection' recommended for folder-strands */
  contentType?: string
  /** Related strands */
  relationships?: {
    /** Referenced strands */
    references?: string[]
    /** Required prerequisite strands */
    prerequisites?: string[]
    /** See also / related content */
    seeAlso?: string[]
  }
  /** Publishing metadata */
  publishing?: {
    /** Publication status */
    status?: 'draft' | 'published' | 'archived'
    /** Last updated timestamp */
    lastUpdated?: string
  }
  /** Auto-generated extractive summary */
  summary?: string
  /** AI-authored abstractive summary */
  aiSummary?: string
  /** Curated notes */
  notes?: string[] | string
  /** Auto-tagging configuration for this document */
  autoTagConfig?: AutoTagConfig
  /** Block-level summaries with tags, illustrations, media */
  blockSummaries?: BlockSummary[]
  /** Document-level illustrations */
  illustrations?: StrandIllustration[]
  /** Document-level galleries */
  galleries?: StrandGallery[]
  /** SEO configuration */
  seo?: StrandSEO
  /** Reader mode display settings */
  readerSettings?: {
    /** Show placeholder when no illustration for block */
    showIllustrationPlaceholder?: boolean
    /** Default placeholder image URL */
    placeholderImage?: string
    /** Illustration display mode */
    illustrationMode?: 'per-block' | 'persistent' | 'none'
  }

  /** Source metadata - tracks strand provenance and creation */
  source?: SourceMetadata

  /** Catch-all for other fields */
  [key: string]: any
}

/**
 * Worthiness signal weights for block tagging
 */
export interface WorthinessWeights {
  /** Weight for topic shift signal (default 0.4) */
  topicShift?: number
  /** Weight for entity density signal (default 0.3) */
  entityDensity?: number
  /** Weight for semantic novelty signal (default 0.3) */
  semanticNovelty?: number
}

/**
 * Worthiness signals for a block
 */
export interface WorthinessSignals {
  /** 0-1: How different is this block from document theme */
  topicShift: number
  /** 0-1: Tech entities / concepts per word */
  entityDensity: number
  /** 0-1: Embedding distance from surrounding blocks */
  semanticNovelty: number
}

/**
 * Result of block worthiness calculation
 */
export interface WorthinessResult {
  /** Combined 0-1 score */
  score: number
  /** Individual signals */
  signals: WorthinessSignals
  /** Above threshold? */
  worthy: boolean
  /** Explanation of worthiness decision */
  reasoning: string
}

/**
 * LLM provider options
 */
export type LLMProvider = 'claude' | 'openai' | 'openrouter'

/**
 * Auto-tagging configuration for documents and blocks
 * Cascading: if document auto-tag is off, block auto-tag is also off
 */
export interface AutoTagConfig {
  /** Enable auto-tagging at document level */
  documentAutoTag?: boolean
  /** Enable auto-tagging at block level (requires documentAutoTag=true) */
  blockAutoTag?: boolean
  /** Use LLM for intelligent tagging (vs statistical NLP only) */
  useLLM?: boolean
  /** Prefer existing tags over creating new ones */
  preferExistingTags?: boolean
  /** Maximum new tags to create per block */
  maxNewTagsPerBlock?: number
  /** Maximum new tags to create per document */
  maxNewTagsPerDocument?: number
  /** Tag confidence threshold (0-1) for auto-suggestion */
  confidenceThreshold?: number

  // === Block-level tagging options ===

  /** LLM provider preference order (first available wins) */
  llmProviderOrder?: LLMProvider[]
  /** Block worthiness threshold (0-1), blocks below this don't get tags */
  blockWorthinessThreshold?: number
  /** Enable tag bubbling from blocks to document */
  enableTagBubbling?: boolean
  /** Minimum block occurrences for tag to bubble up to document */
  tagBubblingThreshold?: number
  /** Worthiness signals weights for block tagging */
  worthinessWeights?: WorthinessWeights
}

/**
 * External media reference (YouTube, audio, video, links)
 */
export interface MediaReference {
  /** Unique identifier */
  id: string
  /** Media type */
  type: 'youtube' | 'video' | 'audio' | 'link' | 'embed'
  /** Source URL */
  url: string
  /** Display title */
  title?: string
  /** Description/caption */
  description?: string
  /** Thumbnail URL */
  thumbnail?: string
  /** Duration in seconds (for audio/video) */
  duration?: number
  /** Start time in seconds (for clips) */
  startTime?: number
  /** End time in seconds (for clips) */
  endTime?: number
  /** Reference type */
  refType?: 'source' | 'related' | 'supplementary' | 'example'
}

/**
 * Block-level illustration with intelligent display logic
 */
export interface BlockIllustration {
  /** Unique identifier */
  id: string
  /** Image source URL */
  src: string
  /** Alt text for accessibility */
  alt?: string
  /** Image caption */
  caption?: string
  /** AI generation style used */
  style?: string
  /** Prompt used to generate this image */
  generationPrompt?: string
  /** Whether this was AI-generated */
  aiGenerated?: boolean
  /** Whether this illustration should be shown for this block
   * If false, reader mode will show previous block's illustration */
  showForBlock?: boolean
  /** Priority weight for display (higher = more likely to show) */
  priority?: number
}

/**
 * Block-level summary for reader mode
 * Enhanced with block-level tags, media references, and illustrations
 */
export interface BlockSummary {
  /** Unique block identifier */
  blockId: string
  /** Type of markdown block */
  blockType: 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'table' | 'html'
  /** Heading level (1-6) if blockType is 'heading' */
  headingLevel?: number
  /** Heading slug for anchor links */
  headingSlug?: string
  /** Starting line number in source */
  startLine: number
  /** Ending line number in source */
  endLine: number
  /** Raw content of this block */
  rawContent?: string
  /** Extractive summary (direct excerpt) */
  extractive: string
  /** AI-generated abstractive summary */
  abstractive?: string
  /** Curated notes for this block */
  notes?: string[]
  /** Block-level tags (in addition to document tags) */
  tags?: string[]
  /** Auto-generated tag suggestions (pre-acceptance) */
  suggestedTags?: Array<{
    tag: string
    confidence: number
    source: 'llm' | 'nlp' | 'existing'
    reasoning?: string
  }>
  /** Block-specific illustrations */
  illustrations?: BlockIllustration[]
  /** Whether this block warrants a new illustration
   * If false, reader mode continues showing previous illustration */
  warrantsNewIllustration?: boolean
  /** External media references */
  mediaRefs?: MediaReference[]
  /** Whether auto-tagging is enabled for this specific block */
  autoTagEnabled?: boolean
  /** Combined worthiness score for tagging (0-1) */
  worthinessScore?: number
  /** Individual signals used to calculate worthiness */
  worthinessSignals?: WorthinessSignals
}

/**
 * Illustration attached to a strand or block
 */
export interface StrandIllustration {
  /** Unique identifier */
  id: string
  /** Associated block ID (optional) */
  blockId?: string
  /** Image source URL */
  src: string
  /** Alt text for accessibility */
  alt?: string
  /** Image caption */
  caption?: string
  /** AI generation style used */
  style?: string
  /** Prompt used to generate this image */
  generationPrompt?: string
  /** Whether this was AI-generated */
  aiGenerated?: boolean
  /** Width (CSS value) */
  width?: string
  /** Position relative to content */
  position?: 'left' | 'right' | 'center' | 'full'
}

/**
 * Gallery of related illustrations
 */
export interface StrandGallery {
  /** Unique identifier */
  id: string
  /** Gallery title */
  title?: string
  /** Gallery description */
  description?: string
  /** Images in this gallery */
  images: StrandIllustration[]
  /** Layout mode */
  layout?: 'grid' | 'carousel' | 'masonry'
}

/**
 * SEO configuration for a strand
 */
export interface StrandSEO {
  /** Allow search engine indexing */
  index?: boolean
  /** Allow link following */
  follow?: boolean
  /** Canonical URL override */
  canonicalUrl?: string
  /** Meta description override */
  metaDescription?: string
  /** OpenGraph image URL */
  ogImage?: string
  /** Sitemap priority (0.0 - 1.0) */
  sitemapPriority?: number
  /** Change frequency hint */
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
}

/**
 * File filter scope - controls what types of files are shown
 * - **strands**: Only markdown files with metadata (cataloged knowledge)
 * - **media**: Markdown files + media assets (images, audio, video, PDFs)
 * - **configs**: JSON/YAML/TOML config files
 * - **all**: All repository files (except .gitignore entries)
 */
export type FileFilterScope = 'strands' | 'media' | 'configs' | 'text' | 'images' | 'all'

/**
 * Navigation root scope
 * - fabric: Start at weaves/ folder (default, shows Fabric content only)
 * - root: Show entire repository structure (includes READMEs, configs, etc.)
 */
export type NavigationRootScope = 'fabric' | 'weaves'

/**
 * Search filter options
 */
export interface SearchOptions {
  /** Search query string */
  query: string
  /** Search in file names */
  searchNames: boolean
  /** Search in file content (full-text) */
  searchContent: boolean
  /** Case-sensitive search */
  caseSensitive: boolean
  /** Use regex for search pattern matching */
  useRegex?: boolean
  /** Filter scope (what types of files to show) */
  filterScope: FileFilterScope
  /** Hide folders that don't contain matching files */
  hideEmptyFolders: boolean
  /** Navigation root scope (fabric-only or full repo) */
  rootScope: NavigationRootScope
  /** Filter by difficulty */
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  /** Filter by tags */
  tags?: string[]
  /** Filter by subjects */
  subjects?: string[]
}

/**
 * Date filter configuration for calendar-based filtering
 */
export interface DateFilter {
  /** Filter mode */
  mode: 'single' | 'range' | 'none'
  /** Start date (ISO 8601 format) */
  startDate?: string
  /** End date for range selection (ISO 8601 format) */
  endDate?: string
}

/**
 * Advanced filter options for calendar, tags, and exclusions
 */
export interface AdvancedFilterOptions {
  /** Date-based filtering using frontmatter date field */
  dateFilter: DateFilter
  /** Selected tags for filtering (multi-select) */
  selectedTags: string[]
  /** Tag match mode - 'any' for OR, 'all' for AND */
  tagMatchMode: 'any' | 'all'
  /** Selected subjects from taxonomy */
  selectedSubjects: string[]
  /** Selected topics from taxonomy */
  selectedTopics: string[]
  /** Paths to exclude from view */
  excludedPaths: string[]
}

/**
 * Position data for tracking tree node positions during filtering
 * Used to preserve hidden items' positions during drag-drop
 */
export interface PositionData {
  /** Parent directory path */
  parentPath: string
  /** Index among siblings */
  index: number
  /** When position was recorded */
  timestamp: number
  /** Whether item is currently hidden by filters */
  isHidden: boolean
}

/**
 * Position tracking state for the entire tree
 */
export interface PositionTrackingState {
  /** Map of path to position data */
  positions: Record<string, PositionData>
  /** Timestamp of last snapshot */
  lastSnapshot: number
  /** True if positions changed since last save */
  isDirty: boolean
}

/**
 * Date index entry for efficient date-based filtering
 */
export interface DateIndexEntry {
  /** File path */
  path: string
  /** Date value (ISO 8601 format) */
  date: string
  /** Source of the date (frontmatter, git, etc.) */
  dateSource: 'frontmatter' | 'git' | 'filesystem'
}

/**
 * Aggregated date index for the codex
 */
export interface DateIndex {
  /** All date entries */
  entries: DateIndexEntry[]
  /** Earliest date in the index */
  minDate?: string
  /** Latest date in the index */
  maxDate?: string
  /** Available years for quick filtering */
  availableYears: number[]
  /** Available year-month pairs */
  availableMonths: { year: number; month: number }[]
}

/**
 * Sidebar display mode
 * FABRIC Plugin System: Allows plugin-defined sidebar modes
 */
export type BuiltInSidebarMode = 'tree' | 'toc' | 'tags' | 'graph' | 'query' | 'plugins' | 'planner'
export type SidebarMode = BuiltInSidebarMode | string // Allow plugin mode IDs

/**
 * Viewer display mode
 */
export type ViewerMode = 'modal' | 'page'

/**
 * Level-specific styling configuration
 */
export interface LevelStyle {
  /** Display label */
  label: string
  /** Tailwind CSS classes */
  className: string
  /** Icon component */
  icon?: LucideIcon
}

/**
 * Tag index entry for tag-based navigation
 */
export interface TagIndexEntry {
  /** Tag name */
  name: string
  /** Number of strands with this tag */
  count: number
  /** File paths tagged with this */
  paths: string[]
}

/**
 * Tags index structure for the entire codex
 */
export interface TagsIndex {
  /** All tags */
  tags: TagIndexEntry[]
  /** All subjects from taxonomy */
  subjects: TagIndexEntry[]
  /** All topics from taxonomy */
  topics: TagIndexEntry[]
}

/**
 * Props for QuarryCodexViewer component
 */
export interface QuarryCodexViewerProps {
  /** Whether the viewer is open (modal mode) */
  isOpen: boolean
  /** Close callback (modal mode) */
  onClose?: () => void
  /** Display mode */
  mode?: ViewerMode
  /** Initial path to load */
  initialPath?: string
  /** Initial file to load (for clean URL routing) */
  initialFile?: string | null
}

/** @deprecated Use QuarryCodexViewerProps instead */
export type FrameCodexViewerProps = QuarryCodexViewerProps