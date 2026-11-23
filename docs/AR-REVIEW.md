# Arabic review (all screen text)

Every Arabic text in the app, next to its English. Arabic is now the language the app opens in.
How to review: read the Arabic column; write corrections in the "Fix" column, or just tell Claude
"<key>: <new Arabic>". `{name}`, `{n}` etc. are filled in by the app (a medicine name, a number) — keep them.

Also to check (not in this table):
- **Medicine names list** (Arabic spellings of ~50 drugs): `src/data/drugs.ts` — best checked by a pharmacist.
- **Spoken Arabic** (what the voice says, with full vowels): `src/lib/spokenArabic.ts`.
- **Amounts** are built from the `unit.*` words by number (fixed 23 Nov): «حبة واحدة»، «حبتان»، «3 حبات»،
  «11 حبة»، «نصف حبة»، «حبة ونصف»; check the `.two` and `.few` words.


## Login, sign-up, demo account (43)

| Key | English | العربية | Fix |
|---|---|---|---|
| `app.name` | Med Friend | صديقك الطبي | |
| `lang.switchTo` | العربية | English | |
| `lang.switchLabel` | تغيير اللغة إلى العربية | Switch language to English | |
| `db.unreachable` | Cannot reach Med Friend online. Check your internet connection. | تعذّر الاتصال بصديقك الطبي. تأكّد من اتصالك بالإنترنت. | |
| `db.retry` | Try again | حاول مرة أخرى | |
| `db.loadFailed` | Could not load your medicines. Check your internet connection. | تعذّر تحميل أدويتك. تأكّد من اتصالك بالإنترنت. | |
| `db.saveFailed` | Could not save. Check your internet connection and try again. | تعذّر الحفظ. تأكّد من اتصالك بالإنترنت وحاول مرة أخرى. | |
| `db.deleteFailed` | Could not delete. Check your internet connection and try again. | تعذّر الحذف. تأكّد من اتصالك بالإنترنت وحاول مرة أخرى. | |
| `auth.email` | Email | البريد الإلكتروني | |
| `auth.password` | Password | كلمة المرور | |
| `auth.newPassword` | New password (at least {n} characters) | كلمة مرور جديدة ({n} أحرف على الأقل) | |
| `auth.passwordAgain` | Type the password again | اكتب كلمة المرور مرة أخرى | |
| `auth.wait` | Please wait… | لحظة من فضلك… | |
| `auth.login.title` | Log in | تسجيل الدخول | |
| `auth.login.submit` | Log in | دخول | |
| `auth.login.forgot` | Forgot your password? | نسيت كلمة المرور؟ | |
| `auth.login.noAccount` | New to Med Friend? | جديد في صديقك الطبي؟ | |
| `auth.demo` | Use the demo account | استخدم الحساب التجريبي | |
| `auth.demo.note` | The demo account has sample medicines. Anyone with the link can see and change them. | في الحساب التجريبي أدوية للتجربة فقط. يستطيع أي شخص لديه الرابط رؤيتها وتغييرها. | |
| `auth.signup.title` | Create an account | إنشاء حساب | |
| `auth.signup.submit` | Create account | أنشئ الحساب | |
| `auth.signup.haveAccount` | Already have an account? | لديك حساب بالفعل؟ | |
| `auth.signup.checkEmail` | Account created. Open the email we sent you to confirm it, then log in. | تم إنشاء الحساب. افتح الرسالة التي أرسلناها إلى بريدك لتأكيده، ثم سجّل الدخول. | |
| `auth.forgot.title` | Reset your password | إعادة تعيين كلمة المرور | |
| `auth.forgot.hint` | Enter your email. We will send you a link to choose a new password. | أدخل بريدك الإلكتروني وسنرسل لك رابطاً لاختيار كلمة مرور جديدة. | |
| `auth.forgot.submit` | Send the link | أرسل الرابط | |
| `auth.forgot.sent` | If an account exists for this email, we have sent a link. Check your inbox. | إذا كان هناك حساب بهذا البريد فقد أرسلنا إليه رابطاً. تفقّد بريدك الوارد. | |
| `auth.backToLogin` | Back to log in | العودة إلى تسجيل الدخول | |
| `auth.reset.title` | Choose a new password | اختر كلمة مرور جديدة | |
| `auth.reset.submit` | Save new password | احفظ كلمة المرور | |
| `auth.reset.done` | Your new password is saved | تم حفظ كلمة المرور الجديدة | |
| `auth.logout` | Log out | تسجيل الخروج | |
| `auth.signedInAs` | Logged in as | مسجّل الدخول باسم | |
| `auth.err.wrong` | Wrong email or password. | البريد الإلكتروني أو كلمة المرور غير صحيحة. | |
| `auth.err.exists` | An account with this email already exists. Log in instead. | يوجد حساب بهذا البريد بالفعل. سجّل الدخول بدلاً من ذلك. | |
| `auth.err.short` | The password must have at least 8 characters. | يجب أن تتكون كلمة المرور من 8 أحرف على الأقل. | |
| `auth.err.mismatch` | The two passwords are not the same. | كلمتا المرور غير متطابقتين. | |
| `auth.err.email` | Please enter a valid email address. | أدخل بريداً إلكترونياً صحيحاً. | |
| `auth.err.noPassword` | Please enter your password. | أدخل كلمة المرور. | |
| `auth.err.tooMany` | Too many tries. Please wait a few minutes and try again. | محاولات كثيرة. انتظر بضع دقائق ثم حاول مرة أخرى. | |
| `auth.err.notConfirmed` | Please confirm your email first (check your inbox). | أكّد بريدك الإلكتروني أولاً (تفقّد بريدك الوارد). | |
| `auth.err.samePassword` | Choose a password different from the old one. | اختر كلمة مرور مختلفة عن القديمة. | |
| `auth.err.generic` | Something went wrong. Please try again. | حدث خطأ ما. حاول مرة أخرى. | |

## Today and the reminder (46)

| Key | English | العربية | Fix |
|---|---|---|---|
| `home.tagline` | All your medicines in one place, and a reminder for every dose on time. | كل أدويتك في مكان واحد، وتذكير بكل جرعة في وقتها. | |
| `home.addMedication` | Add a medicine | إضافة دواء | |
| `home.empty` | You have not added any medication yet. | لم تُضِف أي دواء بعد. | |
| `home.myMeds` | My medicines | أدويتي | |
| `home.saved` | Medication saved | تم حفظ الدواء | |
| `home.deleted` | Medication deleted | تم حذف الدواء | |
| `today.title` | Today | اليوم | |
| `today.summary` | {taken} of {total} taken | الجرعات المأخوذة: {taken} من {total} | |
| `today.empty` | No doses today. Add a medicine to see your doses. | لا توجد جرعات اليوم. أضف دواءً لتظهر جرعاتك هنا. | |
| `part.morning` | Morning | الصباح | |
| `part.noon` | Noon | الظهر | |
| `part.evening` | Evening | المساء | |
| `part.night` | Night | الليل | |
| `status.upcoming` | Upcoming | لاحقاً | |
| `status.due` | Due now | حان موعدها | |
| `status.missed` | Missed | فاتت | |
| `status.taken` | Taken at {time} | أُخذت الساعة {time} | |
| `status.skipped` | Skipped | تم تخطّيها | |
| `dose.take` | Taken | أخذتها | |
| `dose.skip` | Skip | تخطّي | |
| `dose.undo` | Undo | تراجع | |
| `dose.takeLabel` | I took it: {name} at {time} | أخذتُ {name} الساعة {time} | |
| `dose.skipLabel` | Skip: {name} at {time} | تخطّي {name} الساعة {time} | |
| `dose.undoLabel` | Undo: {name} at {time} | تراجع عن {name} الساعة {time} | |
| `rem.title` | Time for your {part} medicine | حان موعد دواء {part} | |
| `rem.followUp` | Second reminder: did you take it? | تذكير ثانٍ: هل أخذت دواءك؟ | |
| `rem.count` | {n} of {total} | {n} من {total} | |
| `rem.snoozeMin` | Remind me in {n} minutes | ذكّرني بعد {n} دقيقة | |
| `rem.snoozeSec` | Remind me in {n} seconds | ذكّرني بعد {n} ثانية | |
| `status.snoozed` | Snoozed until {time} | مؤجَّلة حتى {time} | |
| `home.count.one` | 1 medicine | دواء واحد | |
| `home.count` | {n} medicines | عدد الأدوية: {n} | |
| `partIn.morning` | morning | الصباح | |
| `partIn.noon` | noon | الظهر | |
| `partIn.evening` | evening | المساء | |
| `partIn.night` | night | الليل | |
| `hero.now` | Take now, {part} | حان موعدها، {part} | |
| `hero.next` | Next dose, {part} | الجرعة التالية، {part} | |
| `hero.snoozed` | Reminder again at {time} | سنذكّرك مرة أخرى الساعة {time} | |
| `hero.done` | Every dose for today has an answer. | سجّلت كل جرعات اليوم. | |
| `hero.take` | I took it | أخذتها | |
| `hero.later` | Remind me later | ذكّرني لاحقاً | |
| `rem.skip` | Skip this dose | تخطَّ هذه الجرعة | |
| `home.savedNoPhoto` | Medication saved, but the photo could not be saved. Add it from this list. | تم حفظ الدواء، لكن تعذّر حفظ الصورة. أضفها من هذه القائمة. | |
| `rem.stockLow` | Only {days} left. Time to get a refill. | {days} فقط. حان وقت شراء علبة جديدة. | |
| `rem.stockOut` | None left. Time to get a refill. | نفد هذا الدواء. حان وقت شراء علبة جديدة. | |

## My medicines (cards, photo, stock, change times) (71)

| Key | English | العربية | Fix |
|---|---|---|---|
| `card.delete` | Delete | حذف | |
| `card.deleteLabel` | Delete {name} | حذف {name} | |
| `card.confirmDelete` | Delete {name}? This cannot be undone. | هل تريد حذف {name}؟ لا يمكن التراجع عن ذلك. | |
| `card.confirmYes` | Yes, delete | نعم، احذف | |
| `card.confirmNo` | Keep it | لا، أبقِه | |
| `med.detail` | {amount}, {often} | {amount}، {often} | |
| `photo.add` | Add a photo | أضف صورة | |
| `photo.addLabel` | Add a photo of {name} | أضف صورة لـ {name} | |
| `photo.change` | Change photo | غيّر الصورة | |
| `photo.changeLabel` | Change the photo of {name} | غيّر صورة {name} | |
| `photo.remove` | Remove photo | احذف الصورة | |
| `photo.removeLabel` | Remove the photo of {name} | احذف صورة {name} | |
| `photo.confirmRemove` | Remove the photo of {name}? | هل تريد حذف صورة {name}؟ | |
| `photo.confirmYes` | Yes, remove | نعم، احذفها | |
| `photo.saving` | Saving photo… | جارٍ حفظ الصورة… | |
| `photo.failed` | The photo could not be saved. Try again. | تعذّر حفظ الصورة. حاول مرة أخرى. | |
| `photo.notImage` | Please choose a photo (an image file). | الرجاء اختيار صورة (ملف صورة). | |
| `photo.alt` | Photo of {name} | صورة {name} | |
| `photo.step.q` | Take a photo of your pill or box | صوّر دواءك أو علبته | |
| `photo.step.hint` | Optional. The photo shows on this medicine and in its reminder, so you can see which one to take. | اختياري. تظهر الصورة مع هذا الدواء وفي تذكيره، لتعرف أي دواء تأخذ. | |
| `photo.step.take` | Take or choose a photo | التقط صورة أو اخترها | |
| `photo.step.retake` | Choose another photo | اختر صورة أخرى | |
| `photo.skip` | Skip for now | ليس الآن | |
| `meds.view.label` | Show | عرض | |
| `meds.view.meds` | Medicines | الأدوية | |
| `meds.view.docs` | Documents | المستندات | |
| `stock.step.q` | The box | علبة الدواء | |
| `stock.step.hint` | Optional. Each time you tap “I took it”, the app counts down what you have and warns you before it runs out. | اختياري. كلما ضغطت «أخذتها» يحسب التطبيق ما بقي لديك، وينبّهك قبل أن ينفد. | |
| `stock.pack.q` | How many are in one box? | كم في العلبة الواحدة؟ | |
| `stock.left.q` | How many are left in the box you are using? | كم بقي في العلبة التي تستعملها الآن؟ | |
| `stock.needPack` | Type how many are in one box. | اكتب كم في العلبة الواحدة. | |
| `stock.needLeft` | Type how many are left. | اكتب كم بقي. | |
| `stock.tooMany` | That is more than one box holds. | هذا أكثر مما تتّسع له علبة واحدة. | |
| `stock.review` | {pack} a box · {left} left | {pack} في العلبة · بقي {left} | |
| `stock.line` | {left} left · {days} | بقي {left} · {days} | |
| `stock.lineOut` | None left | لم يبقَ شيء | |
| `stock.days.0` | less than a day | يكفي أقل من يوم | |
| `stock.days.1` | about 1 day | يكفي نحو يوم واحد | |
| `stock.days.2` | about 2 days | يكفي نحو يومين | |
| `stock.days.few` | about {n} days | يكفي نحو {n} أيام | |
| `stock.days.many` | about {n} days | يكفي نحو {n} يومًا | |
| `stock.low` | Low | قليل | |
| `stock.out` | Out of stock | نفد | |
| `stock.today.low` | {name}: only {days} left. | {name}: {days} فقط. | |
| `stock.today.out` | {name} has run out. | نفد {name}. | |
| `stock.today.action` | Time to get a refill. | حان وقت شراء علبة جديدة. | |
| `stock.newBox` | I got a new box | اشتريت علبة جديدة | |
| `stock.newBoxLabel` | I got a new box of {name} | اشتريت علبة جديدة من {name} | |
| `stock.confirmNewBox` | Add one box of {pack}? | إضافة علبة فيها {pack}؟ | |
| `stock.confirmYes` | Yes, add it | نعم، أضفها | |
| `stock.cancel` | Cancel | إلغاء | |
| `stock.correct` | Correct the count | صحّح العدد | |
| `stock.correctLabel` | Correct the count of {name} | صحّح عدد {name} | |
| `stock.set` | Set the box size | أدخل حجم العلبة | |
| `stock.setLabel` | Set the box size for {name} | أدخل حجم علبة {name} | |
| `stock.save` | Save | حفظ | |
| `stock.saving` | Saving… | جارٍ الحفظ… | |
| `stock.failed` | The count could not be saved. Try again. | تعذّر حفظ العدد. حاول مرة أخرى. | |
| `stock.extra.q` | How many more full boxes do you have? | كم علبة ممتلئة أخرى لديك؟ | |
| `stock.extra.less` | Fewer boxes | علب أقل | |
| `stock.extra.more` | More boxes | علب أكثر | |
| `stock.total.q` | How many do you have now in total? | كم لديك الآن في المجموع؟ | |
| `stock.totalLine` | In total: {n} | المجموع: {n} | |
| `times.change` | Change times | تغيير المواعيد | |
| `times.changeLabel` | Change times for {name} | تغيير مواعيد {name} | |
| `times.title` | New times for {name} | المواعيد الجديدة لدواء {name} | |
| `times.hint` | Doses you already answered stay as they are. The new times start tomorrow. | الجرعات التي سجّلتها تبقى كما هي. تبدأ المواعيد الجديدة من الغد. | |
| `times.save` | Save new times | احفظ المواعيد الجديدة | |
| `times.saving` | Saving… | جارٍ الحفظ… | |
| `times.saved` | New times saved. They start tomorrow. | تم حفظ المواعيد الجديدة. تبدأ من الغد. | |
| `times.tomorrow` | New times start tomorrow. | تبدأ المواعيد الجديدة من الغد. | |

## Add a medicine (steps, forms, units, strength, times) (98)

| Key | English | العربية | Fix |
|---|---|---|---|
| `add.title` | Add medication | إضافة دواء | |
| `add.step` | Step {n} of 6 | الخطوة {n} من 6 | |
| `add.back` | Back | رجوع | |
| `add.cancel` | Cancel | إلغاء | |
| `add.next` | Next | التالي | |
| `add.save` | Save medication | حفظ الدواء | |
| `add.saving` | Saving… | جارٍ الحفظ… | |
| `add.name.q` | What is the medicine's name? | ما اسم الدواء؟ | |
| `add.name.hint` | Type the name on the box. Pick a suggestion or keep what you typed. | اكتب الاسم كما هو على العلبة. اختر من الاقتراحات أو أبقِ ما كتبت. | |
| `add.name.label` | Medicine name | اسم الدواء | |
| `add.name.suggestions` | Suggestions | اقتراحات | |
| `add.strength.label` | Strength (optional) | التركيز (اختياري) | |
| `add.form.q` | What form is it? | ما شكل الدواء؟ | |
| `form.tablet` | Tablet | حبوب | |
| `form.capsule` | Capsule | كبسولات | |
| `form.syrup` | Syrup | شراب | |
| `form.injection` | Injection | حقن | |
| `form.inhaler` | Inhaler | بخاخ | |
| `form.drops` | Drops | قطرة | |
| `form.cream` | Cream / ointment | كريم / مرهم | |
| `form.other` | Other | غير ذلك | |
| `add.amount.q` | How much do you take each time? | كم تأخذ في كل مرة؟ | |
| `add.amount.less` | Less | أقل | |
| `add.amount.more` | More | أكثر | |
| `unit.tablet.one` | tablet | حبة | |
| `unit.tablet.other` | tablets | حبة | |
| `unit.tablet.two` | 2 tablets | حبتان | |
| `unit.tablet.few` | tablets | حبات | |
| `unit.capsule.one` | capsule | كبسولة | |
| `unit.capsule.other` | capsules | كبسولة | |
| `unit.capsule.two` | 2 capsules | كبسولتان | |
| `unit.capsule.few` | capsules | كبسولات | |
| `unit.syrup.one` | ml | مل | |
| `unit.syrup.other` | ml | مل | |
| `unit.syrup.two` | 2 ml | 2 مل | |
| `unit.syrup.few` | ml | مل | |
| `unit.injection.one` | unit | وحدة | |
| `unit.injection.other` | units | وحدة | |
| `unit.injection.two` | 2 units | وحدتان | |
| `unit.injection.few` | units | وحدات | |
| `unit.inhaler.one` | puff | بخّة | |
| `unit.inhaler.other` | puffs | بخّة | |
| `unit.inhaler.two` | 2 puffs | بخّتان | |
| `unit.inhaler.few` | puffs | بخّات | |
| `unit.drops.one` | drop | نقطة | |
| `unit.drops.other` | drops | نقطة | |
| `unit.drops.two` | 2 drops | نقطتان | |
| `unit.drops.few` | drops | نقاط | |
| `unit.cream.one` | application | دهنة | |
| `unit.cream.other` | applications | دهنة | |
| `unit.cream.two` | 2 applications | دهنتان | |
| `unit.cream.few` | applications | دهنات | |
| `unit.other.one` | dose | جرعة | |
| `unit.other.other` | doses | جرعة | |
| `unit.other.two` | 2 doses | جرعتان | |
| `unit.other.few` | doses | جرعات | |
| `add.times.q` | How many times a day? | كم مرة في اليوم؟ | |
| `add.times.hint` | Change a time if you need to. | يمكنك تغيير أي موعد. | |
| `add.times.timeLabel` | Time of dose {n} | موعد الجرعة {n} | |
| `perDay.1` | Once a day | مرة واحدة يومياً | |
| `perDay.2` | Twice a day | مرتين يومياً | |
| `perDay.3` | 3 times a day | 3 مرات يومياً | |
| `perDay.4` | 4 times a day | 4 مرات يومياً | |
| `add.review.title` | Check and save | راجِع واحفظ | |
| `add.review.name` | Name | الاسم | |
| `add.review.strength` | Strength | التركيز | |
| `add.review.form` | Form | الشكل | |
| `add.review.amount` | Each time | في كل مرة | |
| `add.review.times` | Times | المواعيد | |
| `add.strength.hint` | Type the number on the box, then choose the unit. | اكتب الرقم المكتوب على العلبة، ثم اختر الوحدة. | |
| `add.strength.number` | Strength number | رقم التركيز | |
| `add.strength.unit` | Strength unit | وحدة التركيز | |
| `add.strength.needUnit` | Choose a unit, or clear the number. | اختر الوحدة، أو امسح الرقم. | |
| `add.strength.needNumber` | Type the number, or tap the unit again to clear it. | اكتب الرقم، أو اضغط على الوحدة مرة أخرى لإلغائها. | |
| `strength.mg` | mg | ملغ | |
| `strength.mcg` | mcg | مكغ | |
| `strength.g` | g | غ | |
| `strength.ml` | ml | مل | |
| `strength.unit` | units | وحدة | |
| `strength.percent` | % | % | |
| `often.1` | once a day | مرة واحدة يومياً | |
| `often.2` | twice a day | مرتين يومياً | |
| `often.3` | 3 times a day | 3 مرات يومياً | |
| `often.4` | 4 times a day | 4 مرات يومياً | |
| `add.times.dose` | Dose {n} | الجرعة {n} | |
| `add.times.modeLabel` | How to set dose {n} | طريقة تحديد الجرعة {n} | |
| `add.times.mode.clock` | Clock time | ساعة محددة | |
| `add.times.mode.moment` | A moment in my day | وقت من يومي | |
| `add.times.prayers` | After a prayer | بعد الصلاة | |
| `add.times.ramadan` | Ramadan | رمضان | |
| `add.times.meals` | Meals | الوجبات | |
| `add.times.relation` | Before, with or after the meal | قبل الوجبة أو معها أو بعدها | |
| `add.times.pick` | Choose a moment. | اختر وقتاً. | |
| `add.times.chosen` | {anchor}: today at {time} | {anchor}: اليوم الساعة {time} | |
| `add.times.prayerOff` | Prayer and Ramadan times are off. You can turn them on in Settings. | أوقات الصلاة ورمضان متوقفة. يمكنك تشغيلها من الإعدادات. | |
| `add.times.same` | Two doses are at the same time ({time}). Please choose different times. | جرعتان في الوقت نفسه ({time}). يُرجى اختيار أوقات مختلفة. | |
| `add.review.photo` | Photo | الصورة | |
| `add.review.box` | Box | العلبة | |

## Moments in my day (prayers and meals) (27)

| Key | English | العربية | Fix |
|---|---|---|---|
| `anchor.fajr` | After Fajr | بعد صلاة الفجر | |
| `anchor.dhuhr` | After Dhuhr | بعد صلاة الظهر | |
| `anchor.asr` | After Asr | بعد صلاة العصر | |
| `anchor.maghrib` | After Maghrib | بعد صلاة المغرب | |
| `anchor.isha` | After Isha | بعد صلاة العشاء | |
| `anchor.suhoor` | With Suhoor | مع السحور | |
| `anchor.iftar` | With Iftar | مع الإفطار | |
| `anchor.breakfast:before` | Before breakfast | قبل الفطور | |
| `anchor.breakfast:with` | With breakfast | مع الفطور | |
| `anchor.breakfast:after` | After breakfast | بعد الفطور | |
| `anchor.lunch:before` | Before lunch | قبل الغداء | |
| `anchor.lunch:with` | With lunch | مع الغداء | |
| `anchor.lunch:after` | After lunch | بعد الغداء | |
| `anchor.dinner:before` | Before dinner | قبل وجبة العشاء | |
| `anchor.dinner:with` | With dinner | مع وجبة العشاء | |
| `anchor.dinner:after` | After dinner | بعد وجبة العشاء | |
| `meal.breakfast` | Breakfast | الفطور | |
| `meal.lunch` | Lunch | الغداء | |
| `meal.dinner` | Dinner | وجبة العشاء | |
| `rel.before` | Before | قبل | |
| `rel.with` | With | مع | |
| `rel.after` | After | بعد | |
| `prayer.fajr` | Fajr | الفجر | |
| `prayer.dhuhr` | Dhuhr | الظهر | |
| `prayer.asr` | Asr | العصر | |
| `prayer.maghrib` | Maghrib | المغرب | |
| `prayer.isha` | Isha | العشاء | |

## My documents (36)

| Key | English | العربية | Fix |
|---|---|---|---|
| `docs.title` | My documents | مستنداتي | |
| `docs.count.one` | 1 document | مستند واحد | |
| `docs.count` | {n} documents | عدد المستندات: {n} | |
| `docs.add` | Add a document | أضف مستندًا | |
| `docs.empty` | No documents yet. Add a lab result or prescription. | لا توجد مستندات بعد. أضف نتيجة مختبر أو وصفة طبية. | |
| `docs.emptyType` | No documents of this type. | لا توجد مستندات من هذا النوع. | |
| `docs.filter.label` | Show documents | عرض المستندات | |
| `docs.filter.all` | All | الكل | |
| `docs.filter.lab` | Lab results | نتائج المختبر | |
| `docs.filter.prescription` | Prescriptions | الوصفات الطبية | |
| `docs.filter.report` | Medical reports | التقارير الطبية | |
| `docs.filter.other` | Other | أخرى | |
| `docs.type.lab` | Lab result | نتيجة مختبر | |
| `docs.type.prescription` | Prescription | وصفة طبية | |
| `docs.type.report` | Medical report | تقرير طبي | |
| `docs.type.other` | Other | أخرى | |
| `docs.new` | New document | مستند جديد | |
| `docs.type.q` | What kind of document is it? | ما نوع هذا المستند؟ | |
| `docs.type.required` | Choose the kind of document. | اختر نوع المستند. | |
| `docs.date.label` | Date of the document | تاريخ المستند | |
| `docs.date.future` | The date cannot be in the future. | لا يمكن أن يكون التاريخ في المستقبل. | |
| `docs.date.missing` | Choose the date of the document. | اختر تاريخ المستند. | |
| `docs.name.label` | Name (optional) | الاسم (اختياري) | |
| `docs.name.hint` | For example: Blood test – Dr. Ahmad | مثلًا: فحص دم – د. أحمد | |
| `docs.save` | Save document | احفظ المستند | |
| `docs.saving` | Saving document… | جارٍ حفظ المستند… | |
| `docs.saved` | Document saved | حُفظ المستند | |
| `docs.deleted` | Document deleted | حُذف المستند | |
| `docs.failed` | The document could not be saved. Try again. | تعذّر حفظ المستند. حاول مرة أخرى. | |
| `docs.wrongType` | Only photos and PDF files can be added. | يمكن إضافة الصور وملفات PDF فقط. | |
| `docs.tooBig` | This file is too big (max 10 MB). | الملف كبير جدًا (الحد الأقصى 10 ميغابايت). | |
| `docs.pdf` | PDF file | ملف PDF | |
| `docs.openPdf` | Open the PDF | افتح ملف PDF | |
| `docs.alt` | Photo of the document | صورة المستند | |
| `docs.delete` | Delete document | احذف المستند | |
| `docs.confirmDelete` | Delete this document? This cannot be undone. | هل تريد حذف هذا المستند؟ لا يمكن التراجع عن ذلك. | |

## Progress (20)

| Key | English | العربية | Fix |
|---|---|---|---|
| `progress.title` | Progress | التقدّم | |
| `progress.overall` | Overall | الإجمالي | |
| `progress.last7` | Last 7 days | آخر 7 أيام | |
| `progress.last30` | Last 30 days | آخر 30 يوماً | |
| `progress.taken` | {n} of {total} doses taken | أُخذت {n} من {total} جرعة | |
| `progress.noData` | Not enough data yet | لا توجد بيانات كافية بعد | |
| `progress.noDataShort` | — | — | |
| `progress.perMed` | Each medicine | كل دواء | |
| `progress.days7` | 7 days | 7 أيام | |
| `progress.days30` | 30 days | 30 يوماً | |
| `progress.onTime` | {n} of {total} taken on time (within 1 hour) | {n} من {total} أُخذت في وقتها (خلال ساعة) | |
| `progress.log` | Dose log | سجلّ الجرعات | |
| `progress.showAll` | Show {n} days | اعرض {n} يوماً | |
| `progress.period` | Period | المدة | |
| `progress.sentence` | You took {n} of {total} doses ({pct}%). | أخذت {n} من {total} جرعة ({pct}%). | |
| `progress.days` | Doses taken each day | الجرعات المأخوذة كل يوم | |
| `progress.dayValue` | {n} of {total} | {n} من {total} | |
| `progress.today` | Today | اليوم | |
| `progress.seeAll` | See every dose | اعرض كل الجرعات | |
| `progress.hideAll` | Hide the dose list | أخفِ قائمة الجرعات | |

## Summary for my doctor (and WhatsApp text) (36)

| Key | English | العربية | Fix |
|---|---|---|---|
| `profile.title` | My details | بياناتي | |
| `profile.name` | Your name | اسمك | |
| `profile.year` | Year of birth (optional) | سنة الميلاد (اختياري) | |
| `profile.save` | Save my details | احفظ بياناتي | |
| `profile.saving` | Saving… | جارٍ الحفظ… | |
| `profile.saved` | Your details are saved. | تم حفظ بياناتك. | |
| `profile.err.name` | Please type your name. | اكتب اسمك من فضلك. | |
| `profile.err.year` | Type a year between 1900 and this year, or leave it empty. | اكتب سنة بين 1900 والسنة الحالية، أو اتركها فارغة. | |
| `summary.open` | Summary for my doctor | ملخّص لطبيبي | |
| `summary.title` | Medication summary | ملخّص الأدوية | |
| `summary.patient` | Patient: {name} | المريض: {name} | |
| `summary.born` | Born {born} | مواليد {born} | |
| `summary.date` | Date: {date} | التاريخ: {date} | |
| `summary.needName` | Add your name so the doctor knows whose list this is. | أضف اسمك ليعرف الطبيب لمن هذه القائمة. | |
| `summary.meds` | Medicines | الأدوية | |
| `summary.noMeds` | No medicines recorded. | لا توجد أدوية مسجّلة. | |
| `summary.medLine` | {amount}, {often}: {times} | {amount}، {often}: {times} | |
| `summary.taken` | Doses taken | الجرعات المأخوذة | |
| `summary.period` | {period}: {n} of {total} doses ({pct}%) | {period}: {n} من {total} جرعة ({pct}%) | |
| `summary.periodNone` | {period}: not enough data yet | {period}: لا توجد بيانات كافية بعد | |
| `summary.perMed` | Each medicine, last 30 days | كل دواء، آخر 30 يوماً | |
| `summary.footer` | Recorded by the patient in Med Friend. Not medical advice. | سجّلها المريض في تطبيق صديقك الطبي. ليست نصيحة طبية. | |
| `summary.print` | Print or save as PDF | اطبع أو احفظ PDF | |
| `summary.whatsapp` | Send on WhatsApp | أرسل عبر واتساب | |
| `summary.loading` | Loading… | جارٍ التحميل… | |
| `summary.bornValue` | {year} ({age} years old) | {year} (العمر {age} سنة) | |
| `summary.label.patient` | Patient | المريض | |
| `summary.label.born` | Year of birth | سنة الميلاد | |
| `summary.label.date` | Date | التاريخ | |
| `summary.notSet` | Not added | غير مضاف | |
| `summary.col.medicine` | Medicine | الدواء | |
| `summary.col.amount` | Each time | كل مرة | |
| `summary.col.often` | How often | عدد المرات | |
| `summary.col.times` | Times | المواعيد | |
| `summary.col.taken` | Doses taken | الجرعات المأخوذة | |
| `summary.ofDoses` | {n} of {total} doses | {n} من {total} جرعة | |

## Settings (30)

| Key | English | العربية | Fix |
|---|---|---|---|
| `settings.title` | Settings | الإعدادات | |
| `settings.demo.title` | For the demo | للعرض التجريبي | |
| `settings.demoSpeed` | Demo speed | السرعة التجريبية | |
| `settings.demoSpeed.hint` | For showing the app: every minute in reminders becomes one second (second reminder after 15 s, snooze 15 s, missed after 60 s). | لعرض التطبيق: كل دقيقة في التذكيرات تصبح ثانية واحدة (تذكير ثانٍ بعد 15 ثانية، تأجيل 15 ثانية، فائتة بعد 60 ثانية). | |
| `settings.on` | On | تشغيل | |
| `settings.off` | Off | إيقاف | |
| `settings.trigger` | Show the next reminder now | اعرض التذكير التالي الآن | |
| `settings.trigger.done` | The reminder is on the screen. | ظهر التذكير على الشاشة. | |
| `settings.trigger.none` | No more doses to remind today. | لا توجد جرعات أخرى للتذكير اليوم. | |
| `settings.account` | Account | الحساب | |
| `settings.disclaimer` | Med Friend only records what you enter. It does not give medical advice. | صديقك الطبي يسجّل فقط ما تُدخله، ولا يقدّم نصائح طبية. | |
| `settings.language` | Language | اللغة | |
| `settings.demoSpeed.short` | 1 minute becomes 1 second | الدقيقة تصبح ثانية واحدة | |
| `settings.reset` | Reset all data | حذف كل البيانات | |
| `settings.reset.confirm` | Delete all your medicines and your dose history? This cannot be undone. | هل تريد حذف كل أدويتك وسجلّ جرعاتك؟ لا يمكن التراجع عن ذلك. | |
| `settings.reset.yes` | Yes, delete everything | نعم، احذف كل شيء | |
| `settings.reset.no` | Keep my data | احتفظ ببياناتي | |
| `settings.reset.done` | All your data is deleted. | تم حذف كل بياناتك. | |
| `settings.reset.failed` | Could not delete. Check your internet connection and try again. | تعذّر الحذف. تحقّق من اتصالك بالإنترنت وحاول مرة أخرى. | |
| `settings.reset.demo` | The shared demo account cannot be reset. | لا يمكن حذف بيانات الحساب التجريبي المشترك. | |
| `settings.day.title` | My day | يومي | |
| `settings.prayer` | Prayer and Ramadan times | أوقات الصلاة ورمضان | |
| `settings.prayer.hint` | Lets you set a dose after a prayer, or with Suhoor or Iftar. Times for Amman. | لتحديد جرعة بعد الصلاة أو مع السحور أو الإفطار. الأوقات حسب عمّان. | |
| `settings.prayer.today` | Today in Amman | اليوم في عمّان | |
| `settings.meals.title` | My meal times | مواعيد وجباتي | |
| `settings.meals.save` | Save meal times | احفظ مواعيد الوجبات | |
| `settings.meals.saved` | Meal times saved. The new times start tomorrow; today stays as it was. | تم حفظ مواعيد الوجبات. تبدأ المواعيد الجديدة من الغد، ويبقى اليوم كما هو. | |
| `settings.reminders.title` | Reminders | التذكيرات | |
| `settings.readAloud` | Read reminders aloud | اقرأ التذكيرات بصوت عالٍ | |
| `settings.readAloud.short` | The phone says each reminder out loud (this device). | يقرأ الهاتف كل تذكير بصوت مسموع (على هذا الجهاز). | |

## Voice readout (screen text) (6)

| Key | English | العربية | Fix |
|---|---|---|---|
| `speak.dose` | Time for your medicine: {name}, {amount}{moment}. | حان وقت دوائك: {name}، {amount}{moment}. | |
| `speak.moment` | , {moment} | ، {moment} | |
| `speak.followUp` | Reminder: this dose is not recorded yet. | تذكير: لم تُسجّل هذه الجرعة بعد. | |
| `voice.read` | Read aloud | اقرأ بصوت عالٍ | |
| `voice.readLabel` | Read aloud: {name} | اقرأ بصوت عالٍ: {name} | |
| `voice.none` | Voice not available on this device. | الصوت غير متوفر على هذا الجهاز. | |

## Bottom tabs (2)

| Key | English | العربية | Fix |
|---|---|---|---|
| `tab.label` | Main sections | الأقسام الرئيسية | |
| `tab.today` | Today | اليوم | |

## Other (3)

| Key | English | العربية | Fix |
|---|---|---|---|
| `amount.oneWord` | one | واحدة | |
| `amount.half` | half a {unit} | نصف {unit} | |
| `amount.andHalf` | {amount} and a half | {amount} ونصف | |
