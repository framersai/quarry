/**
 * Codex Hooks - Main exports
 * @module codex/hooks
 *
 * React hooks for the Codex system:
 * - Canvas & export workflows
 * - Keyboard shortcuts
 * - Touch & haptic feedback
 * - Navigation & UI state
 *
 * @example
 * ```tsx
 * import {
 *   useCanvasExport,
 *   useCodexHotkeys,
 *   useHaptics,
 *   useIsTouchDevice,
 * } from '@/components/codex/hooks'
 * ```
 */

// Canvas & Export
export { useCanvasExport, useCanvasHasContent } from './useCanvasExport'
export type { UseCanvasExportOptions, UseCanvasExportResult } from './useCanvasExport'

// Keyboard Shortcuts
export { useCodexHotkeys } from './useCodexHotkeys'

// Touch & Haptics
export { useHaptics, triggerHaptic } from './useHaptics'
export type { HapticPattern } from './useHaptics'
export { useIsTouchDevice } from './useIsTouchDevice'

// Navigation & State
export { useActiveHeading } from './useActiveHeading'
export { useBookmarks } from './useBookmarks'
export { useKeyboardNavigation } from './useKeyboardNavigation'
export { useProfile } from './useProfile'
export { usePreferences } from './usePreferences'
export { useSwipeGesture } from './useSwipeGesture'

// Media & Storage
export { useMediaStorage } from './useMediaStorage'
export { useTextToSpeech } from './useTextToSpeech'

// UI Utilities
export { useMediaQuery } from './useMediaQuery'
export { useResponsiveLayout } from './useResponsiveLayout'
export { useModalAccessibility } from './useModalAccessibility'
export { useFocusManager } from './useFocusManager'
