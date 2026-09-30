// @vitest-environment jsdom
import { act,renderHook,waitFor,cleanup } from '@testing-library/react';
import { afterEach,it,expect,vi } from 'vitest';
import { useLibrary } from '../src/features/library/presentation/use-library';
import type { User } from 'firebase/auth';
import { demoLibrary } from '../src/features/library/infrastructure/demo';
import { applyCommand } from '../src/features/library/domain/model';
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
it('undo restores a deleted game including runs, activity and list order',async()=>{
 const s=demoLibrary(),g=s.games[0];s.lists=[{id:'list',name:'Viajes',description:'',gameIds:[g.id]}];localStorage.setItem('archivario-demo-v1',JSON.stringify(s));
 const {result}=renderHook(()=>useLibrary(null));await waitFor(()=>expect(result.current.ready).toBe(true));
 await act(()=>result.current.execute({type:'delete-game',id:g.id}));expect(result.current.state.games.some(x=>x.id===g.id)).toBe(false);expect(result.current.canUndo).toBe(true);
 await act(()=>result.current.undo());expect(result.current.state.games).toEqual(s.games);expect(result.current.state.runs).toEqual(s.runs);expect(result.current.state.activities).toEqual(s.activities);expect(result.current.state.lists).toEqual(s.lists);expect(result.current.canUndo).toBe(false);
});
it('undo is invalidated when another device changes the revision',async()=>{
 let server=demoLibrary();const user={getIdToken:async()=> 'test'} as unknown as User;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{if(init?.method==='POST'){const body=JSON.parse(init.body as string);server=applyCommand(server,body.command,new Date().toISOString());}return {ok:true,json:async()=>structuredClone(server)};}));
 const {result}=renderHook(()=>useLibrary(user));await waitFor(()=>expect(result.current.ready).toBe(true));
 await act(()=>result.current.execute({type:'profile',profile:{...server.profile,name:'Local'}}));expect(result.current.canUndo).toBe(true);
 server={...server,revision:server.revision+1,profile:{...server.profile,name:'Otro dispositivo'}};await act(()=>result.current.reload());expect(result.current.canUndo).toBe(false);
 await act(()=>result.current.undo());expect(result.current.state.profile.name).toBe('Otro dispositivo');
});
