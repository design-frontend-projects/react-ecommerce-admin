/**
 * UOM Localization Helper
 *
 * Resolves full, human-friendly UOM descriptions instead of raw abbreviation codes,
 * tailored to the currently active language ('en' or 'ar').
 */

// Mapping of standard UOM codes and English names to Arabic descriptions
const UOM_ARABIC_DICTIONARY: Record<string, string> = {
  // Count & Packaging
  pc: 'قطعة',
  piece: 'قطعة',
  ea: 'حبة',
  each: 'حبة',
  box: 'صندوق',
  ctn: 'كرتونة',
  carton: 'كرتونة',
  pack: 'طرد',
  package: 'عبوة',
  pkg: 'عبوة',
  bdl: 'ربطة',
  bundle: 'ربطة',
  dz: 'دستة',
  dozen: 'دستة',
  pr: 'زوج',
  pair: 'زوج',
  set: 'طقم',
  bag: 'كيس',
  sack: 'شوال',
  crate: 'قفص',
  plt: 'طبلية',
  pallet: 'طبلية',
  tin: 'صفيحة',
  can: 'علبة',
  jar: 'برطمان',
  btl: 'زجاجة',
  bottle: 'زجاجة',
  tray: 'صينية',
  roll: 'بكرة',
  sheet: 'لوح',
  portion: 'وجبة',
  serving: 'حصة',
  strip: 'شريط',
  blister: 'بليستر',
  drum: 'برميل',
  tub: 'علبة بلاستيكية',
  case: 'صندوق شحن',

  // Weight
  kg: 'كيلوجرام',
  kilogram: 'كيلوجرام',
  g: 'جرام',
  gram: 'جرام',
  mg: 'مليجرام',
  milligram: 'مليجرام',
  ton: 'طن',
  'metric ton': 'طن متري',
  lb: 'رطل',
  pound: 'رطل',
  oz: 'أونصة',
  ounce: 'أونصة',
  qtl: 'قنطار',
  quintal: 'قنطار',
  ct: 'قيراط',
  carat: 'قيراط',

  // Volume
  l: 'لتر',
  liter: 'لتر',
  litre: 'لتر',
  ml: 'مليلتر',
  milliliter: 'مليلتر',
  millilitre: 'مليلتر',
  cl: 'سنتيلتر',
  dl: 'ديسيلتر',
  gal: 'جالون',
  gallon: 'جالون',
  cup: 'كوب',
  tbsp: 'ملعقة كبيرة',
  tsp: 'ملعقة صغيرة',
  fl_oz: 'أونصة سائلة',
  pt: 'باينت',
  qt: 'كوارت',
  m3: 'متر مكعب',

  // Length
  m: 'متر',
  meter: 'متر',
  metre: 'متر',
  cm: 'سنتيمتر',
  centimeter: 'سنتيمتر',
  mm: 'مليمتر',
  millimeter: 'مليمتر',
  km: 'كيلومتر',
  kilometer: 'كيلومتر',
  in: 'بوصة',
  inch: 'بوصة',
  ft: 'قدم',
  foot: 'قدم',
  yd: 'ياردا',
  yard: 'ياردا',

  // Time
  hr: 'ساعة',
  hour: 'ساعة',
  day: 'يوم',
  min: 'دقيقة',
  minute: 'دقيقة',
  wk: 'أسبوع',
  week: 'أسبوع',
  mo: 'شهر',
  month: 'شهر',
  shift: 'وردية عمل',
}

// Mapping of standard UOM codes to English descriptions
const UOM_ENGLISH_DICTIONARY: Record<string, string> = {
  // Count & Packaging
  pc: 'Piece',
  ea: 'Each',
  box: 'Box',
  ctn: 'Carton',
  pack: 'Pack',
  pkg: 'Package',
  bdl: 'Bundle',
  dz: 'Dozen',
  pr: 'Pair',
  set: 'Set',
  bag: 'Bag',
  sack: 'Sack',
  crate: 'Crate',
  plt: 'Pallet',
  tin: 'Tin / Can',
  jar: 'Jar',
  btl: 'Bottle',
  tray: 'Tray',
  roll: 'Roll',
  sheet: 'Sheet',
  strip: 'Strip',
  blister: 'Blister Pack',
  drum: 'Drum',
  tub: 'Tub',
  case: 'Case',

  // Weight
  kg: 'Kilogram',
  g: 'Gram',
  mg: 'Milligram',
  ton: 'Metric Ton',
  lb: 'Pound',
  oz: 'Ounce',
  qtl: 'Quintal',
  ct: 'Carat',

  // Volume
  l: 'Liter',
  ml: 'Milliliter',
  cl: 'Centiliter',
  dl: 'Deciliter',
  gal: 'Gallon',
  cup: 'Cup',
  tbsp: 'Tablespoon',
  tsp: 'Teaspoon',
  fl_oz: 'Fluid Ounce',
  pt: 'Pint',
  qt: 'Quart',
  m3: 'Cubic Meter',

  // Length
  m: 'Meter',
  cm: 'Centimeter',
  mm: 'Millimeter',
  km: 'Kilometer',
  in: 'Inch',
  ft: 'Foot',
  yd: 'Yard',

  // Time
  hr: 'Hour',
  day: 'Day',
  min: 'Minute',
  wk: 'Week',
  mo: 'Month',
  shift: 'Shift',
}

export interface UomLike {
  name?: string | null
  code?: string | null
}

/**
 * Returns a human-friendly UOM description (e.g. "Carton" or "كرتونة")
 * instead of raw abbreviation codes (like "ctn"), localized based on current language.
 */
export function getLocalizedUomDescription(
  uom: UomLike | null | undefined,
  lang: string = 'en'
): string {
  if (!uom) return '—'

  const rawName = (uom.name || '').trim()
  const rawCode = (uom.code || '').trim().toLowerCase()
  const isArabic = lang.toLowerCase().startsWith('ar')

  // Case 1: Name contains bilingual formatting like "Carton (كرتونة)" or "Piece (قطعة)"
  if (rawName.includes('(') && rawName.includes(')')) {
    const arabicMatch = rawName.match(/\(([\u0600-\u06FF\s/\\-]+)\)/)
    const generalParenMatch = rawName.match(/\(([^)]+)\)/)

    if (isArabic) {
      if (arabicMatch && arabicMatch[1]) {
        return arabicMatch[1].trim()
      }
      // If the parentheses didn't contain Arabic, check dictionary for the English prefix
      const enPrefix = rawName.split('(')[0].trim().toLowerCase()
      if (UOM_ARABIC_DICTIONARY[enPrefix]) {
        return UOM_ARABIC_DICTIONARY[enPrefix]
      }
      if (rawCode && UOM_ARABIC_DICTIONARY[rawCode]) {
        return UOM_ARABIC_DICTIONARY[rawCode]
      }
      return generalParenMatch ? generalParenMatch[1].trim() : rawName
    } else {
      // English requested: extract English text prior to parenthesis
      const enPrefix = rawName.split('(')[0].trim()
      if (enPrefix) {
        return enPrefix
      }
    }
  }

  // Case 2: Arabic language requested
  if (isArabic) {
    // If rawName contains Arabic script directly
    if (/[\u0600-\u06FF]/.test(rawName)) {
      return rawName
    }

    // Lookup by English name
    const normalizedName = rawName.toLowerCase()
    if (UOM_ARABIC_DICTIONARY[normalizedName]) {
      return UOM_ARABIC_DICTIONARY[normalizedName]
    }

    // Lookup by code
    if (rawCode && UOM_ARABIC_DICTIONARY[rawCode]) {
      return UOM_ARABIC_DICTIONARY[rawCode]
    }

    // If we only have rawName
    if (rawName) return rawName
    if (rawCode) return rawCode.toUpperCase()
    return '—'
  }

  // Case 3: English (or other non-Arabic language) requested
  if (rawName) {
    // If rawName has parentheses, strip them
    if (rawName.includes('(')) {
      const stripped = rawName.split('(')[0].trim()
      if (stripped) return stripped
    }
    // If name is purely Arabic, try to find English equivalent in reverse dictionary
    if (/^[\u0600-\u06FF\s/\\-]+$/.test(rawName)) {
      for (const [enKey, arVal] of Object.entries(UOM_ARABIC_DICTIONARY)) {
        if (arVal === rawName && UOM_ENGLISH_DICTIONARY[enKey]) {
          return UOM_ENGLISH_DICTIONARY[enKey]
        }
      }
    }
    return rawName
  }

  // If only code is provided
  if (rawCode) {
    if (UOM_ENGLISH_DICTIONARY[rawCode]) {
      return UOM_ENGLISH_DICTIONARY[rawCode]
    }
    return rawCode.toUpperCase()
  }

  return '—'
}
