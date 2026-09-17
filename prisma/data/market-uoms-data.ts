export interface MarketUomDefinition {
  code: string;
  name: string;
  uom_category: 'count' | 'weight' | 'volume' | 'length' | 'time';
  is_base: boolean;
}

export const MARKET_UOMS: MarketUomDefinition[] = [
  // --- COUNT & PACKAGING ---
  { code: 'pc', name: 'Piece (قطعة)', uom_category: 'count', is_base: true },
  { code: 'ea', name: 'Each (حبة)', uom_category: 'count', is_base: false },
  { code: 'box', name: 'Box (صندوق / علبة)', uom_category: 'count', is_base: false },
  { code: 'ctn', name: 'Carton (كرتونة)', uom_category: 'count', is_base: false },
  { code: 'pack', name: 'Pack (طرد / باقة)', uom_category: 'count', is_base: false },
  { code: 'pkg', name: 'Package (عبوة)', uom_category: 'count', is_base: false },
  { code: 'bdl', name: 'Bundle (ربطة)', uom_category: 'count', is_base: false },
  { code: 'dz', name: 'Dozen (دستة / 12 حبة)', uom_category: 'count', is_base: false },
  { code: 'pr', name: 'Pair (زوج)', uom_category: 'count', is_base: false },
  { code: 'set', name: 'Set (طقم)', uom_category: 'count', is_base: false },
  { code: 'bag', name: 'Bag (كيس)', uom_category: 'count', is_base: false },
  { code: 'sack', name: 'Sack (شوال / خيش)', uom_category: 'count', is_base: false },
  { code: 'crate', name: 'Crate (سحارة / قفص)', uom_category: 'count', is_base: false },
  { code: 'plt', name: 'Pallet (طبلية)', uom_category: 'count', is_base: false },
  { code: 'tin', name: 'Tin / Can (صفيحة / تنكة)', uom_category: 'count', is_base: false },
  { code: 'jar', name: 'Jar (برطمان)', uom_category: 'count', is_base: false },
  { code: 'btl', name: 'Bottle (قارورة / زجاجة)', uom_category: 'count', is_base: false },
  { code: 'tray', name: 'Tray (صينية / طبق)', uom_category: 'count', is_base: false },
  { code: 'roll', name: 'Roll (رول / بكرة)', uom_category: 'count', is_base: false },
  { code: 'sheet', name: 'Sheet (لوح / فرخ)', uom_category: 'count', is_base: false },
  { code: 'portion', name: 'Portion / Serving (وجبة / حصة)', uom_category: 'count', is_base: false },
  { code: 'strip', name: 'Strip (شريط)', uom_category: 'count', is_base: false },
  { code: 'blister', name: 'Blister Pack (بليستر)', uom_category: 'count', is_base: false },
  { code: 'drum', name: 'Drum (برميل شحن)', uom_category: 'count', is_base: false },
  { code: 'keg', name: 'Keg (برميل صغير)', uom_category: 'count', is_base: false },
  { code: 'pouch', name: 'Pouch (كيس مرن)', uom_category: 'count', is_base: false },
  { code: 'sachet', name: 'Sachet (مغلف صغير)', uom_category: 'count', is_base: false },
  { code: 'tub', name: 'Tub (علبة بلاستيكية)', uom_category: 'count', is_base: false },
  { code: 'case', name: 'Case (صندوق شحن كبير)', uom_category: 'count', is_base: false },
  { code: 'bale', name: 'Bale (بالة مضغوطة)', uom_category: 'count', is_base: false },

  // --- WEIGHT ---
  // note: kg and gram already exist in DB
  { code: 'mg', name: 'Milligram (مليجرام)', uom_category: 'weight', is_base: false },
  { code: 'ton', name: 'Metric Ton (طن متري)', uom_category: 'weight', is_base: false },
  { code: 'lb', name: 'Pound (رطل إنجليزي)', uom_category: 'weight', is_base: false },
  { code: 'oz', name: 'Ounce (أونصة)', uom_category: 'weight', is_base: false },
  { code: 'qtl', name: 'Quintal (قنطار)', uom_category: 'weight', is_base: false },
  { code: 'tola', name: 'Tola (تولة شرقية - 11.66g)', uom_category: 'weight', is_base: false },
  { code: 'uqiyyah', name: 'Uqiyyah (أوقية عربية)', uom_category: 'weight', is_base: false },
  { code: 'ratl', name: 'Ratl (رطل بلدي)', uom_category: 'weight', is_base: false },
  { code: 'mann', name: 'Mann (مَنّ تقليدي)', uom_category: 'weight', is_base: false },
  { code: 'mithqal', name: 'Mithqal (مثقال زعفران/ذهب - 4.25g)', uom_category: 'weight', is_base: false },
  { code: 'ct', name: 'Carat (قيراط)', uom_category: 'weight', is_base: false },

  // --- VOLUME ---
  { code: 'l', name: 'Liter (لتر)', uom_category: 'volume', is_base: true },
  { code: 'ml', name: 'Milliliter (مليلتر)', uom_category: 'volume', is_base: false },
  { code: 'cl', name: 'Centiliter (سنتيلتر)', uom_category: 'volume', is_base: false },
  { code: 'dl', name: 'Deciliter (ديسيلتر)', uom_category: 'volume', is_base: false },
  { code: 'gal', name: 'US Gallon (جالون أمريكي)', uom_category: 'volume', is_base: false },
  { code: 'gal_imp', name: 'Imperial Gallon (جالون إمبراطوري)', uom_category: 'volume', is_base: false },
  { code: 'cup', name: 'Standard Cup (كوب معياري)', uom_category: 'volume', is_base: false },
  { code: 'tbsp', name: 'Tablespoon (ملعقة كبيرة)', uom_category: 'volume', is_base: false },
  { code: 'tsp', name: 'Teaspoon (ملعقة صغيرة)', uom_category: 'volume', is_base: false },
  { code: 'fl_oz', name: 'Fluid Ounce (أونصة سائلة)', uom_category: 'volume', is_base: false },
  { code: 'pt', name: 'Pint (باينت)', uom_category: 'volume', is_base: false },
  { code: 'qt', name: 'Quart (كوارت)', uom_category: 'volume', is_base: false },
  { code: 'bbl', name: 'Liquid Barrel (برميل سائل)', uom_category: 'volume', is_base: false },
  { code: 'drop', name: 'Drop (قطرة مستخلص)', uom_category: 'volume', is_base: false },
  { code: 'm3', name: 'Cubic Meter (متر مكعب)', uom_category: 'volume', is_base: false },

  // --- LENGTH & DIMENSIONS ---
  { code: 'm', name: 'Meter (متر)', uom_category: 'length', is_base: true },
  { code: 'cm', name: 'Centimeter (سنتيمتر)', uom_category: 'length', is_base: false },
  { code: 'mm', name: 'Millimeter (مليمتر)', uom_category: 'length', is_base: false },
  { code: 'km', name: 'Kilometer (كيلومتر)', uom_category: 'length', is_base: false },
  { code: 'in', name: 'Inch (بوصة)', uom_category: 'length', is_base: false },
  { code: 'ft', name: 'Foot (قدم)', uom_category: 'length', is_base: false },
  { code: 'yd', name: 'Yard (ياردا)', uom_category: 'length', is_base: false },
  { code: 'dhira', name: 'Dhira / Cubit (ذراع قماش تقليدي)', uom_category: 'length', is_base: false },
  { code: 'baa', name: 'Baa / Fathom (باع تقليدي)', uom_category: 'length', is_base: false },

  // --- TIME & SERVICES ---
  { code: 'hr', name: 'Hour (ساعة)', uom_category: 'time', is_base: true },
  { code: 'day', name: 'Day (يوم)', uom_category: 'time', is_base: false },
  { code: 'min', name: 'Minute (دقيقة)', uom_category: 'time', is_base: false },
  { code: 'wk', name: 'Week (أسبوع)', uom_category: 'time', is_base: false },
  { code: 'mo', name: 'Month (شهر)', uom_category: 'time', is_base: false },
  { code: 'shift', name: 'Shift (وردية عمل)', uom_category: 'time', is_base: false },
];
