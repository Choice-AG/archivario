import {it,expect} from 'vitest';
import {demoLibrary} from '../src/features/library/infrastructure/demo';
import {applyCommand,activityId} from '../src/features/library/domain/model';
import {commandSchema} from '../src/features/library/application/validation';
import {sagaCompleted} from '../src/features/library/domain/sagas';
it('batch status and list are atomic and preserve unrelated data',()=>{
 const state=demoLibrary(),date='2026-09-30',now=date+'T12:00:00Z';
 const ids=state.games.slice(0,2).map(g=>g.id);
 const next=applyCommand(state,{type:'batch-status',gameIds:ids,status:'pendiente',date},now);
 expect(next.revision).toBe(state.revision+1);
 expect(next.runs.filter(r=>ids.includes(r.gameId)).every(r=>r.status==='pendiente')).toBe(true);
 expect(state.runs[0].status).toBe('jugando');
 expect(()=>applyCommand(state,{type:'batch-status',gameIds:[ids[0],'missing'],status:'pendiente',date},now)).toThrow();
 state.lists=[{id:'test',name:'Test',description:'',gameIds:[ids[0]]}];
 expect(applyCommand(state,{type:'batch-list',gameIds:ids,listId:'test'},now).lists?.[0].gameIds).toEqual(ids);
});
it('multi-game day updates selected notes and preserves other days and games',()=>{
 const state=demoLibrary(),g=state.games[0],date='2026-09-30';
 const item={gameId:g.id,runId:g.primaryRunId,note:'Una nota'};
 const next=applyCommand(state,commandSchema.parse({type:'save-day',date,items:[item]}),date+'T12:00:00Z');
 expect(next.activities.find(a=>a.id===activityId(g.id,date))?.note).toBe('Una nota');
 expect(next.activities.filter(a=>a.gameId!==g.id)).toEqual(state.activities.filter(a=>a.gameId!==g.id));
 expect(commandSchema.safeParse({type:'save-day',date,items:[item,item]}).success).toBe(false);
 expect(()=>applyCommand(state,{type:'save-day',date,items:[{...item,runId:'bad'}]},date+'T12:00:00Z')).toThrow();
});
it('completed alternate editions satisfy the same saga step',()=>{
 const state=demoLibrary();state.games[0].catalogId=99;state.runs[0].status='completado';
 expect(sagaCompleted(state,{catalogId:1,title:'Original',releaseDate:'',chapter:'',note:'',optional:false,alternatives:[{catalogId:99,title:'Remake'}]})).toBe(true);
});
