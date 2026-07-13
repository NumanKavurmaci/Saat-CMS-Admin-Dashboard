"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, LoaderCircle, RefreshCw, Save } from "lucide-react";
import { createContentAction, updateContentAction } from "@/lib/content/actions";
import {
  contentParentType,
  contentTypes,
  videoQualities,
  type ContentFormValues,
  type ContentMutationState,
  type ContentParentOption,
} from "@/lib/content/model";
import type { ContentType } from "@/lib/types";

const initialActionState: ContentMutationState = { status: "idle" };

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1.5 text-xs text-rose-300">{message}</p> : null;
}

function InheritHint() {
  return <span className="mt-1.5 block text-xs leading-5 text-slate-600">Leave blank to inherit the closest parent value.</span>;
}

export function ContentForm({
  mode,
  initialValues,
  contentId,
  etag,
  seriesParents,
  seasonParents,
}: {
  mode: "create" | "edit";
  initialValues: ContentFormValues;
  contentId?: string;
  etag?: string | null;
  seriesParents: ContentParentOption[];
  seasonParents: ContentParentOption[];
}) {
  const action = mode === "create" ? createContentAction : updateContentAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [type, setType] = useState<ContentType>(initialValues.type);
  const [parentId, setParentId] = useState(initialValues.parentId);
  const [geoOverride, setGeoOverride] = useState(initialValues.geoBlockCountriesOverride);
  const parentType = contentParentType(type);
  const parentOptions = useMemo(
    () => type === "SEASON" ? seriesParents : type === "EPISODE" ? seasonParents : [],
    [seasonParents, seriesParents, type],
  );

  function changeType(nextType: ContentType) {
    setType(nextType);
    setParentId("");
  }

  return (
    <form action={formAction} className="space-y-5">
      {contentId && <input type="hidden" name="id" value={contentId} />}
      {etag && <input type="hidden" name="etag" value={etag} />}
      {mode === "edit" && <input type="hidden" name="type" value={type} />}

      {state.errors?.form && (
        <div className={`rounded-2xl border p-4 ${state.conflict ? "border-amber-400/20 bg-amber-400/[0.06]" : "border-rose-400/20 bg-rose-400/[0.06]"}`} role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${state.conflict ? "text-amber-300" : "text-rose-300"}`} />
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold tracking-wide text-slate-300">{state.errorCode ?? "CONTENT_REQUEST_FAILED"}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{state.errors.form}</p>
              {state.requestId && <p className="mt-2 font-mono text-[0.68rem] text-slate-600">Request {state.requestId}</p>}
              {state.conflict && (
                <Link className="secondary-button mt-3" href={`/content/${encodeURIComponent(contentId ?? "")}`}>
                  <RefreshCw className="h-4 w-4" /> Reload latest version
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="panel rounded-2xl p-5 sm:p-6">
        <div className="border-b border-[var(--border)] pb-4">
          <h2 className="text-lg font-semibold text-white">Identity and hierarchy</h2>
          <p className="mt-1 text-sm text-slate-500">Content type controls where this record may live in the catalog.</p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Content type</span>
            {mode === "create" ? (
              <select className="field" name="type" value={type} onChange={(event) => changeType(event.target.value as ContentType)}>
                {contentTypes.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            ) : (
              <div className="field cursor-not-allowed text-slate-400" aria-label="Content type">{type} <span className="ml-1 text-xs text-slate-600">(immutable)</span></div>
            )}
            <FieldError message={state.errors?.type} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
            <input className="field" name="title" defaultValue={initialValues.title} required aria-invalid={Boolean(state.errors?.title)} />
            <FieldError message={state.errors?.title} />
          </label>
          {parentType && (
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-300">{parentType === "SERIES" ? "Series" : "Season"} parent</span>
              <input
                className="field"
                name="parentId"
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                list={`content-${parentType.toLowerCase()}-parents`}
                placeholder={`Choose or enter a ${parentType.toLowerCase()} ID`}
                required
                aria-label={`${parentType === "SERIES" ? "Series" : "Season"} parent`}
                aria-invalid={Boolean(state.errors?.parentId)}
              />
              <datalist id={`content-${parentType.toLowerCase()}-parents`}>
                {parentOptions.map((parent) => <option key={parent.id} value={parent.id}>{parent.title}</option>)}
              </datalist>
              <span className="mt-1.5 block text-xs leading-5 text-slate-600">
                {parentOptions.length} matching {parentType.toLowerCase()} records loaded. You can also paste an exact ID.
              </span>
              <FieldError message={state.errors?.parentId} />
            </label>
          )}
        </div>
      </section>

      <section className="panel rounded-2xl p-5 sm:p-6">
        <div className="border-b border-[var(--border)] pb-4">
          <h2 className="text-lg font-semibold text-white">Metadata overrides</h2>
          <p className="mt-1 text-sm text-slate-500">Blank values inherit independently from the closest parent.</p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Parental rating</span>
            <input className="field" name="parentalRating" defaultValue={initialValues.parentalRating} placeholder="e.g. 16+" />
            <InheritHint />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Genre</span>
            <input className="field" name="genre" defaultValue={initialValues.genre} placeholder="e.g. Space Adventure" />
            <InheritHint />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Quality</span>
            <select className="field" name="quality" defaultValue={initialValues.quality}>
              <option value="">Inherit</option>
              {videoQualities.map((quality) => <option key={quality} value={quality}>{quality.replace("_", " ")}</option>)}
            </select>
            <FieldError message={state.errors?.quality} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Premium</span>
            <select className="field" name="premium" defaultValue={initialValues.premium}>
              <option value="inherit">Inherit</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <FieldError message={state.errors?.premium} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-300">Playback URL</span>
            <input className="field font-mono text-sm" name="playbackUrl" defaultValue={initialValues.playbackUrl} placeholder="Protected CMS-only asset URL" />
            <span className="mt-1.5 block text-xs leading-5 text-slate-600">This protected value is never included in the public metadata preview.</span>
          </label>
        </div>
      </section>

      <section className="panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <input
            id="geoBlockCountriesOverride"
            className="mt-1 h-4 w-4 accent-blue-500"
            type="checkbox"
            name="geoBlockCountriesOverride"
            checked={geoOverride}
            onChange={(event) => setGeoOverride(event.target.checked)}
            aria-label="Override geo-block countries here"
          />
          <label htmlFor="geoBlockCountriesOverride">
            <span className="block font-medium text-slate-200">Override geo-block countries here</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">Enabled with an empty list intentionally clears inherited country blocks.</span>
          </label>
        </div>
        {geoOverride && (
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Blocked countries</span>
            <textarea className="field min-h-24 resize-y uppercase" name="geoBlockCountries" defaultValue={initialValues.geoBlockCountries} placeholder="TR, DE, US" aria-label="Blocked countries" />
            <span className="mt-1.5 block text-xs leading-5 text-slate-600">Comma or space separated ISO alpha-2 codes. Leave empty to override with no blocked countries.</span>
            <FieldError message={state.errors?.geoBlockCountries} />
          </label>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="secondary-button" href={contentId ? `/content/${encodeURIComponent(contentId)}` : "/content"}>
          <ArrowLeft className="h-4 w-4" /> Cancel
        </Link>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Saving…" : mode === "create" ? "Create content" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
