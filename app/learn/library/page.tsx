import { ReferenceShelf } from '../../components/reference-shelf';
import '../../reference.css';

export default async function ReferenceLibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const language = typeof params.language === 'string' ? params.language : 'javascript';
  const slug = typeof params.note === 'string' ? params.note : 'README';
  return <ReferenceShelf key={`${language}-${slug}`} initialLanguage={language} initialSlug={slug} />;
}
