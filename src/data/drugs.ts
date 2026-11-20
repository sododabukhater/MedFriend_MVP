// REVIEW-AR: the whole list (brand names, Arabic spellings, generic names) needs a check by the
// owner or a pharmacist. Drafted without an official Jordanian source (e.g. the JFDA register).
// Chronic-care classes: diabetes, blood pressure, cholesterol, heart / blood thinners, thyroid,
// stomach, asthma, pain, gout, nerves. Used only for name suggestions; never for doses.

export type Drug = {
  brand: string // as printed on the box (Latin)
  ar: string // Arabic spelling
  generic: string
}

export const DRUGS: Drug[] = [
  // Diabetes
  { brand: 'Glucophage', ar: 'جلوكوفاج', generic: 'metformin' },
  { brand: 'Glucophage XR', ar: 'جلوكوفاج إكس آر', generic: 'metformin' },
  { brand: 'Januvia', ar: 'جانوفيا', generic: 'sitagliptin' },
  { brand: 'Janumet', ar: 'جانوميت', generic: 'sitagliptin + metformin' },
  { brand: 'Galvus', ar: 'جالفوس', generic: 'vildagliptin' },
  { brand: 'Galvus Met', ar: 'جالفوس ميت', generic: 'vildagliptin + metformin' },
  { brand: 'Amaryl', ar: 'أماريل', generic: 'glimepiride' },
  { brand: 'Diamicron MR', ar: 'دياميكرون', generic: 'gliclazide' },
  { brand: 'Jardiance', ar: 'جارديانس', generic: 'empagliflozin' },
  { brand: 'Forxiga', ar: 'فورسيجا', generic: 'dapagliflozin' },
  { brand: 'Lantus', ar: 'لانتوس', generic: 'insulin glargine' },
  { brand: 'NovoRapid', ar: 'نوفورابيد', generic: 'insulin aspart' },
  { brand: 'Mixtard 30', ar: 'ميكستارد ٣٠', generic: 'insulin human (mixed)' },
  // Blood pressure / heart failure
  { brand: 'Concor', ar: 'كونكور', generic: 'bisoprolol' },
  { brand: 'Tenormin', ar: 'تينورمين', generic: 'atenolol' },
  { brand: 'Norvasc', ar: 'نورفاسك', generic: 'amlodipine' },
  { brand: 'Diovan', ar: 'ديوفان', generic: 'valsartan' },
  { brand: 'Co-Diovan', ar: 'كو-ديوفان', generic: 'valsartan + hydrochlorothiazide' },
  { brand: 'Exforge', ar: 'إكسفورج', generic: 'amlodipine + valsartan' },
  { brand: 'Micardis', ar: 'ميكارديس', generic: 'telmisartan' },
  { brand: 'Aprovel', ar: 'أبروفيل', generic: 'irbesartan' },
  { brand: 'Atacand', ar: 'أتاكاند', generic: 'candesartan' },
  { brand: 'Cozaar', ar: 'كوزار', generic: 'losartan' },
  { brand: 'Tritace', ar: 'تريتاس', generic: 'ramipril' },
  { brand: 'Coversyl', ar: 'كوفرسيل', generic: 'perindopril' },
  { brand: 'Lasix', ar: 'لازكس', generic: 'furosemide' },
  { brand: 'Aldactone', ar: 'ألداكتون', generic: 'spironolactone' },
  { brand: 'Entresto', ar: 'إنتريستو', generic: 'sacubitril + valsartan' },
  // Cholesterol
  { brand: 'Lipitor', ar: 'ليبيتور', generic: 'atorvastatin' },
  { brand: 'Crestor', ar: 'كريستور', generic: 'rosuvastatin' },
  { brand: 'Zocor', ar: 'زوكور', generic: 'simvastatin' },
  { brand: 'Ezetrol', ar: 'إيزيترول', generic: 'ezetimibe' },
  // Blood thinners / heart
  { brand: 'Aspocid', ar: 'أسبوسيد', generic: 'aspirin (low dose)' },
  { brand: 'Plavix', ar: 'بلافيكس', generic: 'clopidogrel' },
  { brand: 'Xarelto', ar: 'زاريلتو', generic: 'rivaroxaban' },
  { brand: 'Eliquis', ar: 'إليكويس', generic: 'apixaban' },
  { brand: 'Coumadin', ar: 'كومادين', generic: 'warfarin' },
  // Thyroid
  { brand: 'Euthyrox', ar: 'يوثيروكس', generic: 'levothyroxine' },
  { brand: 'Eltroxin', ar: 'إلتروكسين', generic: 'levothyroxine' },
  // Stomach
  { brand: 'Nexium', ar: 'نيكسيوم', generic: 'esomeprazole' },
  { brand: 'Controloc', ar: 'كونترولوك', generic: 'pantoprazole' },
  { brand: 'Losec', ar: 'لوسيك', generic: 'omeprazole' },
  // Asthma / COPD
  { brand: 'Ventolin', ar: 'فنتولين', generic: 'salbutamol' },
  { brand: 'Seretide', ar: 'سيريتايد', generic: 'salmeterol + fluticasone' },
  { brand: 'Symbicort', ar: 'سيمبيكورت', generic: 'budesonide + formoterol' },
  { brand: 'Singulair', ar: 'سينجولير', generic: 'montelukast' },
  // Pain / joints / gout / nerves
  { brand: 'Panadol', ar: 'بنادول', generic: 'paracetamol' },
  { brand: 'Brufen', ar: 'بروفين', generic: 'ibuprofen' },
  { brand: 'Voltaren', ar: 'فولتارين', generic: 'diclofenac' },
  { brand: 'Celebrex', ar: 'سيليبريكس', generic: 'celecoxib' },
  { brand: 'Zyloric', ar: 'زيلوريك', generic: 'allopurinol' },
  { brand: 'Lyrica', ar: 'ليريكا', generic: 'pregabalin' },
]

/** Lower-case, drop Arabic diacritics and treat أ/إ/آ/ا, ة/ه, ى/ي as the same letter. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
}

const ARABIC = /[؀-ۿ]/

export function isArabic(text: string): boolean {
  return ARABIC.test(text)
}

/** Up to `limit` drugs whose brand, Arabic or generic name contains the query. Names that start with it come first. */
export function searchDrugs(query: string, limit = 6): Drug[] {
  const q = normalize(query)
  if (!q) return []
  const scored: { drug: Drug; score: number }[] = []
  for (const drug of DRUGS) {
    const fields = [drug.brand, drug.ar, drug.generic].map(normalize)
    if (fields.some((f) => f.startsWith(q))) scored.push({ drug, score: 0 })
    else if (fields.some((f) => f.includes(q))) scored.push({ drug, score: 1 })
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((s) => s.drug)
}
