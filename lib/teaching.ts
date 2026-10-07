import type {Entry} from '../data';
export type Instructor={id:string;name:string;title:string;scheduleName:string;aliases:string[]};
export const instructorParts=(label:string)=>label.split(/\s*\/\s*/).map(x=>x.trim()).filter(Boolean);
export const instructorLabel=(p:Pick<Instructor,'name'|'title'>)=>[p.title,p.name].filter(Boolean).join(' ');
export function splitInstructor(label:string){const match=label.trim().match(/^(أ\.\s*د\.|ا\.\s*د\.|د\.|م\.|أ\.|ا\.|دكتور|مهندس|مدرس)\s*(.*)$/);return {name:match?match[2]:label.trim(),title:match?match[1]:''};}
export async function instructorCatalog(database:D1Database,entries:Entry[]){
 const rows=await database.prepare('SELECT id,name,title,schedule_name AS scheduleName,aliases_json FROM instructors').all<any>();
 const profiles:Instructor[]=rows.results.map(p=>({...p,aliases:JSON.parse(p.aliases_json)}));
 const known=new Set(profiles.flatMap(p=>[p.scheduleName,instructorLabel(p),...p.aliases]));
 for(const label of new Set(entries.flatMap(e=>instructorParts(e.instructor)))){if(label&&!known.has(label))profiles.push({id:'schedule:'+label,...splitInstructor(label),scheduleName:label,aliases:[label]});}
 return profiles.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
}
export async function displayInstructors(database:D1Database,entries:Entry[]){
 const rows=await database.prepare('SELECT name,title,schedule_name,aliases_json FROM instructors').all<any>();
 const names=new Map<string,string>();for(const p of rows.results)for(const key of [p.schedule_name,...JSON.parse(p.aliases_json)])names.set(key,instructorLabel(p));
 return entries.map(e=>({...e,instructor:instructorParts(e.instructor).map(part=>names.get(part)||part).join(' / ')}));
}
export function teachingGroups(entries:Entry[]){const groups=new Map<string,{key:string;course:string;department:string;level:number;instructor:string;entries:Entry[]}>();for(const e of entries){const key=JSON.stringify([e.course,e.department,e.level,e.instructor]);if(!groups.has(key))groups.set(key,{key,course:e.course,department:e.department,level:e.level,instructor:e.instructor,entries:[]});groups.get(key)!.entries.push(e)}return [...groups.values()].sort((a,b)=>a.course.localeCompare(b.course,'ar')||a.department.localeCompare(b.department)||a.level-b.level);}
export const isOwner=(a:{id:string})=>a.id==='owner';
