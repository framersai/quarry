/**
 * Canvas Custom Shapes - Main exports
 * @module codex/ui/canvas/shapes
 *
 * Exports all custom tldraw shapes for the infinite canvas:
 * - VoiceNoteShape: Audio player with waveform
 * - TranscriptShape: Text card linked to voice notes
 * - AttachmentShape: File/image embed
 * - HandwritingShape: Handwritten notes with OCR transcription
 */

// Shape utils
export { VoiceNoteShapeUtil } from './VoiceNoteShape'
export { TranscriptShapeUtil } from './TranscriptShape'
export { AttachmentShapeUtil } from './AttachmentShape'
export { HandwritingShapeUtil } from './HandwritingShape'

// Components
export { VoiceNoteComponent, WaveformCanvas, generateWaveformFromAudio } from './VoiceNoteShape'
export { TranscriptComponent } from './TranscriptShape'
export { AttachmentComponent } from './AttachmentShape'
export { HandwritingComponent, ConfidenceBadge } from './HandwritingShape'

// Types
export * from './types'

/**
 * All custom shape utils for registration with tldraw
 */
export const customShapeUtils = [
  () => import('./VoiceNoteShape').then((m) => m.VoiceNoteShapeUtil),
  () => import('./TranscriptShape').then((m) => m.TranscriptShapeUtil),
  () => import('./AttachmentShape').then((m) => m.AttachmentShapeUtil),
  () => import('./HandwritingShape').then((m) => m.HandwritingShapeUtil),
]

/**
 * Array of custom shape util classes for Tldraw shapeUtils prop
 */
import { VoiceNoteShapeUtil } from './VoiceNoteShape'
import { TranscriptShapeUtil } from './TranscriptShape'
import { AttachmentShapeUtil } from './AttachmentShape'
import { HandwritingShapeUtil } from './HandwritingShape'

export const CUSTOM_SHAPE_UTILS = [
  VoiceNoteShapeUtil,
  TranscriptShapeUtil,
  AttachmentShapeUtil,
  HandwritingShapeUtil,
]
