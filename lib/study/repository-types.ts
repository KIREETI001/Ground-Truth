export const areas=['backend','frontend','data','testing','tooling','core'] as const;
export const areaNames:Record<typeof areas[number],string>={backend:'Backend',frontend:'Frontend',data:'Data & storage',testing:'Testing',tooling:'Tooling & automation',core:'Core logic'};
export type RepositoryFeature={id:string;area:typeof areas[number];title:string;summary:string;concepts:string[];filePaths:string[]};
export type RepositoryMap={id:string;repository:string;url:string;commit:string;summary:string;features:RepositoryFeature[];warnings:string[];sampledPaths:string[];catalogueCount:number;listedCount:number;expiresAt:string};
export type LearningPath={purpose:'improve'|'transfer';area:string;featureTitle:string;concepts:string[];transferGoal:string;mapId:string};
