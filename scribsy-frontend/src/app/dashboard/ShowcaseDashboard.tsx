import Link from 'next/link';
import { AudioLines, ArrowLeft, CalendarDays, CheckCircle2, Clock3, FileText, Mic2, Sparkles, Users } from 'lucide-react';

const sampleNotes = [
  { label: 'Follow-up visit', type: 'SOAP note', status: 'Ready for review', time: 'Today · 10:24 AM' },
  { label: 'Annual wellness visit', type: 'SOAP note', status: 'Draft', time: 'Yesterday · 2:18 PM' },
  { label: 'Initial consultation', type: 'SOAP note', status: 'Completed', time: 'Monday · 11:42 AM' },
];

export default function ShowcaseDashboard() {
  return <div className="min-h-screen bg-[#f6f9f5] text-[#173d32]">
    <div className="border-b border-emerald-100 bg-[#e7f4e9] px-5 py-3 text-center text-xs font-semibold text-[#236b50]">
      Product preview · All information shown is sample data. No patient records are accessible.
    </div>
    <div className="mx-auto flex max-w-[1440px]">
      <aside className="hidden min-h-[calc(100vh-40px)] w-60 shrink-0 flex-col border-r border-[#e0ebe2] bg-white p-6 md:flex">
        <Link href="/" className="mb-12 flex items-center gap-2 text-xl font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#176d57] text-white"><AudioLines size={20}/></span>Scribsy<span className="-ml-2 text-[#71b593]">.</span></Link>
        <p className="mb-4 px-3 text-[10px] font-bold tracking-[.18em] text-[#9bb1a5]">WORKSPACE PREVIEW</p>
        <span className="flex items-center gap-3 rounded-xl bg-[#eaf5ed] px-3 py-3 text-sm font-semibold text-[#176d57]"><CalendarDays size={18}/> Dashboard</span>
        <span className="mt-2 flex items-center gap-3 px-3 py-3 text-sm text-[#81998b]"><FileText size={18}/> Notes</span>
        <span className="mt-2 flex items-center gap-3 px-3 py-3 text-sm text-[#81998b]"><Users size={18}/> Patients</span>
        <div className="mt-auto rounded-xl bg-[#f1f8f1] p-4"><Sparkles size={18} className="mb-3 text-[#398d69]"/><p className="text-sm font-semibold">A look inside Scribsy</p><p className="mt-1 text-xs leading-5 text-[#748a7a]">Explore the layout with illustrative data.</p></div>
      </aside>
      <main className="w-full min-w-0 px-5 py-9 sm:px-9 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4"><div><Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-[#398669] hover:underline"><ArrowLeft size={14}/> Back to Scribsy</Link><p className="text-xs font-bold uppercase tracking-[.18em] text-[#4a9473]">Your workspace</p><h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Good morning, clinician.</h1><p className="mt-3 text-sm text-[#778d7f]">Here is what a day with Scribsy could look like.</p></div><span className="rounded-full border border-[#cce5d3] bg-white px-4 py-2 text-xs font-semibold text-[#398669]">Sample dashboard</span></div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[{icon:FileText,label:'Notes drafted',value:'12',caption:'Sample activity'},{icon:Clock3,label:'Awaiting review',value:'03',caption:'Ready for your eyes'},{icon:CheckCircle2,label:'Completed notes',value:'09',caption:'In this example'}].map(item=><div key={item.label} className="rounded-2xl border border-[#e1ebe2] bg-white p-6 shadow-sm"><span className="mb-7 grid h-10 w-10 place-items-center rounded-xl bg-[#eaf6ec] text-[#25815f]"><item.icon size={20}/></span><p className="text-sm text-[#6e8678]">{item.label}</p><div className="mt-2 flex items-end justify-between"><strong className="font-serif text-4xl font-normal">{item.value}</strong><span className="text-xs text-[#96aa9d]">{item.caption}</span></div></div>)}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <section className="rounded-2xl border border-[#e1ebe2] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#edf2ed] px-6 py-5"><div><h2 className="font-serif text-2xl">Recent notes</h2><p className="mt-1 text-xs text-[#8ca092]">A glimpse of the review workflow</p></div><FileText size={20} className="text-[#72a98c]"/></div><div className="divide-y divide-[#edf2ed]">{sampleNotes.map(note=><div key={note.label} className="flex flex-wrap items-center gap-4 px-6 py-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eff7ef] text-[#328363]"><FileText size={19}/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{note.label}</h3><p className="mt-1 text-xs text-[#91a497]">{note.type} · {note.time}</p></div><span className="rounded-full bg-[#eaf5ee] px-3 py-1 text-[11px] font-semibold text-[#317e5b]">{note.status}</span></div>)}</div></section>
            <section className="overflow-hidden rounded-2xl bg-[#155d49] p-7 text-white shadow-sm"><div className="mb-10 grid h-12 w-12 place-items-center rounded-xl bg-white/15"><Mic2 size={24}/></div><p className="text-xs font-bold tracking-[.17em] text-[#a7dec0]">FROM AUDIO TO NOTE</p><h2 className="mt-4 font-serif text-3xl leading-tight">More presence.<br/>Less paperwork.</h2><p className="mt-4 text-sm leading-7 text-[#c5e3d1]">Capture a visit, generate a structured draft, and review it before it enters your workflow.</p><div className="mt-10 flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-4 text-xs"><Sparkles size={17} className="shrink-0 text-[#b9edcb]"/> Preview only · Recording is unavailable here</div></section>
          </div>
        </div>
      </main>
    </div>
  </div>;
}
