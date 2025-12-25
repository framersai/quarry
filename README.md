<p align="center">
  <img src="public/quarry-logo-mono-light.svg" alt="Quarry" width="240" />
</p>

<h3 align="center">Notes That Organize Themselves</h3>

Quarry is a free and open-source personal knowledge management (PKM) system. It's a next-generation note-taking and knowledge base tool that helps you capture, organize, and discover connections in your ideas.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)

## Features

### Core Features (Community Edition)

- **Knowledge Tree** - Hierarchical organization with infinite nesting
- **Markdown Editor** - Rich text editing with live preview
- **Knowledge Graph** - Visualize connections between your notes
- **Full-Text Search** - Fast BM25 lexical search across all content
- **Bookmarks & History** - Track your reading journey
- **Spiral Path Learning** - Guided learning paths through your knowledge
- **GitHub Integration** - Sync with any GitHub repository
- **8 Beautiful Themes** - Light, dark, sepia, terminal, and oceanic variants
- **Offline-First** - All data stored locally in your browser
- **No Telemetry** - Your data stays private

### Premium Features

The following features require a [premium license](https://frame.dev/quarry):

- Semantic Search (AI-powered embeddings)
- Flashcards with FSRS spaced repetition
- AI-generated Quizzes
- Q&A Generation
- Learning Studio
- Advanced Export/Import

## Quick Start

### Web (Development)

```bash
# Clone the repository
git clone https://github.com/framersai/quarry.git
cd quarry

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Desktop App (Electron)

```bash
# Development mode
pnpm electron:dev

# Build for macOS
pnpm electron:dist:mac

# Build unsigned for local testing
pnpm electron:dist:mac:unsigned
```

## Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# GitHub token for higher API rate limits
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxx

# Default repository
NEXT_PUBLIC_GITHUB_OWNER=your-username
NEXT_PUBLIC_GITHUB_REPO=your-knowledge-base
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Editor**: TipTap
- **Storage**: IndexedDB (sql.js + idb)
- **Desktop**: Electron

## Project Structure

```
quarry/
├── app/                 # Next.js app router pages
│   └── codex/          # Main Codex viewer routes
├── components/
│   ├── codex/          # Codex viewer components
│   └── ui/             # Shared UI primitives
├── lib/
│   ├── codex/          # Codex utilities
│   ├── config/         # Feature flags & configuration
│   ├── search/         # Search engine
│   └── storage/        # Data persistence
├── electron/           # Electron main process
└── public/             # Static assets
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Community

- [Discord](https://discord.gg/VXXC4SJMKh) - Join our community
- [GitHub Issues](https://github.com/framersai/quarry/issues) - Bug reports & feature requests
- [Frame.dev](https://frame.dev) - Project homepage

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with love by [Johnny Dunn](https://github.com/jddunn) at [Frame.dev](https://frame.dev)
