/**
 * Canvas Shape Type Definitions
 * @module codex/ui/canvas/shapes/types
 *
 * Type definitions for custom tldraw shapes:
 * - VoiceNoteShape: Audio player with waveform
 * - TranscriptShape: Text card linked to voice notes
 * - AttachmentShape: File/image embed with AI analysis
 * - HandwritingShape: Handwritten notes with OCR transcription
 */

import type { TLBaseShape } from '@tldraw/tldraw'
import type { ImageSourceType, ImageAnalysisResult } from '@/lib/ai/types'

/* ═══════════════════════════════════════════════════════════════════════════
   VOICE NOTE SHAPE
═══════════════════════════════════════════════════════════════════════════ */

/** Transcription status for voice notes */
export type TranscriptionStatus =
  | 'idle'       // Not transcribed, can start
  | 'pending'    // Queued for transcription
  | 'processing' // Currently transcribing
  | 'done'       // Transcription complete
  | 'error'      // Transcription failed
  | 'cancelled'  // User cancelled transcription

/** VoiceNote shape props */
export interface VoiceNoteShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Relative path to audio file in assets/audio/ */
  audioPath: string
  /** Total duration in seconds */
  duration: number
  /** Current playback position in seconds */
  currentTime: number
  /** Whether audio is playing */
  isPlaying: boolean
  /** Normalized waveform data (0-1 values) */
  waveformData: number[]
  /** Inline transcript preview text */
  transcriptText: string
  /** ID of linked TranscriptShape */
  linkedTranscriptId: string
  /** ISO timestamp when recorded */
  recordedAt: string
  /** User-editable title */
  title: string
  /** Current transcription status */
  transcriptionStatus: TranscriptionStatus
}

/** VoiceNote shape type */
export type VoiceNoteShape = TLBaseShape<'voicenote', VoiceNoteShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSCRIPT SHAPE
═══════════════════════════════════════════════════════════════════════════ */

/** Timestamped text segment for audio sync */
export interface TranscriptTimestamp {
  /** Time in seconds */
  time: number
  /** Text at this timestamp */
  text: string
}

/** Transcript shape props */
export interface TranscriptShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Header title */
  title: string
  /** Full transcript text */
  text: string
  /** ID of linked VoiceNoteShape */
  linkedVoiceNoteId: string
  /** Hashtags for categorization */
  tags: string[]
  /** Timestamp markers for audio sync */
  timestamps: TranscriptTimestamp[]
  /** Card color theme */
  color: string
  /** ISO timestamp when created */
  createdAt: string
}

/** Transcript shape type */
export type TranscriptShape = TLBaseShape<'transcript', TranscriptShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   ATTACHMENT SHAPE
═══════════════════════════════════════════════════════════════════════════ */

/** Image/video dimensions */
export interface MediaDimensions {
  width: number
  height: number
}

/** Attachment shape props */
export interface AttachmentShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Display filename */
  fileName: string
  /** Relative path to file in assets/ */
  filePath: string
  /** MIME type of file */
  mimeType: string
  /** File size in bytes */
  fileSize: number
  /** Optional thumbnail URL for images/videos */
  thumbnailPath: string
  /** Dimensions for images/videos */
  dimensions: MediaDimensions | null
  /** ISO timestamp when uploaded */
  uploadedAt: string
  /** AI-generated caption/description for images */
  caption?: string
  /** Image source type (camera, upload, screenshot, etc.) */
  sourceType?: ImageSourceType
  /** Complete image analysis result */
  analysisMetadata?: ImageAnalysisResult
  /** Current analysis status */
  analysisStatus?: 'idle' | 'analyzing' | 'done' | 'error'
}

/** Attachment shape type */
export type AttachmentShape = TLBaseShape<'attachment', AttachmentShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   HANDWRITING SHAPE
═══════════════════════════════════════════════════════════════════════════ */

/** Source type for handwriting content */
export type HandwritingSourceType = 'canvas' | 'upload' | 'camera'

/** OCR transcription mode */
export type OCRMode = 'local' | 'cloud' | 'manual'

/** Handwriting shape props */
export interface HandwritingShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Source of handwriting content */
  sourceType: HandwritingSourceType
  /** SVG/canvas stroke data (for canvas-drawn content) */
  strokesData?: string
  /** Relative path to uploaded image */
  imagePath?: string
  /** Image blob (temporary, before upload) */
  imageBlob?: Blob
  /** Image dimensions if known */
  dimensions?: MediaDimensions | null
  /** User-editable title */
  title: string
  /** Current transcription status */
  transcriptionStatus: TranscriptionStatus
  /** OCR mode used/to use */
  transcriptionMode: OCRMode
  /** Local OCR confidence score (0-1) */
  localConfidence?: number
  /** ID of linked TranscriptShape */
  linkedTranscriptId: string
  /** Preview text (first 100 chars of transcription) */
  previewText: string
  /** ISO timestamp when created */
  createdAt: string
  /** Language for OCR */
  language: 'en'
}

/** Handwriting shape type */
export type HandwritingShape = TLBaseShape<'handwriting', HandwritingShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   SHAPE UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/** All custom canvas shape types */
export type CanvasCustomShape = VoiceNoteShape | TranscriptShape | AttachmentShape | HandwritingShape

/** Map of shape type to default props */
export const DEFAULT_SHAPE_PROPS: {
  voicenote: VoiceNoteShapeProps
  transcript: TranscriptShapeProps
  attachment: AttachmentShapeProps
  handwriting: HandwritingShapeProps
} = {
  voicenote: {
    w: 400,
    h: 120,
    audioPath: '',
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    waveformData: [],
    transcriptText: '',
    linkedTranscriptId: '',
    recordedAt: new Date().toISOString(),
    title: 'Voice Note',
    transcriptionStatus: 'idle',
  },
  transcript: {
    w: 300,
    h: 200,
    title: 'Transcript',
    text: '',
    linkedVoiceNoteId: '',
    tags: [],
    timestamps: [],
    color: 'purple',
    createdAt: new Date().toISOString(),
  },
  attachment: {
    w: 200,
    h: 200,
    fileName: '',
    filePath: '',
    mimeType: 'application/octet-stream',
    fileSize: 0,
    thumbnailPath: '',
    dimensions: null,
    uploadedAt: new Date().toISOString(),
    caption: undefined,
    sourceType: undefined,
    analysisMetadata: undefined,
    analysisStatus: 'idle',
  },
  handwriting: {
    w: 400,
    h: 300,
    sourceType: 'canvas',
    title: 'Handwritten Note',
    transcriptionStatus: 'idle',
    transcriptionMode: 'local',
    linkedTranscriptId: '',
    previewText: '',
    createdAt: new Date().toISOString(),
    language: 'en',
  },
}

/** Theme-aware colors for shapes */
export const SHAPE_THEME_COLORS = {
  voicenote: {
    light: { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444', text: '#991b1b' },
    dark: { bg: '#450a0a', border: '#7f1d1d', accent: '#f87171', text: '#fecaca' },
  },
  transcript: {
    light: { bg: '#faf5ff', border: '#e9d5ff', accent: '#a855f7', text: '#6b21a8' },
    dark: { bg: '#3b0764', border: '#6b21a8', accent: '#c084fc', text: '#e9d5ff' },
  },
  attachment: {
    light: { bg: '#f0fdf4', border: '#bbf7d0', accent: '#22c55e', text: '#166534' },
    dark: { bg: '#052e16', border: '#166534', accent: '#4ade80', text: '#bbf7d0' },
  },
  handwriting: {
    light: { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1e40af' },
    dark: { bg: '#172554', border: '#1e40af', accent: '#60a5fa', text: '#bfdbfe' },
  },
} as const

/** Shape sizing constraints */
export const SHAPE_SIZE_CONSTRAINTS = {
  voicenote: { minW: 200, minH: 100, maxW: 600, maxH: 200 },
  transcript: { minW: 200, minH: 100, maxW: 500, maxH: Infinity },
  attachment: { minW: 150, minH: 150, maxW: 400, maxH: 400 },
  handwriting: { minW: 250, minH: 200, maxW: 600, maxH: 500 },
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get theme colors for a shape type
 */
export function getShapeColors(
  type: 'voicenote' | 'transcript' | 'attachment' | 'handwriting',
  isDark: boolean
) {
  return SHAPE_THEME_COLORS[type][isDark ? 'dark' : 'light']
}

/**
 * Clamp shape dimensions to constraints
 */
export function clampShapeDimensions(
  type: 'voicenote' | 'transcript' | 'attachment' | 'handwriting',
  w: number,
  h: number
): { w: number; h: number } {
  const constraints = SHAPE_SIZE_CONSTRAINTS[type]
  return {
    w: Math.max(constraints.minW, Math.min(constraints.maxW, w)),
    h: Math.max(constraints.minH, Math.min(constraints.maxH, h)),
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format duration for display (MM:SS)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Check if a MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Check if a MIME type is audio
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith('audio/')
}

/**
 * Check if a MIME type is video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}
