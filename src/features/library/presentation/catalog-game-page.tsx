"use client";
import {useEffect,useState} from 'react';
import {GameGallery} from './game-gallery';
import {Button} from '@/components/ui/button';
import {Modal,type ApiRequest,type Execute} from './app';
import {AddGame} from './add-game';
import {GameSeries} from './game-series';
import {formatHours,timeLabels} from '../domain/daily';
import type {Library,GameTimes,Saga} from '../domain/model';
import type {CatalogGame} from './use-catalog-search';
import guides from '../infrastructure/saga-guides.json';
type Details=CatalogGame&{summary:string;releaseDate:string;developers:string[];videos:{name:string;url:string}[]};
export function CatalogGamePage({id,state,request,execute,demo,onBack,onGame}:{id:number;state:Library;request:ApiRequest;execute:Execute;demo:boolean;onBack:()=>void;onGame:(id:string)=>void}){
 const entry=[...(state.sagas??[]),...guides as Saga[]].flatMap(s=>s.entries).find(e=>e.catalogId===id);
 const [data,setData]=useState<Details>(),[times,setTimes]=useState<GameTimes>(),[error,setError]=useState(''),[timeError,setTimeError]=useState(''),[retry,setRetry]=useState(0),[adding,setAdding]=useState(false);
 useEffect(()=>{if(demo)return;const c=new AbortController();let active=true;setError('');setTimeError('');
 request('/api/catalog/details?id='+id,{signal:c.signal}).then(r=>r.json()).then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});
 request('/api/catalog/times?id='+id,{signal:c.signal}).then(r=>r.json()).then(d=>{if(active)setTimes(d);}).catch(e=>{if(active)setTimeError(e.message);});
 return()=>{active=false;c.abort();};},[id,request,demo,retry]);
 const game:CatalogGame|undefined=data?{catalogId:id,title:data.title,genres:data.genres,platforms:data.platforms,...(data.cover?{cover:data.cover}:{})}:entry?{catalogId:id,title:entry.title,genres:[],platforms:[],...(entry.cover?{cover:entry.cover}:{})}:undefined;
 const owned=state.games.find(g=>g.catalogId===id);
 return <div className="game-page"><button className="game-back" onClick={onBack}>← Volver a Sagas</button>
 {error&&<p className="form-error" role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Reintentar ficha</button></p>}
 {game?<><header className="game-hero"><div className="game-hero-cover">{game.cover&&<img src={game.cover} alt={'Portada de '+game.title}/>}</div><div><p className="eyebrow">EXPLORA EL CATÁLOGO</p><h1 tabIndex={-1}>{game.title}</h1><p className="game-hero-genres">{game.genres.join(' · ')}</p><div className="game-platforms">{game.platforms.map(p=><span key={p}>{p}</span>)}</div><p className="muted">{(data?.releaseDate??entry?.releaseDate)?.slice(0,4)}</p><div className="game-hero-actions">{owned?<Button onClick={()=>onGame(owned.id)}>Abrir mi ficha</Button>:<Button disabled={!demo&&!data} onClick={()=>setAdding(true)}>Añadir a mi biblioteca</Button>}</div></div></header>
 <nav className="game-section-links" aria-label="Secciones de la ficha"><a href="#catalog-overview">Información</a><a href="#catalog-times">Duración</a><a href="#catalog-series">Saga</a></nav>
 <GameGallery id={id} cover={game.cover} request={request} demo={demo}/><section className="game-section" id="catalog-overview"><h2>Sobre el juego</h2>{demo?<><p className="game-prose">{entry?.note}</p><p className="info-note">Inicia sesión para consultar la sinopsis, las plataformas y el estudio desde IGDB.</p></>:data?<><p className="muted text-xs">Información de IGDB; puede estar en inglés.</p><p className="game-prose">{data.summary||'Sin sinopsis disponible.'}</p><h3>Estudio</h3><p>{data.developers.join(' · ')||'Sin información disponible'}</p><h3>Primer lanzamiento</h3><p>{data.releaseDate?new Intl.DateTimeFormat('es',{dateStyle:'long',timeZone:'UTC'}).format(new Date(data.releaseDate)):'Sin fecha disponible'}</p>{data.videos.length>0&&<><h3>Tráilers y vídeos</h3>{data.videos.map(v=><p key={v.url}><a className="text-link" href={v.url} target="_blank" rel="noopener noreferrer">{v.name} ↗</a></p>)}</>}</>:<p role="status">Cargando información…</p>}</section>
 <section className="game-section" id="catalog-times"><h2>¿Cuánto dura?</h2><div className="game-time-cards">{(['main','extras','complete'] as const).map(mode=><div key={mode}><span>{timeLabels[mode]}</span><strong>{times?.[mode]?formatHours(times[mode].hours):!demo&&!times&&!timeError?'…':'Sin datos'}</strong><small>{times?.[mode]?'Fuente: IGDB':'Estimación del juego completo'}</small></div>)}</div>{timeError&&<p role="status">{timeError} <button className="text-link" onClick={()=>setRetry(n=>n+1)}>Reintentar</button></p>}</section>
 <section className="game-section" id="catalog-series"><h2>Otros juegos de la saga</h2><GameSeries catalogId={id} state={state} request={request} demo={demo} onGame={onGame}/></section>
 {adding&&<Modal title="Añadir a mi biblioteca" onClose={()=>setAdding(false)}><AddGame initialGame={game} state={state} execute={execute} request={request} demo={demo} onClose={()=>setAdding(false)} onAdded={onGame}/></Modal>}
 </>:!error?<p role="status">{demo?'Este título no está incluido en la demostración. Inicia sesión para consultar su ficha.':'Cargando ficha…'}</p>:null}</div>;
}
