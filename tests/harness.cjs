const assert=require('node:assert/strict');
const fs=require('node:fs');const {DatabaseSync}=require('node:sqlite');
const ts=require('typescript');const Module=require('node:module');
const database=new DatabaseSync(':memory:');database.exec('PRAGMA foreign_keys=ON');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())database.exec(fs.readFileSync('drizzle/'+file,'utf8'));
let sessionToken='';const environment={DB:null};
const DB={prepare(sql){const params=[];return {bind(...p){params.push(...p);return this},async first(){return database.prepare(sql).get(...params)||null},async all(){return {results:database.prepare(sql).all(...params)}},async run(){database.prepare(sql).run(...params);return {success:true}}}},async batch(statements){database.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());database.exec('COMMIT');return result}catch(e){database.exec('ROLLBACK');throw e}}};
environment.DB=DB;
class NextResponse extends Response{static json(body,init){const r=new NextResponse(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json',...init?.headers}});r.cookieValues={};r.cookies={set(name,value,options){r.cookieValues[name]={value,options}}};return r}}
const original=Module._load;
Module._load=function(id,parent,isMain){if(id==='cloudflare:workers')return {env:environment};if(id==='next/headers')return {headers:async()=>new Headers({'oai-authenticated-user-id':'forged-user','oai-authenticated-user-email':'forged@example.test'}),cookies:async()=>({get:()=>sessionToken?{value:sessionToken}:undefined})};if(id==='next/server')return {NextResponse};return original.call(this,id,parent,isMain)};
Module._extensions['.ts']=(m,filename)=>m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const root=process.cwd();const schedule=require(root+'/app/api/schedule/route.ts'),accounts=require(root+'/app/api/account/route.ts'),instructors=require(root+'/app/api/instructors/route.ts'),reports=require(root+'/app/api/reports/route.ts'),history=require(root+'/app/api/history/route.ts');
const notices=require(root+'/app/api/notifications/route.ts');
const auth=require(root+'/lib/accounts.ts');
const request=(body)=>({url:'https://test.local/api',headers:new Headers({origin:'https://test.local'}),json:async()=>body});
const call=async(route,body,status=200)=>{const r=await route.POST(request(body));const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d};
async function signIn(id){sessionToken='session-'+id;database.prepare('INSERT OR REPLACE INTO sessions(token,account_id,expires) VALUES (?,?,?)').run(await auth.digest(sessionToken),id,Date.now()+10000000)}
function seedAccount(id,role){database.prepare('INSERT INTO accounts(id,username,name,password_hash,role,department,level,can_edit,active) VALUES (?,?,?,?,?,?,?,?,1)').run(id,id,'اسم '+id,'hash',role,'SE',3,1)}
const entry=(id,day,department='SE',instructor='د. المدرس الأول')=>({id,day,department,level:3,start:'08:00',end:'10:00',course:'مقرر اختبار',instructor,room:'403',groupName:'',kind:'محاضرة',source:'test'});
module.exports={assert,fs,database,DB,environment,schedule,accounts,instructors,reports,history,notices,auth,request,call,signIn,seedAccount,entry,setSession(value){sessionToken=value}};
