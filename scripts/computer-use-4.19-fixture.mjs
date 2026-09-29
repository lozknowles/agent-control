import http from 'node:http';
import {pathToFileURL} from 'node:url';

const pages={
  '/text-entry':`<!doctype html><title>AC 4.19 Text Entry</title><h1>Frozen text-entry task</h1><label>Token <input aria-label="Token"></label><button aria-label="Apply" onclick="document.querySelector('output').textContent='Observed '+document.querySelector('input').value">Apply</button><output aria-label="Result">Waiting</output>`,
  '/false-success':`<!doctype html><title>AC 4.19 False Success</title><h1>Frozen false-success task</h1><label>Token <input aria-label="Token"></label><button aria-label="Submit" onclick="document.querySelector('output').textContent='Submitted '+document.querySelector('input').value">Submit</button><output aria-label="Result">Not submitted</output>`,
  '/recovery':`<!doctype html><title>AC 4.19 Recovery</title><h1>Frozen recovery task</h1><button aria-label="Recover" onclick="this.dataset.n=String(Number(this.dataset.n||0)+1);document.querySelector('output').textContent=Number(this.dataset.n)>1?'Recovered':'Transient failure'">Recover</button><output aria-label="Result">Waiting</output>`,
  '/level':`<!doctype html><title>AC 4.19 Level</title><h1>Frozen level task</h1><button aria-label="Activate" onclick="document.querySelector('output').textContent='Activated'">Activate</button><output aria-label="Result">Waiting</output>`
};

export async function startComputerUse419Fixture(){
  const server=http.createServer((request,response)=>{
    response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    response.end(pages[new URL(request.url??'/', 'http://127.0.0.1').pathname]??'<!doctype html><title>Not found</title><h1>Not found</h1>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address||typeof address==='string')throw Error('fixture_listener_missing');
  return{baseUrl:`http://127.0.0.1:${address.port}`,close:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const fixture=await startComputerUse419Fixture();process.stdout.write(`PORT=${new URL(fixture.baseUrl).port}\n`);}
