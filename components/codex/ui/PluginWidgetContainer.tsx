/**
 * Plugin Widget Container
 *
 * Renders sidebar widgets from enabled plugins.
 * Wraps each widget in an error boundary for isolation.
 *
 * @module codex/ui/PluginWidgetContainer
 */

'use client'

import React, { useState, useEffect, useCallback, Component, type ErrorInfo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { pluginUIRegistry, quarryPluginManager, createPluginAPI } from '@/lib/plugins'
import type { WidgetProps } from '@/lib/plugins/types'

interface PluginWidgetContainerProps {
  /** Current theme */
  theme?: string
}

interface WidgetErrorBoundaryProps {
  pluginId: string
  children: ReactNode
  theme?: string
  onDisable: () => void
}

interface WidgetErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary for individual plugin widgets
 */
class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[PluginWidget:${this.props.pluginId}] Error:`, error, errorInfo)
  }

  render() {
    const { theme = 'light', pluginId, onDisable, children } = this.props
    const { hasError, error } = this.state
    const isDark = theme.includes('dark')

    if (hasError) {
      return (
        <div className={`
          p-3 rounded-lg text-xs
          ${isDark ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}
        `}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                Widget Error
              </p>
              <p className={`mt-1 line-clamp-2 ${isDark ? 'text-red-400/80' : 'text-red-600/80'}`}>
                {error?.message || 'An error occurred'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
                ${isDark
                  ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                }
              `}
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
            <button
              onClick={onDisable}
              className={`
                px-2 py-1 rounded text-[10px] font-medium
                ${isDark
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                }
              `}
            >
              Disable Plugin
            </button>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Plugin Widget Container Component
 */
export default function PluginWidgetContainer({ theme = 'light' }: PluginWidgetContainerProps) {
  const [widgets, setWidgets] = useState<typeof pluginUIRegistry.allWidgets>([])
  const [collapsed, setCollapsed] = useState(false)
  const [, forceUpdate] = useState({})

  const isDark = theme.includes('dark')

  // Subscribe to widget changes
  useEffect(() => {
    setWidgets(pluginUIRegistry.allWidgets)

    const unsubscribe = pluginUIRegistry.onChange(() => {
      setWidgets([...pluginUIRegistry.allWidgets])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Handle disabling a plugin
  const handleDisablePlugin = useCallback(async (pluginId: string) => {
    await quarryPluginManager.disablePlugin(pluginId)
  }, [])

  // No widgets, don't render
  if (widgets.length === 0) {
    return null
  }

  return (
    <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`
          w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase
          ${isDark ? 'text-zinc-500 hover:bg-zinc-800/50' : 'text-zinc-400 hover:bg-zinc-50'}
          transition-colors
        `}
      >
        <span>Widgets ({widgets.length})</span>
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Widgets */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-2">
              {widgets.map(({ pluginId, component: WidgetComponent }) => {
                const plugin = quarryPluginManager.getPlugin(pluginId)
                if (!plugin) return null

                // Create widget props
                const widgetProps: WidgetProps = {
                  api: createPluginAPI(pluginId, () => plugin.settings),
                  settings: plugin.settings,
                  theme,
                  isDark,
                }

                return (
                  <WidgetErrorBoundary
                    key={`${pluginId}-widget`}
                    pluginId={pluginId}
                    theme={theme}
                    onDisable={() => handleDisablePlugin(pluginId)}
                  >
                    <div className={`
                      rounded-lg overflow-hidden
                      ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
                    `}>
                      <WidgetComponent {...widgetProps} />
                    </div>
                  </WidgetErrorBoundary>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Hook to use plugin widgets in other components
 */
export function usePluginWidgets() {
  const [widgets, setWidgets] = useState(pluginUIRegistry.allWidgets)

  useEffect(() => {
    setWidgets(pluginUIRegistry.allWidgets)
    return pluginUIRegistry.onChange(() => {
      setWidgets([...pluginUIRegistry.allWidgets])
    })
  }, [])

  return widgets
}
