import Link from "next/link";
import { ArrowLeft, MapPinOff } from "lucide-react";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center px-5"><div className="panel max-w-lg rounded-3xl p-8 text-center"><MapPinOff className="mx-auto h-8 w-8 text-blue-300" /><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">404</p><h1 className="mt-2 text-3xl font-semibold text-white">That workspace does not exist</h1><p className="mt-3 text-sm leading-6 text-slate-500">Return to the SaatCMS overview and continue from a known resource.</p><Link className="primary-button mt-6" href="/dashboard"><ArrowLeft className="h-4 w-4" />Back to overview</Link></div></main>;
}
