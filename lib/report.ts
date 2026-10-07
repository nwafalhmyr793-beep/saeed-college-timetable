import type { Entry } from '../data';
import { isCancelledOnDate, type Cancellation } from '../availability';
export type LocationChange={entryId:string;date:string;room:string;reason:string};
export function reportDates(start:string,count:number){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(count)||count<1||count>366)return [];
 const first=new Date(`${start}T12:00:00Z`);
 if(Number.isNaN(+first)||first.toISOString().slice(0,10)!==start)return [];
 return Array.from({length:count},(_,i)=>{const d=new Date(first);d.setUTCDate(first.getUTCDate()+i);return {date:d.toISOString().slice(0,10),day:d.getUTCDay()}});
}
export function reportRows(entries:Entry[],cancellations:Cancellation[],locations:LocationChange[],start:string,count:number){
 return reportDates(start,count).flatMap(({date,day})=>entries.filter(e=>Number(e.day)===day).sort((a,b)=>a.start.localeCompare(b.start)||a.department.localeCompare(b.department)).map(entry=>{
 const location=locations.find(l=>l.entryId===entry.id&&l.date===date);
 const cancelled=isCancelledOnDate(cancellations,entry.id,date);
 const cancellation=cancellations.find(c=>c.entryId===entry.id&&(c.date===date||c.date===`weekly:${date}`));
 return {entry,date,day,cancelled,cancellation,location,room:(cancelled?cancellation?.cancelledRoom:undefined)||location?.room||entry.room,reason:cancelled?cancellation?.reason:location?.reason};
 }));
}
