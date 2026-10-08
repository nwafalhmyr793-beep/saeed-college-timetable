import type {Member} from '../../../lib/payload';
import type {CancelSelection} from '../../../lib/cancellation-selection';
import {readJsonObject,InvalidRequestError,validText,validTime} from '../../../lib/validation';
import {delegateNotification} from '../../../lib/notifications';
import { auditStatement } from '../../../lib/audit';
import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { account,scope } from '../../../lib/accounts';
import { canonicalRoom, normalizeCiscoRoom } from '../../../availability';
import { seed, departments, type Entry } from '../../../data';
import { applyWorkbookImport } from '../../../lib/workbook-import';


import {instructorCatalog,displayInstructors} from '../../../lib/teaching';
import {cancellationSelection,validDate as isValidSelectionDate} from '../../../lib/cancellation-selection';
function db(){ return env.DB as D1Database; }
const validDate=(value:unknown)=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const day=new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(+day)&&day.toISOString().slice(0,10)===value;
};
async function role(){
 const a=await account();
 if(!a)return {id:'',email:'',name:'',role:'viewer',department:'',level:0,canEdit:false,canCancel:false};
 return {...a,email:a.username,canEdit:a.role==='admin'||a.role!=='teacher'&&a.can_edit===1,canCancel:['admin','delegate','teacher'].includes(a.role),password_hash:undefined};
}
export async function allEntries(){
 await applyWorkbookImport(db());
 const rows=await db().prepare('SELECT id,day,department,level,start,end,course,instructor,room,group_name AS groupName,kind,source FROM entries').all<Entry>();
 const merged=new Map(seed.map(e=>[e.id,e]));for(const e of rows.results){if(e.source==='deleted')merged.delete(e.id);else merged.set(e.id,e);}return displayInstructors(db(),[...merged.values()]);
}
const allowed=(a:Awaited<ReturnType<typeof role>>,e:Entry)=>scope(a,e);
const invalid=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function GET(){try{
 const current=await role();const [entries,settings,cancellations,locations,members]=await Promise.all([
 allEntries(),db().prepare("SELECT key,value FROM settings WHERE key='termStart'").all<{key:string,value:string}>(),
 db().prepare("SELECT entry_id AS entryId,CASE WHEN date LIKE 'weekly:%' THEN substr(date,8) ELSE date END AS date,reason,cancelled_by AS changedBy FROM cancellations").all(),
 db().prepare('SELECT entry_id AS entryId,date,room,reason,changed_by AS changedBy FROM locations').all(),
 current.role==='admin'?db().prepare('SELECT id,username,name,role,department,level,can_edit AS canEdit,active,instructor_id AS instructorId FROM accounts').all<Omit<Member,'entryIds'>>():Promise.resolve({results:[]})]);
 const [instructors,assignments]=current.role==='admin'?await Promise.all([instructorCatalog(db(),entries),db().prepare('SELECT account_id AS accountId,entry_id AS entryId FROM teaching_assignments').all<{accountId:string;entryId:string}>()]):[[],{results:[]}];
 const memberList=members.results.map(m=>({...m,entryIds:assignments.results.filter(x=>x.accountId===m.id).map(x=>x.entryId)}));
 return NextResponse.json({instructors,isOwner:current.id==='owner',assignedEntryIds:'assignedEntryIds' in current?current.assignedEntryIds:[],entries,settings:Object.fromEntries(settings.results.map(x=>[x.key,x.value])),cancellations:cancellations.results,locations:locations.results.map(x=>({...x,room:normalizeCiscoRoom(String(x.room))})),members:memberList,...current,verifiedCount:seed.length},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof InvalidRequestError)return NextResponse.json({error:e.message},{status:400});console.error(e);return invalid('تعذر تحميل الجدول. أعد المحاولة.',503);}}
export async function POST(req:NextRequest){
  try{
    if(req.headers.get('origin')!==new URL(req.url).origin)return invalid('طلب غير مسموح',403);
    const actor=await role();
    const mutations:D1PreparedStatement[]=[];
    const body=await readJsonObject(req) as {action:string;selection:CancelSelection;reason?:string;id:string;date:string;scope?:string;room:string;key:string;value:string;entry:Entry};
    if(['previewCancel','cancelBatch','restoreBatch'].includes(body.action)){
      if(!actor.canCancel)return invalid('لا تملك صلاحية الإلغاء',403);
      if(!body.selection||typeof body.selection!=='object'||!isValidSelectionDate(body.selection.date)||!['day','week'].includes(body.selection.period))return invalid('اختر فترة الإلغاء');
      const matches=cancellationSelection((await allEntries()).filter(e=>allowed(actor,e)),body.selection);
      if(!matches.length)return invalid('لا توجد محاضرات ضمن صلاحياتك لهذه الفترة');
      const [allCancelled,allLocations]=await Promise.all([db().prepare('SELECT entry_id,date,reason FROM cancellations').all<{entry_id:string;date:string;reason:string}>(),db().prepare('SELECT entry_id,date,room FROM locations').all<{entry_id:string;date:string;room:string}>()]);
      const rows=matches.map(({entry,date})=>({entry,date,cancelled:allCancelled.results.some(c=>c.entry_id===entry.id&&(c.date===date||c.date==='weekly:'+date))}));
      if(body.action==='previewCancel')return NextResponse.json({rows});
      const reason=String(body.reason||'').trim().slice(0,250);
      let changed=0;
      for(const row of rows){
       const {entry,date,cancelled}=row;if(body.action==='cancelBatch'&&cancelled||body.action==='restoreBatch'&&!cancelled)continue;
       changed++;
       const before=allCancelled.results.filter(c=>c.entry_id===entry.id&&(c.date===date||c.date==='weekly:'+date));
       const notice=delegateNotification(db(),actor,body.action==='cancelBatch'?'cancel':'restore',{...entry,room:allLocations.results.find(l=>l.entry_id===entry.id&&l.date===date)?.room||entry.room},date,reason);if(notice)mutations.push(notice);
       if(body.action==='cancelBatch')mutations.push(db().prepare('INSERT INTO cancellations(entry_id,date,reason,cancelled_by,created_at) VALUES (?,?,?,?,?) ON CONFLICT(entry_id,date) DO NOTHING').bind(entry.id,date,reason,actor.name,new Date().toISOString()));
       else mutations.push(db().prepare('DELETE FROM cancellations WHERE entry_id=? AND (date=? OR date=?)').bind(entry.id,date,'weekly:'+date));
       mutations.push(auditStatement(db(),actor,body.action==='cancelBatch'?'cancel':'restore',entry,date,before,body.action==='cancelBatch'?{cancelled:true,reason,room:allLocations.results.find(l=>l.entry_id===entry.id&&l.date===date)?.room||entry.room}:{cancelled:false}));
      }
      if(mutations.length)await db().batch(mutations);
      return NextResponse.json({ok:true,changed});
    }else if(['cancel','restore','location','restoreLocation'].includes(body.action)){
      if(!actor.canCancel)return invalid('لا تملك صلاحية إدارة هذا الموعد.',403);
      if(actor.role==='teacher'&&['location','restoreLocation'].includes(body.action))return invalid('تغيير القاعات للمدير أو المندوب فقط',403);
      const id=String(body.id||''),date=body.date;
      if(!validDate(date))return invalid('اختر تاريخًا صحيحًا');
      const entries=await allEntries(), matching=entries.find(e=>e.id===id);
      if(!matching)return invalid('المحاضرة غير موجودة',404);
      if(!allowed(actor,matching))return invalid('المحاضرة خارج تخصصك أو مستواك.',403);
      if(new Date(`${date}T12:00:00Z`).getUTCDay()!==Number(matching.day))return invalid('التاريخ لا يطابق يوم المحاضرة');
      if(body.scope && body.scope!=='date')return invalid('الإلغاء لموعد واحد فقط');
      const cancellationRoom=['cancel','restore'].includes(body.action)?await db().prepare('SELECT room FROM locations WHERE entry_id=? AND date=?').bind(id,date).first<{room:string}>():null;
      const before=body.action==='cancel'||body.action==='restore'?await db().prepare('SELECT * FROM cancellations WHERE entry_id=? AND (date=? OR date=?)').bind(id,date,'weekly:'+date).all():await db().prepare('SELECT * FROM locations WHERE entry_id=? AND date=?').bind(id,date).all();
      if(body.action==='cancel'&&before.results.length)return NextResponse.json({ok:true,changed:0});
      if(body.action==='restore'&&!before.results.length)return NextResponse.json({ok:true,changed:0});
      if(['cancel','restore'].includes(body.action)){const notice=delegateNotification(db(),actor,body.action==='cancel'?'cancel':'restore',{...matching,room:cancellationRoom?.room||matching.room},date,String(body.reason||'').slice(0,250));if(notice)mutations.push(notice);}
      if(body.action==='cancel')mutations.push(db().prepare('INSERT INTO cancellations(entry_id,date,reason,cancelled_by,created_at) VALUES (?,?,?,?,?) ON CONFLICT(entry_id,date) DO UPDATE SET reason=excluded.reason,cancelled_by=excluded.cancelled_by,created_at=excluded.created_at').bind(id,date,String(body.reason||'').slice(0,250),actor.name,new Date().toISOString()));
      if(body.action==='restore')mutations.push(db().prepare('DELETE FROM cancellations WHERE entry_id=? AND (date=? OR date=?)').bind(id,date,'weekly:'+date));
      if(body.action==='location'||body.action==='restoreLocation'){
        const room=body.action==='restoreLocation'?matching.room:normalizeCiscoRoom(String(body.room||'').trim());if(!room||room.length>80)return invalid('أدخل اسم القاعة أو المعمل أو الورشة');
        const [changes,cancels]=await Promise.all([db().prepare('SELECT entry_id,room FROM locations WHERE date=?').bind(date).all<{entry_id:string,room:string}>(),db().prepare('SELECT entry_id FROM cancellations WHERE date=? OR date=?').bind(date,'weekly:'+date).all<{entry_id:string}>()]);
        const normalize=(v:string)=>canonicalRoom(v)||v.trim().replace(/\s+/g,'').toLowerCase();
        if(entries.some(e=>e.id!==id&&e.day===matching.day&&e.start<matching.end&&e.end>matching.start&&!cancels.results.some(c=>c.entry_id===e.id)&&normalize(changes.results.find(c=>c.entry_id===e.id)?.room||e.room)===normalize(room)))return invalid('المكان مشغول بمحاضرة أخرى في الوقت نفسه.',409);
        if(body.action==='restoreLocation')mutations.push(db().prepare('DELETE FROM locations WHERE entry_id=? AND date=?').bind(id,date));
        else mutations.push(db().prepare('INSERT INTO locations(entry_id,date,room,reason,changed_by) VALUES (?,?,?,?,?) ON CONFLICT(entry_id,date) DO UPDATE SET room=excluded.room,reason=excluded.reason,changed_by=excluded.changed_by').bind(id,date,room,String(body.reason||'').slice(0,250),actor.name));
      }
      mutations.push(auditStatement(db(),actor,body.action,matching,date,before.results,body.action==='cancel'?{cancelled:true,room:cancellationRoom?.room||matching.room,reason:String(body.reason||'').slice(0,250)}:body.action==='location'?{room:normalizeCiscoRoom(String(body.room||'').trim()),reason:String(body.reason||'').slice(0,250)}:body.action==='restore'?{cancelled:false}:{room:matching.room}));
    }else if(body.action==='setting'){
      if(actor.role!=='admin')return invalid('هذه الإعدادات للمسؤول فقط.',403);
      if(body.key!=='termStart'||!validDate(body.value))return invalid('تاريخ غير صالح.');
      mutations.push(db().prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(body.key,body.value));
    }else if(body.action==='delete'){
      if(actor.role==='teacher'||!actor.canEdit)return invalid('التعديل يتطلب صلاحية يمنحها مالك الموقع.',403);
      const id=String(body.id||'');
      if(!id)return invalid('معرّف غير صالح.');
      const existing=(await allEntries()).find(e=>e.id===id);if(!existing||!allowed(actor,existing))return invalid('المحاضرة خارج صلاحياتك',403);
      mutations.push(db().prepare("INSERT INTO entries(id,day,department,level,start,end,course,instructor,room,group_name,kind,source) VALUES (?,0,'',1,'','','','','','','','deleted') ON CONFLICT(id) DO UPDATE SET source='deleted'").bind(id));
      mutations.push(auditStatement(db(),actor,'delete',existing,null,existing,null));
    }else if(body.action==='entry'){
      if(actor.role==='teacher'||!actor.canEdit)return invalid('التعديل يتطلب صلاحية يمنحها مالك الموقع.',403);
      const e=body.entry as Entry;
      if(!e||Array.isArray(e)||!Number.isInteger(e.day)||e.day<0||e.day>6||![1,2,3,4,5].includes(e.level)||!departments.includes(e.department)||!validText(e.course,160)||!validText(e.instructor,120)||!validText(e.room,80)||!validTime(e.start)||!validTime(e.end)||e.start>=e.end||(e.id!==undefined&&e.id!==''&&!validText(e.id,200))||(e.groupName!==undefined&&(typeof e.groupName!=='string'||e.groupName.length>80))||(e.kind!==undefined&&!validText(e.kind,30)))return invalid('أكمل بيانات المحاضرة والوقت بصورة صحيحة.');
      if(!allowed(actor,e))return invalid('التخصص أو المستوى خارج صلاحياتك',403);
      const existing=(await allEntries()).find(x=>x.id===e.id);if(existing&&!allowed(actor,existing))return invalid('المحاضرة خارج صلاحياتك',403);
      const id=String(e.id||crypto.randomUUID());
      if(existing&&[existing.course,existing.department,existing.level,existing.instructor].join('|')!==[e.course,e.department,e.level,e.instructor].join('|'))mutations.push(db().prepare('DELETE FROM teaching_assignments WHERE entry_id=?').bind(id));
      mutations.push(db().prepare('INSERT INTO entries(id,day,department,level,start,end,course,instructor,room,group_name,kind,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,department=excluded.department,level=excluded.level,start=excluded.start,end=excluded.end,course=excluded.course,instructor=excluded.instructor,room=excluded.room,group_name=excluded.group_name,kind=excluded.kind,source=excluded.source').bind(id,Number(e.day),String(e.department).slice(0,50),Number(e.level),e.start,e.end,String(e.course).slice(0,160),String(e.instructor).slice(0,120),normalizeCiscoRoom(String(e.room)).slice(0,80),String(e.groupName||'').slice(0,80),String(e.kind||'محاضرة').slice(0,30),'إضافة الفريق'));
      mutations.push(auditStatement(db(),actor,existing?'edit':'create',{...e,id},null,existing||null,{...e,id}));
    }else return invalid('عملية غير معروفة.');
    if(mutations.length)await db().batch(mutations);
    return NextResponse.json({ok:true});
  }catch(e){if(e instanceof InvalidRequestError)return NextResponse.json({error:e.message},{status:400});console.error(e);return invalid('تعذر حفظ التغيير. أعد المحاولة.',503);}
}
