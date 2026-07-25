import { useId } from 'react'

type LoaderVariant =
  | 'badge-check'
  | 'shield-draw'
  | 'gauge-sweep'
  | 'slide-fade'
  | 'skeleton'
  | 'dots'

interface LoaderProps {
  variant: LoaderVariant
  label?: string
  size?: number
}

const BADGE_BG = '#0F6E56'
const STROKE = '#ffffff'
const SHIELD_PATH = 'M17 3 L29 8 V16 C29 24 24 29 17 31 C10 29 5 24 5 16 V8 Z'
const CHECK_PATH = 'M11 17 L15.5 21.5 L23 12.5'

function BadgeFrame({
  size,
  className,
  children,
}: {
  size: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: BADGE_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  )
}

function BadgeCheck({ size, uid }: { size: number; uid: string }) {
  return (
    <BadgeFrame size={size} className={`${uid}-badge-check`}>
      <svg
        width={size * 0.68}
        height={size * 0.68}
        viewBox="0 0 34 34"
        fill="none"
        stroke={STROKE}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path className={`${uid}-badge-shield`} d={SHIELD_PATH} pathLength={1} />
        <path className={`${uid}-badge-checkmark`} d={CHECK_PATH} pathLength={1} />
      </svg>
    </BadgeFrame>
  )
}

function ShieldDraw({ size, uid }: { size: number; uid: string }) {
  return (
    <BadgeFrame size={size}>
      <svg
        width={size * 0.68}
        height={size * 0.68}
        viewBox="0 0 34 34"
        fill="none"
        stroke={STROKE}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path className={`${uid}-shield-outline`} d={SHIELD_PATH} pathLength={1} fill="transparent" />
        <path className={`${uid}-shield-fill`} d={SHIELD_PATH} fill={STROKE} fillOpacity={0} stroke="none" />
      </svg>
    </BadgeFrame>
  )
}

function GaugeSweep({ size, uid }: { size: number; uid: string }) {
  const strokeWidth = Math.max(4, size * 0.07)
  const width = size
  const height = size * 0.72
  const cx = width / 2
  const cy = height * 0.9
  const radius = width * 0.34
  const startX = cx - radius
  const endX = cx + radius
  const arcPath = `M ${startX} ${cy} A ${radius} ${radius} 0 0 1 ${endX} ${cy}`

  return (
    <div style={{ width, height: size, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <path d={arcPath} fill="none" stroke="#D7E5E0" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path
          d={arcPath}
          fill="none"
          stroke={BADGE_BG}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray="0.66 1"
          pathLength={1}
          opacity={0.3}
        />
        <g className={`${uid}-gauge-needle`} style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - radius * 0.9}
            stroke={BADGE_BG}
            strokeWidth={Math.max(3, size * 0.045)}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={Math.max(4, size * 0.07)} fill={BADGE_BG} />
        </g>
      </svg>
    </div>
  )
}

function SlideFade({ size, uid }: { size: number; uid: string }) {
  return (
    <div
      style={{
        width: size * 2.2,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <BadgeFrame size={size} className={`${uid}-slide-badge`}>
        <svg
          width={size * 0.58}
          height={size * 0.58}
          viewBox="0 0 34 34"
          fill="none"
          stroke={STROKE}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={SHIELD_PATH} />
          <path d={CHECK_PATH} />
        </svg>
      </BadgeFrame>
    </div>
  )
}

function Skeleton({ size, uid }: { size: number; uid: string }) {
  const rowHeight = Math.max(12, Math.round(size * 0.3))
  const gap = Math.max(8, Math.round(size * 0.2))
  const widths = ['100%', '88%', '64%']

  return (
    <div style={{ width: Math.round(size * 4.8), maxWidth: '100%' }} aria-hidden="true">
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {widths.map((width, index) => (
          <div
            key={index}
            className={`${uid}-skeleton-bar`}
            style={{
              height: rowHeight,
              width,
              borderRadius: rowHeight / 2,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function Dots({ size, uid }: { size: number; uid: string }) {
  const dotSize = Math.max(6, Math.round(size * 0.22))
  const gap = Math.max(4, Math.round(dotSize * 0.65))

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        minHeight: size,
      }}
      aria-hidden="true"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`${uid}-dot`}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: BADGE_BG,
            animationDelay: `${index * 0.16}s`,
          }}
        />
      ))}
    </div>
  )
}

type VariantComponentProps = { size: number; uid: string }

const VARIANT_COMPONENTS: Record<LoaderVariant, (props: VariantComponentProps) => ReturnType<typeof BadgeCheck>> = {
  'badge-check': BadgeCheck,
  'shield-draw': ShieldDraw,
  'gauge-sweep': GaugeSweep,
  'slide-fade': SlideFade,
  skeleton: Skeleton,
  dots: Dots,
}

export function Loader({ variant, label, size = 48 }: LoaderProps) {
  const uid = useId().replace(/[:]/g, '')
  const VariantComponent = VARIANT_COMPONENTS[variant]
  const ariaLabel = label ?? 'Loading'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className="flex flex-col items-center justify-center gap-2"
      style={{ overflow: 'visible' }}
    >
      <VariantComponent size={size} uid={uid} />

      <style>{`
.${uid}-badge-check {
  animation: ${uid}-badgePulse 3s ease-in-out infinite;
}
.${uid}-badge-shield,
.${uid}-badge-checkmark,
.${uid}-shield-outline {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.${uid}-badge-shield {
  animation: ${uid}-shieldTrace 3s ease-in-out infinite;
}
.${uid}-badge-checkmark {
  animation: ${uid}-checkTrace 3s ease-in-out infinite;
}
.${uid}-shield-outline {
  animation: ${uid}-outlineTrace 2.8s ease-in-out infinite;
}
.${uid}-shield-fill {
  animation: ${uid}-shieldFill 2.8s ease-in-out infinite;
}
.${uid}-gauge-needle {
  animation: ${uid}-needleSweep 1.7s ease-in-out infinite alternate;
}
.${uid}-slide-badge {
  animation: ${uid}-slideFade 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
.${uid}-skeleton-bar {
  background: linear-gradient(90deg, #e5e7eb 15%, #f8fafc 50%, #e5e7eb 85%);
  background-size: 200% 100%;
  animation: ${uid}-shimmer 1.5s linear infinite;
}
.${uid}-dot {
  animation: ${uid}-dotBounce 1.1s ease-in-out infinite;
}

@keyframes ${uid}-badgePulse {
  0%, 72%, 100% { opacity: 1; transform: scale(1); }
  82% { opacity: 0.88; transform: scale(0.98); }
}

@keyframes ${uid}-shieldTrace {
  0%, 10% { stroke-dashoffset: 1; }
  38%, 100% { stroke-dashoffset: 0; }
}

@keyframes ${uid}-checkTrace {
  0%, 42% { stroke-dashoffset: 1; }
  62%, 100% { stroke-dashoffset: 0; }
}

@keyframes ${uid}-outlineTrace {
  0%, 14% { stroke-dashoffset: 1; opacity: 1; }
  48%, 100% { stroke-dashoffset: 0; opacity: 1; }
}

@keyframes ${uid}-shieldFill {
  0%, 44% { fill-opacity: 0; }
  62%, 86% { fill-opacity: 0.2; }
  100% { fill-opacity: 0; }
}

@keyframes ${uid}-needleSweep {
  0% { transform: rotate(-58deg); }
  100% { transform: rotate(58deg); }
}

@keyframes ${uid}-slideFade {
  0% { transform: translateX(-120%) scale(0.96); opacity: 0; }
  18% { transform: translateX(0) scale(1); opacity: 1; }
  72% { transform: translateX(0) scale(1); opacity: 1; }
  100% { transform: translateX(120%) scale(0.96); opacity: 0; }
}

@keyframes ${uid}-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes ${uid}-dotBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.75; }
  40% { transform: translateY(-35%); opacity: 1; }
}
      `}</style>

      <span className={label ? 'text-center text-sm' : 'sr-only'} style={{ color: '#6b7280', maxWidth: 260 }}>
        {ariaLabel}
      </span>
    </div>
  )
}

export default Loader
