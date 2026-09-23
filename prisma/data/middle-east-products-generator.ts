/**
 * Middle East Traditional Products Generator Engine
 * Generates 5,000 authentic traditional products and ~13,000 variants
 * across 10 Middle Eastern sectors, mapped to real companies and categories.
 */

export interface ProductVariantTemplate {
  name: string;
  name_ar?: string;
  sku_suffix: string;
  barcode_suffix: string;
  weight: number; // in kg
  dimensions: { length: number; width: number; height: number; unit: string };
  uom_code: string;
  cost_multiplier: number; // relative to base cost
  price_multiplier: number; // relative to base price
  shelf_life_months?: number;
}

export interface ProductArchetype {
  sector: string;
  base_name_en: string;
  base_name_ar: string;
  desc_en: string;
  desc_ar: string;
  brand_candidates: string[]; // Brand names in DB
  category_candidates: string[]; // Category names in DB
  base_uom_code: string;
  product_type_code: 'non_durable' | 'durable';
  tracking_mode: 'none' | 'batch' | 'serial';
  base_cost: number;
  base_price: number;
  variants: ProductVariantTemplate[];
  variants_count?: number;
}

// GS1 EAN-13 Check Digit Calculator
export function generateEan13(prefix: string, numberSequence: number): string {
  // prefix: e.g. "628" (Saudi), "629" (UAE), "622" (Egypt)
  const paddedSeq = String(numberSequence).padStart(9, '0');
  const twelveDigits = `${prefix}${paddedSeq}`.slice(0, 12);
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${twelveDigits}${checkDigit}`;
}

export interface GeneratedVariant {
  sku: string;
  name: string;
  barcode: string;
  weight: number;
  dimensions: { length: number; width: number; height: number; unit: string };
  uom_code: string;
  cost_price: number;
  price: number;
  min_price: number;
  shelf_life_months?: number;
}

export interface GeneratedProduct {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  weight: number;
  dimensions: string;
  has_variants: boolean;
  is_stock_item: boolean;
  reorderable: boolean;
  is_batch_tracked: boolean;
  is_serial_tracked: boolean;
  tracking_mode: 'none' | 'batch' | 'serial';
  product_type_code: 'non_durable' | 'durable';
  base_uom_code: string;
  brand_name: string;
  category_name: string;
  variants: GeneratedVariant[];
}

// 10 Sector Archetypes with Modifiers to construct 5,000 distinct products
export const SECTORS_CONFIG = [
  // -------------------------------------------------------------------------
  // Sector 1: Oud, Perfumes & Attars (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Oud, Perfumes & Attars",
    product_type_code: 'non_durable' as const,
    tracking_mode: 'batch' as const,
    base_uom_code: 'ml',
    country_prefix: '628',
    brand_candidates: [
      'Arabian Oud', 'Abdul Samad Al Qurashi', 'Ajmal Perfumes', 'Swiss Arabian',
      'Rasasi', 'Ibrahim AlQurashi', 'Deraah', 'Lattafa', 'Afnan', 'Armaf',
      'Al Haramain Perfumes', 'Asgharali', 'Nabeel Perfumes', 'Touch of Oud',
      'Anfasic Dokhoon', 'Hind Al Oud', 'Taif Al Emarat'
    ],
    category_candidates: [
      'Arabian Oud, Dehn Al Oud & Perfumes',
      'Bukhoor, Incense & Charcoal Burners',
      'Floral Waters, Rose & Orange Blossom'
    ],
    items: [
      { name_en: "Royal Dehn Al Oud Cambodi Aged", name_ar: "دهن عود كمبودي معتق فاخر", base_cost: 450, base_price: 850, var_type: "oil" },
      { name_en: "Kalakassi Royal Aged Oud Oil", name_ar: "دهن عود كلاكاسي ملكي قديم", base_cost: 900, base_price: 1750, var_type: "oil" },
      { name_en: "Hindi Seufi Heritage Dehn Oud", name_ar: "دهن عود هندي سيوفي تراثي", base_cost: 650, base_price: 1250, var_type: "oil" },
      { name_en: "Taif Mountain Rose Pure Attar (Ward Taifi)", name_ar: "عطر الورد الطائفي النقي قطفة أولى", base_cost: 380, base_price: 720, var_type: "oil" },
      { name_en: "Musk Al Tahara Pure White Essence", name_ar: "مسك الطهارة الأبيض الأصلي", base_cost: 85, base_price: 180, var_type: "oil" },
      { name_en: "Royal Ambergris Mukhallat Private Reserve", name_ar: "مخلط العنبر الملكي الخاص", base_cost: 420, base_price: 820, var_type: "oil" },
      { name_en: "Kalemat Oriental Amber Eau de Parfum", name_ar: "عطر كلمات الشرقي بالعنبر", base_cost: 210, base_price: 420, var_type: "spray" },
      { name_en: "Resala Velvet Saffron Eau de Parfum", name_ar: "عطر رسالة الزعفران المخملي", base_cost: 260, base_price: 520, var_type: "spray" },
      { name_en: "Woody Intense Smoky Cedarwood Spray", name_ar: "عطر وودي إنتنس بخشب الأرز", base_cost: 195, base_price: 390, var_type: "spray" },
      { name_en: "Sultani Royal Floral Musky Eau de Parfum", name_ar: "عطر سلطاني الملكي بالمسك والأزهار", base_cost: 320, base_price: 640, var_type: "spray" },
      { name_en: "Majlis Imperial Incense Wood Chips (Muattar)", name_ar: "معطر عود المجلس الملكي المبخر", base_cost: 140, base_price: 280, var_type: "bakhoor" },
      { name_en: "Dhofar Green Hojari Royal Frankincense", name_ar: "لبان حوجري ظفاري ملكي أخضر", base_cost: 110, base_price: 220, var_type: "bakhoor" },
      { name_en: "Bakhoor Al-Arais Wedding Incense Tablets", name_ar: "بخور العرائس الفاخر للمناسبات", base_cost: 95, base_price: 190, var_type: "bakhoor" },
      { name_en: "Spanish Tobacco & Leather Oud Spray", name_ar: "عطر التبغ الإسباني والعود الفاخر", base_cost: 290, base_price: 580, var_type: "spray" },
      { name_en: "Pure Blue Kenam Wild Agarwood Chips", name_ar: "خشب عود كينام الأزرق النادر", base_cost: 750, base_price: 1490, var_type: "bakhoor" },
    ]
  },

  // -------------------------------------------------------------------------
  // Sector 2: Arabic Dates & Confectionery (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Arabic Dates & Confectionery",
    product_type_code: 'non_durable' as const,
    tracking_mode: 'batch' as const,
    base_uom_code: 'kg',
    country_prefix: '628',
    brand_candidates: [
      'Bateel', 'Abu Auf', 'Halwani Bros', 'Patchi', 'Castania',
      'Bayara', 'Al Shifa Honey', 'Sunbulah', 'Goody'
    ],
    category_candidates: [
      'Arabic Dates & Date Specialties',
      'Medjool Dates Super Jumbo',
      'Ajwa Al-Madinah Organic',
      'Sukari Soft & Golden',
      'Saghai Two-Tone Dates',
      'Khalas Al-Qassim & Al-Ahsa',
      'Stuffed Gourmet Dates with Nuts',
      'Chocolate Enrobed Arabian Dates',
      'Date Paste & Maamoul Dough',
      'Artisanal Date Syrup & Treacle'
    ],
    items: [
      { name_en: "Ajwa Al-Madinah Grade A Organic Dates", name_ar: "تمر عجوة المدينة المنورة درجة أولى عضوي", base_cost: 90, base_price: 180, var_type: "pack_weight" },
      { name_en: "Royal Medjool Super Jumbo Selected", name_ar: "تمر مجدول ملكي سوبر جامبو قطاف مختار", base_cost: 85, base_price: 165, var_type: "pack_weight" },
      { name_en: "Sukari Soft Golden Mofattal Dates", name_ar: "تمر سكري مفتل ملكي ذهبي لين", base_cost: 45, base_price: 95, var_type: "pack_weight" },
      { name_en: "Saghai Amber Crisp Top Dates", name_ar: "تمر صقعي ملكي فاخر مقرمش القمة", base_cost: 55, base_price: 110, var_type: "pack_weight" },
      { name_en: "Khalas Al-Qassim Premium Harvest", name_ar: "تمر خلاص القصيم الملكي الفاخر", base_cost: 40, base_price: 85, var_type: "pack_weight" },
      { name_en: "Medjool Stuffed with Roasted Aleppo Pistachio", name_ar: "تمر مجدول محشو بالفستق الحلبي المحمص", base_cost: 130, base_price: 250, var_type: "box_pack" },
      { name_en: "Ajwa Stuffed with Caramelized Whole Almonds", name_ar: "تمر عجوة محشو باللوز المحمص المكرمل", base_cost: 120, base_price: 230, var_type: "box_pack" },
      { name_en: "Belgian Dark Chocolate Enrobed Medjool Dates", name_ar: "تمر مجدول مغطى بالشوكولاتة البلجيكية الداكنة", base_cost: 145, base_price: 280, var_type: "box_pack" },
      { name_en: "Gourmet Dates Assorted Luxury Wooden Gift Box", name_ar: "صندوق هدايا خشبي ملكي مشكل من أفخر التمور", base_cost: 210, base_price: 420, var_type: "gift_box" },
      { name_en: "Pure Natural Slow-Extracted Date Molasses", name_ar: "دبس التمر الطبيعي النقي المركز", base_cost: 35, base_price: 70, var_type: "liquid_jar" },
      { name_en: "Traditional Date Paste for Maamoul & Bakery", name_ar: "معجون تمر طبيعي نقي للمعمول والحلويات", base_cost: 28, base_price: 55, var_type: "baking_pack" },
      { name_en: "Date Seed Healthy Roasted Coffee Alternative", name_ar: "قهوة نوى التمر الصحية المحمصة بدون كافيين", base_cost: 40, base_price: 80, var_type: "liquid_jar" },
    ]
  },

  // -------------------------------------------------------------------------
  // Sector 3: Spices, Herbs & Heritage Seasonings (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Spices, Herbs & Seasoning",
    product_type_code: 'non_durable' as const,
    tracking_mode: 'batch' as const,
    base_uom_code: 'gram',
    country_prefix: '629',
    brand_candidates: [
      'Bayara', 'Al Douri', 'Bafarat', 'Abu Auf', 'Castania', 'Al Rifai', 'Best Food'
    ],
    category_candidates: [
      'Spices, Herbs & Seasonings',
      'Regional Masalas & Signature Spice Blends',
      'Zaatar & Thyme Preparations',
      'Green Cardamom Pods Jumbo',
      'Whole Cumin Seeds & Roasted Powder',
      'Cloves Whole Buds Hand-Picked'
    ],
    items: [
      { name_en: "Kashmiri Super Negin Grade 1 Saffron", name_ar: "زعفران كشميري سوبر نقين فاخر درجة أولى", base_cost: 180, base_price: 360, var_type: "saffron" },
      { name_en: "Green Cardamom Jumbo Extra Bold Pods", name_ar: "هيل هندي أخضر جامبو رقم 1 حبوب كاملة", base_cost: 95, base_price: 190, var_type: "spice_weight" },
      { name_en: "Authentic Saudi 7-Spice Kabsa Blend", name_ar: "بهارات الكبسة السعودية السبعة الخاصة", base_cost: 30, base_price: 65, var_type: "spice_jar" },
      { name_en: "Aleppo Wild Mountain Sumac Handpicked", name_ar: "سماق جبلي حلبي بلدي نقي حامض", base_cost: 25, base_price: 55, var_type: "spice_jar" },
      { name_en: "Levantine Royal Zaatar with Roasted Sesame", name_ar: "زعتر ملوكي بلدي بالسمسم المحمص والسماق", base_cost: 35, base_price: 75, var_type: "spice_jar" },
      { name_en: "Traditional Egyptian Sesame Spiced Dukkah", name_ar: "دقة مصرية أصيلة بالسمسم والكمون والكزبرة", base_cost: 22, base_price: 50, var_type: "spice_jar" },
      { name_en: "Moroccan Ras El Hanout 30-Spice Master Blend", name_ar: "رأس الحانوت المغربي الأصيل ثلاثين بهار", base_cost: 45, base_price: 95, var_type: "spice_jar" },
      { name_en: "Black Persian Sun-Dried Loomi Limes", name_ar: "لومي أسود صحراوي مجفف للشوربة والكبسة", base_cost: 25, base_price: 50, var_type: "spice_weight" },
      { name_en: "Whole Clove Buds Hand-Sorted", name_ar: "قرنفل مسمار حب بلدي منتقى بعناية", base_cost: 40, base_price: 85, var_type: "spice_weight" },
      { name_en: "Ceylon True Cinnamon Quills Grade ALBA", name_ar: "قرفة سيلانية أصلية أعواد درجة ألبا", base_cost: 50, base_price: 105, var_type: "spice_weight" },
      { name_en: "Aromatic Mahlab Cherry Pits Stone-Ground", name_ar: "محلب بلدي مطحون للمعمول والمخبوزات", base_cost: 65, base_price: 130, var_type: "spice_jar" },
      { name_en: "Yemeni Spiced Hawaij for Stews and Soups", name_ar: "حوايج يمنية للشوربة والإيدامات", base_cost: 32, base_price: 68, var_type: "spice_jar" },
    ]
  },

  // -------------------------------------------------------------------------
  // Sector 4: Gahwa, Specialty Coffees & Teas (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Gahwa, Specialty Coffees & Teas",
    product_type_code: 'non_durable' as const,
    tracking_mode: 'batch' as const,
    base_uom_code: 'gram',
    country_prefix: '628',
    brand_candidates: [
      'Barn\'s Coffee', 'Dr. Cafe', 'Half Million', 'Bafarat', 'Al Douri',
      'Overdose', 'Chaiwala & Co ME', 'Coffee Planet', '% Arabica Middle East', 'Dose Cafe'
    ],
    category_candidates: [
      'Arabic Gahwa & Traditional Coffee',
      'Turkish Coffee & Roasted Beans',
      'Regional Teas & Herbal Infusions'
    ],
    items: [
      { name_en: "Traditional Saudi Blonde Roast Gahwa with Cardamom", name_ar: "قهوة عربية سعودية شقراء بالهيل والزعفران", base_cost: 45, base_price: 95, var_type: "coffee_pack" },
      { name_en: "Yemeni Khawlani Heirloom Mountain Beans", name_ar: "بن خولاني يمني جبلي أصيل درجة أولى", base_cost: 110, base_price: 220, var_type: "coffee_pack" },
      { name_en: "Yemeni Harazi Peaberry Single Estate Roast", name_ar: "بن حرازي يمني فريد حبة لؤلؤية بيري", base_cost: 135, base_price: 270, var_type: "coffee_pack" },
      { name_en: "Turkish Coffee Dark Roast with Double Cardamom", name_ar: "قهوة تركية غامقة بالهيل المضاعف حجرية", base_cost: 38, base_price: 78, var_type: "coffee_pack" },
      { name_en: "Damascene Medium Roast Coffee with Nutmeg & Mastic", name_ar: "قهوة شامية وسط بالمستكة وجوزة الطيب", base_cost: 42, base_price: 88, var_type: "coffee_pack" },
      { name_en: "Artisanal Spiced Karak Chai Instant Master Blend", name_ar: "خلطة شاي كرك هندي خليجي بالزعفران والهيل", base_cost: 32, base_price: 68, var_type: "coffee_pack" },
      { name_en: "Moroccan Gunpowder Green Tea with Mint Flakes", name_ar: "أتاي مغربي أصيل شاي أخضر بارود بالنعناع", base_cost: 30, base_price: 65, var_type: "coffee_pack" },
      { name_en: "Egyptian Pure Aswan Hibiscus (Karkadeh) Calyces", name_ar: "كركديه أسواني بلدي زهرات كاملة درجة أولى", base_cost: 25, base_price: 55, var_type: "coffee_pack" },
      { name_en: "Saudi Gahwa Drip Filter Bags Box (10 Sachets)", name_ar: "أظرف قهوة سعودية جاهزة للتقطير 10 أظرف", base_cost: 35, base_price: 75, var_type: "sachet_box" },
    ]
  },

  // -------------------------------------------------------------------------
  // Sector 5: Honey, Ghee, Tahina & Traditional Pantry (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Honey, Ghee & Traditional Pantry",
    product_type_code: 'non_durable' as const,
    tracking_mode: 'batch' as const,
    base_uom_code: 'kg',
    country_prefix: '628',
    brand_candidates: [
      'Al Shifa Honey', 'Halwani Bros', 'Savola', 'Afia', 'Crystal Oil',
      'El Rashidi El Mizan', 'Noor Oil', 'Goody', 'Sunbulah'
    ],
    category_candidates: [
      'Natural Honeys & Mountain Bee Products',
      'Ghee, Clarified Butter & Animal Fats',
      'Extra Virgin Olive Oils & Regional Presses',
      'Tahini, Sesame Pastes & Halva',
      'Fruit Molasses & Natural Syrups'
    ],
    items: [
      { name_en: "Yemeni Hadramout Royal Sidr Do'ani Honey", name_ar: "عسل سدر دوعني حضرمي ملكي فاخر", base_cost: 350, base_price: 700, var_type: "honey_jar" },
      { name_en: "Pure Natural Mountain Flower Forest Honey", name_ar: "عسل جبلي طبيعي أزهار برية نقي", base_cost: 80, base_price: 160, var_type: "honey_jar" },
      { name_en: "Black Forest Raw Acacia Honeycomb", name_ar: "عسل الغابة السوداء الطبيعي مع قرص الشمع", base_cost: 110, base_price: 220, var_type: "honey_jar" },
      { name_en: "Authentic Cow Clarified Ghee (Samnah Baladi)", name_ar: "سمن بقري بلدي نقي مصفى برائحة زكية", base_cost: 65, base_price: 135, var_type: "ghee_tin" },
      { name_en: "Pure Sheep Clarified Ghee Desert Churned", name_ar: "سمن غنم بلدي بري أصيل", base_cost: 95, base_price: 195, var_type: "ghee_tin" },
      { name_en: "Stone-Ground 100% Sesame Pure Tahina", name_ar: "طحينة سمسم طبيعي 100% معصورة على البارد", base_cost: 35, base_price: 75, var_type: "tahina_tub" },
      { name_en: "Traditional Sesame Halawa with Roasted Pistachio", name_ar: "حلاوة طحينية فاخرة بالفستق الحلبي", base_cost: 40, base_price: 85, var_type: "tahina_tub" },
      { name_en: "Silky Shredded Hair Halawa (Halawa Shaar)", name_ar: "حلاوة شعرية ناعمة فاخرة تذوب في الفم", base_cost: 45, base_price: 95, var_type: "tahina_tub" },
      { name_en: "Concentrated Sour Pomegranate Molasses (Dibs Rumman)", name_ar: "دبس رمان طبيعي حامض مركز بدون سكر", base_cost: 28, base_price: 60, var_type: "liquid_bottle" },
      { name_en: "Cold-Pressed Black Seed Virgin Oil (Habbat Al Baraka)", name_ar: "زيت حبة البركة بكر معصور على البارد", base_cost: 50, base_price: 105, var_type: "liquid_bottle" },
      { name_en: "Sinai Extra Virgin Cold-Pressed Olive Oil", name_ar: "زيت زيتون سيناوي بكر ممتاز حموضة منخفضة", base_cost: 75, base_price: 155, var_type: "liquid_bottle" },
    ]
  },

  // -------------------------------------------------------------------------
  // Sector 6: Levantine & Oriental Sweets & Pastries (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Levantine & Oriental Sweets",
    product_type_code: 'non_durable' as const,
    tracking_mode: 'batch' as const,
    base_uom_code: 'kg',
    country_prefix: '622',
    brand_candidates: [
      'Al Hallab', 'El Abd Patisserie', 'Mandarine Koueider', 'Sale Sucre',
      'Tseppas', 'Halwani Bros', 'Patchi', 'Chocobloom'
    ],
    category_candidates: [
      'Levantine & Syrian Sweets',
      'Gulf & Khaleeji Confections',
      'Egyptian Pastries & Oriental Sweets',
      'Nougat, Malban & Turkish Delights'
    ],
    items: [
      { name_en: "Royal Assorted Aleppo Pistachio Baklava Tin", name_ar: "بقلاوة حلبية مشكلة فاخرة بالفستق الأخضر في علبة معدنية", base_cost: 110, base_price: 220, var_type: "baklava_tin" },
      { name_en: "Burma Golden Shredded Pastry Stuffed with Pistachios", name_ar: "بورمة بالفستق الحلبي بالسمن البلدي", base_cost: 125, base_price: 250, var_type: "baklava_tin" },
      { name_en: "Taj Al Malak (King's Crown) Crispy Birds Nest", name_ar: "عش البلبل تاج الملك بالفستق الحلبي", base_cost: 115, base_price: 230, var_type: "baklava_tin" },
      { name_en: "Semolina Pistachio Maamoul Baked with Pure Ghee", name_ar: "معمول سميد ملكي بالفستق والسمن البلدي", base_cost: 95, base_price: 190, var_type: "maamoul_box" },
      { name_en: "Authentic Walnut Maamoul Dusted with Icing Sugar", name_ar: "معمول عين الجمل بالجوز وسكر البودرة", base_cost: 85, base_price: 175, var_type: "maamoul_box" },
      { name_en: "Syrian Barazek Crisp Cookies with Sesame & Honey", name_ar: "برازق شامية مقرمشة بالسمسم والعسل والفستق", base_cost: 55, base_price: 115, var_type: "cookie_box" },
      { name_en: "Ghorayeba Egyptian Melt-in-Mouth Cardamom Gems", name_ar: "غريبة مصرية ناعمة بالسمن البلدي والمكسرات", base_cost: 65, base_price: 135, var_type: "cookie_box" },
      { name_en: "Turkish Delight Lokum Cubes with Roasted Pistachios", name_ar: "حلقوم تركي ملكي محشو بالفستق ومغطى بالورد", base_cost: 70, base_price: 145, var_type: "cookie_box" },
      { name_en: "Gaz Isfahani Nougat with Pistachio and Rosewater", name_ar: "نوجا قز إصفهاني ملكي بالفستق وماء الورد", base_cost: 80, base_price: 165, var_type: "cookie_box" },
    ]
  },

  // -------------------------------------------------------------------------
  // Sector 7: Traditional Attire, Thobes, Abayas & Shemaghs (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Traditional Attire & Textiles",
    product_type_code: 'durable' as const,
    tracking_mode: 'none' as const,
    base_uom_code: 'pc',
    country_prefix: '628',
    brand_candidates: [
      'Lomar', 'Alaseel', 'Al-Daffa', 'Ithob', 'Kashkha',
      'First Choice Abayas', 'Louzan Abaya Dubai', 'Mauzan Couture UAE', 'Sweet Lady Abaya'
    ],
    category_candidates: [
      'Traditional Apparel, Thobes & Shemaghs',
      'Abayas, Kaftans & Oriental Embroidery',
      'Arabesque Linens, Carpets & Majlis Textiles'
    ],
    items: [
      { name_en: "Japanese Luxury Fabric Classic Saudi Thobe", name_ar: "ثوب سعودي كلاسيكي قماش ياباني فاخر", base_cost: 160, base_price: 350, var_type: "thobe_sizes" },
      { name_en: "Emirati Tailored Kandoora with Removable Tarboosha", name_ar: "كندورة إماراتية مطرزة مع طربوشة حرير", base_cost: 175, base_price: 380, var_type: "thobe_sizes" },
      { name_en: "Kuwaiti Standing Collar Summer Lightweight Dishdasha", name_ar: "دشداشة كويتية صيفية ياقة قلاب خفيفة", base_cost: 150, base_price: 330, var_type: "thobe_sizes" },
      { name_en: "English Woven Classic Red Cotton Shemagh", name_ar: "شماغ أحمر كلاسيكي نسج إنجليزي قطن 100%", base_cost: 80, base_price: 190, var_type: "shemagh_sizes" },
      { name_en: "Swiss Voile Pure White Royal Ghutra", name_ar: "غترة بيضاء ملكية سويسرية سوبر فيول", base_cost: 75, base_price: 175, var_type: "shemagh_sizes" },
      { name_en: "Handmade Royal Black Wool Agal (Al-Mar\'az)", name_ar: "عقال صوف مرعز يدوي ملكي أسود", base_cost: 65, base_price: 145, var_type: "standard_sizes" },
      { name_en: "Emirati Cut Black Crêpe Open Abaya with French Lace", name_ar: "عباية إماراتية سوداء قماش كريب مع دانتيل فرنسي", base_cost: 220, base_price: 520, var_type: "abaya_sizes" },
      { name_en: "Luxury Winter Wool Bisht / Farwa with Fur Lining", name_ar: "فروة شتوية ملكية مبطنة بالفرو الناعم", base_cost: 380, base_price: 850, var_type: "standard_sizes" },
      { name_en: "Traditional Royal Mishlah (Bisht) with Gold Zari Border", name_ar: "بشت ملكي صيفي بحواشي قصب مذهب فاخر", base_cost: 650, base_price: 1450, var_type: "standard_sizes" },
      { name_en: "Medina Pattern Silk Memory Foam Prayer Carpet", name_ar: "سجادة صلاة طبية بنقوش الحرم النبوي مع ميموري فوم", base_cost: 75, base_price: 170, var_type: "standard_sizes" },
      { name_en: "Hand-Carved 99-Bead Amber & Kukawood Misbaha", name_ar: "سبحة كهرمان وكوك يدوي 99 حبة بشرابة فضة", base_cost: 95, base_price: 220, var_type: "standard_sizes" },
    ]
  },

  // -------------------------------------------------------------------------
  // Sector 8: Heritage Tableware, Brass Dallahs & Hospitality (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Heritage Tableware & Brassware",
    product_type_code: 'durable' as const,
    tracking_mode: 'none' as const,
    base_uom_code: 'set',
    country_prefix: '628',
    brand_candidates: [
      'Al-Saif Gallery', 'Bafarat', 'Day to Day', 'Safeer Market', 'Grand Mart'
    ],
    category_candidates: [
      'Dallah, Ibrik & Gahwa Serving Sets',
      'Brass, Copper & Handcrafted Metalware',
      'Clay Cookware, Tagines & Pottery'
    ],
    items: [
      { name_en: "Hand-Hammered Damascus Brass Arabic Dallah", name_ar: "دلة قهوة عربية دمشقية نحاس منقوش يدوي", base_cost: 160, base_price: 360, var_type: "dallah_sizes" },
      { name_en: "Electric Smart Arabic Coffee Maker Dallah Al-Arab", name_ar: "دلة العرب الكهربائية الذكية لصنع القهوة التلقائية", base_cost: 240, base_price: 520, var_type: "single_or_pack" },
      { name_en: "Antique Solid Brass Incense Burner (Mabkhara)", name_ar: "مبخرة نحاسية كلاسيكية مزخرفة بزخارف إسلامية", base_cost: 85, base_price: 195, var_type: "single_or_pack" },
      { name_en: "Luxury Electric Incense Vaporizer for Home & Car", name_ar: "مبخرة إلكترونية ذكية قابلة للشحن للمنزل والسيارة", base_cost: 95, base_price: 210, var_type: "single_or_pack" },
      { name_en: "Set of 12 Porcelain Finjan Coffee Cups with Gold Rim", name_ar: "طقم فناجين قهوة عربية بورسلين مذهب 12 قطعة", base_cost: 65, base_price: 145, var_type: "cup_sets" },
      { name_en: "Set of 6 Crystal Istikanat Tea Glasses with Saucers", name_ar: "طقم استكانات شاي زجاج كريستال مع صحون 6 قطع", base_cost: 55, base_price: 125, var_type: "cup_sets" },
      { name_en: "Carved Brass Round Hospitality Tray with Handles", name_ar: "صينية ضيافة نحاسية بيضاوية منقوشة بمقابض", base_cost: 120, base_price: 260, var_type: "single_or_pack" },
      { name_en: "Thermal Vacuum Arabic Coffee & Tea Flask (Thermos)", name_ar: "ترامس شاي وقهوة فاخرة عازلة للحرارة 24 ساعة", base_cost: 90, base_price: 200, var_type: "dallah_sizes" },
    ]
  },

  // -------------------------------------------------------------------------
  // Sector 9: Middle Eastern Dairy, Cheeses & Labneh (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Middle Eastern Dairy & Cheeses",
    product_type_code: 'non_durable' as const,
    tracking_mode: 'batch' as const,
    base_uom_code: 'kg',
    country_prefix: '628',
    brand_candidates: [
      'Almarai', 'Nadec', 'SADAFCO (Saudia)', 'KDD', 'Baladna', 'Siniora',
      'Puck Middle East', 'Al Rawabi', 'Domty', 'Juhayna', 'Lamar'
    ],
    category_candidates: [
      'Middle Eastern Cheeses & Curds',
      'Labneh, Yogurt & Fermented Milks',
      'Halal Deli, Basturma & Cured Meats'
    ],
    items: [
      { name_en: "Traditional Nabulsi Boiled White Cheese with Nigella", name_ar: "جبنة نابلسية مغلية بلدية بحبة البركة والمحلب", base_cost: 55, base_price: 110, var_type: "cheese_pack" },
      { name_en: "Semi-Hard Grilling Halloumi Traditional Cheese", name_ar: "جبنة حلوم بلدية ممتازة للشوي والتحمير", base_cost: 48, base_price: 98, var_type: "cheese_pack" },
      { name_en: "Akkawi Soaking White Cheese for Sweets & Pastries", name_ar: "جبنة عكاوي بلدية حلوة للحلويات والكنافة", base_cost: 42, base_price: 88, var_type: "cheese_pack" },
      { name_en: "Authentic Labneh Balls Preserved in Virgin Olive Oil", name_ar: "كرات لبنة بلدية مدعبلة بزيت الزيتون البكر والزعتر", base_cost: 65, base_price: 135, var_type: "cheese_jar" },
      { name_en: "Egyptian Aged Rumi Hard Cheese Wheel Slices", name_ar: "جبنة رومي مصرية قديمة معتقة بطعم غني", base_cost: 70, base_price: 145, var_type: "cheese_pack" },
      { name_en: "Fresh Clotted Milk Cream (Baladi Ashta)", name_ar: "قشطة بلدية طازجة للحلويات والعسل", base_cost: 38, base_price: 80, var_type: "cheese_jar" },
      { name_en: "Siniora Halal Beef Mortadella with Whole Pistachios", name_ar: "مرتديلا لحم بقري حلال بالفستق الحلبي الكامل", base_cost: 50, base_price: 105, var_type: "cheese_pack" },
      { name_en: "Air-Dried Egyptian Spiced Pastirma (Basturma) Slices", name_ar: "بسطرمة مصرية بلدية بالثوم والحلبة شرائح رقيقة", base_cost: 95, base_price: 195, var_type: "cheese_pack" },
    ]
  },

  // -------------------------------------------------------------------------
  // Sector 10: Natural Care, Aleppo Soaps & Hammam Essentials (500 products)
  // -------------------------------------------------------------------------
  {
    sector: "Natural Care & Aleppo Soaps",
    product_type_code: 'non_durable' as const,
    tracking_mode: 'batch' as const,
    base_uom_code: 'pc',
    country_prefix: '622',
    brand_candidates: [
      'Nahdi Pharmacy', 'Al Dawaa Pharmacy', 'Life Pharmacy', 'BinSina Pharmacy',
      'El Ezaby Pharmacy', 'Faces Middle East', 'Nice One', 'Golden Scent'
    ],
    category_candidates: [
      'Traditional Hammam, Aleppo Soaps & Skincare',
      'Kohl, Henna & Natural Oriental Botanicals',
      'Floral Waters, Rose & Orange Blossom'
    ],
    items: [
      { name_en: "Ancient Aleppo 40% Laurel Oil Aged Olive Soap Bar", name_ar: "صابون غار حلبي أصلي معتق 40% زيت غار", base_cost: 30, base_price: 70, var_type: "soap_bar" },
      { name_en: "Gentle Everyday 20% Laurel Oil Aleppo Olive Soap", name_ar: "صابون زيت زيتون وغار حلبي 20% يومي للبشرة الحساسة", base_cost: 20, base_price: 48, var_type: "soap_bar" },
      { name_en: "Liquid Organic Aleppo Body Wash with Orange Blossom", name_ar: "شاور جل صابون غار حلبي سائل بماء الزهر", base_cost: 35, base_price: 80, var_type: "soap_bottle" },
      { name_en: "Moroccan Black Eucalyptus Soap (Beldi Paste)", name_ar: "صابون مغربي بلدي أسود بزيت الزيتون والأوكالبتوس", base_cost: 32, base_price: 75, var_type: "soap_tub" },
      { name_en: "Atlas Mountain Rhassoul Mineral Clay for Face & Hair", name_ar: "طين الغاسول المغربي البركاني المعدني", base_cost: 28, base_price: 65, var_type: "soap_tub" },
      { name_en: "Traditional Moroccan Kessa Exfoliating Hammam Glove", name_ar: "ليفة كيس حمام مغربية كلاسيكية للتقشير", base_cost: 15, base_price: 40, var_type: "soap_single" },
      { name_en: "Organic Moroccan Argan Oil 100% Pure Cold-Pressed", name_ar: "زيت أركان مغربي أصلي 100% نقي معصور على البارد", base_cost: 95, base_price: 210, var_type: "oil_dropper" },
      { name_en: "Damask Triple-Distilled Pure Rose Water Atomizer", name_ar: "ماء ورد جوري دمشقي مقطر ثلاثي بخاخ منعش", base_cost: 32, base_price: 75, var_type: "soap_bottle" },
      { name_en: "Organic Madinah Henna Powder for Hair Conditioning", name_ar: "حناء المدينة المنورة الطبيعية العضوية للشعر", base_cost: 25, base_price: 55, var_type: "soap_tub" },
      { name_en: "Natural Black Kohl Ismid Stone Powder with Brass Wand", name_ar: "كحل إثمد أسود أصلي نقي مع مكحلة نحاسية", base_cost: 45, base_price: 110, var_type: "soap_single" },
    ]
  }
];


// Helper to generate variants based on template type
export function generateVariantsForType(
  varType: string,
  baseCost: number,
  basePrice: number,
  productSku: string,
  eanPrefix: string,
  seqBase: number
): GeneratedVariant[] {
  const vars: GeneratedVariant[] = [];

  const addVar = (
    suffix: string,
    name: string,
    uom: string,
    costMul: number,
    priceMul: number,
    weight: number,
    dims: { length: number; width: number; height: number; unit: string },
    shelfLife?: number
  ) => {
    const sku = `${productSku}-${suffix}`.slice(0, 95);
    const barcode = generateEan13(eanPrefix, seqBase + vars.length);
    const cost_price = Math.round(baseCost * costMul * 100) / 100;
    const price = Math.round(basePrice * priceMul * 100) / 100;
    const min_price = Math.round(price * 0.8 * 100) / 100;

    vars.push({
      sku,
      name,
      barcode,
      weight,
      dimensions: dims,
      uom_code: uom,
      cost_price,
      price,
      min_price,
      shelf_life_months: shelfLife
    });
  };

  switch (varType) {
    case 'oil': // Attars & Oud Oils
      addVar('1-4TOLA', '3ml (¼ Tola / ربع تولة)', 'ml', 0.45, 0.45, 0.05, { length: 5, width: 3, height: 3, unit: 'cm' }, 60);
      addVar('1-2TOLA', '6ml (½ Tola / نصف تولة)', 'ml', 0.75, 0.75, 0.08, { length: 6, width: 4, height: 4, unit: 'cm' }, 60);
      addVar('1TOLA', '12ml (1 Tola / تولة كاملة)', 'tola', 1.0, 1.0, 0.15, { length: 8, width: 5, height: 5, unit: 'cm' }, 60);
      break;

    case 'spray': // Eau de Parfum
      addVar('50ML', '50ml Eau de Parfum Spray', 'ml', 0.7, 0.7, 0.28, { length: 12, width: 6, height: 6, unit: 'cm' }, 48);
      addVar('100ML', '100ml Eau de Parfum Spray', 'ml', 1.0, 1.0, 0.45, { length: 15, width: 8, height: 8, unit: 'cm' }, 48);
      addVar('GIFT-SET', 'Luxury Gift Set (100ml + 30ml Travel)', 'set', 1.4, 1.4, 0.75, { length: 22, width: 16, height: 7, unit: 'cm' }, 48);
      break;

    case 'bakhoor': // Incense & Frankincense
      addVar('30G', '30g Glass Aroma Jar (30 جم)', 'gram', 0.6, 0.6, 0.12, { length: 7, width: 7, height: 6, unit: 'cm' }, 36);
      addVar('60G', '60g Premium Box (60 جم)', 'gram', 1.0, 1.0, 0.22, { length: 10, width: 10, height: 8, unit: 'cm' }, 36);
      addVar('150G', '150g Luxury Wooden Crate (150 جم)', 'gram', 2.1, 2.1, 0.45, { length: 15, width: 12, height: 10, unit: 'cm' }, 36);
      break;

    case 'pack_weight': // Dates & Food
      addVar('500G', '500g Fresh Pouch (500 جم)', 'gram', 0.55, 0.55, 0.52, { length: 18, width: 12, height: 5, unit: 'cm' }, 24);
      addVar('1KG', '1kg Luxury Vacuum Box (1 كجم)', 'kg', 1.0, 1.0, 1.05, { length: 24, width: 16, height: 6, unit: 'cm' }, 24);
      addVar('3KG', '3kg Family Banquet Crate (3 كجم)', 'kg', 2.7, 2.7, 3.15, { length: 32, width: 22, height: 12, unit: 'cm' }, 24);
      break;

    case 'box_pack': // Stuffed & Chocolate Dates
      addVar('250G', '250g Artisan Gift Box (250 جم)', 'box', 0.6, 0.6, 0.32, { length: 15, width: 12, height: 4, unit: 'cm' }, 18);
      addVar('500G', '500g Royal Selection (500 جم)', 'box', 1.0, 1.0, 0.62, { length: 22, width: 16, height: 5, unit: 'cm' }, 18);
      addVar('1KG', '1kg Velvet Banquet Box (1 كجم)', 'box', 1.85, 1.85, 1.25, { length: 30, width: 22, height: 6, unit: 'cm' }, 18);
      break;

    case 'gift_box': // Grand Confectionery
      addVar('1KG', '1kg Handcrafted Royal Wooden Box', 'box', 1.0, 1.0, 1.45, { length: 28, width: 20, height: 7, unit: 'cm' }, 18);
      addVar('2KG', '2kg VIP Heritage Presentation Hamper', 'box', 1.85, 1.85, 2.85, { length: 38, width: 28, height: 9, unit: 'cm' }, 18);
      break;

    case 'liquid_jar': // Syrups & Honey
      addVar('250G', '250g Glass Jar (250 جم)', 'jar', 0.55, 0.55, 0.42, { length: 8, width: 8, height: 9, unit: 'cm' }, 36);
      addVar('500G', '500g Glass Jar (500 جم)', 'jar', 1.0, 1.0, 0.78, { length: 10, width: 10, height: 12, unit: 'cm' }, 36);
      break;

    case 'baking_pack': // Paste
      addVar('1KG', '1kg Baking Pack (1 كجم)', 'kg', 1.0, 1.0, 1.05, { length: 20, width: 15, height: 5, unit: 'cm' }, 24);
      addVar('5KG', '5kg Commercial Bucket (5 كجم)', 'kg', 4.5, 4.5, 5.25, { length: 30, width: 30, height: 25, unit: 'cm' }, 24);
      break;

    case 'saffron': // Saffron
      addVar('1G', '1g Sealed Acrylic Box (1 جم)', 'gram', 0.35, 0.35, 0.02, { length: 4, width: 4, height: 2, unit: 'cm' }, 36);
      addVar('3G', '3g Royal Tin (3 جم)', 'gram', 0.85, 0.85, 0.05, { length: 6, width: 6, height: 3, unit: 'cm' }, 36);
      addVar('5G', '5g (1 Mithqal) Glass Flacon (5 جم)', 'mithqal', 1.35, 1.35, 0.09, { length: 8, width: 5, height: 4, unit: 'cm' }, 36);
      break;

    case 'spice_weight': // Spices
      addVar('100G', '100g Fresh Aroma Pouch (100 جم)', 'gram', 0.45, 0.45, 0.12, { length: 12, width: 8, height: 3, unit: 'cm' }, 24);
      addVar('250G', '250g Metal Aroma Canister (250 جم)', 'tin', 1.0, 1.0, 0.32, { length: 14, width: 9, height: 9, unit: 'cm' }, 24);
      addVar('1KG', '1kg Foodservice Bag (1 كجم)', 'kg', 3.4, 3.4, 1.08, { length: 28, width: 18, height: 8, unit: 'cm' }, 24);
      break;

    case 'spice_jar': // Blends
      addVar('120G', '120g Shaker Glass Jar (120 جم)', 'jar', 0.65, 0.65, 0.28, { length: 11, width: 5, height: 5, unit: 'cm' }, 24);
      addVar('250G', '250g Airtight Tin (250 جم)', 'tin', 1.0, 1.0, 0.38, { length: 14, width: 8, height: 8, unit: 'cm' }, 24);
      addVar('500G', '500g Resealable Pouch (500 جم)', 'pouch', 1.8, 1.8, 0.55, { length: 20, width: 14, height: 5, unit: 'cm' }, 24);
      break;

    case 'coffee_pack': // Coffee
      addVar('250G', '250g Ground Vacuum Pack (250 جم)', 'gram', 0.55, 0.55, 0.28, { length: 15, width: 8, height: 5, unit: 'cm' }, 18);
      addVar('500G', '500g Whole Bean Tin (500 جم)', 'tin', 1.0, 1.0, 0.62, { length: 18, width: 10, height: 10, unit: 'cm' }, 18);
      addVar('1KG', '1kg Master Valve Bag (1 كجم)', 'kg', 1.85, 1.85, 1.05, { length: 28, width: 14, height: 8, unit: 'cm' }, 18);
      break;

    case 'sachet_box': // Drip / Tea
      addVar('10X', 'Box of 10 Filter Sachets (10 أظرف)', 'box', 1.0, 1.0, 0.18, { length: 16, width: 10, height: 8, unit: 'cm' }, 24);
      addVar('30X', 'Value Pack of 30 Sachets (30 ظرف)', 'box', 2.6, 2.6, 0.48, { length: 24, width: 16, height: 10, unit: 'cm' }, 24);
      break;

    case 'honey_jar': // Honey
      addVar('250G', '250g Glass Hexagon Jar (250 جم)', 'jar', 0.55, 0.55, 0.45, { length: 8, width: 8, height: 9, unit: 'cm' }, 36);
      addVar('500G', '500g Glass Honey Jar (500 جم)', 'jar', 1.0, 1.0, 0.85, { length: 11, width: 9, height: 9, unit: 'cm' }, 36);
      addVar('1KG', '1kg Family Honey Crock (1 كجم)', 'jar', 1.85, 1.85, 1.65, { length: 15, width: 12, height: 12, unit: 'cm' }, 36);
      break;

    case 'ghee_tin': // Ghee
      addVar('450G', '450g Hermetic Tin (450 جم)', 'tin', 0.6, 0.6, 0.55, { length: 10, width: 10, height: 10, unit: 'cm' }, 24);
      addVar('900G', '900g Traditional Ghee Tin (900 جم)', 'tin', 1.0, 1.0, 1.05, { length: 13, width: 12, height: 12, unit: 'cm' }, 24);
      addVar('1.8KG', '1.8kg Professional Foodservice Tin (1.8 كجم)', 'tin', 1.85, 1.85, 2.05, { length: 18, width: 16, height: 16, unit: 'cm' }, 24);
      break;

    case 'tahina_tub': // Tahina & Halawa
      addVar('400G', '400g Airtight Tub (400 جم)', 'tub', 0.55, 0.55, 0.45, { length: 12, width: 10, height: 7, unit: 'cm' }, 24);
      addVar('800G', '800g Family Tub (800 جم)', 'tub', 1.0, 1.0, 0.88, { length: 15, width: 13, height: 9, unit: 'cm' }, 24);
      break;

    case 'liquid_bottle': // Oils / Molasses
      addVar('250ML', '250ml Dark Glass Bottle (250 مل)', 'btl', 0.6, 0.6, 0.45, { length: 20, width: 6, height: 6, unit: 'cm' }, 24);
      addVar('500ML', '500ml Marasca Glass Bottle (500 مل)', 'btl', 1.0, 1.0, 0.82, { length: 26, width: 7, height: 7, unit: 'cm' }, 24);
      addVar('1L', '1 Liter Tin Flagon (1 لتر)', 'tin', 1.8, 1.8, 1.15, { length: 24, width: 10, height: 8, unit: 'cm' }, 24);
      break;

    case 'baklava_tin': // Sweets
      addVar('500G', '500g Assorted Gift Box (500 جم)', 'box', 0.6, 0.6, 0.65, { length: 22, width: 15, height: 4, unit: 'cm' }, 6);
      addVar('1KG', '1kg Royal Embossed Metal Tin (1 كجم)', 'tin', 1.0, 1.0, 1.25, { length: 28, width: 20, height: 5, unit: 'cm' }, 6);
      addVar('2KG', '2kg Banquet Master Tray (2 كجم)', 'tray', 1.9, 1.9, 2.45, { length: 38, width: 28, height: 6, unit: 'cm' }, 6);
      break;

    case 'maamoul_box': // Maamoul
      addVar('500G', '500g Fresh Box (approx 16 pcs)', 'box', 0.55, 0.55, 0.58, { length: 20, width: 14, height: 5, unit: 'cm' }, 9);
      addVar('1KG', '1kg Metal Heritage Tin (approx 32 pcs)', 'tin', 1.0, 1.0, 1.18, { length: 26, width: 18, height: 7, unit: 'cm' }, 9);
      break;

    case 'cookie_box': // Barazek & Cookies
      addVar('350G', '350g Sealed Tub (350 جم)', 'tub', 0.6, 0.6, 0.42, { length: 14, width: 14, height: 6, unit: 'cm' }, 12);
      addVar('700G', '700g Royal Tin (700 جم)', 'tin', 1.0, 1.0, 0.85, { length: 20, width: 20, height: 8, unit: 'cm' }, 12);
      break;

    case 'thobe_sizes': // Thobes
      addVar('54-REG', 'Size 54 Regular (مقاس 54 عادي)', 'pc', 1.0, 1.0, 0.65, { length: 40, width: 30, height: 3, unit: 'cm' });
      addVar('56-REG', 'Size 56 Regular (مقاس 56 عادي)', 'pc', 1.0, 1.0, 0.68, { length: 40, width: 30, height: 3, unit: 'cm' });
      addVar('58-TALL', 'Size 58 Tall (مقاس 58 طويل)', 'pc', 1.05, 1.05, 0.72, { length: 40, width: 30, height: 3, unit: 'cm' });
      addVar('60-TALL', 'Size 60 X-Tall (مقاس 60 طويل جداً)', 'pc', 1.05, 1.05, 0.75, { length: 40, width: 30, height: 3, unit: 'cm' });
      break;

    case 'shemagh_sizes': // Shemagh
      addVar('SIZE-55', 'Size 55 (مقاس 55 كلاسيك)', 'pc', 0.95, 0.95, 0.22, { length: 25, width: 20, height: 2, unit: 'cm' });
      addVar('SIZE-58', 'Size 58 (مقاس 58 ملكي)', 'pc', 1.0, 1.0, 0.25, { length: 25, width: 20, height: 2, unit: 'cm' });
      addVar('SIZE-60', 'Size 60 (مقاس 60 عريض)', 'pc', 1.05, 1.05, 0.28, { length: 25, width: 20, height: 2, unit: 'cm' });
      break;

    case 'abaya_sizes': // Abayas
      addVar('SIZE-54', 'Length 54 (طول 54)', 'pc', 1.0, 1.0, 0.75, { length: 35, width: 25, height: 4, unit: 'cm' });
      addVar('SIZE-56', 'Length 56 (طول 56)', 'pc', 1.0, 1.0, 0.78, { length: 35, width: 25, height: 4, unit: 'cm' });
      addVar('SIZE-58', 'Length 58 (طول 58)', 'pc', 1.05, 1.05, 0.82, { length: 35, width: 25, height: 4, unit: 'cm' });
      break;

    case 'standard_sizes': // Bisht / Rugs / Misbaha
      addVar('STD', 'Standard Royal Edition (إصدار ملكي قياسي)', 'pc', 1.0, 1.0, 0.85, { length: 35, width: 25, height: 5, unit: 'cm' });
      addVar('VIP', 'VIP Handcrafted Collector Edition (نسخة فاخرة مرصعة)', 'pc', 1.5, 1.5, 1.15, { length: 40, width: 30, height: 6, unit: 'cm' });
      break;

    case 'dallah_sizes': // Dallah Pots
      addVar('750ML', '750ml Medium Capacity (750 مل)', 'pc', 0.85, 0.85, 0.85, { length: 24, width: 18, height: 26, unit: 'cm' });
      addVar('1000ML', '1000ml Large Hospitality Size (1 لتر)', 'pc', 1.0, 1.0, 1.15, { length: 28, width: 20, height: 32, unit: 'cm' });
      break;

    case 'cup_sets': // Cups
      addVar('SET-6', 'Set of 6 Pieces (طقم 6 قطع)', 'set', 0.6, 0.6, 0.65, { length: 22, width: 15, height: 8, unit: 'cm' });
      addVar('SET-12', 'Complete Set of 12 Pieces (طقم 12 قطعة كامل)', 'set', 1.0, 1.0, 1.25, { length: 30, width: 22, height: 10, unit: 'cm' });
      break;

    case 'single_or_pack': // Accessories
      addVar('REGULAR', 'Classic Tabletop Model (موديل مكتبي كلاسيك)', 'pc', 1.0, 1.0, 0.75, { length: 18, width: 14, height: 14, unit: 'cm' });
      addVar('DELUXE', 'Deluxe Gift Box Edition (طقم هدايا ديلوكس)', 'set', 1.45, 1.45, 1.25, { length: 25, width: 20, height: 16, unit: 'cm' });
      break;

    case 'cheese_pack': // Cheese
      addVar('250G', '250g Vacuum Fresh Pack (250 جم)', 'pack', 0.55, 0.55, 0.28, { length: 14, width: 10, height: 3, unit: 'cm' }, 12);
      addVar('500G', '500g Block in Brine (500 جم)', 'pack', 1.0, 1.0, 0.56, { length: 18, width: 12, height: 5, unit: 'cm' }, 12);
      addVar('1KG', '1kg Commercial Block (1 كجم)', 'kg', 1.85, 1.85, 1.08, { length: 24, width: 15, height: 7, unit: 'cm' }, 12);
      break;

    case 'cheese_jar': // Labneh in oil
      addVar('350G', '350g Glass Jar in Extra Virgin Olive Oil', 'jar', 0.65, 0.65, 0.55, { length: 10, width: 10, height: 12, unit: 'cm' }, 12);
      addVar('700G', '700g Family Pantry Jar in Olive Oil', 'jar', 1.0, 1.0, 1.15, { length: 13, width: 13, height: 16, unit: 'cm' }, 12);
      break;

    case 'soap_bar': // Aleppo Soap
      addVar('200G', '200g Traditional Square Bar (200 جم)', 'pc', 1.0, 1.0, 0.21, { length: 8, width: 8, height: 6, unit: 'cm' }, 48);
      addVar('4X200G', 'Pack of 4 Aged Bars Box (طقم 4 قطع معتق)', 'pack', 3.6, 3.6, 0.85, { length: 18, width: 18, height: 7, unit: 'cm' }, 48);
      break;

    case 'soap_bottle': // Shower Gel / Rosewater
      addVar('250ML', '250ml Fine Spray Mist Bottle (250 مل)', 'btl', 0.65, 0.65, 0.32, { length: 18, width: 5, height: 5, unit: 'cm' }, 36);
      addVar('500ML', '500ml Family Pump Flacon (500 مل)', 'btl', 1.0, 1.0, 0.58, { length: 22, width: 7, height: 7, unit: 'cm' }, 36);
      break;

    case 'soap_tub': // Beldi Soap / Clay / Henna
      addVar('250G', '250g Airtight Tub (250 جم)', 'tub', 0.6, 0.6, 0.32, { length: 9, width: 9, height: 6, unit: 'cm' }, 24);
      addVar('500G', '500g Hammam Spa Tub (500 جم)', 'tub', 1.0, 1.0, 0.58, { length: 12, width: 12, height: 8, unit: 'cm' }, 24);
      break;

    case 'soap_single': // Kessa Glove / Kohl
      addVar('CLASSIC', 'Classic Standard Finish (إصدار كلاسيكي أصلي)', 'pc', 1.0, 1.0, 0.08, { length: 15, width: 8, height: 2, unit: 'cm' }, 60);
      addVar('PREMIUM', 'Premium Silk Double-Stitched Edition', 'pc', 1.45, 1.45, 0.12, { length: 16, width: 9, height: 3, unit: 'cm' }, 60);
      break;

    case 'oil_dropper': // Argan
      addVar('50ML', '50ml Glass Dropper Bottle (50 مل)', 'btl', 0.6, 0.6, 0.14, { length: 12, width: 4, height: 4, unit: 'cm' }, 36);
      addVar('100ML', '100ml Treatment Bottle with Pump (100 مل)', 'btl', 1.0, 1.0, 0.25, { length: 15, width: 5, height: 5, unit: 'cm' }, 36);
      break;

    default:
      addVar('STD', 'Standard Edition', 'pc', 1.0, 1.0, 0.5, { length: 10, width: 10, height: 10, unit: 'cm' });
      break;
  }

  return vars;
}

// Master generator to produce exactly 5,000 products
export function generate5000MiddleEastProducts(): GeneratedProduct[] {
  const products: GeneratedProduct[] = [];
  const TOTAL_TARGET = 5000;
  const countPerSector = Math.floor(TOTAL_TARGET / SECTORS_CONFIG.length); // 500 each
  const remainder = TOTAL_TARGET - (countPerSector * SECTORS_CONFIG.length); // 0 remainder

  let globalProductIndex = 0;
  let globalBarcodeSeq = 100000;

  for (let sIdx = 0; sIdx < SECTORS_CONFIG.length; sIdx++) {
    const secConfig = SECTORS_CONFIG[sIdx];
    const targetSectorCount = countPerSector + (sIdx === 0 ? remainder : 0);

    const adjectivesEn = [
      "Royal Vintage", "Imperial Reserve", "Supreme Artisan", "Heritage Selected",
      "Prime Special Edition", "Signature Grand", "Traditional Handcrafted",
      "Private Cellar", "Master Blend", "Pure Organic First-Press", "Original Golden",
      "Exquisite Rare", "Finest Natural", "Centuries Old Formula", "Luxury Banquet",
      "Majlis Collection", "Prestige Harvest", "Aristocrat Choice", "Classic Heirloom", "Crown Jewel"
    ];

    const adjectivesAr = [
      "الملكي المعتق", "الخاص المحفوظ", "الحرفي الفاخر", "المختار بعناية",
      "الإصدار الخاص الممتاز", "التوقيع الفريد", "التراثي اليدوي",
      "الاحتياطي الخاص", "خلطة المعلم", "العضوي النقي عصرة أولى", "الذهبي الأصلي",
      "النادر الفاخر", "الطبيعي الممتاز", "تركيبة الأجداد الأصيلة", "المناسبات والضيافة",
      "مجموعة المجلس", "قطاف الموسم الفاخر", "صفوة النخبة", "المتوارث التراثي", "درة التاج"
    ];

    let sectorProdCount = 0;
    while (sectorProdCount < targetSectorCount) {
      for (let iIdx = 0; iIdx < secConfig.items.length; iIdx++) {
        if (sectorProdCount >= targetSectorCount) break;

        const baseItem = secConfig.items[iIdx];
        const adjIndex = (sectorProdCount + iIdx) % adjectivesEn.length;
        const brandIndex = (sectorProdCount + iIdx) % secConfig.brand_candidates.length;
        const catIndex = (sectorProdCount + iIdx) % secConfig.category_candidates.length;

        const brandName = secConfig.brand_candidates[brandIndex];
        const catName = secConfig.category_candidates[catIndex];
        const adjEn = adjectivesEn[adjIndex];
        const adjAr = adjectivesAr[adjIndex];

        globalProductIndex++;
        sectorProdCount++;

        // Structured Product Name
        const brandPrefix = brandName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        const sectorCode = secConfig.sector.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
        const skuNumber = String(globalProductIndex).padStart(5, '0');
        const productSku = `${brandPrefix}-${sectorCode}-${skuNumber}`;

        const productNameEn = `${brandName} - ${baseItem.name_en} (${adjEn})`;
        const productNameAr = `${baseItem.name_ar} ${adjAr} - ${brandName}`;
        const description = `${productNameEn} / ${productNameAr}. Authentic Middle Eastern ${secConfig.sector}, crafted with premier grade heritage standards for optimal connoisseur hospitality and everyday indulgence.`;

        // Calculate barcode
        globalBarcodeSeq++;
        const productBarcode = generateEan13(secConfig.country_prefix, globalBarcodeSeq);

        // Generate Variants
        const variants = generateVariantsForType(
          baseItem.var_type,
          baseItem.base_cost,
          baseItem.base_price,
          productSku,
          secConfig.country_prefix,
          globalBarcodeSeq * 10
        );

        // Dimensions of parent
        const avgWeight = variants.reduce((acc, v) => acc + v.weight, 0) / variants.length;
        const primaryDim = `${variants[0].dimensions.length}x${variants[0].dimensions.width}x${variants[0].dimensions.height} cm`;

        products.push({
          name: productNameEn.slice(0, 195),
          description,
          sku: productSku,
          barcode: productBarcode,
          weight: Math.round(avgWeight * 100) / 100,
          dimensions: primaryDim,
          has_variants: true,
          is_stock_item: true,
          reorderable: true,
          is_batch_tracked: secConfig.tracking_mode === 'batch',
          is_serial_tracked: secConfig.tracking_mode === 'serial',
          tracking_mode: secConfig.tracking_mode,
          product_type_code: secConfig.product_type_code,
          base_uom_code: secConfig.base_uom_code,
          brand_name: brandName,
          category_name: catName,
          variants
        });
      }
    }
  }

  return products;
}
