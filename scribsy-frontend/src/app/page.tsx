import Link from "next/link";
import { ArrowRight, AudioLines, Check, ChevronRight, ClipboardCheck, FileText, LockKeyhole, Menu, Mic2, PenLine, Sparkles } from "lucide-react";
import styles from "./landing.module.css";

const steps = [
  { number: "01", icon: Mic2, title: "Capture the visit", text: "Record the conversation or upload audio after the appointment." },
  { number: "02", icon: Sparkles, title: "Get a structured draft", text: "Turn the transcript into an organized SOAP note you can work from." },
  { number: "03", icon: PenLine, title: "Make it yours", text: "Review, refine, and export the note when it is ready." },
];

function Brand() {
  return <Link href="/" className={styles.brand} aria-label="Scribsy home"><span className={styles.brandMark}><AudioLines size={20} strokeWidth={2.5}/></span><span>Scribsy<span className={styles.brandDot}>.</span></span></Link>;
}

export default function Home() {
  return <div className={styles.site}>
    <header className={styles.header}><div className={styles.navInner}>
      <Brand/>
      <nav className={styles.desktopNav} aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#features">Why Scribsy</a><Link href="/contact">Contact</Link></nav>
      <div className={styles.navActions}>{/* Login hidden while Scribsy is a showcase. */}<Link href="/dashboard" className={styles.navCta}>View dashboard <ArrowRight size={16}/></Link></div>
      <details className={styles.mobileMenu}><summary aria-label="Open menu"><Menu size={23}/></summary><nav aria-label="Mobile navigation"><a href="#how-it-works">How it works</a><a href="#features">Why Scribsy</a><Link href="/contact">Contact</Link><Link href="/dashboard">View dashboard</Link></nav></details>
    </div></header>
    <main>
      <section className={styles.hero}><div className={styles.heroGlow} aria-hidden="true"/><div className={styles.heroInner}>
        <div className={styles.heroCopy}><span className={styles.eyebrow}><span className={styles.eyebrowDot}/> THE AI SCRIBE FOR CLINICIANS</span>
          <h1>Be with your patient.<br/><em>We&apos;ll help with the note.</em></h1>
          <p className={styles.heroLead}>Scribsy turns visit audio into a structured clinical draft, giving you a simpler path from conversation to documentation.</p>
          <div className={styles.heroActions}><Link href="/dashboard" className={styles.primaryButton}>Explore the dashboard <ArrowRight size={18}/></Link><a href="#how-it-works" className={styles.textButton}>See how it works <ChevronRight size={18}/></a></div>
          <p className={styles.heroNote}><Check size={16}/> You review and finalize every note.</p>
        </div>
        <div className={styles.previewWrap} aria-label="Illustration of a Scribsy SOAP note draft">
          <div className={styles.previewCard}>
            <div className={styles.previewTop}><div className={styles.previewLogo}><AudioLines size={17}/> <span>scribsy</span></div><span className={styles.previewBadge}><span/> Draft note</span></div>
            <div className={styles.previewHeading}><div><span className={styles.previewOverline}>VISIT DOCUMENTATION</span><h2>Clinical note</h2></div><span className={styles.previewIcon}><FileText size={18}/></span></div>
            <div className={styles.previewDivider}/>
            {[
              ["S", "Subjective", "Patient reports symptoms and relevant history from the visit conversation."],
              ["O", "Objective", "Document observed findings and clinical details."],
              ["A", "Assessment", "Review the working clinical impression."],
              ["P", "Plan", "Refine next steps before finalizing."],
            ].map(([letter, title, copy]) => <div className={styles.noteSection} key={letter}><span className={styles.noteLetter}>{letter}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}
            <div className={styles.previewBottom}><span><LockKeyhole size={13}/> Your workspace</span><span>Review before export <ArrowRight size={13}/></span></div>
          </div>
          <div className={styles.audioPill}><span className={styles.audioIcon}><Mic2 size={17}/></span><span><strong>Visit audio</strong><small>Ready to transcribe</small></span><span className={styles.wave} aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></span></div>
          <div className={styles.sparkle} aria-hidden="true"><Sparkles size={22}/></div>
        </div>
      </div><div className={styles.heroFooter}><span>LESS TIME FORMATTING</span><span className={styles.footerLine}/><span>MORE ROOM TO FOCUS</span></div></section>
      <section id="how-it-works" className={styles.processSection}><div className={styles.sectionInner}>
        <div className={styles.sectionIntro}><span className={styles.kicker}>A CLEARER WAY TO CHART</span><h2>From conversation to note,<br/><em>in three simple steps.</em></h2><p>Keep your focus on the encounter. Scribsy helps organize the documentation that follows.</p></div>
        <div className={styles.steps}>{steps.map(step => <div className={styles.step} key={step.number}><span className={styles.stepNumber}>{step.number}</span><span className={styles.stepIcon}><step.icon size={24} strokeWidth={1.8}/></span><h3>{step.title}</h3><p>{step.text}</p></div>)}</div>
      </div></section>
      <section id="features" className={styles.featureSection}><div className={styles.featureInner}>
        <div className={styles.featureCopy}><span className={styles.kicker}>BUILT FOR THE MOMENTS THAT MATTER</span><h2>Documentation that<br/>moves with you.</h2><p>A clinical workflow should make room for your judgment. Scribsy gives you a starting point and keeps the final word in your hands.</p><Link href="/dashboard" className={styles.featureLink}>Explore Scribsy <ArrowRight size={18}/></Link></div>
        <div className={styles.featureList}>
          <div><span className={styles.featureIcon}><AudioLines size={21}/></span><div><h3>Audio to transcript</h3><p>Bring visit audio into a readable transcript.</p></div></div>
          <div><span className={styles.featureIcon}><FileText size={21}/></span><div><h3>Structured SOAP notes</h3><p>Organize information into familiar clinical sections.</p></div></div>
          <div><span className={styles.featureIcon}><ClipboardCheck size={21}/></span><div><h3>Review before export</h3><p>Edit your draft and decide when it is ready to use.</p></div></div>
        </div>
      </div></section>
      <section className={styles.ctaSection}><div className={styles.ctaInner}><span className={styles.kicker}>TAKE A LOOK INSIDE</span><h2>Let the visit come first.</h2><p>See how Scribsy brings documentation into focus.</p><Link href="/dashboard" className={styles.lightButton}>View the dashboard <ArrowRight size={18}/></Link></div></section>
    </main>
    <footer className={styles.footer}><div className={styles.footerInner}><Brand/><p>Clinical documentation, with room for care.</p><div><Link href="/contact">Contact</Link><Link href="/dashboard">Dashboard preview</Link></div><span className={styles.copyright}>© {new Date().getFullYear()} Scribsy</span></div></footer>
  </div>;
}
