// Build, run and deploy the application on your own Cloudflare account.
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const [command,...args]=process.argv.slice(2);
const node=process.execPath;
function run(script,argv=[],options={}) {
 const r=spawnSync(node,script.endsWith('wrangler.js')?['--import','./scripts/runtime-env.mjs',script,...argv]:[script,...argv],{cwd:root,stdio:'inherit',...options});
 if(r.error)throw r.error;
 if(r.status!==0)process.exit(r.status??1);
}
const cli='./node_modules/wrangler/bin/wrangler.js';
const config='wrangler.standalone.json';
const cfgArgs=['--config',config];
function configRequired(){if(!existsSync(config))throw Error('Run: node scripts/standalone.mjs build');}
function remoteRequired(){configRequired();const c=JSON.parse(readFileSync(config));if(c.d1_databases[0].database_id==='00000000-0000-4000-8000-000000000000')throw Error('Create your D1 database, then run: node scripts/standalone.mjs configure <database-id>');}
async function password(){
 if(!process.stdin.isTTY){let data='';for await(const c of process.stdin)data+=c;return data.replace(/\r?\n$/,'');}
 process.stderr.write('New owner password (hidden): ');process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
 return await new Promise((resolve)=>{let value='';const onData=s=>{for(const c of s){if(c==='\u0003'){process.stdin.setRawMode(false);process.exit(130);}if(c==='\r'||c==='\n'){process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');resolve(value);return;}if(c==='\u007f'||c==='\b')value=value.slice(0,-1);else if(c>=' ')value+=c;}};process.stdin.on('data',onData);});
}
function writeConfig(){
 const settings=JSON.parse(readFileSync('standalone.config.json','utf8'));
 writeFileSync(config,JSON.stringify({name:settings.worker_name,main:'dist/server/standalone.js',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],no_bundle:true,rules:[{type:'ESModule',globs:['**/*.js','**/*.mjs']}],assets:{directory:'dist/client',binding:'ASSETS'},d1_databases:[{binding:'DB',database_name:settings.database_name,database_id:settings.database_id||'00000000-0000-4000-8000-000000000000',migrations_dir:'drizzle'}]},null,2)+'\n');
}
if(command==='build'){
 run('./scripts/run-framework.mjs',['build']);
 writeFileSync('dist/server/standalone.js',`export {default} from './index.js';\n`);
 writeConfig();
 console.log('Standalone build ready.');
}else if(command==='configure'){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args[0]||''))throw Error('Supply the D1 database UUID returned by Cloudflare.');
 const s=JSON.parse(readFileSync('standalone.config.json','utf8'));s.database_id=args[0];writeFileSync('standalone.config.json',JSON.stringify(s,null,2)+'\n');writeConfig();
}else if(command==='owner'){
 if(existsSync('.dev.vars'))throw Error('.dev.vars already exists; keep it. Change an existing account password through the application.');
 const p=await password();if(p.length<12||p.length>128)throw Error('Use a password of 12–128 characters.');
 const salt=randomBytes(16).toString('hex');const hash=salt+':'+pbkdf2Sync(p,salt,100000,32,'sha256').toString('hex');
 writeFileSync('.dev.vars','OWNER_PASSWORD_HASH='+JSON.stringify(hash)+'\n',{mode:0o600,flag:'wx'});chmodSync('.dev.vars',0o600);console.log('Owner credential configured. Username: nawaf');
}else if(command==='migrate'){
 const target=args[0];if(!['--local','--remote'].includes(target))throw Error('Choose --local or --remote explicitly.');configRequired();if(target==='--remote')remoteRequired();
 run(cli,['d1','migrations','apply','DB',target,...cfgArgs,...(target==='--local'?['--persist-to','.wrangler/standalone']:[])]);
}else if(command==='start'){
 const provided=(name)=>args.some(arg=>arg===name||arg.startsWith(name+'='));
 configRequired();run(cli,['dev',...cfgArgs,'--local','--persist-to','.wrangler/standalone',...(!provided('--ip')?['--ip','127.0.0.1']:[]),...(!provided('--port')?['--port','8787']:[]),...(!provided('--inspector-port')?['--inspector-port','0']:[]),...args]);
}else if(command==='secret'){
 remoteRequired();const content=readFileSync('.dev.vars','utf8');const match=content.match(/^OWNER_PASSWORD_HASH="([0-9a-f]{32}:[0-9a-f]{64})"$/m);if(!match)throw Error('Generate .dev.vars with the owner command first.');
 run(cli,['secret','put','OWNER_PASSWORD_HASH',...cfgArgs],{stdio:['pipe','inherit','inherit'],input:match[1]+'\n'});
}else if(command==='deploy'){
 remoteRequired();run(cli,['deploy',...cfgArgs,...args]);
}else{
 console.log('Commands: build | owner | migrate --local|--remote | start | configure <D1-UUID> | secret | deploy');
 if(command)process.exitCode=1;
}
