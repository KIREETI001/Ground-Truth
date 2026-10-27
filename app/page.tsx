import { ArrowDown, ArrowRight, Braces, Check, ChevronRight, Database, FlaskConical, GitCompareArrows, LockKeyhole, MoveUpRight, ScanLine, Sparkles } from "lucide-react";
import { Brand } from "./components/brand";

export default function Home() {
  return (
    <div className="landing">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header">
        <Brand />
        <nav aria-label="Main navigation" className="site-nav">
          <a href="#how-it-works">How it works</a>
          <a href="#the-lab">The lab</a>
          <a className="button button-small button-dark" href="/workspace">Open the lab <ArrowRight size={15} /></a>
        </nav>
      </header>
      <main id="main">
        <section className="hero section-shell">
          <div className="hero-copy">
            <div className="eyebrow"><span className="status-dot" /> A little less guesswork. A lot more understanding.</div>
            <h1>You built it.<br />Now, <em>understand it.</em></h1>
            <p className="hero-lede">AI can help you write the code. GroundTruth helps you make sense of what it actually does.</p>
            <p className="hero-description">Predict what a small app will save. Run a real test, follow the evidence, and put your explanation to the test.</p>
            <div className="hero-actions"><a className="button button-primary" href="/workspace">Open the lab <ArrowRight size={18} /></a><a className="text-link" href="#how-it-works">Take a closer look <ArrowDown size={15} /></a></div>
            <div className="hero-footnote"><span><FlaskConical size={14} /> One focused learning lab</span><span><LockKeyhole size={14} /> Synthetic data only</span></div>
          </div>
          <div className="hero-instrument" aria-label="A preview of the method: prediction, real execution, and evidence. No test has been run in this illustration.">
            <div className="instrument-top"><span><span className="status-dot" /> THE VERIFICATION WORKBENCH</span><Braces size={17} /></div>
            <div className="instrument-question"><span className="mono-label">01 / YOUR STARTING POINT</span><h2>“What will this<br />app actually save?”</h2><div className="prediction-token"><span>Your prediction</span><strong>?</strong><span>registrations</span></div></div>
            <div className="instrument-connector"><span /><ArrowDown size={17} /><span /></div>
            <div className="instrument-code"><div><span className="code-dot" /><span className="code-dot" /><span className="code-dot" /><span>inspect the supplied code</span></div><pre><code><span className="code-muted">{"// A question worth investigating"}</span>{"\n"}<span className="code-accent">await</span>{" sendSignup();\n"}<span className="code-muted">{"// The response is interrupted.\n// What happens on the next attempt?"}</span></code></pre></div>
            <div className="instrument-bottom"><Database size={18} /><span>Let the saved records tell the story.</span><MoveUpRight size={16} /></div>
            <div className="instrument-note"><ScanLine size={15} /> METHOD PREVIEW · NO EXECUTED RESULTS</div>
          </div>
        </section>
        <div className="principle-strip"><span>YOUR PREDICTION</span><span className="strip-line" /><span>REAL EXECUTION</span><span className="strip-line" /><span>YOUR EXPLANATION</span><span className="strip-line" /><span>A FRESH TEST</span></div>
        <section id="how-it-works" className="method-section section-shell">
          <div className="section-heading"><div><p className="eyebrow">A SMALL SHIFT IN HOW YOU LEARN</p><h2>From “it works”<br />to <em>“I know why.”</em></h2></div><p>Slow down at the interesting part. Make your thinking visible, then see how it holds up against what really happened.</p></div>
          <div className="method-grid">
            <article><span className="method-number">01</span><Braces /><h3>Make a prediction.</h3><p>Read the app’s source. Decide what you expect the client and database to do, and explain why.</p></article>
            <article><span className="method-number">02</span><FlaskConical /><h3>Run the experiment.</h3><p>Send real HTTP requests through a supplied app. Inspect its recorded responses and persisted registrations.</p></article>
            <article><span className="method-number">03</span><ScanLine /><h3>Follow the evidence.</h3><p>Compare your prediction with the request trace. Build an explanation that points to specific records.</p></article>
            <article><span className="method-number">04</span><GitCompareArrows /><h3>Test your understanding.</h3><p>Apply a reviewed change, predict again, then investigate a fresh case independently.</p></article>
          </div>
        </section>
        <section id="the-lab" className="lab-section section-shell">
          <div className="lab-feature"><div className="lab-feature-top"><span className="tag tag-light">LAB 001</span><span className="mono-label">CAMPUS EVENT SIGNUP</span></div><div className="event-illustration"><div className="event-calendar"><span>THU</span><strong>12</strong><span>NOVEMBER</span></div><div><span className="tag tag-teal">SYNTHETIC CAMPUS APP</span><h3>One signup.<br />A second attempt.</h3><p>Does the screen tell the whole story?</p></div></div><div className="lab-feature-foot"><span><Check size={15} /> Read the source</span><span><Check size={15} /> Inspect the records</span><span><Check size={15} /> Keep your work</span></div></div>
          <div className="lab-copy"><p className="eyebrow">ONE APP. A FEW REVEALING QUESTIONS.</p><h2>A small signup app.<br /><em>A useful rabbit hole.</em></h2><p>A disabled button, an interrupted response, and another attempt to sign up. Explore the gap between what a user sees and what an app saves.</p><p>This ungraded, moderated pilot is designed for about 20–30 minutes. You’ll use synthetic campus events and attendees, with a saved record you can export or print.</p><a href="/workspace" className="text-link">Step into the lab <ArrowRight size={17} /></a></div>
        </section>
        <section className="boundary-section section-shell"><div><Sparkles size={22} /><h3>A prompt when it helps.<br />Space to think when it matters.</h3><p>Optional investigation questions can help you choose another test. They are clearly separated from executed evidence. The independent case is completed without AI coaching.</p></div><div><LockKeyhole size={22} /><h3>A focused lab,<br />with clear boundaries.</h3><p>GroundTruth executes supplied app variants and reviewed patches. It does not run arbitrary code or assess production readiness. Your tutor reviews your work; the model does not grade it.</p></div></section>
        <section className="closing-section section-shell"><p className="eyebrow">UNDERSTANDING LEAVES A TRACE.</p><h2>Bring your curiosity.<br /><em>Leave with evidence.</em></h2><a href="/workspace" className="button button-primary">Open the lab <ChevronRight size={18} /></a><p>Native ChatGPT sign-in and a moderator’s pilot code are required.</p></section>
      </main>
      <footer className="site-footer section-shell"><Brand /><p>Make a claim. Follow the evidence.</p><a href="/workspace">Enter the workbench <ArrowRight size={14} /></a></footer>
    </div>
  );
}
