export const theme={green:'green',cyan:'cyan',yellow:'yellow',magenta:'magenta',muted:'gray',border:'gray',focus:'cyan'} as const;
export const laneAccent=(i:number)=>['green','cyan','magenta'][i%3];
export function meter(value:number,width=18){const n=Math.max(0,Math.min(width,Math.round(value*width)));return'█'.repeat(n)+'░'.repeat(width-n);}
export function compactPath(p:string){const home=process.env.HOME;if(home&&p.startsWith(home))return'~'+p.slice(home.length);return p;}
