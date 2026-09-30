import { ArchivarioApp } from "@/features/library/presentation/app";
export default async function GameRoute({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ArchivarioApp initialGameId={id}/>;}
