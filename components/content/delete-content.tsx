"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { deleteContentAction } from "@/lib/content/actions";
import type { ContentMutationState } from "@/lib/content/model";

const initialState: ContentMutationState = { status: "idle" };

export function DeleteContent({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteContentAction, initialState);

  return (
    <>
      <button className="secondary-button !border-rose-400/20 !text-rose-200" type="button" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Delete
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#020711]/80 p-4 backdrop-blur-sm" role="presentation">
          <div className="panel w-full max-w-lg rounded-2xl p-5 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="delete-content-title">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-400/15 bg-rose-400/[0.07]"><AlertTriangle className="h-5 w-5 text-rose-300" /></div>
                <div>
                  <h2 id="delete-content-title" className="text-lg font-semibold text-white">Delete “{title}”?</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Only leaf content can be deleted. This will never recursively delete Seasons or Episodes.</p>
                </div>
              </div>
              <button className="rounded-lg p-1 text-slate-500 hover:text-white" type="button" onClick={() => setOpen(false)} aria-label="Close delete confirmation"><X className="h-5 w-5" /></button>
            </div>
            {state.errors?.form && (
              <div className="mt-5 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-4" role="alert">
                <p className="font-mono text-xs text-rose-300">{state.errorCode}</p>
                <p className="mt-1.5 text-sm leading-6 text-rose-100/75">{state.errors.form}</p>
              </div>
            )}
            <form action={action} className="mt-6 flex flex-wrap justify-end gap-3">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="confirm" value="yes" />
              <button className="secondary-button" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="primary-button !border-rose-400/30 !bg-none !bg-rose-600" type="submit" disabled={pending}>
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {pending ? "Deleting…" : "Delete leaf permanently"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
