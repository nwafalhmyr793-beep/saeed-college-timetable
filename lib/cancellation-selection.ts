import type {Entry} from '../data';
export const validDate=(value:unknown):value is string=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return !Number.isNaN(+date)&&date.toISOString().slice(0,10)===value};
export type CancelSelection={date:string;period:'day'|'week';department?:string;course?:string};
export function cancellationSelection(entries:Entry[],selection:CancelSelection){
 if(!validDate(selection.date)||!['day','week'].includes(selection.period))throw Error('اختر تاريخًا ونطاقًا صحيحين');
 const anchor=new Date(selection.date+'T12:00:00Z');const start=new Date(anchor);
 if(selection.period==='week')start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+1)%7));
 const dates=Array.from({length:selection.period==='week'?7:1},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
 return entries.filter(e=>(!selection.department||e.department===selection.department)&&(!selection.course||e.course===selection.course)).flatMap(entry=>dates.filter(date=>new Date(date+'T12:00:00Z').getUTCDay()===Number(entry.day)).map(date=>({entry,date})));
}
