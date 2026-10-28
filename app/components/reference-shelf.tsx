'use client';

import { createContext, Fragment, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronRight, Code2, Search } from 'lucide-react';
import { referenceLanguages, referenceNotes, type ReferenceNote } from '@/lib/learning/reference';
import { parseReferenceMarkdown, referenceLink, type ReferenceBlock } from '@/lib/learning/reference-markdown';
import { SiteNav } from './site-nav';

const ReferenceNavigation = createContext<((href: string) => void) | null>(null);

function Inline({ text, language }: { text: string; language: string }) {
  const navigate = useContext(ReferenceNavigation);
  return <>{text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}><Inline text={part.slice(2, -2)} language={language} /></strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = referenceLink(link[2], language);
      if (!href) return <Fragment key={index}>{link[1]}</Fragment>;
      if (href.startsWith('https:')) return <a key={index} href={href} target="_blank" rel="noreferrer">{link[1]}<ArrowUpRight size={13} aria-label="external" /></a>;
      return href.startsWith('#') ? <a key={index} href={href}>{link[1]}</a> : <Link key={index} href={href} onClick={event => { if (navigate) { event.preventDefault(); navigate(href); } }}>{link[1]}</Link>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  })}</>;
}

function NoteBlock({ block, language }: { block: ReferenceBlock; language: string }) {
  if (block.kind === 'heading') {
    const Heading = block.depth <= 2 ? 'h2' : 'h3';
    return <Heading id={block.id}><Inline text={block.text} language={language} /></Heading>;
  }
  if (block.kind === 'code') return <div className="reference-code"><span>{block.language || 'Example'}</span><pre tabIndex={0}><code>{block.text}</code></pre></div>;
  if (block.kind === 'rule') return <hr />;
  if (block.kind === 'quote') return <blockquote><Inline text={block.text} language={language} /></blockquote>;
  if (block.kind === 'list') { const List = block.ordered ? 'ol' : 'ul'; return <List>{block.items.map((item, index) => <li key={index}><Inline text={item} language={language} /></li>)}</List>; }
  if (block.kind === 'table') return <div className="reference-table" tabIndex={0}><table><thead><tr>{block.rows[0]?.map((cell, index) => <th key={index}><Inline text={cell} language={language} /></th>)}</tr></thead><tbody>{block.rows.slice(1).map((row, index) => <tr key={index}>{row.map((cell, col) => <td key={col}><Inline text={cell} language={language} /></td>)}</tr>)}</tbody></table></div>;
  return <p><Inline text={block.text} language={language} /></p>;
}

export function ReferenceShelf({ initialLanguage = 'javascript', initialSlug = 'README' }: { initialLanguage?: string; initialSlug?: string }) {
  const initialNote = referenceNotes.find(item => item.language === initialLanguage && item.slug === initialSlug) ?? referenceNotes.find(item => item.language === 'javascript' && item.slug === 'README')!;
  const [note, setNote] = useState<ReferenceNote>(initialNote);
  const language = note.language;
  const [query, setQuery] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(note.url, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('This note could not be loaded.');
      const text = await response.text();
      if (text.length > 200_000 || /^\s*<!doctype html/i.test(text)) throw new Error('This note is unavailable.');
      if (!controller.signal.aborted) { setContent(text); setLoading(false); }
    }).catch(cause => { if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : 'This note could not be loaded.'); setLoading(false); } });
    return () => controller.abort();
  }, [note, reload]);
  const blocks = useMemo(() => parseReferenceMarkdown(content), [content]);
  const topics = referenceNotes.filter(item => item.language === language && `${item.title} ${item.keywords}`.toLowerCase().includes(query.toLowerCase()));
  function selectNote(next: ReferenceNote) {
    setLoading(true); setError(''); setContent(''); setNote(next);
    window.history.replaceState(null, '', `/learn/library?language=${next.language}&note=${next.slug}`);
    requestAnimationFrame(() => document.getElementById('reference-note')?.focus());
  }
  return <div className="learning-app reference-app"><a className="skip-link" href="#reference-main">Skip to reference</a><SiteNav current="learn" /><main className="reference-shell" id="reference-main"><Link className="text-link" href="/learn"><ArrowLeft size={17} />Back to practice</Link><div className="reference-title"><div><p className="section-kicker"><BookOpen size={17} />The reference shelf</p><h1>Look it up. Try it out.</h1><p>Seven languages. Find a concept, read an example, then return to your practice.</p></div><span className="reference-count">100 supplied notes</span></div><div className="reference-notice"><Code2 size={21} /><p><strong>Reference notes, separate from assessed practice.</strong> These are the supplied language guides. Their examples and version claims have not all been validated. GroundTruth currently has guided JavaScript and SQL web-app missions.</p></div><div className="reference-layout"><aside className="reference-sidebar"><label htmlFor="reference-language">Language</label><select id="reference-language" value={language} onChange={event => { const next = referenceNotes.find(item => item.language === event.target.value && item.slug === 'README'); if (next) selectNote(next); }}>{referenceLanguages.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}{language === 'overview' && <option value="overview">Overview</option>}</select><label className="reference-search" htmlFor="reference-search"><Search size={18} /><input id="reference-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a topic" type="search" /></label><nav aria-label="Reference topics">{topics.map(item => <button key={item.slug} aria-current={note.url === item.url ? 'page' : undefined} onClick={() => selectNote(item)}>{item.title}<ChevronRight size={16} /></button>)}{topics.length === 0 && <p>No matching topics in this language. Try another search or language.</p>}</nav><button className="text-link reference-overview" onClick={() => selectNote(referenceNotes.find(item => item.language === 'overview')!)}>About the supplied collection</button></aside><article className="reference-note" id="reference-note" tabIndex={-1} aria-busy={loading}><div className="reference-note-meta"><span>{referenceLanguages.find(item => item.id === note.language)?.label ?? 'Overview'}</span><span>Supplied reference · {note.slug === 'README' ? 'Language overview' : note.slug.replace(/_/g, ' ')}</span></div>{loading ? <p role="status">Opening your note…</p> : error ? <div role="alert"><h2>Let’s try that again.</h2><p>{error}</p><button className="button button-primary" onClick={() => { setLoading(true); setError(''); setContent(''); setReload(value => value + 1); }}>Reload note</button></div> : <ReferenceNavigation.Provider value={href => { const params = new URL(href, window.location.origin).searchParams; const next = referenceNotes.find(item => item.language === params.get('language') && item.slug === params.get('note')); if (next) selectNote(next); }}>{blocks.map((block, index) => <NoteBlock key={`${note.url}-${index}`} block={block} language={note.language} />)}</ReferenceNavigation.Provider>}<Link className="button button-outline reference-back" href="/learn">Put a concept into practice <ChevronRight size={18} /></Link></article></div></main></div>;
}
