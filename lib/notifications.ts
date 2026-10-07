import type {Entry} from '../data';
export function delegateNotification(database:D1Database,actor:{id:string;name:string;role:string},action:'cancel'|'restore',entry:Entry,date:string,reason:string){
 if(actor.role!=='teacher')return null;
 const eventId=crypto.randomUUID(),createdAt=new Date().toISOString();
 const guard=action==='cancel'?'NOT EXISTS':'EXISTS';
 return database.prepare(`INSERT INTO notifications(id,account_id,action,entry_id,occurrence_date,actor_id,actor_name,entry_json,reason,created_at)
 SELECT ? || ':' || id,id,?,?,?,?,?,?,?,? FROM accounts WHERE role='delegate' AND active=1 AND department=? AND level=? AND ${guard}(SELECT 1 FROM cancellations WHERE entry_id=? AND (date=? OR date=?))`).bind(eventId,action,entry.id,date,actor.id,actor.name,JSON.stringify(entry),reason,createdAt,entry.department,Number(entry.level),entry.id,date,'weekly:'+date);
}
