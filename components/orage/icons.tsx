/**
 * Lightweight Orage icons — exact shapes from the prototype HTMLs.
 * Kept here so we don't pull lucide-react into every component just
 * to match the locked geometry of the design system.
 */

type Props = React.SVGProps<SVGSVGElement>

const base = (props: Props) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
})

export const IcDashboard = (p: Props) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
)

export const IcRock = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

export const IcNote = (p: Props) => (
  <svg {...base(p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

export const IcTask = (p: Props) => (
  <svg {...base(p)}>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

export const IcIssue = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

export const IcScorecard = (p: Props) => (
  <svg {...base(p)}>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  </svg>
)

export const IcL10 = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

export const IcVTO = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
  </svg>
)

export const IcOrgChart = (p: Props) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="6" height="6" />
    <rect x="15" y="3" width="6" height="6" />
    <rect x="9" y="15" width="6" height="6" />
    <line x1="6" y1="9" x2="6" y2="15" />
    <line x1="18" y1="9" x2="18" y2="15" />
    <line x1="6" y1="15" x2="18" y2="15" />
  </svg>
)

export const IcPeople = (p: Props) => (
  <svg {...base(p)}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
)

export const IcAdmin = (p: Props) => (
  <svg {...base(p)}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
  </svg>
)

export const IcSettings = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33" />
  </svg>
)

export const IcSearch = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export const IcBell = (p: Props) => (
  <svg {...base(p)}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

export const IcCalendar = (p: Props) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

export const IcPlus = (p: Props) => (
  <svg {...base({ strokeWidth: 3, ...p })}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const IcChevronDown = (p: Props) => (
  <svg {...base(p)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export const IcClose = (p: Props) => (
  <svg {...base(p)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export const IcCheck = (p: Props) => (
  <svg {...base(p)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export const IcArchive = (p: Props) => (
  <svg {...base(p)}>
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
)

export const IcFilter = (p: Props) => (
  <svg {...base(p)}>
    <polyline points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)

export const IcList = (p: Props) => (
  <svg {...base(p)}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3" cy="6" r="1" />
    <circle cx="3" cy="12" r="1" />
    <circle cx="3" cy="18" r="1" />
  </svg>
)

export const IcBoard = (p: Props) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="6" height="18" />
    <rect x="11" y="3" width="6" height="12" />
    <rect x="19" y="3" width="2" height="9" />
  </svg>
)

export const IcTimeline = (p: Props) => (
  <svg {...base(p)}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <circle cx="6" cy="12" r="2" />
    <circle cx="14" cy="12" r="2" />
  </svg>
)

export const IcGrip = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="9" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="18" r="1" />
  </svg>
)

export const IcMore = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
)

export const IcArrowRight = (p: Props) => (
  <svg {...base(p)}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

export const IcLock = (p: Props) => (
  <svg {...base(p)}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export const IcSpark = (p: Props) => (
  <svg {...base(p)}>
    <path d="M12 2v6" />
    <path d="M12 16v6" />
    <path d="M2 12h6" />
    <path d="M16 12h6" />
    <path d="M5 5l3.5 3.5" />
    <path d="M15.5 15.5L19 19" />
    <path d="M5 19l3.5-3.5" />
    <path d="M15.5 8.5L19 5" />
  </svg>
)

export const IcShare = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)

export const IcPin = (p: Props) => (
  <svg {...base(p)}>
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14V5L12 2 5 5z" />
  </svg>
)

export const IcAt = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
  </svg>
)

export const IcSlash = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
)

export const IcAttach = (p: Props) => (
  <svg {...base(p)}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
)

export const IcChevronLeft = (p: Props) => (
  <svg {...base(p)}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

export const IcChevronRight = (p: Props) => (
  <svg {...base(p)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export const IcMessage = (p: Props) => (
  <svg {...base(p)}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

export const IcLink = (p: Props) => (
  <svg {...base(p)}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)
