import { useState, useMemo } from 'react'
import type { ProfilingCompleteOut, RiskScoreOut } from './profiling.types'

// MUI Icons
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded'
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded'
import ComputerRoundedIcon from '@mui/icons-material/ComputerRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

interface ProfilingResultsProps {
  data: ProfilingCompleteOut
  onRestart: () => void
  onEdit: () => void
  onSeeRecommendations?: () => void
}

type SortOrder = 'desc' | 'asc'

// Semantic visual configurations for risk tiers aligned with brand design tokens
const RISK_CONFIG = {
  critical: {
    label: 'Critical Risk',
    badgeBg: 'bg-[#F2DADA] border border-[#8B0000]/25 text-[#8B0000]',
    dotBg: 'bg-[#8B0000]',
    barGradient: 'from-[#C0392B] to-[#8B0000]',
    textScore: 'text-[#8B0000]',
    borderLeft: 'border-l-[#8B0000]',
    iconBg: 'bg-[#F2DADA] text-[#8B0000] border-[#8B0000]/25',
    advice: 'Critical vulnerability detected. Immediate comprehensive insurance coverage required.',
  },
  high: {
    label: 'High Risk',
    badgeBg: 'bg-[#F8E1DF] border border-[#C0392B]/25 text-[#C0392B]',
    dotBg: 'bg-[#C0392B]',
    barGradient: 'from-[#E07B39] to-[#C0392B]',
    textScore: 'text-[#C0392B]',
    borderLeft: 'border-l-[#C0392B]',
    iconBg: 'bg-[#F8E1DF] text-[#C0392B] border-[#C0392B]/25',
    advice: 'Elevated risk profile. Recommended for priority policy coverage and risk transfer.',
  },
  medium: {
    label: 'Medium Risk',
    badgeBg: 'bg-[#F8E9DA] border border-[#C97B2E]/25 text-[#C97B2E]',
    dotBg: 'bg-[#C97B2E]',
    barGradient: 'from-[#F59E0B] to-[#C97B2E]',
    textScore: 'text-[#C97B2E]',
    borderLeft: 'border-l-[#C97B2E]',
    iconBg: 'bg-[#F8E9DA] text-[#C97B2E] border-[#C97B2E]/25',
    advice: 'Moderate exposure. Standard business policy coverage and periodic review advised.',
  },
  low: {
    label: 'Low Risk',
    badgeBg: 'bg-[#E1F0E7] border border-[#1A7B4B]/25 text-[#1A7B4B]',
    dotBg: 'bg-[#1A7B4B]',
    barGradient: 'from-[#34D399] to-[#1A7B4B]',
    textScore: 'text-[#1A7B4B]',
    borderLeft: 'border-l-[#1A7B4B]',
    iconBg: 'bg-[#E1F0E7] text-[#1A7B4B] border-[#1A7B4B]/25',
    advice: 'Well-managed risk level. Baseline operational safeguards and standard monitoring suffice.',
  },
} as const

// Map category names to relevant MUI icons
function getCategoryIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('transit') || lower.includes('transport') || lower.includes('logistics') || lower.includes('cargo')) {
    return <LocalShippingRoundedIcon fontSize="small" />
  }
  if (lower.includes('fire') || lower.includes('flame')) {
    return <LocalFireDepartmentRoundedIcon fontSize="small" />
  }
  if (lower.includes('theft') || lower.includes('burglary') || lower.includes('crime') || lower.includes('security')) {
    return <SecurityRoundedIcon fontSize="small" />
  }
  if (lower.includes('employee') || lower.includes('workforce') || lower.includes('worker') || lower.includes('liability')) {
    return <GroupsRoundedIcon fontSize="small" />
  }
  if (lower.includes('machinery') || lower.includes('equipment') || lower.includes('breakdown')) {
    return <PrecisionManufacturingRoundedIcon fontSize="small" />
  }
  if (lower.includes('business') || lower.includes('interruption') || lower.includes('operations')) {
    return <BusinessCenterRoundedIcon fontSize="small" />
  }
  if (lower.includes('cyber') || lower.includes('data') || lower.includes('it') || lower.includes('technology')) {
    return <ComputerRoundedIcon fontSize="small" />
  }
  return <ShieldRoundedIcon fontSize="small" />
}

export default function ProfilingResults({
  data,
  onRestart,
  onEdit,
  onSeeRecommendations,
}: ProfilingResultsProps) {
  // Sort state: defaults to 'desc' (Descending order) as requested
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({})

  const toggleBreakdown = (categoryName: string) => {
    setExpandedBreakdowns((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }))
  }

  // All scores calculations
  const allScores = useMemo(() => data.scores || [], [data.scores])

  const avgScore = useMemo(() => {
    if (allScores.length === 0) return 0
    return Math.round((allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length) * 100)
  }, [allScores])

  const highCriticalCount = useMemo(() => {
    return allScores.filter((s) => s.risk_level === 'high' || s.risk_level === 'critical').length
  }, [allScores])

  const mediumCount = useMemo(() => {
    return allScores.filter((s) => s.risk_level === 'medium').length
  }, [allScores])

  const lowCount = useMemo(() => {
    return allScores.filter((s) => s.risk_level === 'low').length
  }, [allScores])

  const topRiskItem = useMemo(() => {
    if (allScores.length === 0) return null
    return [...allScores].sort((a, b) => b.score - a.score)[0]
  }, [allScores])

  // Processed, filtered, and sorted scores list
  const processedScores = useMemo(() => {
    let result = [...allScores]

    // 1. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((s) => s.risk_category_name.toLowerCase().includes(q))
    }

    // 2. Sorting - Descending is default (highest score to lowest score)
    result.sort((a, b) => {
      if (sortOrder === 'desc') {
        // Descending by score: e.g. 71% -> 53% -> 47% -> 20%
        return b.score - a.score || a.risk_category_name.localeCompare(b.risk_category_name)
      }
      if (sortOrder === 'asc') {
        // Ascending by score: e.g. 20% -> 47% -> 53% -> 71%
        return a.score - b.score || a.risk_category_name.localeCompare(b.risk_category_name)
      }
      return 0
    })

    return result
  }, [allScores, searchQuery, sortOrder])

  // Overall risk rating
  // Overall risk rating aligned with brand tokens
  const overallRating = useMemo(() => {
    if (avgScore >= 65) return { text: 'High Risk Profile', color: 'text-[#C0392B]', bg: 'bg-[#F8E1DF] border-[#C0392B]/30' }
    if (avgScore >= 35) return { text: 'Moderate Risk Profile', color: 'text-[#C97B2E]', bg: 'bg-[#F8E9DA] border-[#C97B2E]/30' }
    return { text: 'Healthy Risk Profile', color: 'text-[#1A7B4B]', bg: 'bg-[#E1F0E7] border-[#1A7B4B]/30' }
  }, [avgScore])

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-10">
      {/* Hero Header Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102A45] via-[#1A3A5C] to-[#0D7377] p-8 md:p-10 text-white shadow-xl">
        {/* Subtle decorative glow orbs */}
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
            {/* Pulsing Success Badge */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <div className="absolute inset-0 rounded-2xl animate-ping bg-teal-400/20 duration-1000" />
              <CheckCircleRoundedIcon sx={{ fontSize: 44 }} className="text-teal-300 drop-shadow-sm" />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-teal-400/20 text-teal-200 border border-teal-300/30">
                  <ShieldRoundedIcon sx={{ fontSize: 14 }} /> Assessment Completed
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${overallRating.bg} ${overallRating.color}`}>
                  {overallRating.text}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white m-0">
                Risk Profiling Report
              </h1>
              <p className="mt-2 text-sm text-slate-200 max-w-xl leading-relaxed">
                Comprehensive evaluation of your business risk categories, operational exposure levels, and policy recommendation indicators.
              </p>
            </div>
          </div>

          {/* Quick CTA in Hero */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={onSeeRecommendations || (() => alert('Recommendations coming soon!'))}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#E07B39] to-[#C9652A] text-white shadow-lg shadow-orange-950/25 hover:from-[#d56e2c] hover:to-[#be5c22] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>View Recommended Policies</span>
              <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* KPI Metrics Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Categories */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Categories</span>
            <div className="p-2 rounded-xl bg-[#1A3A5C]/10 text-[#1A3A5C]">
              <ShieldRoundedIcon sx={{ fontSize: 18 }} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">{allScores.length}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Fully Evaluated</div>
          </div>
        </div>

        {/* Card 2: Attention Needed */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">High Risk</span>
            <div className={`p-2 rounded-xl ${highCriticalCount > 0 ? 'bg-[#C0392B]/10 text-[#C0392B]' : 'bg-[#1A7B4B]/10 text-[#1A7B4B]'}`}>
              <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />
            </div>
          </div>
          <div>
            <div className={`text-3xl font-black ${highCriticalCount > 0 ? 'text-[#C0392B]' : 'text-slate-800'}`}>
              {highCriticalCount}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Require Coverage</div>
          </div>
        </div>

        {/* Card 3: Average Score */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Exposure</span>
            <div className="p-2 rounded-xl bg-[#0D7377]/10 text-[#0D7377]">
              <SpeedRoundedIcon sx={{ fontSize: 18 }} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">{avgScore}%</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Across all operations</div>
          </div>
        </div>

        {/* Card 4: Top Driver */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Top Vulnerability</span>
            <div className="p-2 rounded-xl bg-[#E07B39]/10 text-[#E07B39]">
              <TrendingUpRoundedIcon sx={{ fontSize: 18 }} />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800 truncate" title={topRiskItem?.risk_category_name ?? 'None'}>
              {topRiskItem?.risk_category_name ?? 'None'}
            </div>
            <div className="text-xs text-[#C0392B] font-bold mt-0.5">
              {topRiskItem ? `${Math.round(topRiskItem.score * 100)}% Risk Score` : 'N/A'}
            </div>
          </div>
        </div>
      </section>

      {/* Visual Risk Distribution Bar */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <TuneRoundedIcon sx={{ fontSize: 18 }} className="text-slate-500" />
            <span className="text-sm font-bold text-slate-800">Risk Spectrum Distribution</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1A7B4B]" />
              <span className="text-slate-600">Low ({lowCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C97B2E]" />
              <span className="text-slate-600">Medium ({mediumCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C0392B]" />
              <span className="text-slate-600">High & Critical ({highCriticalCount})</span>
            </div>
          </div>
        </div>

        {/* Multi-segment distribution track */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex shadow-inner">
          {allScores.length > 0 ? (
            <>
              {lowCount > 0 && (
                <div
                  style={{ width: `${(lowCount / allScores.length) * 100}%` }}
                  className="bg-[#1A7B4B] h-full transition-all duration-500"
                  title={`Low Risk: ${lowCount}`}
                />
              )}
              {mediumCount > 0 && (
                <div
                  style={{ width: `${(mediumCount / allScores.length) * 100}%` }}
                  className="bg-[#C97B2E] h-full transition-all duration-500"
                  title={`Medium Risk: ${mediumCount}`}
                />
              )}
              {highCriticalCount > 0 && (
                <div
                  style={{ width: `${(highCriticalCount / allScores.length) * 100}%` }}
                  className="bg-[#C0392B] h-full transition-all duration-500"
                  title={`High & Critical: ${highCriticalCount}`}
                />
              )}
            </>
          ) : (
            <div className="w-full bg-slate-200" />
          )}
        </div>
      </section>

      {/* Main Content Area: Controls & Risk Cards List */}
      <section className="flex flex-col gap-5">
        {/* Controls Bar: Sort (Left) & Search (Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          {/* Left Side: Sort Toggle (Descending by default) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl w-fit">
            <span className="text-[11px] font-bold text-slate-500 px-2 uppercase tracking-wider">
              Sort:
            </span>
            <button
              type="button"
              onClick={() => setSortOrder('desc')}
              title="Sort Descending: Highest Risk to Lowest"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortOrder === 'desc'
                  ? 'bg-[#0D7377] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ArrowDownwardRoundedIcon sx={{ fontSize: 14 }} />
              <span>Descending (High → Low)</span>
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('asc')}
              title="Sort Ascending: Lowest Risk to Highest"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortOrder === 'asc'
                  ? 'bg-[#0D7377] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ArrowUpwardRoundedIcon sx={{ fontSize: 14 }} />
              <span>Ascending (Low → High)</span>
            </button>
          </div>

          {/* Right Side: Search Filter */}
          <div className="relative w-full sm:w-72">
            <SearchRoundedIcon
              sx={{ fontSize: 18 }}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search risk category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377] focus:border-transparent transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Scores List Section */}
        {processedScores.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {processedScores.map((score: RiskScoreOut, index: number) => {
              const cfg = RISK_CONFIG[score.risk_level] ?? RISK_CONFIG.low
              const pct = Math.round(score.score * 100)
              const hasBreakdown = score.factor_breakdown && Object.keys(score.factor_breakdown).length > 0
              const isExpanded = !!expandedBreakdowns[score.risk_category_name]

              return (
                <div
                  key={score.risk_category_name}
                  className={`relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:shadow-md hover:border-slate-300 border-l-4 ${cfg.borderLeft}`}
                >
                  <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Rank, Icon, Name, Badge & Advice */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Rank Badge */}
                        <div
                          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 text-slate-600 font-extrabold text-xs"
                          title={`Sorted Rank #${index + 1}`}
                        >
                          #{index + 1}
                        </div>

                        {/* Category Icon Badge */}
                        <div
                          className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border ${cfg.iconBg} shadow-sm`}
                        >
                          {getCategoryIcon(score.risk_category_name)}
                        </div>

                        {/* Text details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-800 truncate m-0">
                              {score.risk_category_name}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${cfg.badgeBg}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotBg}`} />
                              {cfg.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 line-clamp-1 leading-relaxed">
                            {cfg.advice}
                          </p>
                        </div>
                      </div>

                      {/* Right: Progress Meter & Score */}
                      <div className="flex items-center gap-5 sm:w-80 shrink-0">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <div className="flex justify-between text-[11px] font-bold text-slate-500">
                            <span>Exposure Level</span>
                            <span className={cfg.textScore}>{pct}%</span>
                          </div>
                          {/* Modern Animated Progress Track */}
                          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${cfg.barGradient} transition-all duration-700 ease-out`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Prominent Score Number */}
                        <div className={`w-14 text-right text-2xl font-black ${cfg.textScore} tabular-nums`}>
                          {pct}%
                        </div>
                      </div>
                    </div>

                    {/* Expandable Factor Breakdown Toggle */}
                    {hasBreakdown && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleBreakdown(score.risk_category_name)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#0D7377] hover:text-[#095457] transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Factor Breakdown' : 'View Contributing Factors'}</span>
                          {isExpanded ? (
                            <KeyboardArrowUpRoundedIcon sx={{ fontSize: 16 }} />
                          ) : (
                            <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} />
                          )}
                        </button>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {Object.keys(score.factor_breakdown || {}).length} sub-factors analyzed
                        </span>
                      </div>
                    )}

                    {/* Factor Breakdown Content */}
                    {hasBreakdown && isExpanded && score.factor_breakdown && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/60">
                        {Object.entries(score.factor_breakdown).map(([factor, factorScore]) => {
                          const fPct = Math.round(factorScore * 100)
                          return (
                            <div
                              key={factor}
                              className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-lg border border-slate-200/50 shadow-xs"
                            >
                              <span className="text-xs font-semibold text-slate-700 truncate capitalize">
                                {factor.replace(/_/g, ' ')}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${cfg.barGradient}`}
                                    style={{ width: `${fPct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-slate-700 w-8 text-right">
                                  {fPct}%
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
              <InfoOutlinedIcon sx={{ fontSize: 32 }} />
            </div>
            <h4 className="text-base font-bold text-slate-800 m-0">No risk categories found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              No categories match &quot;{searchQuery}&quot;. Try clearing the search.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
              }}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </section>

      {/* Bottom Actions Bar */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs"
          >
            <RestartAltRoundedIcon sx={{ fontSize: 16 }} />
            <span>Start New Assessment</span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs"
          >
            <EditRoundedIcon sx={{ fontSize: 16 }} />
            <span>Edit Responses</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onSeeRecommendations || (() => alert('Recommendations coming soon!'))}
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0D7377] to-[#1A3A5C] hover:from-[#095457] hover:to-[#102A45] shadow-md shadow-teal-900/20 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <span>See Policy Recommendations</span>
          <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
        </button>
      </footer>
    </div>
  )
}
