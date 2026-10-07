import type { Entry } from './data';
export type Cancellation = {entryId:string;date:string;reason:string;changedBy?:string;createdAt?:string;cancelledRoom?:string};
export const weeklyCancellationKey=(date:string)=>`weekly:${date}`;
export const weeklyCancellationFor=(cancellations:Cancellation[],entryId:string,date:string)=>
  cancellations.find(c=>c.entryId===entryId&&c.date.startsWith('weekly:')&&c.date.slice(7)===date);
export const isCancelledOnDate=(cancellations:Cancellation[],entryId:string,date:string)=>
  cancellations.some(c=>c.entryId===entryId&&c.date===date)||!!weeklyCancellationFor(cancellations,entryId,date);
export const normalizeCiscoRoom=(room:string)=>/^(?:(?:ق|قاعة|قاعه|معمل)\s*)?(?:cisco|سيسكو)$/i.test(room.trim())?'ق Cisco':room;
export function canonicalRoom(room:string):string|null {
  const compact=room.toLocaleLowerCase('ar').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[()]/g,'').replace(/\s+/g,'').replace(/^قاعه/,'ق');
  if(!compact||/^[-—–]+$/.test(compact)||compact==='معمل'||compact==='online'||compact.startsWith('غيرمذكور')||compact.startsWith('غيرمحدد'))return null;
  let m=compact.match(/^ق(\d+)/);
  if(m)return `ق ${m[1]}`;
  if(normalizeCiscoRoom(room)==='ق Cisco')return 'ق Cisco';
  if(compact.startsWith('قالدراساتالعليا')){
    m=compact.match(/m(\d+)/);
    return m?`ق الدراسات العليا M${m[1]}`:null;
  }
  if(compact.startsWith('قالسمنار'))return 'ق السمنار';
  if(compact.startsWith('مدرجالخوارزمي'))return 'مدرج الخوارزمي';
  if(compact.startsWith('مدرجهائل'))return 'مدرج هائل';
  if(compact.startsWith('معملالفيزياء')){
    m=compact.match(/^معملالفيزياء(\d+)/);
    return m?`معمل الفيزياء ${m[1]}`:null;
  }
  m=compact.match(/^معمل(\d+)/);
  if(m)return `معمل ${m[1]}`;
  if(compact.startsWith('معملمعمل')){
    m=compact.match(/^معملمعمل(\d+)/);
    if(m)return `معمل ${m[1]}`;
  }
  for(const [pattern,label] of [
    ['معملالمنطقيه','معمل المنطقية'],['معملالمعالجات','معمل المعالجات'],
    ['معملالمعاللجات','معمل المعالجات'],['معملالالكترونيات','معمل الإلكترونيات'],
    ['معملالكهرباء','معمل الكهرباء'],['معملالاتصالات','معمل الاتصالات'],
    ['معملالقياسات','معمل القياسات']
  ])if(compact.startsWith(pattern))return label;
  if(compact==='الورشه')return 'الورشة';
  return room.trim();
}
export const roomKey=(room:string)=>canonicalRoom(room)??'';
export const knownRoom=(room:string)=>canonicalRoom(room)!==null;
export function roomsForDate(entries:Entry[],cancellations:Cancellation[],date:string,start:string,end:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||start>=end)return [];
  const weekday=new Date(`${date}T12:00:00`).getDay();
  const cancelled=new Set(cancellations.filter(x=>x.date===date||(x.date.startsWith('weekly:')&&x.date.slice(7)===date)).map(x=>x.entryId));
  const rooms=new Map<string,{name:string;occupants:Entry[]}>();
  for(const e of entries){
    if(!knownRoom(e.room))continue;
    const key=roomKey(e.room);
    if(!rooms.has(key))rooms.set(key,{name:key,occupants:[]});
    if(Number(e.day)===weekday&&!cancelled.has(e.id)&&e.start<end&&e.end>start)rooms.get(key)!.occupants.push(e);
  }
  return [...rooms.values()].sort((a,b)=>a.name.localeCompare(b.name,'ar'));
}
