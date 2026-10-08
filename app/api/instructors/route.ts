import {readJsonObject,InvalidRequestError,validText} from '../../../lib/validation';
import {NextRequest,NextResponse} from 'next/server';
import {account,db} from '../../../lib/accounts';
import {allEntries} from '../schedule/route';
import {instructorCatalog,instructorLabel} from '../../../lib/teaching';
export async function POST(req:NextRequest){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'طلب غير مسموح'},{status:403});
 const actor=await account();if(actor?.role!=='admin')return NextResponse.json({error:'إدارة المدرسين للمدير فقط'},{status:403});
 const b=await readJsonObject(req) as {id?:string;name?:string;title?:string};if(!validText(b.name,120)||(b.title!==undefined&&typeof b.title!=='string')||(b.id!==undefined&&b.id!==''&&!validText(b.id,200)))return NextResponse.json({error:'أدخل بيانات المدرس بصورة صحيحة'},{status:400});const name=String(b.name||'').trim(),title=String(b.title||'').trim();
 if(!name||name.length>120||title.length>40)return NextResponse.json({error:'أدخل اسم المدرس ولقبه بصورة صحيحة'},{status:400});
 const profiles=await instructorCatalog(db(),await allEntries()),old=b.id?profiles.find(p=>p.id===b.id):null;
 if(b.id&&!old)return NextResponse.json({error:'المدرس غير موجود'},{status:404});
 const label=instructorLabel({name,title});if(profiles.some(p=>p.id!==old?.id&&instructorLabel(p)===label))return NextResponse.json({error:'المدرس موجود بالفعل'},{status:409});
 const id=old?.id||crypto.randomUUID(),aliases=old?[...new Set([...old.aliases,old.scheduleName,instructorLabel(old),label])]:[label];
 await db().batch([
 db().prepare('INSERT INTO instructors(id,name,title,schedule_name,aliases_json) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,title=excluded.title,aliases_json=excluded.aliases_json').bind(id,name,title,old?.scheduleName||label,JSON.stringify(aliases)),
 db().prepare("UPDATE accounts SET name=? WHERE instructor_id=? AND role='teacher'").bind(label,id)
 ]);return NextResponse.json({ok:true});
 }catch(e){if(e instanceof InvalidRequestError)return NextResponse.json({error:e.message},{status:400});console.error(e);return NextResponse.json({error:'تعذر حفظ بيانات المدرس'},{status:503})}}
