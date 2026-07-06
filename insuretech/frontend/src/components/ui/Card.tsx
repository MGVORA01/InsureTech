import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <section className={`rounded-[24px] border border-black/5 bg-white shadow-[0_14px_40px_rgba(20,20,19,0.045)] ${className}`.trim()}>
      {children}
    </section>
  )
}
