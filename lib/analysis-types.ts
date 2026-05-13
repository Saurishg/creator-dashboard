export interface ReelBreakdown {
  reelId: string
  url: string
  views: number
  likes: number
  comments: number
  transcript: string
  caption?: string
  hook: string           // exact first line / opening seconds
  body: string           // main value delivery
  cta: string            // closing ask
  hookType: string       // e.g. "Bold claim", "Number + promise", "Question"
  emotionalTrigger: string  // e.g. "Curiosity", "FOMO", "Authority", "Social proof"
  engagementScore: number   // derived from views/likes/comments
}

export interface ContentPatterns {
  topHookTypes: string[]          // ranked by frequency in high-performing reels
  topCTAFormats: string[]
  commonBodyStructure: string     // narrative pattern used most
  bestPerformingPattern: string   // the single pattern that correlates with most views
  weaknesses: string[]            // things missing from current content
  recommendations: string[]       // 3-5 specific, actionable next steps
  winningFormula: string          // the "formula" distilled from top reels
  avgEngagementByHookType: Record<string, number>
}

export interface CompetitorInsight {
  handle: string
  reelsAnalysed: number
  topHookTypes: string[]
  topCTAFormats: string[]
  winningPattern: string
  avgViews: number
  whatIsWorking: string
}

export interface CompetitorFullAnalysis {
  handle: string
  totalReels: number
  breakdowns: ReelBreakdown[]
  patterns: ContentPatterns
}

export interface CompetitorAnalysisResult {
  analysedAt: string
  competitors: CompetitorFullAnalysis[]
}

export interface CalendarDay {
  day: number          // 1-30
  date: string         // ISO date string
  postingDay: boolean
  hookType: string
  topic: string
  hook: string
  body: string
  cta: string
  emoji: string
  color: string
}

export interface AnalysisResult {
  analysedAt: string
  totalReels: number
  breakdowns: ReelBreakdown[]
  patterns: ContentPatterns
  competitorInsights?: CompetitorInsight[]
}
