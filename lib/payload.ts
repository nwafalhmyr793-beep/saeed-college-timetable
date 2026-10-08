import type {Entry} from '../data';
import type {Cancellation} from '../availability';
import type {Instructor} from './teaching';

export type Member = {
  id:string; username:string; name:string; role:string; department:string;
  level:number; canEdit:number; active:number; instructorId?:string|null; entryIds:string[];
};
export type SchedulePayload = {
  id?:string; isOwner?:boolean; assignedEntryIds?:string[]; instructors?:Instructor[];
  name?:string; department?:string; level?:number;
  locations:{entryId:string;date:string;room:string;reason:string}[];
  entries:Entry[]; cancellations:Cancellation[]; settings:Record<string,string>;
  members:Member[]; role:string; email:string; canEdit:boolean; canCancel:boolean; verifiedCount:number;
};
