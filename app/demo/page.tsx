import Link from 'next/link';

export const metadata = {
  title: 'GroundTruth — Three-minute demo',
  description: 'Understand the code, practise independently, and give teachers evidence of the learning behind an AI-assisted project.',
};

const revision = 'b7e788a8';
const videoSrc = `/groundtruth-demo.mp4?v=${revision}`;
const captionsSrc = `/groundtruth-demo.vtt?v=${revision}`;

export default function Demo() {
  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px', fontSize: 18, lineHeight: 1.6 }}>
      <Link href="/login">GroundTruth →</Link>
      <h1 style={{ fontSize: 'clamp(28px,3vw,40px)', lineHeight: 1.2, margin: '20px 0' }}>
        Understand your code. Think in systems.
      </h1>
      <p>See a learner explore a real project, practise independently, and share their original work with a teacher.</p>
      <p style={{ color: '#657080' }}>2:58 · 1080p · English captions included</p>
      <video
        controls
        playsInline
        preload="metadata"
        poster={`/demo-poster.png?v=${revision}`}
        style={{ width: '100%', borderRadius: 16, background: '#182237' }}
      >
        <source src={videoSrc} type="video/mp4" />
        <track kind="captions" src={captionsSrc} srcLang="en" label="English" />
        Your browser does not support video. <a href={videoSrc}>Download the demo</a>.
      </video>
      <p>
        <a href={videoSrc}>Download video</a> · <a href={captionsSrc}>Download captions</a> ·{' '}
        <a href="https://github.com/KIREETI001/Ground-Truth">Source code and setup</a> ·{' '}
        <Link href="/login">Try GroundTruth</Link>
      </p>
      <p style={{ color: '#657080', fontSize: 16 }}>
        Edited walkthrough with real hosted captures, explanatory animation and synthetic demo accounts.
        Example attempts show the workflow; learning outcomes remain unmeasured. Meta Muse Spark supplies
        contextual guidance, while teachers review the original learner evidence.
      </p>
    </main>
  );
}
