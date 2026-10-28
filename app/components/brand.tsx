import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`brand${compact ? " brand-compact" : ""}`} href="/" aria-label="GroundTruth home"><span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span><span>Ground<span className="brand-truth">Truth</span><span className="brand-period">.</span></span></Link>;
}
