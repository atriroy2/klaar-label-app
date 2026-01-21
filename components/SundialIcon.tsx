import React from 'react'

interface SundialIconProps {
  className?: string
}

export default function SundialIcon({ className }: SundialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Sundial base plate - semicircle dial */}
      <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9" />
      {/* Hour markers on the dial */}
      <line x1="12" y1="3" x2="12" y2="4.5" />
      <line x1="12" y1="3" x2="10.8" y2="4.2" />
      <line x1="12" y1="3" x2="13.2" y2="4.2" />
      <line x1="12" y1="3" x2="9.2" y2="6" />
      <line x1="12" y1="3" x2="14.8" y2="6" />
      {/* Gnomon (the triangular stick that casts shadow) - pointing north */}
      <path d="M12 3 L10 9 L12 8 L14 9 Z" fill="currentColor" />
      {/* Base circle for reference */}
      <circle cx="12" cy="12" r="9" opacity="0.2" />
    </svg>
  )
}
