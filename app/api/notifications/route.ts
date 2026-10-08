import {readJsonObject,InvalidRequestError} from '../../../lib/validation';
import {NextRequest,NextResponse} from 'next/server';
import {account,db} from '../../../lib/accounts';
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
export async function GET(req:NextRequest){try{
 const actor=await account();if(!actor)return fail('سجل الدخول لعرض الإشعارات',401);if(actor.role!=='delegate')return fail('الإشعارات مخصصة لحساب المندوب',403);
 const offset=Number(req.nextUrl.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)return fail('صفحة غير صحيحة',400);
 const [rows,count]=await Promise.all([db().prepare('SELECT id,action,entry_id AS entryId,occurrence_date AS date,actor_name AS actorName,entry_json AS entryJson,reason,created_at AS createdAt,read_at AS readAt FROM notifications WHERE account_id=? ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET ?').bind(actor.id,offset).all<{id:string;action:string;entryId:string;date:string;actorName:string;entryJson:string;reason:string;createdAt:string;readAt:string|null}>(),db().prepare('SELECT COUNT(*) AS count FROM notifications WHERE account_id=? AND read_at IS NULL').bind(actor.id).first<{count:number}>()]);
 return NextResponse.json({notifications:rows.results.slice(0,50).map(({entryJson,...n})=>({...n,entry:JSON.parse(entryJson)})),unread:count?.count||0,nextOffset:rows.results.length>50?offset+50:null},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof InvalidRequestError)return NextResponse.json({error:e.message},{status:400});console.error(e);return fail('تعذر تحميل الإشعارات. أعد المحاولة.',503)}}
export async function POST(req:NextRequest){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return fail('طلب غير مسموح',403);
 const actor=await account();if(!actor)return fail('سجل الدخول أولًا',401);if(actor.role!=='delegate')return fail('هذه العملية للمندوب فقط',403);
 const body=await readJsonObject(req) as {action?:string;id?:string};const time=new Date().toISOString();
 if(body.action==='readAll')await db().prepare('UPDATE notifications SET read_at=? WHERE account_id=? AND read_at IS NULL').bind(time,actor.id).run();
 else if(body.action==='read'&&typeof body.id==='string'){
 const existing=await db().prepare('SELECT id FROM notifications WHERE id=? AND account_id=?').bind(body.id,actor.id).first();if(!existing)return fail('الإشعار غير موجود',404);
 await db().prepare('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND account_id=?').bind(time,body.id,actor.id).run();
 }else return fail('عملية غير صحيحة',400);
 return NextResponse.json({ok:true});
 }catch(e){if(e instanceof InvalidRequestError)return NextResponse.json({error:e.message},{status:400});console.error(e);return fail('تعذر تحديث الإشعار. أعد المحاولة.',503)}}
