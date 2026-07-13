import { BookmarkPlus, Layers } from "lucide-react"
import React from "react"

interface CreateMenuIconProps {
  className?: string
}

const ICON_SIZE = 20

export const CreateTaskMenuIcon: React.FC<CreateMenuIconProps> = ({ className }) => (
  <svg className={className} width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="18" height="18" rx="5" fill="var(--color-brand)" />
    <path d="m5.4 10.1 3 3 6.3-6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const CreateProjectMenuIcon: React.FC<CreateMenuIconProps> = ({ className }) => (
  <svg className={className} width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 10 L10 4 A6 6 0 1 1 6.473 14.854 Z" fill="currentColor" />
  </svg>
)

export const CreateAreaMenuIcon: React.FC<CreateMenuIconProps> = ({ className }) => (
  <Layers
    className={className}
    width={ICON_SIZE}
    height={ICON_SIZE}
    color="currentColor"
    strokeWidth={1.5}
    absoluteStrokeWidth
    aria-hidden="true"
  />
)

export const CreateViewMenuIcon: React.FC<CreateMenuIconProps> = ({ className }) => (
  <BookmarkPlus
    className={className}
    width={ICON_SIZE}
    height={ICON_SIZE}
    color="currentColor"
    strokeWidth={1.5}
    absoluteStrokeWidth
    aria-hidden="true"
  />
)
