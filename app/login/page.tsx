'use client';
import { useState } from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
export default function LoginPage(){
 const router=useRouter();
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="delegateLogin" dir="rtl"><Link href="/">العودة إلى الجدول</Link><section><h1>تسجيل الدخول</h1><p>استخدم اسم المستخدم وكلمة المرور التي أنشأها لك مسؤول الموقع.</p><form onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{const response=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',username:username.trim(),password})});const result=await response.json() as {error?:string};if(!response.ok)throw Error(result.error||'تعذر تسجيل الدخول');router.push('/');router.refresh()}catch(e){setError(e instanceof Error?e.message:'تعذر الاتصال. أعد المحاولة.');setBusy(false)}}}><label>اسم المستخدم<input required name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} dir="ltr" value={username} onChange={e=>setUsername(e.target.value)}/></label><label>كلمة المرور<input required name="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="failure" role="alert">{error}</p>}<button className="primary" disabled={busy} type="submit">{busy?'جارٍ تسجيل الدخول…':'تسجيل الدخول'}</button></form><p>صلاحياتك مرتبطة بدورك والمقررات أو الأقسام المخصصة لك. إذا لم يكن لديك حساب أو نسيت كلمة المرور، تواصل مع مسؤول الموقع.</p></section></main>;
}
