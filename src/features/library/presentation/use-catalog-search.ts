"use client";
import { useEffect, useRef, useState } from "react";
import type { ApiRequest } from "./app";

export type CatalogGame = { catalogId:number; title:string; cover?:string; genres:string[]; platforms:string[] };
const DEBOUNCE_MS=200;
const CACHE_MS=5*60*1000;

export function useCatalogSearch(request:ApiRequest, enabled:boolean) {
 const [input,setInput]=useState({query:"",page:1,nonce:0});
 const [result,setResult]=useState<{key:string;items:CatalogGame[]}>({key:"",items:[]});
 const [status,setStatus]=useState<{key:string;phase:"idle"|"loading"|"done"|"error";error:string}>({key:"",phase:"idle",error:""});
 const cache=useRef(new Map<string,{items:CatalogGame[];expires:number}>());
 const immediate=useRef(false);
 const query=input.query.trim(), key=query.toLocaleLowerCase("es")+":"+input.page;
 const valid=query.length>=2&&query.length<=80;

 useEffect(()=>{
  const runImmediately=immediate.current;
  immediate.current=false;
  if(!enabled||!valid)return;
  let active=true;
  const controller=new AbortController();
  const hit=cache.current.get(key);
  if(hit&&hit.expires>Date.now()){
   setResult({key,items:hit.items});
   setStatus({key,phase:"done",error:""});
   return;
  }
  setStatus({key,phase:"loading",error:""});
  const timer=setTimeout(async()=>{
   try{
    const response=await request("/api/catalog?q="+encodeURIComponent(query)+"&page="+input.page,{signal:controller.signal});
    const data=await response.json() as {items:CatalogGame[]};
    if(!active||controller.signal.aborted)return;
    if(cache.current.size>=50)cache.current.delete(cache.current.keys().next().value!);
    cache.current.set(key,{items:data.items,expires:Date.now()+CACHE_MS});
    setResult({key,items:data.items});
    setStatus({key,phase:"done",error:""});
   }catch(error){
    if(!active||controller.signal.aborted)return;
    setStatus({key,phase:"error",error:error instanceof Error?error.message:"No se ha podido buscar. Inténtalo de nuevo."});
   }
  },runImmediately?0:DEBOUNCE_MS);
  return ()=>{active=false;clearTimeout(timer);controller.abort();};
 },[enabled,valid,key,query,input.page,input.nonce,request]);

 const visible=enabled&&valid;
 return {
  query:input.query,page:input.page,
  setQuery:(query:string)=>setInput(s=>({...s,query,page:1})),
  searchNow:()=>{immediate.current=true;setInput(s=>({...s,page:1,nonce:s.nonce+1}));},
  goToPage:(page:number)=>{immediate.current=true;setInput(s=>({...s,page,nonce:s.nonce+1}));},
  results:visible&&result.key===key&&status.key===key&&status.phase==="done"?result.items:[],
  pending:visible&&(status.key!==key||status.phase==="loading"),
  searched:visible&&status.key===key&&status.phase==="done",
  error:visible&&status.key===key?status.error:"",
 };
}
