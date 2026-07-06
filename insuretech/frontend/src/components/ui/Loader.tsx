interface LoaderProps {
  label?: string
  className?: string
}

export default function Loader({ label = 'Loading…', className = '' }: LoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`.trim()}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      {label ? <p className="text-sm text-slate-500">{label}</p> : null}
    </div>
  )
}
