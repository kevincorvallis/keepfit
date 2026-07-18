import { NavLink, Route, Routes } from 'react-router-dom'
import { ChartNoAxesColumn, Dumbbell, History, LibraryBig, Settings } from 'lucide-react'
import TrainPage from '../features/player/TrainPage'
import ProgramsPage from '../features/programs/ProgramsPage'
import ProgramDetailPage from '../features/programs/ProgramDetailPage'
import HistoryPage from '../features/history/HistoryPage'
import SessionDetailPage from '../features/history/SessionDetailPage'
import StatsPage from '../features/analytics/StatsPage'
import SettingsPage from '../features/settings/SettingsPage'

const tabs = [
  { to: '/', label: 'Train', icon: Dumbbell },
  { to: '/programs', label: 'Programs', icon: LibraryBig },
  { to: '/history', label: 'History', icon: History },
  { to: '/stats', label: 'Stats', icon: ChartNoAxesColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 pb-24">
        <Routes>
          <Route path="/" element={<TrainPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/:programId" element={<ProgramDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:sessionId" element={<SessionDetailPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-lg">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-wide uppercase ${
                  isActive ? 'text-chalk' : 'text-faint'
                }`
              }
            >
              <Icon size={22} strokeWidth={2} aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
