'use client';
import { createContext,useContext,type ReactNode } from 'react';
export type RuntimeProfile={cloudDeployment:boolean;modelProvider:'meta'|'local'|'disabled'};
const Profile=createContext<RuntimeProfile>({cloudDeployment:true,modelProvider:'meta'});
export function RuntimeProfileProvider({profile,children}:{profile:RuntimeProfile;children:ReactNode}){return <Profile.Provider value={profile}>{children}</Profile.Provider>;}
export const useRuntimeProfile=()=>useContext(Profile);
