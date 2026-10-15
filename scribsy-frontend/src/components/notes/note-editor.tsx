'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { draftKey } from '@/lib/note-draft';
import { useNoteDraft } from '@/hooks/use-note-draft';
import type { Note } from '@/types';

export function NoteEditor({ note, accountId, inline = false, onDone }: { note: Note; accountId: number; inline?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const initial = { content: note.content, soap_subjective: note.soap_subjective || '', soap_objective: note.soap_objective || '', soap_assessment: note.soap_assessment || '', soap_plan: note.soap_plan || '' };
  const [value, setValue] = useState(initial);
  const draft = useNoteDraft({ scope: draftKey(accountId, note.id), initial, value, apply: setValue, save: snapshot => apiClient.updateNote(note.id, snapshot) });
  const finish = async () => {
    try {
      await draft.flush();
      window.localStorage.removeItem(`soap_review_${note.id}`);
      if (onDone) onDone(); else router.push(`/notes/${note.id}`);
    } catch { /* Recovery and retry remain visible. */ }
  };
  return <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 space-y-4" aria-label="Note editor">
    {draft.pending && <div role="status" className="rounded-lg border border-blue-200 p-4"><p>A recovery copy from this tab is available.</p><div className="flex gap-4 mt-2"><button type="button" onClick={draft.restore} className="underline">Restore draft</button><button type="button" onClick={draft.discard} className="underline">Discard recovery copy</button></div></div>}
    <p role="status">{draft.pending ? 'Choose whether to restore your draft.' : draft.status === 'saving' ? 'Saving…' : draft.status === 'error' ? 'Changes not saved.' : draft.dirty ? 'Unsaved changes' : 'All changes saved'}</p>
    {draft.error && <div role="alert"><p>{draft.error} Your changes remain in the editor.</p><button type="button" className="underline" onClick={() => void draft.flush().catch(() => {})}>Retry save</button></div>}
    {draft.storageError && <p role="status">Tab recovery is unavailable in this browser. Keep this page open until your changes are saved.</p>}
    <fieldset disabled={!!draft.pending || !draft.ready} className="space-y-4">
      {Object.entries(value).map(([key, text]) => <label key={key} className="block font-medium">{key === 'content' ? 'Visit notes' : key.replace('soap_', '').replace(/^./, first => first.toUpperCase())}<textarea aria-label={key === 'content' ? 'Visit notes' : key.replace('soap_', '').replace(/^./, first => first.toUpperCase())} className="block w-full mt-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 font-normal" rows={key === 'content' ? 8 : 4} value={text} onChange={event => setValue(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
    </fieldset>
    <button type="button" disabled={!!draft.pending || !draft.ready || draft.status === 'saving'} className="button-primary rounded-lg px-4 py-2 disabled:opacity-50" onClick={() => void finish()}>{inline ? 'Done editing' : 'Save & return to note'}</button>
  </section>;
}
