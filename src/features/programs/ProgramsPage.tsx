import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { Program } from '../../lib/types'
import { Button, EmptyState, PageHeader } from '../../app/ui'
import { db, newId } from '../../db/db'
import { usePrograms } from '../../state/hooks'

export default function ProgramsPage() {
  const programs = usePrograms()
  const navigate = useNavigate()

  const createProgram = async () => {
    const program: Program = {
      id: newId(),
      name: 'New program',
      days: [{ id: newId(), name: 'Day 1', slots: [] }],
      createdAt: Date.now(),
    }
    await db.programs.put(program)
    navigate(`/programs/${program.id}`)
  }

  return (
    <div>
      <PageHeader
        sub="Library"
        title="Programs"
        action={
          <Button variant="primary" onClick={() => void createProgram()}>
            <Plus size={18} aria-hidden /> New
          </Button>
        }
      />

      {programs === undefined ? null : programs.length === 0 ? (
        <EmptyState
          title="No programs"
          body="Create a program to plan your training days."
          action={
            <Button variant="primary" onClick={() => void createProgram()}>
              <Plus size={18} aria-hidden /> New program
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3 px-5">
          {programs.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => navigate(`/programs/${p.id}`)}
                className="w-full rounded-card border border-line bg-surface p-4 text-left active:bg-raised"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold uppercase">{p.name}</h2>
                  {p.id.startsWith('tpl-') && (
                    <span className="mt-0.5 shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] tracking-wide text-faint uppercase">
                      Template
                    </span>
                  )}
                </div>
                {p.description && <p className="mt-1 text-sm text-dust">{p.description}</p>}
                <p className="mt-2 text-xs text-faint">
                  {p.days.length} {p.days.length === 1 ? 'day' : 'days'}
                  {p.days.length > 0 && ` · ${p.days.map((d) => d.name).join(', ')}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
