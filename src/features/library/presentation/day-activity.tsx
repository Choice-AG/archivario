"use client";
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Cover,type Execute} from './app';
import {MultiGameDay} from './multi-game-day';
import {ActivityForm} from './forms';
import type {Activity,Library} from '../domain/model';
export function DayActivity({state,date,initial,gameId,execute,onGame}:{state:Library;date:string;initial?:Activity;gameId?:string;execute:Execute;onGame:(id:string)=>void}){
 const [multiple,setMultiple]=useState(false);
 const [day,setDay]=useState(initial?.date??date),[editor,setEditor]=useState<{activity?:Activity;gameId?:string}|undefined>(initial||gameId?{activity:initial,gameId}:undefined);
 const activities=state.activities.filter(a=>a.date===day).sort((a,b)=>(state.games.find(g=>g.id===a.gameId)?.title??'').localeCompare(state.games.find(g=>g.id===b.gameId)?.title??''));
 return <div className="day-activity"><label>Día del desglose<input aria-label="Día del desglose" type="date" value={day} onChange={e=>{if(e.target.value){setDay(e.target.value);setEditor(undefined);setMultiple(false);}}}/></label><div className="section-header"><h3>{activities.length} {activities.length===1?'juego registrado':'juegos registrados'}</h3><Button variant="secondary" onClick={()=>setEditor({})}>Añadir juego al día</Button></div>
 <Button variant="secondary" onClick={()=>{setMultiple(true);setEditor(undefined);}}>Registrar varios juegos</Button>{multiple&&<MultiGameDay key={day} state={state} date={day} execute={execute} onDone={()=>setMultiple(false)}/>}<div className="day-games">{activities.map(a=>{const g=state.games.find(g=>g.id===a.gameId);if(!g)return null;const run=state.runs.find(r=>r.id===a.runId);return <article className="day-game" key={a.id}><button className="day-game-cover" aria-label={'Abrir '+g.title} onClick={()=>onGame(g.id)}><Cover game={g}/></button><div><button className="game-title" onClick={()=>onGame(g.id)}>{g.title}</button><p className="muted">{run?run.label+' · '+run.platform:'Sin partida asociada'}</p><p className="game-prose">{a.note||'Sin nota para este día.'}</p><Button variant="ghost" onClick={()=>setEditor({activity:a})}>Editar actividad de {g.title}</Button></div></article>;})}</div>
 {!activities.length&&<p className="info-note">Todavía no has registrado juegos este día.</p>}
 {editor&&<section className="day-editor"><div className="section-header"><h3>{editor.activity?'Editar actividad':'Registrar otro juego'}</h3><Button variant="ghost" onClick={()=>setEditor(undefined)}>Cancelar edición</Button></div><ActivityForm key={day+':'+(editor.activity?.id??editor.gameId??'new')} state={state} date={day} initial={editor.activity} gameId={editor.gameId} execute={async command=>{await execute(command);if(command.type==='save-activity')setDay(command.activity.date);}} onClose={()=>setEditor(undefined)}/></section>}
 </div>;
}
