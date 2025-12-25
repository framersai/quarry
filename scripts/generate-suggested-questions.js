#!/usr/bin/env node
/**
 * Generate suggested questions for Codex documents
 * 
 * Analyzes markdown content to determine:
 * - Content significance (word count, headings, code blocks)
 * - Topic complexity (technical terms, references)
 * - Difficulty level (sentence complexity, vocabulary)
 * 
 * Generates 1-5 natural language questions per document based on:
 * - Content value/information density
 * - Presence of answerable concepts
 * - Document length and structure
 * 
 * Output: /assets/suggested-questions.json
 */

const fs = require('fs')
const path = require('path')

const CODEX_REPO_OWNER = process.env.NEXT_PUBLIC_CODEX_REPO_OWNER || 'framersai'
const CODEX_REPO_NAME = process.env.NEXT_PUBLIC_CODEX_REPO_NAME || 'codex'
const CODEX_REPO_BRANCH = process.env.NEXT_PUBLIC_CODEX_REPO_BRANCH || 'main'

/**
 * Analyze document to determine if it's worth generating questions for
 */
function analyzeDocument(content, path) {
  const words = content.trim().split(/\s+/).length
  const headings = (content.match(/^#{1,3}\s+.+$/gm) || []).length
  const codeBlocks = (content.match(/```/g) || []).length / 2
  const links = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length
  
  // Calculate significance score (0-100)
  let significance = 0
  significance += Math.min(words / 100, 30) // Length (max 30)
  significance += headings * 5 // Structure (5 pts per heading)
  significance += codeBlocks * 8 // Technical content (8 pts per code block)
  significance += links * 2 // References (2 pts per link)
  
  // Calculate difficulty (0-100)
  const avgWordLength = content.split(/\s+/).reduce((sum, w) => sum + w.length, 0) / (words || 1)
  const technicalTerms = (content.match(/\b(API|SDK|CLI|HTTP|JSON|YAML|async|await|function|class|interface|type|const|let|var)\b/gi) || []).length
  
  let difficulty = 0
  difficulty += Math.min((avgWordLength - 4) * 10, 30) // Word complexity (max 30)
  difficulty += Math.min(technicalTerms / 5, 40) // Technical density (max 40)
  difficulty += Math.min(codeBlocks * 10, 30) // Code complexity (max 30)
  
  return {
    words,
    headings,
    codeBlocks,
    links,
    significance: Math.min(Math.round(significance), 100),
    difficulty: Math.min(Math.round(difficulty), 100),
  }
}

/**
 * Generate questions based on content analysis
 */
function generateQuestions(content, path, analysis) {
  const questions = []
  
  // Only generate questions for significant content (score >= 20)
  if (analysis.significance < 20) {
    return questions
  }
  
  // Extract title from frontmatter or first heading
  const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/title:\s*["']?(.+?)["']?\s*$/m)
  const title = titleMatch ? titleMatch[1] : path.split('/').pop().replace(/\.md$/, '')
  
  // Extract key concepts (headings)
  const headings = [...content.matchAll(/^#{2,3}\s+(.+)$/gm)].map(m => m[1])
  
  // Generate 1-5 questions based on significance
  const questionCount = Math.min(
    Math.ceil(analysis.significance / 25),
    5
  )
  
  // Question templates based on difficulty and content type
  const templates = []
  
  if (analysis.difficulty < 40) {
    templates.push(
      `What is ${title}?`,
      `How does ${title} work?`,
      `When should I use ${title}?`
    )
  } else {
    templates.push(
      `How do I implement ${title}?`,
      `What are the key concepts in ${title}?`,
      `What is the difference between ${headings[0]} and ${headings[1]}?`
    )
  }
  
  if (analysis.codeBlocks > 0) {
    templates.push(
      `Show me an example of ${title}`,
      `How do I configure ${title}?`
    )
  }
  
  if (headings.length > 2) {
    templates.push(
      `Explain ${headings[0]}`,
      `What is ${headings[1]} used for?`
    )
  }
  
  // Randomly select questions (deterministic based on path hash)
  const hash = path.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)
  const shuffled = templates.sort(() => ((hash * 9301 + 49297) % 233280) / 233280 - 0.5)
  
  return shuffled.slice(0, questionCount).map(q => ({
    question: q,
    difficulty: analysis.difficulty < 40 ? 'beginner' : analysis.difficulty < 70 ? 'intermediate' : 'advanced',
    tags: headings.slice(0, 3),
  }))
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 Generating suggested questions for Codex documents...\n')
  
  try {
    // Fetch codex-index.json to get all documents
    const indexUrl = `https://raw.githubusercontent.com/${CODEX_REPO_OWNER}/${CODEX_REPO_NAME}/${CODEX_REPO_BRANCH}/codex-index.json`
    const indexResponse = await fetch(indexUrl)
    
    if (!indexResponse.ok) {
      console.log('⚠️  codex-index.json not found (404). Skipping question generation.')
      console.log('   Run auto-indexer in the Codex repo first.')
      process.exit(0)
    }
    
    const indexData = await indexResponse.json()
    const suggestedQuestions = {}
    
    for (const doc of indexData) {
      if (!doc.path || !doc.path.endsWith('.md')) continue
      
      // Fetch document content
      const contentUrl = `https://raw.githubusercontent.com/${CODEX_REPO_OWNER}/${CODEX_REPO_NAME}/${CODEX_REPO_BRANCH}/${doc.path}`
      const contentResponse = await fetch(contentUrl)
      
      if (!contentResponse.ok) continue
      
      const content = await contentResponse.text()
      const analysis = analyzeDocument(content, doc.path)
      const questions = generateQuestions(content, doc.path, analysis)
      
      if (questions.length > 0) {
        suggestedQuestions[doc.path] = {
          analysis,
          questions,
        }
        console.log(`✓ ${doc.path}: ${questions.length} question(s) (significance: ${analysis.significance}, difficulty: ${analysis.difficulty})`)
      }
    }
    
    // Write to assets/
    const assetsDir = path.join(process.cwd(), 'public', 'assets')
    fs.mkdirSync(assetsDir, { recursive: true })
    
    const outputPath = path.join(assetsDir, 'suggested-questions.json')
    fs.writeFileSync(
      outputPath,
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        repo: `${CODEX_REPO_OWNER}/${CODEX_REPO_NAME}`,
        branch: CODEX_REPO_BRANCH,
        questions: suggestedQuestions,
      }, null, 2)
    )
    
    console.log(`\n✅ Generated ${Object.keys(suggestedQuestions).length} document question sets`)
    console.log(`📄 Output: ${outputPath}`)
    
  } catch (error) {
    console.error('❌ Error generating suggested questions:', error.message)
    console.log('   This is non-critical; Q&A will work without suggested questions.')
    process.exit(0)
  }
}

// Skip only if explicitly disabled (enabled by default)
if (process.env.SKIP_QUESTION_GENERATION === '1' || process.env.SKIP_QUESTION_GENERATION === 'true') {
  console.log('⏭️  Skipping question generation (SKIP_QUESTION_GENERATION=1)')
  process.exit(0)
}

main()

