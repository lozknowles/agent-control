export function reconcileOwnedEntries(entries,{isAlive,terminate}){const live=entries.filter(entry=>Number.isInteger(entry.pid)&&entry.pid>0&&isAlive(entry.pid));const forwards=live.filter(entry=>entry.id==='pixel-forward');const keep=forwards[0];for(const entry of forwards.slice(1))terminate(entry.pid);return live.filter(entry=>entry.id!=='pixel-forward'||entry===keep);}

