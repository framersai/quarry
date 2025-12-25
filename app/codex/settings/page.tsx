'use client'

/**
 * Codex Settings Page
 * 
 * User settings and preferences including API token management,
 * server status, and application configuration.
 * 
 * @module app/codex/settings/page
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Settings,
  Key,
  Server,
  Activity,
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  User,
  Palette,
  Bell,
  Shield,
  HardDrive,
  Zap,
  Copy,
  Check,
  ChevronRight,
  Eye
} from 'lucide-react'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'
import { ApiTokenManager } from '@/components/codex/ui/ApiTokenManager'
import { VisionSettings } from '@/components/codex/ui/settings/VisionSettings'
import { VaultSettings } from '@/components/codex/ui/settings/VaultSettings'
import { cn } from '@/lib/utils'

// ============================================================================
// CONSTANTS
// ============================================================================

const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3002'
const API_BASE_URL = `http://localhost:${API_PORT}/api/v1`

// ============================================================================
// HOOKS
// ============================================================================

function useApiStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [info, setInfo] = useState<{
    version?: string
    uptime?: number
    database?: string
    endpoints?: number
  } | null>(null)

  const checkStatus = async () => {
    setStatus('checking')
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      
      const [healthRes, infoRes] = await Promise.all([
        fetch(`${API_BASE_URL}/health`, { signal: controller.signal }).catch(() => null),
        fetch(`${API_BASE_URL}/info`, { signal: controller.signal }).catch(() => null)
      ])
      clearTimeout(timeout)
      
      if (healthRes?.ok) {
        const healthData = await healthRes.json()
        const infoData = infoRes?.ok ? await infoRes.json() : null
        
        setInfo({
          version: infoData?.version || '1.0.0',
          uptime: healthData.uptime,
          database: healthData.database,
          endpoints: infoData?.endpoints?.length || 0
        })
        setStatus('online')
      } else {
        setStatus('offline')
      }
    } catch {
      setStatus('offline')
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  return { status, info, refresh: checkStatus }
}

function useProfile() {
  const [profileId, setProfileId] = useState<string>('default')
  
  useEffect(() => {
    // Try to get profile from localStorage
    try {
      const stored = localStorage.getItem('fabric_profile')
      if (stored) {
        const profile = JSON.parse(stored)
        setProfileId(profile.id || 'default')
      } else {
        // Generate a new profile ID if none exists
        const newId = `profile_${Date.now()}`
        localStorage.setItem('fabric_profile', JSON.stringify({ id: newId }))
        setProfileId(newId)
      }
    } catch {
      setProfileId('default')
    }
  }, [])

  return { profileId }
}

// ============================================================================
// COMPONENTS
// ============================================================================

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <button
      onClick={handleCopy}
      className={cn('p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors', className)}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4 text-zinc-400" />
      )}
    </button>
  )
}

function ApiServerStatus() {
  const { status, info, refresh } = useApiStatus()

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-xl',
              status === 'online' 
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : status === 'offline'
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-zinc-100 dark:bg-zinc-700'
            )}>
              <Server className={cn(
                'w-5 h-5',
                status === 'online' 
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : status === 'offline'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-500'
              )} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                API Server
                {status === 'online' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                )}
                {status === 'offline' && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
                    Offline
                  </span>
                )}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                REST API for external integrations
              </p>
            </div>
          </div>
          
          <button
            onClick={refresh}
            disabled={status === 'checking'}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={cn('w-5 h-5 text-zinc-400', status === 'checking' && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Connection Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
              <Zap className="w-4 h-4" />
              Base URL
            </div>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-zinc-900 dark:text-white break-all">
                {API_BASE_URL}
              </code>
              <CopyButton text={API_BASE_URL} />
            </div>
          </div>
          
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
              <Server className="w-4 h-4" />
              Port
            </div>
            <code className="text-lg font-mono font-bold text-zinc-900 dark:text-white">
              {API_PORT}
            </code>
          </div>
        </div>

        {/* Status Details */}
        {status === 'online' && info && (
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Database</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white capitalize">
                {info.database || 'Connected'}
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Uptime</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                {formatUptime(info.uptime)}
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-purple-50 dark:bg-purple-900/10">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Version</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                {info.version}
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10">
              <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Endpoints</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                {info.endpoints || '20+'}
              </div>
            </div>
          </div>
        )}

        {status === 'offline' && (
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 text-center">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
              The API server is not running
            </p>
            <div className="bg-zinc-900 rounded-lg p-3 inline-block">
              <code className="text-emerald-400 font-mono text-sm">npm run api</code>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-700/50">
          <a
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              status === 'online'
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
            )}
            onClick={e => status !== 'online' && e.preventDefault()}
          >
            <ExternalLink className="w-4 h-4" />
            Swagger UI
          </a>
          
          <Link
            href="/codex/api"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <Zap className="w-4 h-4" />
            API Hub
          </Link>
          
          <Link
            href="/codex/api-docs"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            API Reference
          </Link>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ 
  title, 
  description, 
  icon: Icon, 
  children 
}: { 
  title: string
  description: string
  icon: React.ElementType
  children: React.ReactNode 
}) {
  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-700">
            <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white">{title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

function SettingsNav({ activeSection, onNavigate }: { activeSection: string; onNavigate: (section: string) => void }) {
  const sections = [
    { id: 'vault', label: 'Vault Location', icon: HardDrive },
    { id: 'api', label: 'API Server', icon: Server },
    { id: 'tokens', label: 'API Tokens', icon: Key },
    { id: 'vision', label: 'Vision AI', icon: Eye },
    { id: 'profile', label: 'Profile', icon: User, disabled: true },
    { id: 'appearance', label: 'Appearance', icon: Palette, disabled: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, disabled: true },
    { id: 'privacy', label: 'Privacy', icon: Shield, disabled: true },
  ]

  return (
    <nav className="space-y-1">
      {sections.map(section => (
        <button
          key={section.id}
          onClick={() => !section.disabled && onNavigate(section.id)}
          disabled={section.disabled}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
            activeSection === section.id
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : section.disabled
              ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          )}
        >
          <section.icon className="w-5 h-5" />
          <span className="font-medium">{section.label}</span>
          {section.disabled && (
            <span className="ml-auto text-xs text-zinc-400">Coming Soon</span>
          )}
          {!section.disabled && activeSection === section.id && (
            <ChevronRight className="w-4 h-4 ml-auto" />
          )}
        </button>
      ))}
    </nav>
  )
}

// ============================================================================
// PAGE
// ============================================================================

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('vault')
  const { profileId } = useProfile()

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <Navigation />
      
      <main className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-3">
              <Settings className="w-8 h-8" />
              Settings
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Manage your API, tokens, and preferences
            </p>
          </motion.div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="md:sticky md:top-24 md:self-start"
          >
            <SettingsNav activeSection={activeSection} onNavigate={setActiveSection} />
          </motion.aside>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            {activeSection === 'vault' && (
              <VaultSettings />
            )}

            {activeSection === 'api' && (
              <ApiServerStatus />
            )}
            
            {activeSection === 'tokens' && (
              <SettingsSection
                title="API Tokens"
                description="Manage access tokens for the REST API"
                icon={Key}
              >
                <ApiTokenManager profileId={profileId} />
              </SettingsSection>
            )}

            {activeSection === 'vision' && (
              <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden p-6">
                <VisionSettings />
              </div>
            )}
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}








