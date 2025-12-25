/**
 * useMediaQuery - Responsive media query hook
 * @module codex/hooks/useMediaQuery
 *
 * Provides reactive media query matching for responsive UIs.
 * SSR-safe with proper hydration handling.
 */

'use client'

// Force runtime require to prevent webpack from optimizing hooks through framer-motion
import React, { useState as useStateType, useEffect as useEffectType, useCallback as useCallbackType } from 'react'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactRuntime = typeof window !== 'undefined' ? require('react') : React
const useState = ReactRuntime.useState as typeof useStateType
const useEffect = ReactRuntime.useEffect as typeof useEffectType
const useCallback = ReactRuntime.useCallback as typeof useCallbackType

/**
 * Hook to track a CSS media query match state
 */
export function useMediaQuery(query: string): boolean {
  // SSR-safe: default to false during SSR
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)

    // Set initial value
    setMatches(mediaQuery.matches)

    // Create listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener (modern API)
    mediaQuery.addEventListener('change', handler)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}

/**
 * Predefined breakpoint queries matching Tailwind defaults
 */
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const

/**
 * Hook for common responsive checks
 */
export function useResponsive() {
  const isMobile = !useMediaQuery(breakpoints.md)
  const isTablet = useMediaQuery(breakpoints.md) && !useMediaQuery(breakpoints.lg)
  const isDesktop = useMediaQuery(breakpoints.lg)
  const isSmallScreen = !useMediaQuery(breakpoints.sm)
  const isLargeScreen = useMediaQuery(breakpoints.xl)

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    isLargeScreen,
  }
}

/**
 * Hook for device orientation detection
 */
export function useOrientation() {
  const isLandscape = useMediaQuery('(orientation: landscape)')
  const isPortrait = useMediaQuery('(orientation: portrait)')

  return {
    isLandscape,
    isPortrait,
  }
}

/**
 * Hook for touch device detection
 */
export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for touch capability
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE-specific
      navigator.msMaxTouchPoints > 0

    setIsTouch(hasTouch)
  }, [])

  return isTouch
}

/**
 * Combined hook for all responsive needs
 */
export function useDeviceInfo() {
  const responsive = useResponsive()
  const orientation = useOrientation()
  const isTouch = useTouchDevice()

  return {
    ...responsive,
    ...orientation,
    isTouch,
  }
}

export default useMediaQuery
