/**
 * Static Build Script
 *
 * Handles building for static export by temporarily excluding API routes
 * which are incompatible with Next.js output: 'export' mode.
 *
 * API routes work in server mode but must be excluded for static HTML export.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const API_DIR = path.join(__dirname, '..', 'app', 'api')
const API_BACKUP = path.join(__dirname, '..', 'app', '_api_backup')

const isStaticExport = process.env.STATIC_EXPORT === 'true'

function moveApiRoutes() {
  if (fs.existsSync(API_DIR)) {
    console.log('[static-build] Moving API routes aside for static export...')
    fs.renameSync(API_DIR, API_BACKUP)
  }
}

function restoreApiRoutes() {
  if (fs.existsSync(API_BACKUP)) {
    console.log('[static-build] Restoring API routes...')
    // Remove api dir if it was recreated
    if (fs.existsSync(API_DIR)) {
      fs.rmSync(API_DIR, { recursive: true })
    }
    fs.renameSync(API_BACKUP, API_DIR)
  }
}

async function main() {
  if (!isStaticExport) {
    console.log('[static-build] Not in static export mode, running normal build')
    execSync('npx next build', { stdio: 'inherit' })
    return
  }

  console.log('[static-build] Static export mode detected')

  try {
    // Step 1: Move API routes aside
    moveApiRoutes()

    // Step 2: Run the build
    console.log('[static-build] Running Next.js build...')
    execSync('npx next build', { stdio: 'inherit' })

    console.log('[static-build] Build completed successfully')
  } finally {
    // Step 3: Always restore API routes
    restoreApiRoutes()
  }
}

main().catch(err => {
  console.error('[static-build] Build failed:', err)
  restoreApiRoutes() // Ensure cleanup on error
  process.exit(1)
})
