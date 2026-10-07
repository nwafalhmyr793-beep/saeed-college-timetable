import { NextRequest,NextResponse } from 'next/server';
import { account,db } from '../../../lib/accounts';
import { reportDates } from '../../../lib/report';
export async function GET(req:NextRequest){
 try{
 const actor=await account();if(!actor)return NextResponse.json({error:'سجل الدخول لعرض سجل العمليات'},{status:401});
 const start=req.nextUrl.searchParams.get('start')||'',count=Number(req.nextUrl.searchParams.get('days')||7),offset=Number(req.nextUrl.searchParams.get('offset')||0);
 const dates=reportDates(start,count);if(!dates.length||!Number.isSafeInteger(offset)||offset<0)return NextResponse.json({error:'فترة غير صحيحة'},{status:400});
 const from=new Date(`${start}T00:00:00+03:00`),until=new Date(+from+count*86400000);
 const department=req.nextUrl.searchParams.get('department')||'',level=req.nextUrl.searchParams.get('level')||'';
 let where='occurred_at>=? AND occurred_at<?';const args:(string|number)[]=[from.toISOString(),until.toISOString()];
 if(actor.role==='teacher'){where+=' AND entry_id IN (SELECT entry_id FROM teaching_assignments WHERE account_id=?)';args.push(actor.id)}else if(actor.role!=='admin'){where+=' AND department=? AND level=?';args.push(actor.department,actor.level)}
 if(department){where+=' AND department=?';args.push(department)}if(level){where+=' AND level=?';args.push(Number(level))}
 const result=await db().prepare(`SELECT * FROM audit_events WHERE ${where} ORDER BY occurred_at DESC,id DESC LIMIT 101 OFFSET ?`).bind(...args,offset).all();
 return NextResponse.json({events:result.results.slice(0,100),nextOffset:result.results.length>100?offset+100:null},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return NextResponse.json({error:'تعذر تحميل سجل العمليات'},{status:503})}
}
