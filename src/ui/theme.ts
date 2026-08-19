export const theme={healthy:'green',info:'cyan',warning:'yellow',danger:'red',action:'magenta',muted:'gray',border:'gray',focus:'cyan'} as const;
export const laneAccent=(i:number)=>['green','cyan','magenta','yellow','blue'][i%5];
export function meter(value:number,width=18){const n=Math.max(0,Math.min(width,Math.round(value*width)));return'█'.repeat(n)+'░'.repeat(width-n);}
export function colorMeter(value:number,width=18){const v=Math.max(0,Math.min(1,value)),color=v>=.85?'red':v>=.65?'yellow':v>0?'green':'gray';return`{${color}-fg}${meter(v,width)}{/${color}-fg}`;}
export function statusColor(status:string){const s=status.toLowerCase();if(/healthy|ready|running|completed|recovered|current/.test(s))return'green';if(/degraded|waiting|aging|slow|review|retry|checkpoint/.test(s))return'yellow';if(/failed|error|offline|stale|unavailable|blocked/.test(s))return'red';if(/recover|route|handoff|substitute|claim/.test(s))return'magenta';return'cyan';}
export function tag(status:string,text=status){const c=statusColor(status);return`{${c}-fg}${text}{/${c}-fg}`;}
export function compactPath(p:string){const home=process.env.HOME;if(home&&p.startsWith(home))return'~'+p.slice(home.length);return p;}
