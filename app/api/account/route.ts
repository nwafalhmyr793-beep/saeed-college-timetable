import {readJsonObject,InvalidRequestError,validText} from '../../../lib/validation';
import { NextRequest,NextResponse } from 'next/server';
import { account,bootstrap,db,hash,verify,digest,type Account } from '../../../lib/accounts';
import {isOwner,instructorCatalog} from '../../../lib/teaching';
import {allEntries} from '../schedule/route';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function POST(req:NextRequest){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return fail('طلب غير مسموح',403);
 const b=await readJsonObject(req) as {action:string;id?:string;username:string;name:string;password:string;role:string;department:string;level:number;canEdit?:boolean;active?:boolean;current?:string;instructorId?:string;entryIds?:string[]};
 if(b.action==='login'){
 if(!validText(b.username,120)||typeof b.password!=='string'||b.password.length<1||b.password.length>128)return fail('أدخل اسم المستخدم وكلمة المرور بصورة صحيحة');
 await bootstrap();const supplied=String(b.username||'').trim().toLowerCase().replace(/\s+/g,' ');const username=['نواف محمد علي همام','نواف محمد على همام'].includes(supplied)?'nawaf':supplied;const key=await digest(username);const now=Date.now();
 await db().prepare('INSERT INTO login_attempts(key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END').bind(key,now+900000,now,now).run();
 const attempts=await db().prepare('SELECT count FROM login_attempts WHERE key=?').bind(key).first<{count:number}>();
 if(attempts && attempts.count>10)return fail('محاولات كثيرة. أعد المحاولة بعد ١٥ دقيقة.',429);
 const user=await db().prepare('SELECT * FROM accounts WHERE username=? AND active=1').bind(username).first<Account>();
 if(!user||!await verify(String(b.password||''),user.password_hash!))return fail('اسم المستخدم أو كلمة المرور غير صحيحة.',401);
 await db().prepare('DELETE FROM login_attempts WHERE key=?').bind(key).run();
 const token=crypto.randomUUID()+crypto.randomUUID();await db().prepare('INSERT INTO sessions(token,account_id,expires) VALUES (?,?,?)').bind(await digest(token),user.id,now+86400000).run();
 const r=NextResponse.json({ok:true});r.cookies.set('saeed_session',token,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:86400});return r;
 }
 const a=await account();if(!a)return fail('سجل الدخول أولًا',401);
 if(b.action==='logout'){const r=NextResponse.json({ok:true});r.cookies.set('saeed_session','',{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:0});await db().prepare('DELETE FROM sessions WHERE account_id=?').bind(a.id).run();return r;}
 if(b.action==='password'){
 if(!await verify(String(b.current||''),a.password_hash!))return fail('كلمة المرور الحالية غير صحيحة');
 if(typeof b.password!=='string'||b.password.length<6||b.password.length>128)return fail('كلمة المرور من ٦ إلى ١٢٨ حرفًا');
 await db().batch([db().prepare('UPDATE accounts SET password_hash=? WHERE id=?').bind(await hash(b.password),a.id),db().prepare('DELETE FROM sessions WHERE account_id=?').bind(a.id)]);return NextResponse.json({ok:true});
 }
 if(a.role!=='admin')return fail('هذه العملية للمالك فقط',403);
 if(b.action==='status'){
 if(!validText(b.id,200)||typeof b.active!=='boolean')return fail('حدد الحساب وحالة التفعيل بصورة صحيحة');
 const target=await db().prepare('SELECT id,role FROM accounts WHERE id=?').bind(String(b.id||'')).first<{id:string;role:string}>();
 if(!target)return fail('الحساب غير موجود',404);
 if(target.id==='owner'||target.id===a.id)return fail('لا يمكن تعطيل الحساب الرئيسي أو حسابك الحالي');
 if(target.role==='admin'&&!isOwner(a))return fail('إدارة المديرين للحساب الرئيسي فقط',403);
 await db().batch([db().prepare('UPDATE accounts SET active=? WHERE id=?').bind(b.active?1:0,target.id),db().prepare('DELETE FROM sessions WHERE account_id=?').bind(target.id)]);return NextResponse.json({ok:true});
 }
 if(b.action==='save'){
 if(!validText(b.username,40)||!validText(b.name,120)||(b.id!==undefined&&b.id!==''&&!validText(b.id,200))||(b.canEdit!==undefined&&typeof b.canEdit!=='boolean'))return fail('أكمل بيانات الحساب والصلاحيات بصورة صحيحة');
 if(b.id==='owner')return fail('لا يمكن تغيير صلاحيات الحساب الرئيسي');
 const previous=b.id?await db().prepare('SELECT * FROM accounts WHERE id=?').bind(String(b.id)).first<Account>():null;
 if(b.id&&!previous)return fail('الحساب غير موجود',404);
 if((b.role==='admin'||previous?.role==='admin')&&!isOwner(a))return fail('إنشاء المديرين وإدارة صلاحياتهم للحساب الرئيسي فقط',403);
 if(b.id===a.id)return fail('لا يمكن تغيير صلاحيات حسابك الحالي');
 const scoped=['delegate','deputy'].includes(b.role);
 if(!/^[a-z0-9_.-]{3,40}$/.test(b.username)||!String(b.name||'').trim()||!['admin','teacher','delegate','deputy'].includes(b.role)||(scoped&&(!['COM','IT','SE','IMSE','MRE','CND','AIDS','RE'].includes(b.department)||![1,2,3,4,5].includes(Number(b.level)))))return fail('أكمل بيانات الحساب بصورة صحيحة');
 if((!b.id||b.password)&&(typeof b.password!=='string'||b.password.length<6||b.password.length>128))return fail('كلمة المرور من ٦ إلى ١٢٨ حرفًا');
 const id=b.id||crypto.randomUUID(),password=b.password?await hash(b.password):previous!.password_hash!;
 const duplicate=await db().prepare('SELECT id FROM accounts WHERE username=? AND id<>?').bind(b.username,id).first();if(duplicate)return fail('اسم المستخدم مستخدم بالفعل');
 const mutations:D1PreparedStatement[]=[];
 let instructorId:string|null=null;let assigned:string[]=[];
 if(b.role==='teacher'){
 const entries=await allEntries(),catalog=await instructorCatalog(db(),entries),profile=catalog.find(p=>p.id===b.instructorId);
 if(!profile)return fail('اختر المدرس من سجل المدرسين');
 if(!Array.isArray(b.entryIds)||!b.entryIds.length||b.entryIds.some((x:unknown)=>typeof x!=='string'||!entries.some(e=>e.id===x)))return fail('حدد مقررات المدرس من القائمة');
 assigned=[...new Set(b.entryIds as string[])];instructorId=profile.id;
 const other=await db().prepare("SELECT id FROM accounts WHERE instructor_id=? AND role='teacher' AND id<>?").bind(instructorId,id).first();if(other)return fail('يوجد حساب لهذا المدرس؛ عدّل حسابه الحالي');
 mutations.push(db().prepare('INSERT OR IGNORE INTO instructors(id,name,title,schedule_name,aliases_json) VALUES (?,?,?,?,?)').bind(profile.id,profile.name,profile.title,profile.scheduleName,JSON.stringify(profile.aliases)));
 }
 mutations.push(db().prepare('INSERT INTO accounts(id,username,name,password_hash,role,department,level,can_edit,active,instructor_id) VALUES (?,?,?,?,?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,name=excluded.name,password_hash=excluded.password_hash,role=excluded.role,department=excluded.department,level=excluded.level,can_edit=excluded.can_edit,instructor_id=excluded.instructor_id').bind(id,b.username,String(b.name).trim().slice(0,120),password,b.role,scoped?b.department:'',scoped?Number(b.level):0,b.role==='admin'?1:scoped&&b.canEdit?1:0,instructorId));
 mutations.push(db().prepare('DELETE FROM teaching_assignments WHERE account_id=?').bind(id));
 for(const entryId of assigned)mutations.push(db().prepare('INSERT INTO teaching_assignments(account_id,entry_id) VALUES (?,?)').bind(id,entryId));
 mutations.push(db().prepare('DELETE FROM sessions WHERE account_id=?').bind(id));
 await db().batch(mutations);return NextResponse.json({ok:true});
 }return fail('عملية غير معروفة');
 }catch(e){if(e instanceof InvalidRequestError)return NextResponse.json({error:e.message},{status:400});console.error(e);return fail('تعذر حفظ البيانات. أعد المحاولة.',503);}}
