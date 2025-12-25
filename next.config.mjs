/** @type {import('next').NextConfig} */

// ============================================================================
// BUILD CONFIGURATION
// ============================================================================

// Conditional static export:
// - STATIC_EXPORT=true (CI/GitHub Pages) -> static HTML, no API routes
// - STATIC_EXPORT not set (local dev, server deploy) -> full Next.js with API routes
const isStaticExport = process.env.STATIC_EXPORT === 'true'

// Deployment mode: 'static' (free/GitHub Pages) or 'offline' (paid/local)
const deploymentMode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || 'static'
const isOfflineMode = deploymentMode === 'offline'

// Edition: 'community' (free) or 'premium' (paid) - defaults to community for Quarry
const edition = process.env.NEXT_PUBLIC_EDITION || 'community'
const isPremiumBuild = edition === 'premium' || isOfflineMode

// Log build configuration
console.log('[Build Config]', {
  deploymentMode,
  edition,
  isStaticExport,
  isPremiumBuild,
})

const nextConfig = {
  // Only enable static export for CI builds (GitHub Pages)
  // Local dev and server deployments keep full API route support
  ...(isStaticExport && { output: 'export' }),
  trailingSlash: true, // Required for static export client-side navigation
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // Redirect to main codex route
  async redirects() {
    return [
      {
        source: '/',
        destination: '/codex',
        permanent: false,
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: false
  },
  // Transpile @framers/sql-storage-adapter to ensure proper browser compatibility
  // Note: @huggingface/transformers only needed for premium semantic search
  transpilePackages: isPremiumBuild
    ? ['@huggingface/transformers', '@framers/sql-storage-adapter']
    : ['@framers/sql-storage-adapter'],
  webpack: (config, { isServer, webpack }) => {
    config.resolve = config.resolve || {}

    // ========================================================================
    // BUILD-TIME FEATURE FLAGS (for dead code elimination)
    // ========================================================================
    config.plugins = config.plugins || []
    config.plugins.push(
      new webpack.DefinePlugin({
        // Deployment mode flags
        '__DEPLOYMENT_MODE__': JSON.stringify(deploymentMode),
        '__EDITION__': JSON.stringify(edition),
        '__IS_OFFLINE_BUILD__': JSON.stringify(isOfflineMode),
        '__IS_PREMIUM_BUILD__': JSON.stringify(isPremiumBuild),
        '__IS_COMMUNITY_BUILD__': JSON.stringify(!isPremiumBuild),
        '__IS_STATIC_EXPORT__': JSON.stringify(isStaticExport),

        // Feature flags for tree-shaking
        // Premium features (disabled in community builds for smaller bundle)
        '__ENABLE_QUIZZES__': JSON.stringify(isPremiumBuild),
        '__ENABLE_FLASHCARDS__': JSON.stringify(isPremiumBuild),
        '__ENABLE_QNA__': JSON.stringify(isPremiumBuild),
        '__ENABLE_EXPORT__': JSON.stringify(isPremiumBuild),

        // Always enabled features
        '__ENABLE_SPIRAL_PATH__': JSON.stringify(true),
        '__ENABLE_SEMANTIC_SEARCH__': JSON.stringify(isPremiumBuild), // Requires premium for AI embeddings
        '__ENABLE_BOOKMARKS__': JSON.stringify(true),
      })
    )

    // Ignore server-only dependencies for client bundles
    if (!isServer) {
      // Build the alias object - webpack requires false (not undefined) to ignore modules
      const clientAliases = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
        'sharp': false,
        'pg': false,
        'pg-native': false,
        '@aws-sdk/client-s3': false,
        'fs': false,
        'dns': false,
        'net': false,
        'tls': false,
        'module': false,
        'perf_hooks': false,
      }
      
      // Native SQLite dependencies - always stub for static exports (GitHub Pages)
      // because these native modules don't exist in the CI environment
      // Only allow them for non-static premium/offline builds
      if (isStaticExport || !isPremiumBuild) {
        clientAliases['better-sqlite3'] = false
        clientAliases['@capacitor-community/sqlite'] = false
      }
      
      config.resolve.alias = clientAliases
      
      // ====================================================================
      // EXTERNALIZE ONNX RUNTIME WEB FOR ALL PRODUCTION BUILDS
      // ====================================================================
      // Externalize onnxruntime-web to avoid Terser minification issues with
      // import.meta.url. The semantic search module uses dynamic imports with
      // CDN fallbacks, so this is safe for both static and server builds.
      // Note: This only affects production builds - dev mode doesn't minify.
      config.externals = config.externals || []
      if (typeof config.externals === 'object' && !Array.isArray(config.externals)) {
        config.externals = [config.externals]
      }
      config.externals.push(({ request }, callback) => {
        if (request === 'onnxruntime-web' || request?.startsWith('onnxruntime-web/')) {
          // Use root global for browser environment
          return callback(null, `root ortRuntime`)
        }
        callback()
      })
    } else {
      // Ensure the server bundle never touches onnxruntime-web or transformers
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'onnxruntime-web': false,
        // Block any potential native ORT bindings from server bundle
        'onnxruntime-node': false,
        'onnxruntime-common': false,
        // Block transformers on server to avoid import.meta issues
        '@huggingface/transformers': false,
      }
      // Prevent webpack from trying to bundle native sharp binaries on the server build.
      config.externals = config.externals || []
      config.externals.push(({ request }, callback) => {
        if (request && request.startsWith('sharp')) {
          return callback(null, `commonjs ${request}`)
        }
        // Externalize native bindings if ever referenced
        if (request && request.endsWith('.node')) {
          return callback(null, `commonjs ${request}`)
        }
        callback()
      })
    }

    // ========================================================================
    // SKIP PARSING MINIFIED THIRD-PARTY MODULES
    // ========================================================================
    // Prevent webpack from parsing pre-minified vendor files that may contain
    // syntax patterns that cause parse errors (especially in ONNX Runtime Web)
    config.module = config.module || {}
    
    // Initialize noParse array
    config.module.noParse = config.module.noParse || []
    if (!Array.isArray(config.module.noParse)) {
      config.module.noParse = [config.module.noParse]
    }
    // Add patterns to skip parsing minified files
    config.module.noParse.push(
      /onnxruntime-web[\\/]dist[\\/].*\.min\.(js|mjs)$/,
      /onnxruntime-web[\\/]dist[\\/]esm[\\/]/,
      /@huggingface[\\/]transformers[\\/]dist[\\/].*\.min\.js$/
    )

    // Also ignore .node files (native bindings)
    config.module.noParse.push(/\.node$/)

    // Enable async WebAssembly so ORT .wasm files load as assets
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
    }

    // Force React into its own chunk to prevent hook sharing through framer-motion
    // This fixes React #311 errors in dynamically imported components
    if (!isServer) {
      config.optimization = config.optimization || {}
      config.optimization.splitChunks = config.optimization.splitChunks || {}
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        // Isolate React from other vendor chunks to prevent hook context issues
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 50, // Higher priority than default vendor chunks
          enforce: true,
        },
        // Keep framer-motion separate from React
        framerMotion: {
          test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
          name: 'framer-motion',
          chunks: 'all',
          priority: 40,
          enforce: true,
        },
      }
    }

    return config
  }
};

export default nextConfig;
