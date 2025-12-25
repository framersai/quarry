/**
 * OCR Module
 * @module lib/ocr
 *
 * Handwriting transcription system with local and cloud capabilities
 */

// Main engine
export { OCREngine, getOCREngine, resetOCREngine } from './ocrEngine'

// Utilities
export { preprocessForOCR, hashImage } from './imagePreprocessor'
export { loadTrOCRModel, getModelInfo, unloadModel, transcribeWithTrOCR } from './trocr'
export { transcribeWithCloud, isCloudOCRAvailable } from './cloudOCR'
export { detectHandwriting, isLikelyHandwriting } from './handwritingDetector'

// Error handling
export {
  OCRError,
  OCRErrorCode,
  withTimeout,
  validateImageBlob,
} from './errors'

// Types
export type {
  OCRMode,
  TranscriptionStatus,
  OCRResult,
  OCREngineOptions,
  PreprocessOptions,
  CloudOCROptions,
  TrOCRModelInfo,
  OCRCacheEntry,
  OCRErrorDetails,
} from './types'
