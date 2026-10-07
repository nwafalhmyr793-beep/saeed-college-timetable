import imported from './schedule-data.json';
import extra from './schedule-45.json';
export type Entry = {id:string;day:number;department:string;level:number;start:string;end:string;course:string;instructor:string;room:string;groupName:string;kind:string;source:string};
export const seed = [...imported, ...extra] as Entry[];
export const days=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
export const departments=['COM','IT','SE','IMSE','MRE','CND','AIDS','RE'];
