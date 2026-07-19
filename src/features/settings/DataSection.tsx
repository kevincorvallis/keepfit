import { useEffect, useRef, useState } from 'react'
import { FileJson, FileSpreadsheet, Trash2, Upload } from 'lucide-react'
import type { Settings } from '../../lib/types'
import type { ExportBundle } from '../../lib/export'
import { parseImport, sessionsToCsv, toJson } from '../../lib/export'
import { db, ensureSeeded } from '../../db/db'
import { Button, Sheet } from '../../app/ui'
import { SectionCard } from './SectionCard'
import { saveSettings } from './save'

function localDateStamp(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function DataSection({ settings }: { settings: Settings }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ExportBundle | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)

  const exportJson = async () => {
    const [dbSettings, exercises, programs, sessions, progressionState] = await Promise.all([
      db.settings.get('app'),
      db.exercises.toArray(),
      db.programs.toArray(),
      db.sessions.toArray(),
      db.progressionState.toArray(),
    ])
    const json = toJson({
      exportedAt: Date.now(),
      settings: dbSettings ?? settings,
      exercises,
      programs,
      sessions,
      progressionState,
    })
    download(json, `apogee-backup-${localDateStamp()}.json`, 'application/json')
    void saveSettings({ lastBackupAt: Date.now() })
  }

  const exportCsv = async () => {
    const [sessions, exercises] = await Promise.all([
      db.sessions.toArray(),
      db.exercises.toArray(),
    ])
    const finished = sessions.filter((s) => s.finishedAt !== undefined)
    const csv = sessionsToCsv(finished, new Map(exercises.map((e) => [e.id, e])))
    download(csv, `apogee-sets-${localDateStamp()}.csv`, 'text/csv')
  }

  const pickFile = async (file: File) => {
    setImportError(null)
    try {
      setPending(parseImport(await file.text()))
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'That file could not be read.')
    }
  }

  const applyImport = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await db.transaction(
        'rw',
        [db.settings, db.exercises, db.programs, db.sessions, db.progressionState],
        async () => {
          await Promise.all([
            db.settings.clear(),
            db.exercises.clear(),
            db.programs.clear(),
            db.sessions.clear(),
            db.progressionState.clear(),
          ])
          await db.settings.put(pending.settings)
          await db.exercises.bulkPut(pending.exercises)
          await db.programs.bulkPut(pending.programs)
          await db.sessions.bulkPut(pending.sessions)
          await db.progressionState.bulkPut(pending.progressionState)
        },
      )
      setPending(null)
    } catch {
      setImportError('Import failed and nothing was changed. Check the file and try again.')
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  const closeDelete = () => {
    setDeleteOpen(false)
    setArmed(false)
  }

  const deleteAll = async () => {
    setBusy(true)
    try {
      await db.transaction(
        'rw',
        [db.settings, db.exercises, db.programs, db.sessions, db.progressionState],
        async () => {
          await Promise.all([
            db.settings.clear(),
            db.exercises.clear(),
            db.programs.clear(),
            db.sessions.clear(),
            db.progressionState.clear(),
          ])
        },
      )
      await ensureSeeded()
      closeDelete()
    } finally {
      setBusy(false)
    }
  }

  const loggedSets = pending
    ? pending.sessions.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.sets.length, 0), 0)
    : 0

  return (
    <SectionCard label="Your data" caption="Local-first. Everything lives on this device.">
      <StorageStatus />
      <div className="space-y-3">
        <Button className="w-full" onClick={() => void exportJson()}>
          <FileJson size={18} aria-hidden />
          Export backup (JSON)
        </Button>
        <Button className="w-full" onClick={() => void exportCsv()}>
          <FileSpreadsheet size={18} aria-hidden />
          Export sets (CSV)
        </Button>
        <Button className="w-full" onClick={() => fileInput.current?.click()}>
          <Upload size={18} aria-hidden />
          Import backup
        </Button>
        {importError && <p className="text-sm text-plate-red">{importError}</p>}
        <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={18} aria-hidden />
          Delete all data
        </Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void pickFile(file)
          e.target.value = ''
        }}
      />

      <Sheet open={pending !== null} onClose={() => setPending(null)} title="Import backup">
        {pending && (
          <>
            <p className="text-dust">
              Replaces everything on this device with {count(pending.programs.length, 'program')},{' '}
              {count(pending.sessions.length, 'session')}, {count(pending.exercises.length, 'exercise')}{' '}
              and {count(loggedSets, 'logged set')}.
            </p>
            <p className="mt-2 text-sm text-plate-yellow">
              Current data is not merged — export a backup first if you want to keep it.
            </p>
            <div className="mt-5 space-y-3">
              <Button big variant="primary" disabled={busy} onClick={() => void applyImport()}>
                Replace and import
              </Button>
              <Button big variant="ghost" disabled={busy} onClick={() => setPending(null)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={deleteOpen} onClose={closeDelete} title="Delete all data">
        <p className="text-dust">
          Removes every program, workout and setting on this device. The starter catalog and
          program templates are restored; your logged history is not.
        </p>
        <div className="mt-5 space-y-3">
          <Button
            big
            variant="danger"
            disabled={busy}
            className={armed ? 'bg-plate-red/15' : ''}
            onClick={() => (armed ? void deleteAll() : setArmed(true))}
          >
            {armed ? 'Tap again to confirm' : 'Delete everything'}
          </Button>
          <Button big variant="ghost" disabled={busy} onClick={closeDelete}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </SectionCard>
  )
}

/**
 * Whether the browser has granted persistent storage. Best-effort storage
 * can be evicted under pressure — for a local-first log that means losing
 * everything, so surface it instead of hiding it.
 */
function StorageStatus() {
  const [persisted, setPersisted] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    void navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(undefined))
  }, [])
  if (persisted === undefined) return null
  return (
    <p className={`mb-3 text-sm ${persisted ? 'text-dust' : 'text-plate-yellow'}`}>
      {persisted
        ? 'Storage is protected — the browser will not evict your log.'
        : 'Storage is best-effort in this browser — export backups regularly, or install the app to your home screen for durable storage.'}
    </p>
  )
}
