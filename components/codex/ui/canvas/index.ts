/**
 * Canvas Components - Main exports
 * @module codex/ui/canvas
 *
 * Infinite canvas components with custom shapes for:
 * - Voice recordings with waveform visualization
 * - Transcripts linked to voice notes
 * - File/image attachments
 * - Smart export to markdown
 *
 * @example
 * ```tsx
 * import {
 *   canvasToMarkdown,
 *   canvasHasContent,
 *   getCanvasSummary,
 *   useCanvasShapes,
 * } from '@/components/codex/ui/canvas'
 * ```
 */

// Shape utils and types
export * from './shapes'

// Hook for canvas shapes
export { useCanvasShapes } from './useCanvasShapes'

// Export utilities
export {
  canvasToMarkdown,
  canvasHasContent,
  getCanvasSummary,
  type CanvasExportResult,
  type CanvasExportOptions,
  type CanvasExportMetadata,
  type CanvasAsset,
} from './canvasToMarkdown'

// Mobile toolbar
export { default as MobileCanvasToolbar } from './MobileCanvasToolbar'
