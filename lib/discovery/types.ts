export type DiscoveryFetcher = typeof fetch;
export type ProjectTree = {
  repository: string; url: string; commit: string;
  files: { path: string; language: string; size: number }[];
  truncated: boolean; warnings: string[];
};
export type RadarItem = { id: string; title: string; url: string; publishedAt: string; learningAngle: string; missionId: string };
export type RadarSource = { id: string; title: string; url: string; items: RadarItem[]; error: string | null };
export type RadarResult = { fetchedAt: string; sources: RadarSource[] };
