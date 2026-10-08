const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const original=Module._load;
const root=path.resolve(__dirname,'..');
Module._load=function(id,parent,isMain){
 if(id==='next/navigation')return {useRouter:()=>({push(){},refresh(){}})};
 if(id.startsWith('@/'))id=path.join(root,id.slice(2));
 return original.call(this,id,parent,isMain);
};
for(const extension of ['.ts','.tsx'])Module._extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const {AccountPanel}=require('../components/account-panel.tsx');
const {TeachingPanel}=require('../components/teaching-panel.tsx');
const data={id:'owner',isOwner:true,email:'nawaf',name:'مالك الاختبار',role:'admin',department:'SE',level:3,canEdit:true,canCancel:true,verifiedCount:3,locations:[],cancellations:[],settings:{},members:[{id:'teacher-1',username:'teacher',name:'مدرس الاختبار',role:'teacher',department:'',level:0,canEdit:0,active:1,instructorId:'instructor-1',entryIds:['lecture-1']}],instructors:[{id:'instructor-1',name:'مدرس الاختبار',title:'د.',scheduleName:'د. مدرس الاختبار',aliases:[]}],assignedEntryIds:['lecture-1'],entries:[{id:'lecture-1',day:4,department:'SE',level:3,start:'08:00',end:'10:00',course:'المقرر المشترك',instructor:'د. مدرس الاختبار',room:'403',kind:'محاضرة',groupName:'',source:'test'},{id:'lecture-2',day:4,department:'IT',level:3,start:'10:00',end:'12:00',course:'المقرر المشترك',instructor:'د. مدرس الاختبار',room:'404',kind:'محاضرة',groupName:'',source:'test'}]};
const account=props=>renderToStaticMarkup(React.createElement(AccountPanel,{data:{...data,...props},refresh:async()=>{}}));
const tests=[
 ['owner can see administrator option',()=>assert.match(account({}),/<option value="admin">مدير<\/option>/)],
 ['manager cannot see administrator creation option',()=>assert(!account({id:'manager',isOwner:false}).includes('<option value="admin">'))],
 ['teacher account page has no account management',()=>{const html=account({id:'teacher',role:'teacher',isOwner:false});assert(!html.includes('الحسابات والصلاحيات'));assert(html.includes('كلمة المرور الحالية'))}],
 ['account forms have stable navigation targets',()=>{const html=account({});assert(html.includes('id="account-form"'));assert(html.includes('id="instructor-form"'));assert(html.includes('إنشاء حساب'));assert(html.includes('تعديل البيانات'))}],
 ['instructor title list includes configured academic degree',()=>assert(account({}).includes('<option value="د.">'))],
 ['teacher panel restricts sections and course listing',()=>{const html=renderToStaticMarkup(React.createElement(TeachingPanel,{data:{...data,role:'teacher'},refresh:async()=>{}}));assert(html.includes('1 موعد أسبوعي'));assert(html.includes('<option>SE</option>'));assert(!html.includes('<option>IT</option>'));assert(html.includes('الأسبوع من السبت إلى الجمعة'))}],
 ['unassigned teacher has no cancellation controls',()=>{const html=renderToStaticMarkup(React.createElement(TeachingPanel,{data:{...data,role:'teacher',assignedEntryIds:[]},refresh:async()=>{}}));assert(html.includes('لم تُسند لك محاضرات بعد'));assert(!html.includes('معاينة المحاضرات المتأثرة'))}],
 ['user-controlled names are escaped as text',()=>{const html=account({name:'<script>alert(1)</script>'});assert(!html.includes('<script>alert(1)</script>'));assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))}],
];
for(const [name,run] of tests){run();console.log('PASS: '+name)}
console.log('RESULT: '+tests.length+' component rendering cases passed; browser interaction and layout are separate checks.');
