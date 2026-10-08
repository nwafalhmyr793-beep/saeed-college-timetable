# جدول كلية السعيد

نظام عربي لإدارة وعرض الجداول الدراسية لكلية السعيد في جامعة تعز، مع حساب رئيسي ومديرين ومناديب ومدرسين، وصلاحيات محددة لكل دور.

هذه النسخة مستقلة عن ChatGPT وSites. لا تتطلب حساب OpenAI أو تسجيل دخول عبره، ولا ترتبط بالموقع المستضاف سابقًا. الدخول بحسابات النظام وكلمات المرور، والاستضافة وقاعدة البيانات في حساب Cloudflare الذي تحدده أنت.

## الوظائف

- البحث والتصفية بحسب المقرر والمدرس والقسم والمستوى واليوم والقاعة.
- إدارة الجدول الأسبوعي وتغيير قاعة موعد معين والتحقق من الحجوزات المسجلة.
- إنشاء حسابات المدرسين وإسناد محاضراتهم بمربعات اختيار؛ المواعيد الجديدة تحتاج إلى إسناد صريح.
- إلغاء المدرس محاضرة واحدة أو محاضرات يوم أو أسبوع محدد ضمن صلاحياته، واستعادتها.
- إرسال إشعارات داخل النظام إلى المندوب النشط المطابق لقسم المحاضرة ومستواها عند إلغاء المدرس أو استعادته موعدًا. تصل الإشعارات عند فتح الحساب، وتتحدث كل دقيقة وأثناء العودة إلى الصفحة.
- تقارير وسجل عمليات، مع حماية إدارة حسابات المديرين للحساب الرئيسي.

## المتطلبات

Node.js 22.13 أو أحدث، ويفضل إصدار LTS حديث. تحقق من أن `node` و`npx` يستخدمان الإصدار نفسه، خاصة عند وجود أكثر من إصدار على Fedora:

```sh
node --version
npx --version
```

التطبيق يستخدم React وTypeScript وVinext، وخادم Cloudflare Workers وقاعدة D1. التشغيل المحلي يتم عبر Wrangler. لا يُشغّل مباشرة بخادم PHP أو Apache أو MySQL.

## التثبيت والتشغيل المحلي

نفّذ الأوامر من المجلد الذي يحتوي على `package.json`:

```sh
git clone https://github.com/nwafalhmyr793-beep/saeed-college-timetable.git
cd saeed-college-timetable
npx --yes pnpm@11.25.0 install --frozen-lockfile
node scripts/standalone.mjs build
node scripts/standalone.mjs migrate --local
node scripts/standalone.mjs owner
node scripts/standalone.mjs start
```

أمر `owner` يطلب كلمة مرور جديدة بصورة مخفية؛ اسم المستخدم الرئيسي `nawaf`. لا توجد كلمات مرور جاهزة في المصدر. افتح `http://localhost:8787` وسجل الدخول. بيانات التشغيل المحلي منفصلة عن الموقع المنشور.

## النشر إلى حساب Cloudflare مستقل

```sh
node node_modules/wrangler/bin/wrangler.js login
node node_modules/wrangler/bin/wrangler.js d1 create saeed-college-db
node scripts/standalone.mjs build
node scripts/standalone.mjs configure YOUR_D1_DATABASE_UUID
node scripts/standalone.mjs migrate --remote
node scripts/standalone.mjs owner
node scripts/standalone.mjs secret
node scripts/standalone.mjs deploy
```

استبدل `YOUR_D1_DATABASE_UUID` بمعرف قاعدة D1 الذي أعاده Cloudflare. إذا سبق أن نفذت `owner` محليًا، استخدم الملف المحلي الموجود ولا تكرر الأمر. بعد النشر افتح رابط Worker الذي أعاده أمر `deploy`. يمكنك ربط نطاقك من لوحة Cloudflare.

إعدادات النشر في `standalone.config.json`. قاعدة جديدة تبدأ بالجدول الأساسي ذي 614 موعدًا، ولا تنقل تلقائيًا الحسابات أو الإلغاءات أو التعديلات من أي استضافة أخرى. بيانات التشغيل المحلي منفصلة عن قاعدة الإنتاج.

لا ترفع `.dev.vars` أو ملفات `.env` أو قاعدة التشغيل المحلي أو بيانات الحسابات والجلسات إلى GitHub. حساب `nawaf` يُنشأ بكلمة المرور التي تختارها؛ المدرسون والمناديب والمديرون يُضافون من الإدارة. لا يتضمن المصدر كلمات مرور جاهزة أو حسابًا مرتبطًا بهوية خارجية.

النسخة تعتمد على Cloudflare Workers وD1. نقلها إلى VPS مع Node.js وقاعدة SQLite أو PostgreSQL يحتاج تعديل طبقة الخادم وقاعدة البيانات؛ الاستقلال عن ChatGPT لا يغيّر هذه المتطلبات.

## التحقق

```sh
node node_modules/typescript/bin/tsc --noEmit --incremental false
node tests/teaching-permissions.cjs
```

تختبر مجموعة الصلاحيات قاعدة SQLite مؤقتة دون الاتصال ببيانات الموقع الحية، بما يشمل نطاق المدرس، وصلاحيات المدير، وحدود الأسبوع، والإشعارات وخصوصيتها والاستعادة.
