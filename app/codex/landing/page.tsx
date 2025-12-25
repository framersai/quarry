import { redirect } from 'next/navigation'

/**
 * Redirect /codex/landing to /quarry
 * The /quarry page is the landing page for Quarry/Codex
 */
export default function CodexLandingPage() {
  redirect('/quarry')
}
