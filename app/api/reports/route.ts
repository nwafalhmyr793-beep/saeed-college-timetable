import {NextResponse} from 'next/server';
import {account,db,scope} from '../../../lib/accounts';
import {allEntries} from '../schedule/route';
export async function GET(){
 try{
  const actor=await account();
  if(!actor)return NextResponse.json({error:'سجل الدخول لعرض تقرير مقرراتك'},{status:401});
  const entries=(await allEntries()).filter(e=>scope(actor,e));
  const ids=new Set(entries.map(e=>e.id));
  const [c,l]=await Promise.all([
   db().prepare("SELECT entry_id AS entryId,CASE WHEN date LIKE 'weekly:%' THEN substr(date,8) ELSE date END AS date,reason,cancelled_by AS changedBy,created_at AS createdAt,(SELECT COALESCE(json_extract(a.after_json,'$.room'),json_extract(a.entry_json,'$.room')) FROM audit_events a WHERE a.entry_id=cancellations.entry_id AND a.occurrence_date=replace(cancellations.date,'weekly:','') AND a.action='cancel' ORDER BY a.occurred_at DESC LIMIT 1) AS cancelledRoom FROM cancellations").all<{entryId:string}>(),
   db().prepare('SELECT entry_id AS entryId,date,room,reason FROM locations').all<{entryId:string}>()
  ]);
  return NextResponse.json({entries,cancellations:c.results.filter(e=>ids.has(e.entryId)),locations:l.results.filter(e=>ids.has(e.entryId)),role:actor.role,department:actor.department,level:actor.level},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return NextResponse.json({error:'تعذر تحميل التقرير'},{status:503})}
}
