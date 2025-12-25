import PageLayout from '@/components/page-layout'
import { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Shield, Database, Cloud, Download } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Quarry Lifetime Edition Waitlist',
  description:
    'Reserve a lifetime license for FABRIC Codex with sovereign storage, premium exporters, and private bundles while keeping the free edition available to everyone.',
}

const waitlistEmail = 'team@frame.dev'

const encodeMailto = () => {
  const subject = encodeURIComponent('FABRIC Codex Lifetime Edition Waitlist')
  const body = encodeURIComponent(
    [
      'Tell us a bit about your team, use case, and the storage targets you need.',
      '',
      'Name:',
      'Organization:',
      'Preferred data stores (S3, Postgres, BigQuery, SFTP, etc.):',
      'Primary Codex use case:',
      '',
      'We will reply with timelines, pricing, and migration details.',
    ].join('\n'),
  )
  return `mailto:${waitlistEmail}?subject=${subject}&body=${body}`
}

export default function CodexWaitlistPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Lifetime Edition Waitlist
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            Own the Codex forever. No subscriptions. No lock-in.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            The Lifetime Edition adds sovereign storage, private exports, and premium tooling while keeping the
            community edition free. Pay once, run it anywhere, and ship knowledge to any database or cloud you
            control.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href={encodeMailto()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow-lg hover:bg-emerald-500 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Join the Waitlist
            </Link>
            <Link
              href="https://github.com/framersai/codex"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Free Edition
            </Link>
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Premium capabilities
            </h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li>
                <strong>Sovereign storage:</strong> Push strands to S3, Postgres, Snowflake, or on-prem object stores.
              </li>
              <li>
                <strong>Private export pipelines:</strong> Ship daily bundles to notebooks, warehouses, or air-gapped
                environments.
              </li>
              <li>
                <strong>Advanced governance:</strong> retention rules, redaction policies, and encrypted offline bundles.
              </li>
              <li>
                <strong>Priority support & migrations:</strong> white-glove onboarding, schema workshops, and paired
                architecture reviews.
              </li>
            </ul>
          </div>
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500" />
              Lifetime license
            </h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li>One-time purchase. No renewals. Seats are limited so we can support each deployment properly.</li>
              <li>Bring-your-own infrastructure: run it on Kubernetes, Nomad, or a single VM.</li>
              <li>Compatible with the free edition—fork today and upgrade when you are ready.</li>
              <li>Includes future premium modules (federated search, advanced summarization, internal-only weaves).</li>
            </ul>
          </div>
        </section>

        <section className="bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-10 space-y-8">
          <h2 className="text-3xl font-bold text-center">What we need from you</h2>
          <div className="grid gap-6 md:grid-cols-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
              <p className="font-semibold mb-2">1. Deployment goals</p>
              <p>Tell us how you plan to host Codex (cloud, air-gapped, VPC) and the compliance targets you care about.</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
              <p className="font-semibold mb-2">2. Storage & export targets</p>
              <p>List the destinations that matter—S3, Azure Blob, BigQuery, Redshift, ClickHouse, local file drops.</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
              <p className="font-semibold mb-2">3. Team size & timeline</p>
              <p>Share your timeframe and the team that will operate the Codex so we can schedule onboarding time.</p>
            </div>
          </div>
          <div className="text-center">
            <Link
              href={encodeMailto()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-500 transition-colors"
            >
              Reserve a Lifetime License
            </Link>
          </div>
        </section>
      </div>
    </PageLayout>
  )
}


