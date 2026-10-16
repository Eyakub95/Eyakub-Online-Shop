# বাজার হিসাব (অ্যাডমিন-অনলি) — Supabase + GitHub সংস্করণ

মেসের বাজার, রান্নার পালা ও রিয়ালের হিসাব। **শুধু অ্যাডমিন পাসওয়ার্ড দিয়ে** খোলা যায়।

## তথ্য কীভাবে কখনো হারাবে না (৫ স্তরের নিরাপত্তা)

| স্তর | কী করে |
|---|---|
| ১. অ্যাপ | "মুছুন" বলে কিছু নেই — চাপলে "ট্র্যাশে" যায়, সেখান থেকে ফেরত আনা যায় |
| ২. ডেটাবেস | Supabase-এ `DELETE` ও `TRUNCATE` ডেটাবেস নিজেই আটকায় (অ্যাপে বাগ থাকলেও, অন্য কেউ চেষ্টা করলেও) |
| ৩. পরিবর্তনের লগ | প্রতিটি যোগ/বদলের আগের-পরের রূপ `audit_log` টেবিলে চিরতরে জমা থাকে (বদলানো বা মোছাও যায় না) |
| ৪. GitHub ব্যাকআপ | প্রতিদিন রাতে সব তথ্য আপনার **প্রাইভেট** GitHub repository-তে JSON ফাইলে জমা হয় (গিটের ইতিহাসে প্রতিদিনের কপি থাকে) |
| ৫. নিজের ফাইল | সেটিংস → "ব্যাকআপ ফাইল নামান" |

> ⚠️ **গুরুত্বপূর্ণ:** অ্যাপের repository **Public** হলেও চলে (ওতে কোনো হিসাব থাকে না)। কিন্তু **ব্যাকআপ repository অবশ্যই Private** রাখবেন — ওতে আপনার সব হিসাব থাকবে।

---

## ফাইলের তালিকা
```
index.html, css/app.css, js/*.js, sw.js, manifest.webmanifest, logo.svg, icon-*.png, favicon.*   ← অ্যাপ
supabase/schema.sql                                                                          ← ডেটাবেস সেটআপ (Supabase-এ চালাতে হবে)
scripts/backup.mjs, .github/workflows/backup.yml                                              ← প্রতিদিনের অটো-ব্যাকআপ
```

---

## ধাপ ১ — Supabase প্রজেক্ট (প্রায় ১০ মিনিট)

1. **supabase.com** → Sign in (GitHub দিয়ে ঢোকা সহজ) → **New project**।
   নাম `bazar-hisab`, একটা Database Password দিন (কোথাও লিখে রাখুন), Region: কাছের একটা (যেমন Mumbai/Singapore) → **Create**।
2. প্রজেক্ট তৈরি হলে বাঁ মেনুতে **SQL Editor → New query**।
3. এই প্যাকেজের `supabase/schema.sql` ফাইল খুলে **পুরো লেখা কপি** করে বসান।
   ওপরের দিকে `admin_email text := 'আপনার-ইমেইল@gmail.com'` লাইনে **নিজের ইমেইল** লিখুন → **Run**।
   "Success. No rows returned" এলে ডেটাবেস তৈরি।
4. বাঁ মেনু **Authentication → Users → Add user → Create new user**:
   Email = ওই একই ইমেইল, Password = আপনার **অ্যাডমিন পাসওয়ার্ড** (অ্যাপে ঢোকার পাসওয়ার্ড), **Auto Confirm User** টিক দিন → Create।
5. **Authentication → Sign In / Providers** (বা Settings) থেকে **"Allow new users to sign up"** বন্ধ (off) করে Save করুন — যাতে আর কেউ নতুন অ্যাকাউন্ট বানাতে না পারে।
   (বন্ধ না করলেও অন্য কেউ ডেটা দেখতে পারবে না, তবু বন্ধ রাখা ভালো।)
6. **Project Settings → API** থেকে দুটো জিনিস কপি করে রাখুন:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** key
   - (ধাপ ৪-এর জন্য) **service_role** key — এটা **গোপন**, কোথাও ছাপবেন না, অ্যাপের ফাইলে বসাবেন না।

## ধাপ ২ — GitHub-এ অ্যাপ আপলোড

1. github.com → **New repository** → নাম `bazar-hisab` → **Public** → Create।
2. **uploading an existing file** চাপুন → zip খুলে **সব ফোল্ডার ও ফাইল** (`.github` ফোল্ডারসহ) একসাথে টেনে আনুন → **Commit changes**।
   > ফোনের ব্রাউজারে ফোল্ডার আপলোড কঠিন। কম্পিউটার থেকে করা সহজ। অথবা GitHub Desktop / `git push` ব্যবহার করুন।
   > `.github` লুকানো ফোল্ডার — না দেখালে ফাইল-ম্যানেজারে "hidden files দেখান" চালু করুন।
3. `js/config.js` ফাইল GitHub-এ খুলে ✏ চাপুন, ৩টা লেখা বসান:
   ```js
   supabaseUrl: "https://xxxx.supabase.co",
   supabaseAnonKey: "eyJ...(anon public key)...",
   adminEmail: "আপনার-ইমেইল@gmail.com",
   ```
   → **Commit changes**।
4. **Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save**।
5. ১-২ মিনিট পর লিংক: `https://আপনার-ইউজারনেম.github.io/bazar-hisab/` — ফোনে খুলে পাসওয়ার্ড দিয়ে ঢুকুন।

## ধাপ ৩ — GitHub-এ প্রতিদিনের অটো-ব্যাকআপ (ঐচ্ছিক, কিন্তু খুব ভালো)

এতে Supabase-এর সব তথ্য প্রতিদিন আপনার GitHub-এ কপি হবে এবং Supabase ফ্রি প্ল্যানের "৭ দিন না ঢুকলে প্রজেক্ট ঘুমিয়ে পড়া" সমস্যাও আটকাবে।

1. GitHub-এ আরেকটা repository বানান: নাম `bazar-hisab-backup`, **Private**, "Add a README file" টিক দিন → Create।
2. **Personal access token** বানান: GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens → Generate new token**।
   Repository access = **Only select repositories → bazar-hisab-backup**। Permissions → **Contents: Read and write**। Generate করে টোকেন কপি করুন।
3. অ্যাপের repository `bazar-hisab` → **Settings → Secrets and variables → Actions → New repository secret** — ৪টা secret বানান:

   | নাম | মান |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_SERVICE_KEY` | service_role key (গোপন) |
   | `BACKUP_REPO` | `আপনার-ইউজারনেম/bazar-hisab-backup` |
   | `BACKUP_TOKEN` | ওপরে বানানো টোকেন |

4. **Actions** ট্যাব → **প্রতিদিনের ব্যাকআপ** → **Run workflow** চাপুন। সবুজ টিক এলে `bazar-hisab-backup/data/` ফোল্ডারে ফাইল দেখবেন।
   এরপর প্রতিদিন রাত ২৩:৩০ (সৌদি সময়) নিজে নিজে চলবে।
   > GitHub কখনো কখনো ৬০ দিন নিষ্ক্রিয় public repository-র শিডিউল বন্ধ করে দেয়। ইমেইল এলে Actions ট্যাবে গিয়ে আবার চালু করে দেবেন।

## ধাপ ৪ — ফোনে ইনস্টল
- **Android (Chrome):** লিংক খুলুন → ⋮ মেনু → **Install app / Add to Home screen**।
- **iPhone (Safari):** Share → **Add to Home Screen**।

---

## পুরোনো (Firebase) অ্যাপের তথ্য আনা
1. **পুরোনো অ্যাপ** খুলে সেটিংস → **ব্যাকআপ ফাইল নামান** চাপুন (বা "লেখা হিসেবে কপি")।
2. **নতুন অ্যাপ** → সেটিংস → **ব্যাকআপ ও পুরোনো তথ্য আনা** → ফাইল বেছে নিন (বা লেখা বসিয়ে "ফিরিয়ে আনুন")।
3. সদস্য, বাজার, খাওয়া, ট্র্যাশ ও ছবি সব আসবে। আগের তথ্য মুছবে না, শুধু যোগ হবে। একই ফাইল দুইবার দিলেও দ্বিগুণ হবে না।

## অ্যাপ আপডেট করতে
নতুন ফাইল আপলোড করুন। ফোনে নতুন সংস্করণ দ্রুত পৌঁছাতে `sw.js`-এর `VERSION` (`bazar-hisab-v4-1`) এক ধাপ বাড়ান।

## পাসওয়ার্ড ভুলে গেলে
লগইন পর্দায় **"পাসওয়ার্ড ভুলে গেছেন?"** চাপুন — ইমেইলে লিংক যাবে, লিংকে ঢুকে নতুন পাসওয়ার্ড দিন।
(Supabase-এর ফ্রি ইমেইল দিনে অল্প সংখ্যক পাঠাতে পারে। না এলে Supabase → Authentication → Users থেকে নিজেই পাসওয়ার্ড বদলে দিতে পারবেন।)

## সতর্কতা
- `service_role` key শুধু GitHub Secrets-এ থাকবে; `js/config.js` বা অন্য কোনো ফাইলে নয়।
- Supabase প্রজেক্ট বা ব্যাকআপ repository কখনো Delete করবেন না।
- Supabase ফ্রি প্ল্যানে নিজস্ব অটো-ব্যাকআপ নেই — তাই ধাপ ৩ করে রাখা উচিত।
- সব তথ্য দেখতে চাইলে Supabase → **Table Editor** (members, entries, meals, settings, audit_log)।

## আগের সংস্করণ থেকে কী বদলেছে
- ডেটাবেস: Firebase Firestore → **Supabase (PostgreSQL)**; লগইন: Firebase Auth → **Supabase Auth**।
- ডেটাবেস নিজেই মোছা আটকায়; প্রতিটি বদলের লগ থাকে; প্রতিদিন GitHub-এ কপি।
- নতুন ডিজাইন: হালকা/গাঢ় থিম (ফোনের সেটিং অনুযায়ী), পরিষ্কার কার্ড, স্টিকি হেডার।
- কোড ভাগ করা: `js/` ফোল্ডারে আলাদা ফাইল (`store.js` ডেটা, `views.js` পর্দা, `domain.js` হিসাব, `main.js` লগইন ও ক্লিক)।
- অফলাইনে লিখলে ফোনে জমে থাকে, নেট এলে নিজে Supabase-এ যায়; কোনো লেখা ডেটাবেস না নিলে হারায় না, আলাদা করে রাখা হয়।
