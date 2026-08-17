import assert from'node:assert/strict';import test from'node:test';import{discoverLinuxPtys,ptsFromTtyNr,toPtyDiscoveries,ttyFromStat,type ProcReader}from'./linux-pty.js';
const stat=(pid:number,tty:number)=>`${pid} (vim) S 1 1 1 ${tty} 1 0 0 0 0`;
test('decodes Linux pts tty number',()=>{assert.equal(ptsFromTtyNr((136<<8)|7),'/dev/pts/7');assert.equal(ptsFromTtyNr(0x401),null);});
test('reads tty_nr after comm safely',()=>{assert.equal(ttyFromStat(stat(10,(136<<8)|3)),(136<<8)|3);assert.equal(ttyFromStat('broken'),null);});
test('discovery filters other users and non PTYs',()=>{const r:ProcReader={listPids:()=>[10,11,12],readStat:p=>p===12?stat(p,0):stat(p,(136<<8)|p),readCmdline:p=>p===10?'vim file.ts':'psql',readCwd:()=>'/repo',readUid:p=>p===11?2000:1000};const got=discoverLinuxPtys(r,1000);assert.equal(got.length,1);assert.equal(got[0].pid,10);assert.equal(got[0].tty,'/dev/pts/10');});
test('one discovery per tty chooses deepest/latest process',()=>{const d=toPtyDiscoveries([{pid:20,tty:'/dev/pts/4',command:'bash',cwd:'/a',uid:1},{pid:25,tty:'/dev/pts/4',command:'vim',cwd:'/repo',uid:1}]);assert.equal(d.length,1);assert.equal(d[0].pid,25);assert.equal(d[0].command,'vim');});
