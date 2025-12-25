# Contributing to Quarry

First off, thank you for considering contributing to Quarry! It's people like you that make Quarry such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if possible**
- **Include your environment details** (OS, browser, Node version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes (`pnpm test`)
4. Make sure your code lints (`pnpm lint`)
5. Run the type checker (`pnpm typecheck`)

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/quarry.git
cd quarry

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Project Structure

- `app/` - Next.js app router pages
- `components/` - React components
- `lib/` - Utility functions and core logic
- `electron/` - Electron main process
- `public/` - Static assets

### Coding Style

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally

Example:
```
feat(search): add fuzzy matching to search

- Implement Fuse.js for fuzzy search
- Add threshold configuration
- Update search results display

Closes #123
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

## Community

- [Discord](https://discord.gg/VXXC4SJMKh) - Ask questions, share ideas
- [GitHub Discussions](https://github.com/framersai/quarry/discussions) - Long-form discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
