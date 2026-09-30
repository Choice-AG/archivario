// Catalog platform names are suggestions, not a declaration of ownership.
const aliases:Record<string,string>={
 "PC (Microsoft Windows)":"PC","Nintendo Switch":"Switch",
 "PlayStation 5":"PS5","PlayStation 4":"PS4","PlayStation 3":"PS3",
 "Xbox Series X|S":"Xbox Series X/S","Xbox Series X/S":"Xbox Series X/S",
 "Mac":"macOS"
};
export function platformLabel(name:string){return aliases[name]??name;}
export function platformChoices(platforms:string[]){return [...new Set(platforms.map(platformLabel))].filter(p=>p.length<=60).slice(0,12);}
export function preferredPlatforms(platforms:string[],owned:string[]){
 const choices=platformChoices(platforms);
 if(choices.length===1)return choices;
 const counts=new Map<string,number>();
 for(const name of owned){const p=platformLabel(name);counts.set(p,(counts.get(p)??0)+1);}
 const known=choices.filter(p=>counts.has(p)).sort((a,b)=>(counts.get(b)??0)-(counts.get(a)??0));
 return known.length?[known[0]]:[];
}
