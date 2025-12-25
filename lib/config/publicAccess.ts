/**
 * Public Access Mode Configuration
 * @module lib/config/publicAccess
 *
 * @description
 * Controls public access mode for Quarry Codex deployments.
 * When enabled, plugin installation/removal is locked to prevent
 * modifications in public or shared environments.
 *
 * This is an experimental developer feature for:
 * - Sharing your Codex on a public URL
 * - Demo/showcase deployments
 * - Team environments where plugins should be centrally managed
 *
 * @example
 * ```typescript
 * import { isPublicAccess } from '@/lib/config/publicAccess'
 *
 * if (isPublicAccess()) {
 *   // Lock down plugin management
 *   return { success: false, error: 'Disabled in public access mode' }
 * }
 * ```
 */

/**
 * Check if public access mode is enabled
 *
 * When enabled:
 * - Plugin installation from URL, ZIP, or registry is disabled
 * - Plugin uninstallation/removal is disabled
 *
 * When disabled (default):
 * - Normal plugin management is allowed
 *
 * Always available regardless of mode:
 * - Enabling/disabling installed plugins
 * - Configuring plugin settings
 * - Viewing plugin information
 *
 * @returns true if public access mode is enabled
 */
export function isPublicAccess(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check process.env directly
    return process.env.NEXT_PUBLIC_PUBLIC_ACCESS === 'true'
  }
  // Client-side: NEXT_PUBLIC_* vars are inlined at build time
  return process.env.NEXT_PUBLIC_PUBLIC_ACCESS === 'true'
}

/**
 * Get a user-friendly message explaining why an action is blocked
 */
export function getPublicAccessMessage(): string {
  return 'This action is disabled in public access mode. Contact the administrator to modify plugin configuration.'
}

/**
 * Check if plugin installation is allowed
 */
export function canInstallPlugins(): boolean {
  return !isPublicAccess()
}

/**
 * Check if plugin removal is allowed
 */
export function canRemovePlugins(): boolean {
  return !isPublicAccess()
}

