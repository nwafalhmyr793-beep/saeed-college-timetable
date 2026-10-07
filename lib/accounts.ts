import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export const db=()=>env.DB as D1Database;
export type Account={id:string;username:string;name:string;role:string;department:string;level:number;can_edit:number;active:number;password_hash?:string;instructor_id?:string|null;assignedEntryIds?:string[];authMethod?:string};
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export async function hash(password:string,salt=hex(crypto.getRandomValues(new Uint8Array(16)).buffer)){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return salt+':'+hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
export async function verify(password:string,stored:string){const candidate=await hash(password,stored.split(':')[0]);let diff=candidate.length^stored.length;for(let i=0;i<stored.length;i++)diff|=stored.charCodeAt(i)^(candidate.charCodeAt(i)||0);return diff===0;}
export async function digest(s:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
export async function bootstrap(){
 const secret=(env as unknown as Record<string,string>).OWNER_PASSWORD_HASH;
 if(secret)await db().prepare("INSERT OR IGNORE INTO accounts(id,username,name,password_hash,role,department,level,can_edit,active) VALUES ('owner','nawaf',?,?,'admin','SE',3,1,1)").bind('نواف محمد علي همام',secret).run();
 const additionalAdminSecret=(env as unknown as Record<string,string>).NAWAF2_PASSWORD_HASH;
 if(additionalAdminSecret)await db().prepare("INSERT OR IGNORE INTO accounts(id,username,name,password_hash,role,department,level,can_edit,active) VALUES ('admin-nawaf2','nawaf2',?,?,'admin','SE',3,1,1)").bind('نواف محمد علي همام',additionalAdminSecret).run();
}
export async function account(){
 const token=(await cookies()).get('saeed_session')?.value;if(token){
 const user=await db().prepare('SELECT a.* FROM accounts a JOIN sessions s ON s.account_id=a.id WHERE s.token=? AND s.expires>? AND a.active=1').bind(await digest(token),Date.now()).first<Account>();
 if(user?.role==='teacher'){const assignments=await db().prepare('SELECT entry_id FROM teaching_assignments WHERE account_id=?').bind(user.id).all<{entry_id:string}>();user.assignedEntryIds=assignments.results.map(x=>x.entry_id);}return user;
 }

 const identity=await getChatGPTUser();
 // Identity headers are supplied and verified by the Sites dispatcher.
 if(identity && (identity.userId==='f19a42cd-fc65-4b12-bc55-03ec896699c9'||identity.email.trim().toLowerCase()==='alhmyryswq@gmail.com')){
   await bootstrap();
   const owner=await db().prepare("SELECT * FROM accounts WHERE id='owner' AND role='admin' AND active=1").first<Account>();
   if(owner)return {...owner,authMethod:'chatgpt'};
 }
 return null;

}
export const scope=(a:Account,e:{id?:string;department:string;level:number})=>a.role==='admin'||(a.role==='teacher'?!!e.id&&!!a.assignedEntryIds?.includes(e.id):(a.department===e.department&&a.level===Number(e.level)));
