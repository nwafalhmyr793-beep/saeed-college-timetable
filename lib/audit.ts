import type { Entry } from '../data';
export function auditStatement(database:D1Database,actor:{id:string;name:string;email:string},action:string,entry:Entry,date:string|null,before:unknown,after:unknown){
 return database.prepare('INSERT INTO audit_events(id,entry_id,occurrence_date,action,actor_id,actor_name,actor_username,occurred_at,department,level,entry_json,before_json,after_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),entry.id,date,action,actor.id,actor.name,actor.email,new Date().toISOString(),entry.department,Number(entry.level),JSON.stringify(entry),JSON.stringify(before??null),JSON.stringify(after??null));
}
