/**
 * Markdown Utilities
 * @module lib/markdown
 *
 * Utilities for working with markdown content.
 */

export {
  detectExistingTOC,
  stripExistingTOC,
  hasTOCHeading,
  generateTOC,
  ensureTOC,
  type TOCDetectionResult,
  type TOCEntry,
} from './tocDetector'
