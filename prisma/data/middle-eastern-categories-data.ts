export interface CategoryDefinition {
  name: string;
  name_ar: string;
  description: string;
  subcategories: {
    name: string;
    name_ar: string;
    description: string;
  }[];
}

export const MIDDLE_EASTERN_CATEGORIES_DATA: CategoryDefinition[] = [
  // 1. Arabic Dates & Date Specialties
  {
    name: "Arabic Dates & Date Specialties",
    name_ar: "التمور ومنتجاتها التراثية",
    description: "Premium fresh, cured, and gourmet dates cultivated across Saudi Arabia, UAE, Oman, Egypt, and Jordan.",
    subcategories: [
      { name: "Medjool Dates Super Jumbo", name_ar: "تمر مجدول سوبر جامبو", description: "Large, rich, and naturally sweet Medjool dates." },
      { name: "Ajwa Al-Madinah Organic", name_ar: "تمر عجوة المدينة العضوي", description: "Sacred black dates from the blessed farms of Al-Madinah." },
      { name: "Sukari Soft & Golden", name_ar: "تمر سكري مفتل وأصفر", description: "Melt-in-the-mouth soft and golden caramel Sukari dates." },
      { name: "Saghai Two-Tone Dates", name_ar: "تمر صقعي ملكي فاخر", description: "Crisp golden-tipped dates with a soft amber base." },
      { name: "Khalas Al-Qassim & Al-Ahsa", name_ar: "تمر خلاص الأحساء والقصيم", description: "Buttery sweet Khalas dates perfect for pairing with Gahwa." },
      { name: "Stuffed Gourmet Dates with Nuts", name_ar: "تمور محشوة بالمكسرات الفاخرة", description: "Hand-pitted dates stuffed with pistachio, almond, and orange peel." },
      { name: "Chocolate Enrobed Arabian Dates", name_ar: "تمور مغطاة بالشوكولاتة البلجيكية", description: "Fine dates dipped in dark, milk, and ruby chocolate." },
      { name: "Date Paste & Maamoul Dough", name_ar: "معجون التمر وعجينة المعمول", description: "Smooth seeded date paste formulated for baking and confectionery." },
      { name: "Artisanal Date Syrup & Treacle", name_ar: "دبس التمر الطبيعي المركز", description: "Pure, slow-extracted dark date syrup rich in minerals." },
    ],
  },

  // 2. Levantine & Syrian Sweets
  {
    name: "Levantine & Syrian Sweets",
    name_ar: "الحلويات الشامية والسورية",
    description: "Centuries-old pastry traditions featuring clarified ghee, phyllo dough, pistachios, and floral attar.",
    subcategories: [
      { name: "Assorted Aleppo Baklava", name_ar: "بقلاوة حلبية مشكلة بالفستق", description: "Multi-layered phyllo pastry packed with green emerald pistachios." },
      { name: "Damascene Halawet El Jibn", name_ar: "حلاوة الجبن الدمشقية بالقشطة", description: "Sweet cheese rolls rolled with clotted ashta and orange blossom syrup." },
      { name: "Nabulsi & Knafeh Khishneh", name_ar: "كنافة خشنة وناعمة بالجبن النابلسي", description: "Crisp shredded vermicelli crust over molten melted sweet cheese." },
      { name: "Authentic Pistachio Maamoul", name_ar: "معمول بالفستق الحلبي الملكي", description: "Semolina shortbread cakes stamped with fragrant pistachio filling." },
      { name: "Barazek Sesame Honey Biscuits", name_ar: "برازق شامية بالسمسم والفستق", description: "Crispy Syrian cookies studded with roasted sesame and crushed pistachios." },
      { name: "Ghorayeba Cardamom Butter Gems", name_ar: "غريبة شامية ناعمة بالسمن البلدي", description: "Delicate melt-in-mouth clarified butter and flour shortbread." },
      { name: "Znoud El Sit Cream Rolls", name_ar: "زنود الست المقرمشة بالقشطة", description: "Golden fried phyllo rolls filled with fresh clotted cream and pistachios." },
      { name: "Madlouka Semolina Cream Platter", name_ar: "مدلوقة سورية بالمكسرات المحمصة", description: "Cooked semolina and syrup base topped with thick ashta and pine nuts." },
      { name: "Karabij with Nathef Meringue", name_ar: "كرابيج حلبية مع الناطف الأصلي", description: "Spiced semolina walnut cookies served with soapwort root meringue." },
    ],
  },

  // 3. Gulf & Khaleeji Confections
  {
    name: "Gulf & Khaleeji Confections",
    name_ar: "الحلويات الخليجية والتراثية",
    description: "Celebratory aromatic confections infused with saffron, rosewater, cardamom, and toasted nuts.",
    subcategories: [
      { name: "Bahraini Golden Halwa Showaiter", name_ar: "حلوى بحرينية ملكية بالشويطر", description: "Traditional gelatinous starch halwa with saffron, cardamom, and nuts." },
      { name: "Omani Black Halwa with Oudh Fragrance", name_ar: "حلوى عمانية سوداء بالسمن والمكسرات", description: "Slow-cooked copper pot halwa with raw sugar, ghee, and roasted almonds." },
      { name: "Rangina Toasted Flour Date Platter", name_ar: "رنقينة بالتمر والهيل والزعفران", description: "Fresh rutab dates covered in browned spiced flour and sizzling ghee." },
      { name: "Luqaimat Golden Honey Dumplings", name_ar: "لقيمات مقرمشة بالدبس والسمسم", description: "Crisp yeast fritters drizzled with date syrup and toasted sesame." },
      { name: "Khanfaroosh Saffron Mini Cakes", name_ar: "خنفروش خليجي بالهيل والزعفران", description: "Fragrant rice flour and egg cakes spiced with rosewater and saffron." },
      { name: "Aseeda Caramel Pumpkin & Wheat", name_ar: "عصيدة البوبر والقمح المحلى", description: "Caramelized flour and squash pudding enriched with black pepper and ghee." },
      { name: "Qurs Ogaily Fragrant Bundt Cake", name_ar: "قرص عقيلي كويتي بالهيل والسمسم", description: "Aromatic sponge cake generously perfumed with cardamom and sesame." },
      { name: "Balaleet Sweet Saffron Vermicelli", name_ar: "بلاليط بالزعفران وبيض الأومليت", description: "Sweetened saffron vermicelli noodles served with savory egg omelet." },
      { name: "Khubz Al-Raqaaq with Sugar & Ghee", name_ar: "خبز رقاق مقرمش بالسكر والمسلى", description: "Wafer-thin crisp bread layered with clarified butter and sugar dust." },
    ],
  },

  // 4. Egyptian Pastries & Oriental Sweets
  {
    name: "Egyptian Pastries & Oriental Sweets",
    name_ar: "الحلويات والمخبوزات المصرية",
    description: "Historic Egyptian confectionery recipes dating through Fatimid, Mamluk, and modern heritage.",
    subcategories: [
      { name: "Basbousa with Eshta & Almonds", name_ar: "بسبوسة مرملة بالقشطة واللوز", description: "Rich semolina cake soaked in hot sugar syrup and dolloped with fresh cream." },
      { name: "Zalabia & Balah El Sham", name_ar: "بلح الشام المقرمش وزلابية بالعسل", description: "Choux-pastry style fluted churros and honey dough spheres soaked in syrup." },
      { name: "Kahk El Eid Dust Sugar Cookies", name_ar: "كحك العيد بالعجمية والملبن والمكسرات", description: "Traditional festive shortbread filled with agameya honey-nut fudge or lokum." },
      { name: "Bisco Misr Tea & Butter Biscuits", name_ar: "بسكويت الشاي والزبدة الفاخر", description: "Crisp breakfast tea biscuits and golden butter rounds." },
      { name: "Om Ali Puff Pastry Cream Pudding", name_ar: "أم علي بالمكسرات والقشطة البلدي", description: "Baked phyllo and puff pastry soaked in sweetened hot milk with coconut and raisins." },
      { name: "Meshaltet Layered Country Fiteer", name_ar: "فطير مشلتت فلاحي بالسمن البلدي", description: "Multi-layered Egyptian flaky laminated pastry baked with pure farm butter." },
      { name: "Konafa Nabulsia with Fresh Cream", name_ar: "كنافة مصرية بالقشطة والمكسرات", description: "Egyptian style baked knafeh filled with rich clotted buffalo milk." },
      { name: "Rice Pudding with Mastic & Cinnamon", name_ar: "أرز باللبن والمستكة والقرفة", description: "Slow-simmered whole milk rice pudding flavored with natural Chios mastic." },
      { name: "Harissa Alexandrian Spicy-Sweet Cake", name_ar: "هريسة إسكندراني بالبندق واللوز", description: "Denser, richly caramelized semolina slice studded with whole hazelnuts." },
    ],
  },

  // 5. Maghrebi & North African Delicacies
  {
    name: "Maghrebi & North African Delicacies",
    name_ar: "الحلويات والمأكولات المغاربية",
    description: "Artisanal almond paste, blossom honey, and phyllo pastries from Morocco, Algeria, and Tunisia.",
    subcategories: [
      { name: "Moroccan Cornes de Gazelle", name_ar: "كعب الغزال المغربي باللوز وماء الزهر", description: "Delicate crescent pastries filled with almond paste and orange flower water." },
      { name: "Chebakia Spiced Sesame Rosettes", name_ar: "شباكية مغربية بالعسل والزعفران", description: "Fried floral dough ribbons coated in pure mountain honey and toasted sesame." },
      { name: "Makroudh Date Stuffed Semolina Diamonds", name_ar: "مقروض تونسي بالتمر المقلي والمعسل", description: "Coarse semolina dough filled with cinnamon dates, fried, and glazed with honey." },
      { name: "Mhancha Almond Snake Coil", name_ar: "محنشة مغربية باللوز والقرفة", description: "Coiled warka pastry filled with spiced almond paste and topped with pistachios." },
      { name: "Briouat Crispy Honey Almond Triangles", name_ar: "بريوات باللوز والعسل الحر", description: "Crisp triangular pastry envelopes packed with crushed toasted almonds." },
      { name: "Zlebia Kairouan Honey Honeycombs", name_ar: "زلابية القيروان التونسية التقليدية", description: "Deep amber, chewy, fermented honey lace fritters from Kairouan." },
      { name: "Samsa Almond & Sesame Pastry", name_ar: "صامصة تونسية بورق الملسوقة واللوز", description: "Crisp malsouka pastry triangles dipped in light citrus syrup." },
      { name: "Ghriba Moroccan Cracked Almond Biscuits", name_ar: "غريبة بهلة مغربية مفرقعة باللوز", description: "Cracked round shortbread made with toasted almonds and browned butter." },
      { name: "Sellou / Sfouf Spiced Energy Powder", name_ar: "سلو / سفوف مغربي بالمكسرات والأعشاب", description: "Nutritious roasted flour confection blended with almonds, honey, and anise." },
    ],
  },

  // 6. Middle Eastern Flatbreads & Bakery
  {
    name: "Middle Eastern Flatbreads & Bakery",
    name_ar: "المخبوزات والخبز العربي",
    description: "Hearth-baked, clay oven tandoori, and pocket flatbreads staple to daily Middle Eastern meals.",
    subcategories: [
      { name: "Khubz Arabi Pocket Pita Bread", name_ar: "خبز عربي بلدي وجيوب الشامي", description: "Classic double-layered pocket flatbread ideal for shawarma and falafel." },
      { name: "Khubz Tannour Wood-Fired Bread", name_ar: "خبز تنور عراقي على الحطب", description: "Clay-oven blistered large flatbread with smoky aroma and tender pull." },
      { name: "Saj & Shrak Paper-Thin Bread", name_ar: "خبز صاج وشراك بدوي رقيق", description: "Ultra-thin domed griddle bread used for authentic Levantine shawarma." },
      { name: "Samoon Iraqi Diamond Loaf", name_ar: "صمون عراقي حجري على شكل ماسة", description: "Diamond-shaped crusty bread with airy interior baked on refractory stones." },
      { name: "Tamees Saudi-Afghan Hearth Bread", name_ar: "تميس سعودي بالسمن والسمسم", description: "Giant clay-wall flatbread with butter glaze, nigella, and sesame seeds." },
      { name: "Khubz Taboon Clay Pebble Bread", name_ar: "خبز طابون فلسطيني على الرضف", description: "Dimpled rustic bread baked directly on heated stones for musakhan." },
      { name: "Fino Egyptian Soft Sandwich Rolls", name_ar: "عيش فينو مصري طري للساندوتش", description: "Soft elongated bakery rolls ubiquitous for street food and school lunches." },
      { name: "Baladi Egyptian Bran Flatbread", name_ar: "عيش بلدي مصري بالردة على الطين", description: "Whole wheat rustic flatbread dusted with coarse wheat bran and stone-baked." },
      { name: "Lavash & Markouk Mountain Wraps", name_ar: "مرقوق جبلي ولفائف اللواش", description: "Translucent stretched dough leaves baked on inverted iron domes." },
    ],
  },

  // 7. Traditional Savory Pies & Manaqeesh
  {
    name: "Traditional Savory Pies & Manaqeesh",
    name_ar: "الفطائر والمعجنات والمناقيش",
    description: "Freshly rolled doughs topped with wild mountain zaatar, nabulsi cheese, spiced lamb, and spinach.",
    subcategories: [
      { name: "Manaqeesh Wild Zaatar & Olive Oil", name_ar: "مناقيش زعتر بلدي بزيت الزيتون", description: "Oven-baked flatbread topped with fragrant wild thyme and virgin olive oil." },
      { name: "Manaqeesh Akkawi & Halloumi Melt", name_ar: "مناقيش جبنة عكاوي وحلوم مذابة", description: "Gooey salted brined cheese pie blistered to golden perfection." },
      { name: "Lahm bi Ajeen Spiced Minced Meat", name_ar: "لحم بعجين شامي بدبس الرمان", description: "Wafer-thin pastry layered with spiced minced lamb, pine nuts, and pomegranate." },
      { name: "Fatayer Spinach with Sumac & Lemon", name_ar: "فطائر سبانخ بالسماق والليمون", description: "Triangular folded parcels filled with tangy mountain spinach and onions." },
      { name: "Sfiha Baalbek Open Meat Pies", name_ar: "صفيحة بعلبكية باللحم واللبن الزبادي", description: "Square pinched meat pastries seasoned with yogurt, tahini, and spices." },
      { name: "Sambousek Spiced Lamb & Beef", name_ar: "سمبوسك مقلي باللحمة المفرومة والصنوبر", description: "Crispy fried half-moon pastries filled with seasoned ground meat and pine nuts." },
      { name: "Sambousek Four Cheeses & Mint", name_ar: "سمبوسك مشكل بالأجبان والنعناع الجاف", description: "Crisp turnover stuffed with feta, mozzarella, kashkaval, and fresh herbs." },
      { name: "Borek Phyllo Rolls with Spiced Potatoes", name_ar: "بوريك تركي / شامي بالبطاطا المتبلة", description: "Flaky rolled pastry cylinders stuffed with curried potato mash and herbs." },
      { name: "Safeeha Yafawia Rolled Meat Pastry", name_ar: "صفيحة يافاوية حلزونية باللحم المفروم", description: "Spiral-coiled laminated phyllo filled with spiced lamb and toasted almonds." },
    ],
  },

  // 8. Spices, Herbs & Seasonings
  {
    name: "Spices, Herbs & Seasonings",
    name_ar: "البهارات والتوابل والأعشاب",
    description: "Pure whole seeds, ground barks, fragrant stigmas, and aromatic roots across ancient spice routes.",
    subcategories: [
      { name: "Royal Kashmiri & Iranian Saffron", name_ar: "زعفران ملكي أصلي نقيل وسوبر نقين", description: "Deep red Sargol stigmas offering unmatched color, aroma, and bitter-sweet note." },
      { name: "Green Cardamom Pods Jumbo", name_ar: "هيل هندي أخضر جامبو فاخر", description: "Pungent green cardamom pods vital for authentic Gahwa and royal biryanis." },
      { name: "Pure Ceylon Cinnamon Sticks", name_ar: "أعواد قرفة سيلانية أصلية ناعمة", description: "Fragrant, crumbly quill-cut cinnamon barks with low coumarin content." },
      { name: "Black Nigella Seeds (Habbat Al-Barakah)", name_ar: "حبة البركة / الحبة السوداء النقية", description: "Nutritious aromatic black cumin seeds for bread toppings and herbal remedies." },
      { name: "Whole Cumin Seeds & Roasted Powder", name_ar: "كمون بلدي حب ومطحون طازج", description: "Earthy, warm cumin essential for lentils, falafel, and slow braises." },
      { name: "Coriander Seeds & Coarse Ground", name_ar: "كزبرة ناشفة مطحونة وحب", description: "Bright citrusy coriander seed, the soul of Egyptian taameya and molokhia." },
      { name: "Cloves Whole Buds Hand-Picked", name_ar: "قرنفل مسمار حب مختار بعناية", description: "Pungent whole cloves for biryani, spiced teas, and lamb marinades." },
      { name: "Star Anise & Sweet Fennel Seeds", name_ar: "يانسون نجمي وشمر بلدي مجفف", description: "Sweet licorice flavored botanical seeds for breads and aromatic broth." },
      { name: "Dried Whole Black & White Peppercorns", name_ar: "فلفل أسود وأبيض حب ومطحون طازج", description: "Tellicherry bold black peppercorns offering fiery heat and floral undertones." },
    ],
  },

  // 9. Regional Masalas & Signature Spice Blends
  {
    name: "Regional Masalas & Signature Spice Blends",
    name_ar: "الخلطات والبهارات الإقليمية المركبة",
    description: "Proprietary spice blends passed through generations for distinct national dishes.",
    subcategories: [
      { name: "Seven Spices Baharat Lebanese Blend", name_ar: "سبع بهارات شامية تقليدية فاخرة", description: "Harmonious blend of allspice, black pepper, cinnamon, clove, and nutmeg." },
      { name: "Saudi Kabsa Spice Master Blend", name_ar: "بهارات كبسة سعودية ملكية مع الليمون", description: "Cardamom, dried lime, coriander, and turmeric blended for golden rice." },
      { name: "Emirati Bezar Spice Mix", name_ar: "بزار إماراتي تقليدي للمجابيس والثريد", description: "Toasted and ground whole spices customized for UAE fish and meat stew." },
      { name: "Moroccan Ras El Hanout 30-Spice Blend", name_ar: "رأس الحانوت مغربي أصلي فاخر", description: "The master grocer's blend including rosebuds, grains of paradise, and mace." },
      { name: "Yemeni Hawaij for Soup & Stews", name_ar: "حوائج يمنية للمرق واللحم المسلوق", description: "Cumin, black pepper, turmeric, and cardamom mix for deep comforting broths." },
      { name: "Egyptian Dukkah Nut & Seed Mix", name_ar: "دقة مصرية أصيلة بالسمسم والسمسم والفول", description: "Crushed roasted hazelnuts, sesame, cumin, and coriander for bread dipping." },
      { name: "Iraqi Biryani Spice Pot", name_ar: "بهارات برياني عراقية بالهيل والزعفران", description: "Sweet and savory blend accented with dried lime, cardamom, and clove." },
      { name: "Shish Tawook Garlic Poultry Marinade", name_ar: "تتبيلة شيش طاووق بالثوم والليمون", description: "Paprika, garlic, ginger, and yogurt marinade spices for skewered chicken." },
      { name: "Shawarma Meat & Poultry Seasoning", name_ar: "بهارات شاورما لحم ودجاج سورية", description: "Cardamom, cinnamon, vinegar herbs, and mastic notes for rotating spit roasting." },
    ],
  },

  // 10. Zaatar & Thyme Preparations
  {
    name: "Zaatar & Thyme Preparations",
    name_ar: "الزعتر وخلطات الدقة التراثية",
    description: "Mountain-harvested wild hyssop blended with sumac, toasted sesame, and virgin olive oil.",
    subcategories: [
      { name: "Aleppo Premium Red Zaatar", name_ar: "زعتر حلبي أحمر بالسماق والرمان", description: "Tangy rich blend with roasted sesame, sumac, and crushed pomegranate." },
      { name: "Palestinian Green Thyme Zaatar", name_ar: "زعتر فلسطيني بلدي أخضر جبلي", description: "Intense wild oregano (Origanum syriacum) with golden sesame and sea salt." },
      { name: "Royal Jordanian Baladi Zaatar", name_ar: "زعتر أردني ملكي بالسمسم المحمص", description: "Crisp sesame heavy blend seasoned with coarse sour sumac berries." },
      { name: "Lebanese Wild Chouf Zaatar", name_ar: "زعتر لبناني بري من جبال الشوف", description: "Hand-picked high altitude dried thyme leaves mixed with unhulled sesame." },
      { name: "Spicy Chili Zaatar Infusion", name_ar: "زعتر حار بالفلفل الحلبي المجروش", description: "Traditional zaatar boosted with smoky Aleppo chili flakes and coriander." },
      { name: "Wild Dried Mountain Thyme Leaves", name_ar: "أوراق زعتر بري مجففة للشاي والمناقيش", description: "Pure whole dried leaves of wild thyme for herbal teas and bespoke blending." },
      { name: "Zaatar bi Zeit Olive Oil Spread", name_ar: "معجون زعتر بزيت الزيتون البكر جاهز", description: "Ready-to-spread thick breakfast condiment preserved in cold-pressed oil." },
      { name: "Cured Zaatar Dipping Crackers", name_ar: "مقرمشات وفتوت الزعتر البلدي", description: "Bite-sized twice-baked pita crisps dusted with premium thyme mix." },
      { name: "Organic Coarse Purple Sumac", name_ar: "سماق بلدي عضوي حامض خشن", description: "Non-irradiated pure crushed Rhus coriaria berries with natural astringency." },
    ],
  },

  // 11. Arabic Gahwa & Traditional Coffee
  {
    name: "Arabic Gahwa & Traditional Coffee",
    name_ar: "القهوة العربية والخلطات التراثية",
    description: "Lightly roasted Arabica beans brewed with cardamom, saffron, and cloves in historic Dallahs.",
    subcategories: [
      { name: "Saudi Blonde Gahwa Light Roast", name_ar: "قهوة سعودية شقراء خفيفة التحميص", description: "Sun-blonde lightly roasted beans with distinct delicate grassy notes." },
      { name: "Khawlani Mountain Heirloom Beans", name_ar: "بن خولاني سعودي يمني أصيل من جازان", description: "Precious heritage Arabica grown on terraced heights of Jazan and Yemen." },
      { name: "Gahwa Mix with Saffron & Cardamom", name_ar: "خلطة قهوة عربية بالزعفران والهيل", description: "Pre-mixed powdered blend ready for instant royal hospitality brewing." },
      { name: "Omani Gahwa Spiced with Rosewater", name_ar: "قهوة عمانية بماء الورد والهيل والقرنفل", description: "Rich medium roast coffee brewed with fragrant rose distillates and cloves." },
      { name: "Kuwaiti Diwaniya Gahwa Blend", name_ar: "قهوة ديوانية كويتية مسمرة ومتبلة", description: "Medium-roasted coffee blend crafted specifically for long gathering sessions." },
      { name: "Green Unroasted Coffee Beans", name_ar: "حبوب بن أخضر خام غير محمص", description: "Raw whole beans ready for custom roasting and healthy infusion." },
      { name: "Qishr Yemeni Spiced Coffee Husk", name_ar: "قشر البن اليمني المتبل بالقرفة والزنجبيل", description: "Dried Arabica cascara fruit brewed with ginger, cinnamon, and honey." },
      { name: "Ready-to-Drink Chilled Gahwa Can", name_ar: "قهوة عربية باردة معلبة جاهزة للشرب", description: "Convenient chilled ready-to-pour Gahwa with authentic saffron notes." },
      { name: "Gahwa Seasoning Powder (Shenah)", name_ar: "شنة وعطار توابل القهوة العربية", description: "Aromatic spice blend of cloves, mastic, ginger, and saffron threads." },
    ],
  },

  // 12. Turkish Coffee & Roasted Beans
  {
    name: "Turkish Coffee & Roasted Beans",
    name_ar: "القهوة التركية وحبوب البن المحمصة",
    description: "Micro-ground fine powder brewed in long-handled ibriks with a thick velvet crema.",
    subcategories: [
      { name: "Classic Dark Roast Turkish Coffee", name_ar: "قهوة تركية غامقة التحميص بالرغوة", description: "Full-bodied intense roast producing thick foam and bold chocolate notes." },
      { name: "Medium Roast with Green Cardamom", name_ar: "قهوة تركية وسط بالهيل الأخضر الفاخر", description: "Balanced Arabica-Robusta blend accented with crushed aromatic cardamom." },
      { name: "Light Roast Levant Style Coffee", name_ar: "قهوة تركية فاتحة على الطريقة الشامية", description: "Delicate fragrant roast popular across Beirut, Damascus, and Amman." },
      { name: "Mastic Gum Infused Turkish Coffee", name_ar: "قهوة تركية بالمستكة اليونانية الطبيعية", description: "Ground coffee paired with resinous crushed Chios mastic tears." },
      { name: "Nut-Infused Hazelnut Turkish Blend", name_ar: "قهوة تركية بنكهة البندق المحمص", description: "Rich buttery hazelnut aroma layered over finely pulverized coffee." },
      { name: "French Milk Coffee Blend (Café au Lait)", name_ar: "قهوة فرنساوي بالبندق ومبيض الحليب", description: "Velvety coffee blend formulated with powdered milk and cocoa hints." },
      { name: "Decaf Specialty Turkish Coffee", name_ar: "قهوة تركية خالية من الكافيين", description: "Swiss water processed decaf ground to micro-fine Turkish specification." },
      { name: "Whole Bean Specialty Arabica Espresso", name_ar: "حبوب إسبريسو أرابيكا كاملة فاخرة", description: "Single-origin beans curated for specialty cafe and espresso extractions." },
      { name: "Stone-Ground Brazilian Santos Roast", name_ar: "بن برازيلي سانتوس مطحون حجر", description: "Smooth low-acidity Brazilian beans ground fresh on traditional burrs." },
    ],
  },

  // 13. Regional Teas & Herbal Infusions
  {
    name: "Regional Teas & Herbal Infusions",
    name_ar: "الشاي والمشروبات العشبية الشرقية",
    description: "Strong Ceylon dust teas, Karak spices, fresh mountain mint, and dried medicinal botanicals.",
    subcategories: [
      { name: "Karak Spiced Tea Blend", name_ar: "شاي كرك خليجي بالهيل والزعفران", description: "Strong black tea leaves formulated for slow simmering with evaporated milk." },
      { name: "Ceylon Broken Orange Pekoe Tea", name_ar: "شاي سيلاني أسود خشن فاخر", description: "Bright, coppery, robust whole leaf Ceylon tea for clear glass serving." },
      { name: "Maghrebi Gunpowder Green Tea", name_ar: "شاي أخضر مغربي بارود للنعناع", description: "Rolled gunpowder green tea pellets brewed with copious fresh spearmint." },
      { name: "Sage Mountain Herb (Maramia)", name_ar: "مرمية فلسطينية برية مجففة", description: "Aromatic Salvia fruticosa leaves for digestive tea and herbal infusion." },
      { name: "Wild Aniseed & Star Anise Tea", name_ar: "شاي يانسون بلدي مهدئ للأعصاب", description: "Sweet herbal infusion renowned for soothing digestion and sleep." },
      { name: "Egyptian Karkadeh Whole Hibiscus", name_ar: "كركديه أسواني زهور كاملة مجففة", description: "Vibrant ruby-red calyces delivering tart, refreshing vitamin C beverage." },
      { name: "Dried Chamomile Blossoms (Babounj)", name_ar: "زهور بابونج طبيعية مهدئة", description: "Whole dried matricaria flower heads for delicate, floral evening tea." },
      { name: "Zuhurat Shamia Wildflower Tea", name_ar: "زهورات شامية جبلية بالأعشاب والورد", description: "Levantine mountain blend of rose petals, thyme, lemon verbena, and chamomile." },
      { name: "Cinnamon & Ginger Spiced Winter Tea", name_ar: "شاي القرفة والزنجبيل الدافئ", description: "Fiery, warming brew fortified with clove and dried lemon for cold seasons." },
    ],
  },

  // 14. Middle Eastern Cheeses & Curds
  {
    name: "Middle Eastern Cheeses & Curds",
    name_ar: "الأجبان الشرقية والبلدية",
    description: "Brine-cured, stretched, braided, and dried cheeses crafted from sheep, goat, and cow milks.",
    subcategories: [
      { name: "Akkawi Brine-Soaked Cheese", name_ar: "جبنة عكاوي بلدية للمناقيش والحلويات", description: "Mild, semi-firm white cheese that softens and pulls smoothly under heat." },
      { name: "Halloumi Grilling Cheese Blocks", name_ar: "جبن حلوم مشوي أصلي بحبة البركة", description: "High-melting point cheese enriched with mint that blisters golden on the pan." },
      { name: "Nabulsi Boiled Cheese with Nigella & Mastic", name_ar: "جبنة نابلسية مغلية بالمستكة والمحلب", description: "Traditional Palestinian cheese boiled with mastic, mahleb, and black seeds." },
      { name: "Majdouleh Braided String Cheese", name_ar: "جبنة مجدولة مشللة سورية", description: "Stretched elastic white curd braided neatly and seasoned with nigella seeds." },
      { name: "Kashkaval Semi-Hard Yellow Cheese", name_ar: "جبن قشقوان بلدي للأفران والمخبوزات", description: "Sharp, nutty yellow cheese ideal for melting over piping hot manaqeesh." },
      { name: "Shanklish Aged Herbed Cheese Balls", name_ar: "شنكليش بلدي بالزعتر والفلفل الحار", description: "Fermented cured cheese rolled in dried zaatar and stored in olive oil." },
      { name: "Jibneh Arabieh Fresh White Curd", name_ar: "جبنة عربية بيضاء طازجة قليلة الملح", description: "Delicate, fresh unsalted curd suitable for daily mezze and sweet knafeh." },
      { name: "Egyptian Roomi Aged Sharp Cheese", name_ar: "جبن رومي مصري قديم بطارخ", description: "Aged, crumbly, piquante wheel cheese laced with black peppercorns." },
      { name: "Baramili Double Cream Egyptian Feta", name_ar: "جبن براميلي اسطنبولي بالدمعة وفلفل حار", description: "Brine-cured creamy white cheese seasoned with fiery pickled hot peppers." },
    ],
  },

  // 15. Labneh, Yogurt & Fermented Milks
  {
    name: "Labneh, Yogurt & Fermented Milks",
    name_ar: "اللبنة والألبان والشنينة",
    description: "Strained whole yogurts, preserved labneh balls in olive oil, and refreshing fermented buttermilks.",
    subcategories: [
      { name: "Baladi Strained Labneh in Oil", name_ar: "لبنة بلدية مدعبلة بزيت الزيتون", description: "Hand-rolled fermented labneh balls preserved in extra virgin olive oil." },
      { name: "Creamy Turkish Labneh Tub", name_ar: "لبنة تركية كريمية ناعمة للدهن", description: "Silky smooth spreadable strained yogurt with gentle, lactic tartness." },
      { name: "Goat Milk Strained Mountain Labneh", name_ar: "لبنة ماعز جبلية حامضة أصيلة", description: "Distinctively pungent, artisanal labneh produced from mountain goat herds." },
      { name: "Labneh with Garlic & Fresh Mint", name_ar: "لبنة متبلة بالثوم والنعناع البلدي", description: "Zesty seasoned dip ready to be scooped with crisp cucumbers and pita." },
      { name: "Traditional Ayran Salty Yogurt Drink", name_ar: "عيران شنينة مملحة ومنعشة بالنعناع", description: "Frothy yogurt beverage whisked with cold spring water and a pinch of salt." },
      { name: "Laban Rayeb Cultured Buttermilk", name_ar: "لبن رايب بلدي مهضم طبيعي", description: "Traditional fermented probiotic milk aiding digestion after hearty feasts." },
      { name: "Jameed Solidified Hard Yogurt Stone", name_ar: "جميد كركي أردني أصلي للمنسف", description: "Hard dried sheep milk stones reconstituted into savory Mansaf broth." },
      { name: "Liquid Jameed Ready Broth Carton", name_ar: "جميد سائل جاهز للطهي الفوري", description: "Conveniently prepared Mansaf yogurt sauce ready to heat and pour." },
      { name: "Zabadi Whole Buffalo Milk Yogurt", name_ar: "زبادي بلدي جاموسي في قوالب فخار", description: "Thick, naturally sweet Egyptian buffalo yogurt with dense cream cap." },
    ],
  },

  // 16. Ghee, Clarified Butter & Animal Fats
  {
    name: "Ghee, Clarified Butter & Animal Fats",
    name_ar: "السمن البلدي والدهون الحيوانية النقية",
    description: "Slow-simmered, golden clarified butters and rendered fats imparting incomparable richness to dishes.",
    subcategories: [
      { name: "Pure Sheep Milk Ghee (Samen Baladi)", name_ar: "سمن غنم بلدي بري مدخن", description: "Aromatic, intense clarified butter rendered from pure grass-fed sheep milk." },
      { name: "Cow Milk Golden Cooking Ghee", name_ar: "سمن بقري نقي ذهبي للأرز والحلويات", description: "Mild, sweet golden ghee with high smoke point for baklava and pastry." },
      { name: "Egyptian Falahi Clarified Butter", name_ar: "سمنة بلدي فلاحي صفراء وبيضاء", description: "Traditional Nile delta simmered butter with toasted milk solids (Mourta)." },
      { name: "Herbed Omani Spiced Ghee", name_ar: "سمن عماني تقليدي بالهيل والأعشاب", description: "Clarified butter infused with dried desert herbs, turmeric, and cardamom." },
      { name: "Rendered Lamb Tail Fat (Aliyah)", name_ar: "لية خروف بلدي مفرومة ومذوبة", description: "Authentic rendered fat crucial for street kebabs and juicy kofta skewers." },
      { name: "Vegetable Ghee with Butter Flavor", name_ar: "سمن نباتي بنكهة الزبدة الفلاحي", description: "Affordable commercial hydrogenated shortening for bulk bakeries." },
      { name: "Organic Unsalted Farm Butter", name_ar: "زبدة مزارع بلدية طازجة غير مملحة", description: "Cultured churned farm butter suitable for table breakfast and cooking." },
      { name: "Mourta Salted Milk Solids Paste", name_ar: "مورتة مصرية مملحة ناتجة عن السمن", description: "Toasted caramel-brown milk residue harvested from ghee clarification." },
      { name: "Smoked Camel Fat Cooking Block", name_ar: "شحم سنام الحاشي المذوب للكبسة", description: "Delicate camel hump fat prized for enriching Saudi camel meat kabsas." },
    ],
  },

  // 17. Extra Virgin Olive Oils & Regional Presses
  {
    name: "Extra Virgin Olive Oils & Regional Presses",
    name_ar: "زيت الزيتون البكر الممتاز والمعاصر",
    description: "Cold-extracted virgin oils pressed from ancient heirloom cultivars across the Mediterranean.",
    subcategories: [
      { name: "Palestinian Nabali Cold Pressed EVOO", name_ar: "زيت زيتون فلسطيني نبالي بكر ممتاز", description: "Green peppery oil from ancient rain-fed olive groves of Jenin and Salfit." },
      { name: "Lebanese Koura Valley Golden Oil", name_ar: "زيت زيتون الكورة اللبناني العريق", description: "Fruity, golden olive oil with mild buttery notes from northern Lebanon." },
      { name: "Syrian Afrini Dark Green Olive Oil", name_ar: "زيت زيتون عفريني سوري أصيل معصور بارد", description: "Intense, viscous, robust oil celebrated for morning zaatar dipping." },
      { name: "Tunisian Chemlali Organic EVOO", name_ar: "زيت زيتون شملالي تونسي عضوي عالمي", description: "High-polyphenol golden green oil from certified organic olive orchards." },
      { name: "Moroccan Picholine Pressed Oil", name_ar: "زيت زيتون بيشولين مغربي بكر خالص", description: "Freshly pressed fragrant oil with herbaceous artichoke notes." },
      { name: "Jordanian Nabali Green First Press", name_ar: "زيت زيتون كفارات أردني عصرة أولى", description: "Early harvest vivid green oil bursting with grassy aromas and antioxidants." },
      { name: "Saudi Al-Jouf Desert Harvest EVOO", name_ar: "زيت زيتون الجوف السعودي بكر ممتاز", description: "Organically grown olives from the world's largest modern olive farm." },
      { name: "Unfiltered Cloudy Olive Oil Tin", name_ar: "زيت زيتون على عكره خام غير مصفى", description: "Rustic cloudy fresh press oil packed with micro olive particles and enzymes." },
      { name: "Garlic & Herb Infused Olive Oil", name_ar: "زيت زيتون منكه بالثوم والروزماري والشطة", description: "Gourmet dipping oil flavored with roasted cloves, thyme, and red chili." },
    ],
  },

  // 18. Specialty Cold-Pressed & Seed Oils
  {
    name: "Specialty Cold-Pressed & Seed Oils",
    name_ar: "الزيوت النباتية وزيوت البذور المعصورة بارداً",
    description: "Nutrient-dense botanical and culinary seed oils prized for nutrition and gourmet dressing.",
    subcategories: [
      { name: "Black Seed Oil (Habbat Al-Barakah)", name_ar: "زيت حبة البركة الأصلي معصور بارد", description: "Pure Nigella sativa cold-pressed oil renowned for therapeutic potency." },
      { name: "Roasted Sesame Oil (Shiraj)", name_ar: "زيت سمسم بلدي سيرج خالص", description: "Aromatic pressed sesame oil for foul mudammas, marinades, and dressing." },
      { name: "Culinary Moroccan Argan Oil", name_ar: "زيت أركان مغربي أصيل للأكل محمص", description: "Rare UNESCO-heritage oil pressed from gently roasted argan tree kernels." },
      { name: "Sweet Almond Culinary Oil", name_ar: "زيت لوز حلو نقي غذائي", description: "Light, nutty oil for salad dressing, fine confectionery, and marinades." },
      { name: "Cold-Pressed Flaxseed Oil (Zeit Har)", name_ar: "زيت حار مصري (بذرة الكتان) للفول", description: "Pungent, nutty flaxseed oil that defines traditional Egyptian fava beans." },
      { name: "Pumpkin Seed Dark Green Oil", name_ar: "زيت بذور القرع العضوي المركز", description: "Viscous dark green oil packed with zinc and essential fatty acids." },
      { name: "Walnut Kernel Cold Pressed Oil", name_ar: "زيت عين الجمل معصور على البارد", description: "Delicate gourmet salad oil with deep toasted walnut nuances." },
      { name: "Pure Corn & Sunflower Cooking Oils", name_ar: "زيوت ذرة ودوار شمس نقية للقلي", description: "Clear, neutral high-heat frying oils for daily home and restaurant cooking." },
      { name: "Pomegranate Seed Extracted Oil", name_ar: "زيت بذور الرمان المركز المضاد للأكسدة", description: "Specialty botanical oil rich in punicic acid for health elixirs." },
    ],
  },

  // 19. Olives & Cured Table Olives
  {
    name: "Olives & Cured Table Olives",
    name_ar: "الزيتون المخلل والزيتون المتبل",
    description: "Cracked green olives, dry-salt wrinkled black olives, and spiced marinated varieties.",
    subcategories: [
      { name: "Cracked Green Nabali Olives with Lemon", name_ar: "زيتون أخضر نبالي مجروح بالليمون والفلفل", description: "Traditional hand-cracked olives brined with fresh lemons and chili slices." },
      { name: "Kalamata Jumbo Plump Purple Olives", name_ar: "زيتون كالاماتا يوناني جامبو بالخل", description: "Almond-shaped fleshy dark purple olives in red wine vinegar brine." },
      { name: "Moroccan Wrinkled Black Olives (Black Dry)", name_ar: "زيتون أسود مغربي مجعد بالملح والأعشاب", description: "Dry-salt cured shriveled black olives tossed in wild oregano and olive oil." },
      { name: "Stuffed Green Olives with Pimiento & Almond", name_ar: "زيتون أخضر محشي بالجزر واللوز والليمون", description: "Pitted Spanish and Levantine olives filled with crunchy vegetables." },
      { name: "Aleppo Spicy Olive Salad Tub", name_ar: "سلطة زيتون حلبية بالزعتر والدبس والجوز", description: "Chopped olives tossed with pomegranate molasses, walnuts, and chili paste." },
      { name: "Attoun Black Smoked Soft Olives", name_ar: "زيتون عطون أسود مدخن بزيت الزيتون", description: "Tender, mildly sweet and savory black olives preserved without vinegar." },
      { name: "Herbed Green Olives in Herb Marinade", name_ar: "زيتون متبل بالزعتر البري وإكليل الجبل", description: "Gourmet appetizer olives bathed in extra virgin oil with whole bay leaves." },
      { name: "Spicy Crushed Green Olives with Harissa", name_ar: "زيتون أخضر مشطشط بالهريسة التونسية", description: "Zesty spicy olives marinated in red pepper paste and crushed garlic." },
      { name: "Giant Green Queen Olives in Sea Salt Brine", name_ar: "زيتون أخضر عملاق ملكي بالماء والملح", description: "Crisp colossal whole olives pickled in pure natural sea salt brine." },
    ],
  },

  // 20. Pickles, Torchi & Makdous
  {
    name: "Pickles, Torchi & Makdous",
    name_ar: "المخللات والطرشي والمكدوس التراثي",
    description: "Walnut-stuffed baby eggplants, Egyptian mixed torchi, and crunchy sour vegetable preserves.",
    subcategories: [
      { name: "Syrian Baby Eggplant Makdous in Olive Oil", name_ar: "مكدوس باذنجان سوري بالجوز والفلفل والثوم", description: "Oil-cured tender baby aubergines stuffed with walnuts and red peppers." },
      { name: "Egyptian Municipal Mixed Torchi Jar", name_ar: "طرشي بلدي مصري مشكل بمية المخلل", description: "Vibrant pink turnips, carrots, cucumbers, and cauliflower in spicy brine." },
      { name: "Pickled Pink Turnips with Beetroot", name_ar: "لفت مخلل بالبنجر الطبيعي مقرمش", description: "Staple falafel condiment with electric pink hue and garlic crunch." },
      { name: "Mini Persian Pickled Cucumbers", name_ar: "خيار صغير مخلل على الطريقة الشامية", description: "Crunchy baby cucumbers brined with dill, garlic cloves, and white vinegar." },
      { name: "Fermented Whole Pickled Lemons with Safflower", name_ar: "ليمون معصفر بحبة البركة والعصفر البلدي", description: "Egyptian preserved salted whole lemons stuffed with black seed and safflower." },
      { name: "Pickled Garlic Cloves in Aged Vinegar", name_ar: "ثوم مخلل بالخل البلدي والأعشاب", description: "Sweetened, mellowed whole garlic cloves in dark molasses vinegar." },
      { name: "Stuffed Spicy Green Chili Pickles", name_ar: "فلفل أخضر بلدي حار مخلل مقرمش", description: "Fiery green peppers that add spicy bite to breakfast mezze tables." },
      { name: "Pickled Cauliflower Florets with Turmeric", name_ar: "قرنبيط مخلل أصفر بالكركم والكمون", description: "Golden yellow crisp cauliflower seasoned with ground turmeric and spices." },
      { name: "Pickled Wild Baby Onions Pearl", name_ar: "بصل قاورما صغير مخلل بالخل الأحمر", description: "Bite-sized sweet pearl onions pickled in spiced red vinegar." },
    ],
  },

  // 21. Tahini, Sesame Pastes & Halva
  {
    name: "Tahini, Sesame Pastes & Halva",
    name_ar: "الطحينة ومنتجات السمسم والحلاوة الطحينية",
    description: "Stone-ground roasted white and red sesame pastes, marble halva blocks, and sesame spreads.",
    subcategories: [
      { name: "Pure Stone-Ground White Tahini", name_ar: "طحينة بيضاء سمسم صافي حجر معصرة", description: "Velvety sesame paste crafted from hulled Sudanese and Ethiopian seeds." },
      { name: "Red Roasted Sesame Tahini (Sultani)", name_ar: "طحينة حمراء بالسمسم المحمص بقشره", description: "Nutty, deeply toasted amber tahini boasting smoky flavor for fish and foul." },
      { name: "Pistachio Topped Halva Block", name_ar: "حلاوة طحينية سادة ومحشوة بالفستق", description: "Flaky, crumbly, melt-in-the-mouth sesame confection studded with nuts." },
      { name: "Chocolate Marble Ribbon Halva", name_ar: "حلاوة طحينية ماربل بالشوكولاتة والكاكاو", description: "Swirled vanilla and dark cocoa sesame halva block for dessert boards." },
      { name: "Spreadable Creamy Halva Spread", name_ar: "كريمة حلاوة طحينية قابلة للدهن", description: "Smooth spreadable halva cream perfect for toast and school sandwiches." },
      { name: "Raw Hulled White Sesame Seeds", name_ar: "سمسم أبيض سمسمي مقشور خام", description: "Clean natural sesame seeds for bread baking, manaqeesh, and confections." },
      { name: "Roasted Golden Sesame Seeds", name_ar: "سمسم محمص ذهبي للتزيين والطبخ", description: "Toasted aromatic sesame for crunch on dates, cakes, and pastry doughs." },
      { name: "Tahini & Date Syrup Breakfast Combo", name_ar: "خليط طحينة ودبس التمر للغمس", description: "Traditional sweet and savory morning dip beloved across Arab countries." },
      { name: "Organic Black Sesame Paste", name_ar: "معجون سمسم أسود عضوي مركز", description: "Deep black sesame butter prized for savory dressings and pastry fillings." },
    ],
  },

  // 22. Pulses, Legumes & Dry Beans
  {
    name: "Pulses, Legumes & Dry Beans",
    name_ar: "البقوليات الجافة والحبوب المقشورة",
    description: "Whole beans, split pulses, and chickpeas forming the backbone of plant-based Arabian nutrition.",
    subcategories: [
      { name: "Small Baladi Fava Beans for Foul", name_ar: "فول تدميس بلدي حبة صغيرة للمدمس", description: "Creamy-cooking small dry fava beans for the national breakfast stew." },
      { name: "Split Fava Beans for Falafel & Taameya", name_ar: "فول مدشوش مقشور للفلافل والطعمية", description: "Hulled dried split fava beans ground with fresh herbs for crisp fritters." },
      { name: "Jumbo Kabuli Chickpeas Grade A", name_ar: "حمص حب كابولي جامبو فاخر", description: "Large plump dried chickpeas yielding silky smooth hummus and stews." },
      { name: "Brown Mountain Lentils (Addas Majroosh)", name_ar: "عدس بني بجبه للمجدرة والكشري", description: "Whole brown lentils with skins that hold texture in Koshari and Mujaddara." },
      { name: "Split Red / Orange Lentils for Soup", name_ar: "عدس أصفر / أحمر مجروش للشوربة", description: "Quick-cooking hulled lentils that dissolve into golden comforting winter soup." },
      { name: "White Cannellini / Haricot Beans (Fasolia)", name_ar: "فاصوليا بيضاء جافة ناشفة للطبخ", description: "Creamy white kidney beans simmered in tomato and garlic lamb ragouts." },
      { name: "Black-Eyed Peas (Lobya)", name_ar: "لوبيا جافة ذات النقطة السوداء", description: "Tender black-eyed peas stewed with onions, tomato paste, and braised beef." },
      { name: "Dry Yellow Split Peas", name_ar: "حمص طبيخ أصفر مقشور", description: "Split yellow peas for Egyptian meat casseroles and vegetable bakes." },
      { name: "Dry Green Split Peas & Broad Beans", name_ar: "بقوليات مشكلة للشوربة والحساء التقليدي", description: "Assorted dry legumes ideal for rich North African Bessara soup." },
    ],
  },

  // 23. Wheat, Freekeh, Bulgur & Couscous
  {
    name: "Wheat, Freekeh, Bulgur & Couscous",
    name_ar: "القمح والفريك والبرغل والكسكسي",
    description: "Fire-roasted green wheat, cracked whole grains, and steam-rolled semolina semolinas.",
    subcategories: [
      { name: "Green Smoked Freekeh Whole Grain", name_ar: "فريك بلدي أخضر حبة كاملة مدخن", description: "Flame-roasted harvested young green wheat with incomparable smoky essence." },
      { name: "Cracked Green Freekeh for Soup & Stuffing", name_ar: "فريك أخضر مجروش لشوربة الفريكة وحشو الحمام", description: "Coarse cracked freekeh tailored for poultry stuffing and quick cooking." },
      { name: "Fine Coarse Brown Bulgur for Kibbeh", name_ar: "برغل أسمر ناعم للكبة السورية", description: "Finely milled brown wheat bulgur providing elasticity for meat paste shells." },
      { name: "Coarse Golden Bulgur for Pilaf", name_ar: "برغل خشن ذهبي للمجدرة والطبخ", description: "Plump parboiled cracked wheat that replaces rice in hearty village dishes." },
      { name: "Hand-Rolled Moroccan Semolina Couscous", name_ar: "كسكسي مغربي بلدي مفتول باليد ناعم ووسط", description: "Steamed semolina granules that expand into light, fluffy savory bedding." },
      { name: "Sweet Egyptian Dessert Couscous", name_ar: "كسكسي مصري بالسكر البودرة والمكسرات", description: "Light steamed couscous served hot with clarified butter and dust sugar." },
      { name: "Pearl Couscous / Moghrabieh Large Balls", name_ar: "مغربية لبنانية / مفتول فلسطيني كرات كبيرة", description: "Large extruded toasted semolina pearls simmered with chicken and chickpeas." },
      { name: "Whole Emmer Wheat Berries (Qamh)", name_ar: "حبوب قمح كاملة للبليلة والمشروبات", description: "Whole unrefined wheat berries simmered into Egyptian Belila with hot milk." },
      { name: "Toasted Wheat Flour for Desserts (Sweeqa)", name_ar: "دقيق قمح محمص للسويقة والتلبينة النبوية", description: "Gently toasted heritage wheat flour for porridge and energy confections." },
    ],
  },

  // 24. Basmati & Fragrant Long Grains
  {
    name: "Basmati & Fragrant Long Grains",
    name_ar: "الأرز البسمتي والحبوب العطرية",
    description: "Extra long aged grains essential for ceremonial Gulf Kabsas, Biryanis, and Mandi.",
    subcategories: [
      { name: "1121 Sella Aged Basmati Rice", name_ar: "أرز بسمتي سيلا مزة هندي طويل الحبة جداً", description: "Parboiled aged grains that elongate up to double length without breaking." },
      { name: "White Traditional Fragrant Basmati", name_ar: "أرز بسمتي أبيض عنبر برائحة عطرية طبيعية", description: "Classic white aromatic rice yielding delicate fluffy separated grains." },
      { name: "Pakistani Super Kernel Basmati", name_ar: "أرز سوبر كرنل باكستاني معتق للبرياني", description: "Himalayan foothills aged rice with sublime natural floral bouquet." },
      { name: "Biryani & Mandi Extra-Long Grain", name_ar: "أرز مخصص للمندي والبرياني والولائم", description: "Sturdy long grains capable of absorbing heavy spice oils and meat juices." },
      { name: "Brown Whole Grain Basmati Rice", name_ar: "أرز بسمتي بني حبة كاملة صحي غني بالألياف", description: "Nutritious whole grain with bran layer intact and satisfying nutty chew." },
      { name: "Saudi Hassawi Red Heritage Rice", name_ar: "أرز حساوي أحمر تراثي من واحة الأحساء", description: "Ancient nutrient-dense red rice indigenous to the hot springs of Al-Ahsa." },
      { name: "Smoked Long Grain Rice for Mandi", name_ar: "أرز بسمتي مدخن على الفحم للأكلات الشعبية", description: "Pre-seasoned grain infused with charcoal smoke aroma for home ovens." },
      { name: "Golden Saffron Spiced Rice Kit", name_ar: "أرز بسمتي متبل بالزعفران والبهارات الجاهزة", description: "Pre-blended festive banquet rice mix with whole cardamom and sultanas." },
      { name: "Royal Reserve Extra Aged 2 Years Basmati", name_ar: "أرز بسمتي ملكي معتق سنتين للقصور والمناسبات", description: "Vintage harvest grain aged in humidity-controlled silos for zero starchiness." },
    ],
  },

  // 25. Egyptian Rice & Short Grain Varieties
  {
    name: "Egyptian Rice & Short Grain Varieties",
    name_ar: "الأرز المصري والحبوب متوسطة الحبة",
    description: "Starchy plump round grains that cling beautifully for stuffed vine leaves, Koshari, and puddings.",
    subcategories: [
      { name: "Egyptian White Camolino Short Rice", name_ar: "أرز مصري بلدي كامولينو عريض الحبة", description: "Pearly round grain with slight vegetable oil sheen cooking tender and moist." },
      { name: "Egyptian Mahshi Rice Seasoned Mix", name_ar: "خلطة أرز المحشي بالخضرة والبهارات", description: "Grain pre-seasoned with dill, parsley, tomato paste, and sweet spices." },
      { name: "Roz bi Shaariya Vermicelli Rice Mix", name_ar: "أرز بالشعرية المحمرة على الطريقة المصرية", description: "Round grain pre-mixed with toasted golden vermicelli noodles." },
      { name: "Broken Egyptian Rice for Puddings", name_ar: "كسر أرز مصري ناعم للأرز باللبن والكفتة", description: "Fragmented rice kernels that break down swiftly into thick sweet puddings." },
      { name: "Italian Carnaroli Rice for Risotto Oriental", name_ar: "أرز إيطالي كارنارولي للأطباق العصرية", description: "High-amylose short grain creating creaminess for upscale Middle Eastern dining." },
      { name: "Sushi & Short Grain Sticky Rice", name_ar: "أرز قصير الحبة متماسك ومثالي للرولات", description: "Pure short grain suitable for vine-leaf wrapping and fusion rolls." },
      { name: "Wild Black & Red Blended Short Rice", name_ar: "خليط أرز بري أحمر وأسود للسلطات", description: "Textural contrast grain mix for contemporary mezze grain bowls." },
      { name: "Organic Nile Delta Harvest Rice", name_ar: "أرز مصري عضوي من مزارع الدلتا", description: "Sustainably farmed pesticide-free local rice with clean authentic flavor." },
      { name: "Parboiled Golden Egyptian Grain", name_ar: "أرز مصري مفلفل معالج حرارياً ضد الالتصاق", description: "Steam-treated short grain that retains shape and resists overcooking." },
    ],
  },

  // 26. Halal Deli, Basturma & Cured Meats
  {
    name: "Halal Deli, Basturma & Cured Meats",
    name_ar: "البسطرمة واللحوم المقددة والمصنعة حلال",
    description: "Air-cured spiced beef bresaola, mortadella logs with pistachios, and traditional sujuk.",
    subcategories: [
      { name: "Armenian & Egyptian Cured Basturma", name_ar: "بسطرمة بلدي بالعقيلي والثوم والحلبة", description: "Aged salted beef tenderloin coated in a thick, fragrant fenugreek-garlic paste." },
      { name: "Sujuk Spiced Beef Sausages", name_ar: "سجق شرقي بلدي متبل بالبهارات والخل", description: "Robust beef links spiced with cumin, sumac, garlic, and hot red pepper." },
      { name: "Makanek Miniature Lebanese Sausages", name_ar: "مقانق لحم غنم صغيرة بدبس الرمان والصنوبر", description: "Delicate small sausages spiced with pine nuts, clove, and pomegranate glaze." },
      { name: "Halal Beef Mortadella with Pistachios", name_ar: "مرتديلا لحم بقري حلال بالفستق الحلبي", description: "Silky cold cut loaf studded with green emerald pistachios and black peppercorns." },
      { name: "Halal Smoked Turkey Breast Cold Cuts", name_ar: "رومي مدخن شرائح فاخرة للساندوتش", description: "Hardwood smoked turkey breast sliced razor thin for breakfast trays." },
      { name: "Halal Roast Beef Herb Crust Slices", name_ar: "روست بيف بقري مشوي بالأعشاب والبهار", description: "Slow-roasted whole eye of round with rosemary and cracked pepper crust." },
      { name: "Halal Chicken & Olive Luncheon Meat", name_ar: "لانشون دجاج بالزيتون الأخضر والبهار", description: "Light poultry cold cut studded with brine-cured green olive rings." },
      { name: "Dried Spiced Beef Jerky (Qadid / Kaddid)", name_ar: "قديد مغاربي مجفف ومملح بالكزبرة", description: "Sun-dried seasoned meat strips preserved traditionally for winter couscous." },
      { name: "Cured Beef Tongue & Specialty Cuts", name_ar: "لسان بقري مدخن ومتبل ومطهو بالبخار", description: "Tender delicatessen beef tongue spiced and ready to slice for appetizers." },
    ],
  },

  // 27. Fresh Butchery - Arabian Lamb & Goat
  {
    name: "Fresh Butchery - Arabian Lamb & Goat",
    name_ar: "لحوم الأغنام والماعز الطازجة",
    description: "Grass-fed regional breeds including Nuaimi, Najdi, Baladi, and tender mountain goat.",
    subcategories: [
      { name: "Fresh Nuaimi Lamb Whole Carcass & Cuts", name_ar: "لحم خروف نعيمي بلدي طازج بالعظم", description: "Prized Saudi Arabian desert sheep known for rich marbling and sweet flavor." },
      { name: "Najdi Heritage Lamb Prime Cuts", name_ar: "لحم خروف نجدي أصيل طازج", description: "Renowned central Arabian breed favored for royal feasts and kabsa." },
      { name: "Fresh Baladi Lamb Shoulder & Legs", name_ar: "فخذ وكتف خروف بلدي طازج بالعظم", description: "Whole succulent joints trimmed for slow oven roasting and rice beds." },
      { name: "Minced Lamb & Fat for Kebabs (70/30)", name_ar: "لحم مفروم غنم مع اللية للكباب والمشويات", description: "Freshly ground coarse lamb blended with back fat for juicy skewers." },
      { name: "Lamb Chops & Cutlets French Trimmed", name_ar: "ريش غنم بلدي مقصوصة فرنسي للشواء", description: "Tender bone-in rib chops ready for charcoal flame grilling." },
      { name: "Tender Mountain Kid Goat Cuts", name_ar: "لحم تيس جبلي صغير بلدي طري للمندي", description: "Lean, exceptionally tender young goat meat prized for subterranean Mandi pit." },
      { name: "Lamb Shanks for Slow Braising", name_ar: "موزات غنم بالعظم للفتة والطهي البطيء", description: "Collagen-rich shanks that turn fork-tender in spiced tomato broth." },
      { name: "Lamb Ribs & Short Plate for Stews", name_ar: "ضلوع وصدور خروف للمرق واليخنات", description: "Flavorful cut with bone and marrow for fortifying traditional soups." },
      { name: "Lamb Liver, Kidneys & Hearts", name_ar: "علاق معلاق غنم طازج (كبدة وقلب وكلاوي)", description: "Fresh offal cooked quickly with garlic, green chilies, and cumin." },
    ],
  },

  // 28. Fresh Butchery - Veal & Beef Cuts
  {
    name: "Fresh Butchery - Veal & Beef Cuts",
    name_ar: "لحوم العجول والأبقار البلدية",
    description: "Milk-fed pink veal, grain-finished beef tenderloins, and butcher-ground steak burgers.",
    subcategories: [
      { name: "Milk-Fed Tender Veal (Kandouz)", name_ar: "لحم بتلو رضيع طري بالعظم وبدون عظم", description: "Delicate pale pink young veal with melt-in-the-mouth tenderness." },
      { name: "Fresh Beef Tenderloin (Fillet Mignon)", name_ar: "عرق فلتو بقري بلدي طازج كامل", description: "The most tender whole primal cut for gourmet steaks and roasting." },
      { name: "Beef Ribeye & Striploin Steaks", name_ar: "ستيك ريب آي وسيرلوين بقري مشوي", description: "Well-marbled grain-fed cuts delivering deep beefy satisfaction." },
      { name: "Ground Lean Beef for Kofta & Hashweh", name_ar: "لحم بقري مفروم أحمر للكفتة والحشوات", description: "Freshly ground lean beef for sambousek stuffing, pasta bakes, and kofta." },
      { name: "Beef Chuck & Brisket Stewing Cubes", name_ar: "مكعبات لحم بقري سن وموزة لليخنة والخضار", description: "Rich, gelatinous stewing chunks that retain moisture during long simmering." },
      { name: "Beef Eye of Round for Cold Cuts", name_ar: "عرق تربيانكو بقري بلدي للشواء والبارد", description: "Uniform round muscle seasoned with garlic cloves and tied for braising." },
      { name: "Ox Tails for Rich Oxtail Casseroles", name_ar: "عكاوي بقري طازجة لطواجن الفرن بالبصل", description: "Cross-cut oxtail segments delivering sticky collagen-rich clay pot stews." },
      { name: "Fresh Beef Liver Alexandrian Style", name_ar: "كبدة بقري بلدي طازجة للتقطيع الإسكندراني", description: "Fresh liver sliced paper-thin for flash frying with garlic and hot green pepper." },
      { name: "Beef Short Ribs Asado & BBQ", name_ar: "أضلاع بقرية قصيرة للشواء البطيء والتدخين", description: "Thick meaty ribs braised until bone slips clean from the meat." },
    ],
  },

  // 29. Poultry, Quail & Game Birds
  {
    name: "Poultry, Quail & Game Birds",
    name_ar: "الدواجن والسمان والحمام البلدي",
    description: "Corn-fed plump chickens, Egyptian stuffed squabs, tender quails, and holiday turkeys.",
    subcategories: [
      { name: "Fresh Farm Chicken Whole & Halves", name_ar: "دجاج مزارع طازج كامل مبرد ومقطع", description: "Air-chilled fresh whole chickens for broths, rotisseries, and roasting." },
      { name: "Boneless Skinless Chicken Breasts", name_ar: "صدور دجاج فيليه طازجة بدون عظم وجلد", description: "Lean trimmed breasts for tawook skewers, schnitzels, and diet grilling." },
      { name: "Chicken Thighs & Drumsticks", name_ar: "أوراك ودبابيس دجاج طازجة متبلة", description: "Juicy dark meat cuts that stay succulent through tandoor and BBQ fires." },
      { name: "Egyptian Baladi Squabs (Hamam)", name_ar: "حمام بلدي مصري طازج للحشو بالفريك", description: "Young domestic pigeons bred specifically for rice and smoked freekeh stuffing." },
      { name: "Jumbo Farm Quails (Samman)", name_ar: "سمان مزارع جامبو متبل للشواء بالفرن", description: "Plump farmed quails ready for charcoal grilling or slow clay pot roasting." },
      { name: "Whole Duck & Muscovy Ducks", name_ar: "بط بلدي ومسكوفي طازج للتحمير", description: "Rich, dark-fleshed poultry with crispable skin for festive family dinners." },
      { name: "Whole Turkeys & Drumsticks", name_ar: "ديك رومي كامل مبرد للمناسبات والأعياد", description: "Grand holiday centerpieces roasted with spiced rice, almonds, and dried fruit." },
      { name: "Fresh Chicken Liver & Gizzards", name_ar: "كبد وقوانص دجاج طازجة بدبس الرمان", description: "Tender poultry livers sautéed with garlic, coriander, and pomegranate reduction." },
      { name: "Pre-Marinated Shawarma Chicken Strips", name_ar: "شاورما دجاج متبلة جاهزة للطهي السريع", description: "Spiced sliced chicken infused with yogurt, cardamom, garlic, and citrus." },
    ],
  },

  // 30. Arabian Gulf & Red Sea Fishes
  {
    name: "Arabian Gulf & Red Sea Fishes",
    name_ar: "أسماك الخليج العربي والبحر الأحمر",
    description: "Fresh coastal catches landed daily across Dubai, Dammam, Muscat, Jeddah, and Alexandria.",
    subcategories: [
      { name: "Hamour (Greasy Grouper) Whole & Fillet", name_ar: "سمك هامور خليجي طازج كامل وفيليه", description: "The king of Gulf waters, firm white flesh ideal for Machboos and frying." },
      { name: "Zubaidi (Silver Pomfret) Kuwaiti Fresh", name_ar: "سمك زبيدي كويتي طازج مقلي للمطبق", description: "Delicate, sweet, butter-tender silver fish that is Kuwait's national pride." },
      { name: "Najil (Coral Trout) Red Sea Gourmet", name_ar: "سمك ناجل بحر أحمر حر طازج", description: "Vibrant spotted reef fish commanding the highest acclaim for steaming and grilling." },
      { name: "Safi (Spinefoot / Rabbitfish)", name_ar: "سمك صافي محلي صغير للشواء والمقلي", description: "Small beloved coastal fish fried whole without gutting for crispy sweet meat." },
      { name: "Shaari (Spangled Emperor) Fresh", name_ar: "سمك شعري خليجي طازج للصيادية", description: "Firm flake white fish excellent for baked tray casseroles and Sayadieh rice." },
      { name: "Kenaad (King Mackerel / Kingfish) Steaks", name_ar: "سمك كنعد / دراك طازج شرائح مقطعة", description: "Meaty, rich omega-3 steaks seasoned with turmeric and pan-seared crisp." },
      { name: "Red Mullet (Barboni) Alexandrian Fresh", name_ar: "سمك بربوني أحمر بلدي مقلي مقرمش", description: "Small sweet-flavored Mediterranean fish dredged in flour and flash fried." },
      { name: "Sea Bass (Qarous) Whole Salt Baked", name_ar: "سمك قاروص بحري طازج مشوي ومخبوز", description: "Mild, moist white fish suitable for encasing in salt crust or herb grilling." },
      { name: "Sea Bream (Denise) Butterflied", name_ar: "سمك دنيس طازج مشوي سنجاري بالفرن", description: "Butterflied sea bream topped with garlic, tomato, and peppers baked on foil." },
    ],
  },

  // 31. Shellfish, Prawns & Marine Harvest
  {
    name: "Shellfish, Prawns & Marine Harvest",
    name_ar: "الروبيان والمأكولات البحرية الصدفية",
    description: "Wild sea prawns, blue crabs, fresh squids, and oysters harvested from Arabian coastlines.",
    subcategories: [
      { name: "Jumbo Arabian Gulf Tiger Prawns", name_ar: "روبيان / جمبري خليجي نمر جامبو للشواء", description: "Massive wild-caught prawns with firm snappy texture and sweet oceanic profile." },
      { name: "Medium Shrimps Peeled & Deveined", name_ar: "جمبري وسط مقشور ومنظف للطواجن والأرز", description: "Ready-to-cook clean prawns for quick seafood biryanis and tomato tagines." },
      { name: "Blue Swimmer Crabs (Kaboria)", name_ar: "كابوريا بلدي طازجة بالبطارخ للشوربة", description: "Sweet blue crabs boiled whole in spiced onion and celery seafood court-bouillon." },
      { name: "Fresh Mediterranean Calamari & Squid", name_ar: "كاليماري وسبيط طازج مقلي وطواجن", description: "Tender squid rings breaded golden or baked in spicy Alexandrian red tagines." },
      { name: "Octopus Legs Braised & Grilled", name_ar: "أخطبوط بحري طازج مسلوق ومشوي على الفحم", description: "Tenderized whole octopus char-grilled with lemon juice, oregano, and olive oil." },
      { name: "Fresh Mussels in Garlic & Coriander", name_ar: "بلح البحر طازج بالثوم والكزبرة والليمون", description: "Steamed black mussels opened in fragrant broth of white grape juice and garlic." },
      { name: "Arabian Gulf Rock Lobsters (Umm Al-Rubyan)", name_ar: "استاكوزا / كركند خليجي طازج بالجبنة", description: "Whole spiny lobster split lengthwise and broiled with herb butter or thermidor." },
      { name: "Sea Scallops on Half Shell", name_ar: "اسكالوب بحري طازج في الصدفة بالزبدة", description: "Sweet delicate mollusks seared in sizzling butter and deglazed with citrus." },
      { name: "Mixed Seafood Soup Medley Pack", name_ar: "خلطة مأكولات بحرية مشكلة للشوربة الكريمة", description: "Combination of fish fillet chunks, shrimps, calamari, and crab claws." },
    ],
  },

  // 32. Hot & Cold Mezze Staples
  {
    name: "Hot & Cold Mezze Staples",
    name_ar: "أطباق المزة والمقبلات الشرقية",
    description: "The cornerstone of social dining: vibrant cold salads, stuffed vine leaves, and warm appetizers.",
    subcategories: [
      { name: "Warak Enab Stuffed Vine Leaves with Rice", name_ar: "ورق عنب يالنجي بزيت الزيتون والليمون", description: "Hand-rolled tender grape leaves filled with herbed rice, mint, and tomato." },
      { name: "Traditional Fattoush with Crisp Sumac Pita", name_ar: "فتوش شامي بدبس الرمان والخبز المقرمش", description: "Crisp garden greens, purslane, and radishes tossed with tangy sumac vinaigrette." },
      { name: "Authentic Lebanese Parsley Tabbouleh", name_ar: "تبولة لبنانية بالبقدونس البلدي والبرغل", description: "Fine-chopped flat leaf parsley, mint, tomatoes, and bulgur seasoned with lemon." },
      { name: "Fried Kibbeh Meat Stuffed Croquettes", name_ar: "كبة مقلية شامية محشوة باللحم والصنوبر", description: "Bulgur and meat shells fried to a deep mahogany crisp with steaming core." },
      { name: "Kibbeh Nayyeh Raw Spiced Tartare", name_ar: "كبة نية باللحم الطازج والبرغل وزيت الزيتون", description: "Ultra-fresh pounded raw lamb paste with bulgur, marjoram, and olive oil pool." },
      { name: "Batata Harra Spicy Coriander Potatoes", name_ar: "بطاطا حرة مقرمشة بالثوم والكزبرة والشطة", description: "Crisp fried potato cubes tossed with sautéed garlic, crushed chili, and fresh herbs." },
      { name: "Fried Halloumi Fingers with Honey Dip", name_ar: "أصابع حلوم مقلية بالعسل والسمسم", description: "Golden crusted cheese sticks drizzled with wildflower honey and nigella." },
      { name: "Makanek Glazed in Pomegranate Molasses", name_ar: "مقانق لحم مقلية بصلصة دبس الرمان الحامضة", description: "Sizzling mini sausages coated in a sweet, tart reduced pomegranate glaze." },
      { name: "Arayes Charcoal Grilled Meat Pitas", name_ar: "عرايس لحمة مشوية على الفحم بالخبز البلدي", description: "Pocket pitas stuffed with seasoned kofta paste and crisp-grilled over glowing coals." },
    ],
  },

  // 33. Traditional Dips, Hummus & Mutabbal
  {
    name: "Traditional Dips, Hummus & Mutabbal",
    name_ar: "الحمص والمتبل والمغموسات التراثية",
    description: "Silky pureed legume pastes, flame-smoked aubergines, and walnut red pepper creams.",
    subcategories: [
      { name: "Classic Silky Smooth Hummus Tahini", name_ar: "حمص ناعم بالطحينة وزيت الزيتون البكر", description: "Velvety chickpea emulsion seasoned with garlic, lemon juice, and virgin oil." },
      { name: "Hummus Bil Lahmeh & Roasted Pine Nuts", name_ar: "حمص باللحمة المفرومة والصنوبر المقلي", description: "Hot spiced ground lamb and browned pine nuts crowning cold hummus." },
      { name: "Smoked Mutabbal Aubergine Dip", name_ar: "متبل باذنجان مشوي على الحطب بالطحينة", description: "Charcoal-blistered smoky eggplant pureed with creamy tahini and garlic." },
      { name: "Baba Ghanoush with Pomegranate Jewels", name_ar: "بابا غنوج باذنجان مشوي بالخضار والرمان", description: "Chunky roasted eggplant tossed with diced tomatoes, walnuts, and mint." },
      { name: "Muhammara Aleppo Walnut Red Pepper Dip", name_ar: "محمرة حلبية بالجوز ودبس الرمان والشطة", description: "Rich paste of roasted red peppers, crushed walnuts, and pomegranate molasses." },
      { name: "Foul Mudammas Slow Cooked Fava Dip", name_ar: "فول مدمس بالزيت الحار والكمون والليمون", description: "Mashed stewed fava beans seasoned with garlic, cumin, and flaxseed oil." },
      { name: "Labneh with Garlic & Wild Zaatar Dip", name_ar: "مغموس اللبنة بالثوم والزعتر البري وزيت الزيتون", description: "Tangy strained yogurt swirled with garlic oil and dried wild thyme." },
      { name: "Beetroot Mutabbal Vibrant Pink Dip", name_ar: "متبل الشمندر الوردي بالطحينة والزبادي", description: "Roasted sweet red beets blended with tahini for dramatic color and earthiness." },
      { name: "Tarator Creamy Tahini Fish Sauce", name_ar: "صلصة طراطور بالطحينة والثوم والليمون", description: "Airy tahini sauce thinned with lemon and garlic, perfect for fish and falafel." },
    ],
  },

  // 34. Dried Fruits, Apricot Pastes & Qamar al-Din
  {
    name: "Dried Fruits, Apricot Pastes & Qamar al-Din",
    name_ar: "الفواكه المجففة وقمر الدين",
    description: "Sun-dried fruits from oasis orchards, sheeted apricot leathers, and compote ingredients.",
    subcategories: [
      { name: "Qamar al-Din Sun-Dried Apricot Paste", name_ar: "قمر الدين سوري أصلي لفائف مشمش صافي", description: "Pure rolled apricot leather dissolved into the famous Ramadan beverage." },
      { name: "Turkish Malatya Sun-Dried Whole Apricots", name_ar: "مشمش مجفف تركي مالاطيا جامبو فاخر", description: "Plump, golden orange dried whole apricots with soft honeyed centers." },
      { name: "Black Mission & White Smyrna Dried Figs", name_ar: "تين مجفف سوري وتركي طبيعي حبل", description: "Strung sweet dried whole figs filled with crunchy nutritious seeds." },
      { name: "Golden & Dark Thompson Seedless Raisins", name_ar: "زبيب بناتي ذهبي وأسود فاخر", description: "Sweet sun-dried grapes for pilafs, desserts, and bakery fillings." },
      { name: "Dried Pitted Sweet Cherries", name_ar: "كرز مجفف منزوع النوى طبيعي", description: "Tart-sweet whole dried cherries for savory stews and confectionery." },
      { name: "Pitted Prunes (Dried Plums)", name_ar: "قراصيا / برقوق مجفف منزوع النوى للمغربي", description: "Moist dark prunes simmered in Moroccan meat tagines with toasted sesame." },
      { name: "Dried Whole Sour Cherries (Washneh)", name_ar: "وشنة سورية مجففة لكباب الكرز", description: "Specialty sour cherries essential for Aleppo's celebrated cherry kebab." },
      { name: "Dried Hibiscus & Tamarind Blocks", name_ar: "تمر هندي بلدي معجون قوالب صافي", description: "Natural compressed block of sour tamarind fruit for tart iced syrups." },
      { name: "Candied Orange Peel & Citron Strips", name_ar: "قشور برتقال وحمضيات مسكرة للحلويات", description: "Translucent sugar-glazed citrus ribbons for Ma'amoul and cakes." },
    ],
  },

  // 35. Roasted Nuts, Pistachios & Seeds
  {
    name: "Roasted Nuts, Pistachios & Seeds",
    name_ar: "المكسرات المحمصة والفستق الحلبي والبذور",
    description: "Freshly roasted green pistachios, whole cashews, almonds, and spiced roasted seeds.",
    subcategories: [
      { name: "Aleppo Green Kernel Pistachios Raw", name_ar: "فستق حلبي أخضر أصلي نقي مقشور", description: "Emerald green jewel kernels harvested early for luxury confectionery." },
      { name: "Salted Roasted In-Shell Pistachios", name_ar: "فستق حلبي محمص ومملح بالليمون", description: "Freshly roasted crunchy nuts split in shell for casual entertaining." },
      { name: "Roasted Jumbo Cashews with Sea Salt", name_ar: "كاجو محمص جامبو بالملح البحري", description: "Creamy, golden roasted whole cashews boasting buttery crunch." },
      { name: "Whole Blanched & Raw Almonds", name_ar: "لوز أمريكي وعربي مقشر ومحمص", description: "Crunchy peeled sweet almonds for baking, garnishing, and snacking." },
      { name: "Raw & Roasted Pine Nuts (Snobar)", name_ar: "صنوبر بلدي أبيض فاخر للمشويات والأرز", description: "Precious fragrant pine kernels that fry golden for rice and kibbeh garnishes." },
      { name: "Raw Shelled Walnut Halves (Ain Jamal)", name_ar: "عين جمل / جوز أنصاف إكسترا فاتح", description: "Plump walnut halves packed with natural oils for baklava and makdous." },
      { name: "Roasted Egyptian Watermelon Seeds", name_ar: "لب خشب وبطيخ محمص ومملح مصري", description: "Large salted melon seeds cracked during evenings and soccer matches." },
      { name: "Pumpkin Seeds White Roasted (Lib Abyad)", name_ar: "لب أبيض قرع محمص بالملح والكمون", description: "Crisp roasted white pumpkin seeds with nutty mineral-rich centers." },
      { name: "Deluxe Mixed Cocktail Nuts Tin", name_ar: "مكسرات مشكلة إكسترا فاخرة للضيافة", description: "Luxury party assortment of cashews, almonds, pistachios, and hazelnuts." },
    ],
  },

  // 36. Natural Honeys & Mountain Bee Products
  {
    name: "Natural Honeys & Mountain Bee Products",
    name_ar: "عسل السدر والجبلي ومنتجات النحل",
    description: "Single-origin desert tree nectars, raw combs, and royal bee jellies from Yemeni and Arabian hives.",
    subcategories: [
      { name: "Royal Yemeni Doani Sidr Honey", name_ar: "عسل سدر دوعني يمني ملكي أصلي", description: "The crown jewel of honeys harvested from ancient Lote trees in Wadi Doan." },
      { name: "Kashmiri Sidr Pure Raw Honey", name_ar: "عسل سدر كشميري نقي غير مبستر", description: "Aromatic thick amber honey with lingering butterscotch notes." },
      { name: "Arabian Mountain Samar Acacia Honey", name_ar: "عسل سمر جبلي أسود غني بالمعادن", description: "Dark, viscous, robust honey gathered from desert Acacia tortilis blooms." },
      { name: "Black Forest Wild Blossom Honey", name_ar: "عسل الغابة السوداء الطبيعي الداكن", description: "Mineral-rich honeydew nectar with bold malt and molasses undertones." },
      { name: "Raw Honeycomb in Fresh Acacia Honey", name_ar: "قرص شمع عسل نحل طبيعي كامل", description: "Intact pure wax comb packed with raw unfiltered sweet nectar." },
      { name: "Citrus Orange Blossom White Honey", name_ar: "عسل موالح / زهور البرتقال العطري الخفيف", description: "Bright, pale golden honey infused with natural citrus orchard blossoms." },
      { name: "Raw Egyptian Clover Honey (Barsiim)", name_ar: "عسل برسيم نقي فاتح للتحلية اليومية", description: "Mild, floral everyday sweetener harvested from lush Nile delta fields." },
      { name: "Pure Royal Jelly & Ginseng Vitality Mix", name_ar: "غذاء ملكات النحل مع حبوب اللقاح والجنسنج", description: "Energizing tonic blend rich in amino acids and royal honeybee secretions." },
      { name: "Propolis Natural Throat Spray & Extract", name_ar: "عكبر النحل (بروبوليس) نقي مقوي للمناعة", description: "Natural antibacterial bee resin used as an ancient immune restorative." },
    ],
  },

  // 37. Fruit Molasses & Natural Syrups
  {
    name: "Fruit Molasses & Natural Syrups",
    name_ar: "الدبس الطبيعي ومستخلصات الفواكه المركزة",
    description: "Pure reduced fruit juices without added sugar: pomegranate, carob, grape, and mulberry treacle.",
    subcategories: [
      { name: "Tart Lebanese Pomegranate Molasses (Dibs Rumman)", name_ar: "دبس رمان لبناني حامض بدون سكر مضاف", description: "Pure reduced sour pomegranate juice providing ruby glaze and astringent depth." },
      { name: "Traditional Carob Molasses (Dibs Kharroub)", name_ar: "دبس خروب بلدي طبيعي مركز", description: "Rich chocolatey treacle pressed from Mediterranean wild carob pods." },
      { name: "Syrian Grape Treacle Molasses (Dibs Enab)", name_ar: "دبس عنب سوري أصيل للتحلية والفطائر", description: "Smooth amber reduction of ripe wine grapes for tahini breakfast swirling." },
      { name: "Concentrated Mulberry Syrup (Dibs Toot)", name_ar: "شراب توت شامي مركز للعصائر والمشروبات", description: "Deep purple syrup prepared from hand-harvested Levantine dark mulberries." },
      { name: "Pure Medjool Date Molasses (Dibs Tamr)", name_ar: "دبس تمر مجدول طبيعي غني بالبوتاسيوم", description: "Mineral-rich natural sweet syrup pressed from ripe desert date fruit." },
      { name: "Sugar Cane Black Honey (Assal Eswed)", name_ar: "عسل أسود مصري من قصب السكر الصعيدي", description: "Traditional Upper Egyptian boiled black molasses packed with natural iron." },
      { name: "Apple & Quince Simmered Fruit Butter", name_ar: "دبس تفاح وسفرجل بلدي مطبوخ على الحطب", description: "Spiced fruit reduction flavored with cloves and star anise." },
      { name: "Sour Prunus Plum Syrup (Dibs Khoor)", name_ar: "شراب خوخ وبرقوق حامض متبل للطهي", description: "Tangy glazing syrup used for roasted meats and poultry basting." },
      { name: "Fig & Walnut Breakfast Preserve Treacle", name_ar: "مربى ودبس التين البري بالجوز والهيل", description: "Rich whole fig reduction studded with chunky walnuts and lemon peel." },
    ],
  },

  // 38. Floral Waters, Rose & Orange Blossom
  {
    name: "Floral Waters, Rose & Orange Blossom",
    name_ar: "ماء الورد وماء الزهر والمقطرات النقية",
    description: "Steam-distilled aromatic essences of Damask rose, Seville orange blossoms, and wild mint.",
    subcategories: [
      { name: "Damask Rose Water Triple Distilled (Maa Ward)", name_ar: "ماء ورد جوري دمشقي مقطر ثلاث مرات", description: "Fragrant distillate of Rosa damascena petals for muhallabia and tea drops." },
      { name: "Orange Blossom Water Pure (Maa Zahr)", name_ar: "ماء زهر ليمون بلدي نقي مقطر", description: "Astringent floral water from Citrus aurantium blossoms for baklava syrup." },
      { name: "White Coffee Infusion Distillate (Café Blanc)", name_ar: "مستخلص القهوة البيضاء بماء الزهر والليمون", description: "Caffeine-free after-dinner digestive infused with hot orange blossom water." },
      { name: "Distilled Wild Mint Water (Maa Naanaa)", name_ar: "ماء نعناع بلدي مركز للهضم والانتعاش", description: "Refreshing steam-distilled mint water soothing digestive discomfort." },
      { name: "Dried Damascene Edible Rose Buds", name_ar: "زر ورد جوري مجفف للأطعمة والمشروبات", description: "Vibrant pink whole dried buds for garnishing sweets, rice, and spice rubs." },
      { name: "Distilled Willow Water (Maa Leqah)", name_ar: "ماء لقاح نخيل بلدي تراثي للقهوة", description: "Traditional Gulf palm pollen distillate with delicate soothing aroma." },
      { name: "Lavender & Chamomile Floral Mist", name_ar: "ماء لافندر وخزامى نقي للاسترخاء والحلويات", description: "Subtle culinary floral essence for boutique confectionery and beverages." },
      { name: "Edible Rose Petal Gourmet Jam", name_ar: "مربى بتلات الورد الجوري الشامي الفاخر", description: "Delicate pink preserve cooked with whole Damask rose petals and lemon." },
      { name: "Kewra Pandanus Floral Water Essence", name_ar: "ماء كادي وخلاصة الكيورا لبرياني الأرز", description: "Pungent floral distillate of screwpine essential for festive royal rice." },
    ],
  },

  // 39. Ramadan Seasonal Beverages & Syrups
  {
    name: "Ramadan Seasonal Beverages & Syrups",
    name_ar: "مشروبات وعصائر رمضان التراثية",
    description: "Historic ceremonial drinks prepared to break the fast across Cairo, Damascus, and Mecca.",
    subcategories: [
      { name: "Concentrated Jallab Date & Raisin Syrup", name_ar: "شراب جلاب مركز بالصنوبر والزبيب والورد", description: "Smoky syrup of dates, carob, and raisins served over crushed ice and pine nuts." },
      { name: "Tamarind Pressed Beverage (Tamr Hindi)", name_ar: "مشروب تمر هندي رمضاني حامض حلو مروي", description: "Deep brown sweet and sour iced drink traditionally sold by street hawkers." },
      { name: "Egyptian Sobia Coconut Milk Beverage Powder", name_ar: "بودرة سوبيا مصرية بالحليب وجوز الهند والفانيليا", description: "Creamy, sweet, frosted white drink crafted with fermented rice and coconut." },
      { name: "Whole Dried Licorice Bark (Erq Sous)", name_ar: "عرقسوس سوري بلدي منقوع على أصوله", description: "Foaming, bittersweet black herbal tonic poured theatrically from brass vessels." },
      { name: "Qamar al-Din Iced Apricot Nectar", name_ar: "عصير قمر الدين بالمشمش المثلج وماء الزهر", description: "Thick velvety golden apricot nectar served ice cold at sundown." },
      { name: "Karkadeh Iced Hibiscus Sweet Punch", name_ar: "كركديه أسواني مثلج محلى بالسكر", description: "Vibrant ruby-red cold infusion delivering thirst-quenching citrus acidity." },
      { name: "Doum Palm Powder & Herbal Extract", name_ar: "دوم مصري مطحون لمشروبات الصيف التراثية", description: "Fibrous ancient fruit brew celebrated for maintaining balanced blood pressure." },
      { name: "Kharroub Cold Carob Brewed Drink", name_ar: "عصير خروب بلدي مثلج غني بالنكهة", description: "Earthly toasted sweet carob iced drink reminiscent of chocolate malt." },
      { name: "Ward Iced Rose Soda Syrup Concentrate", name_ar: "شراب الورد المركز باللون القرمزي للكوكتيل", description: "Sweet vivid pink rose syrup mixed with ice water or sparkling lemonade." },
    ],
  },

  // 40. Nougat, Malban & Turkish Delights
  {
    name: "Nougat, Malban & Turkish Delights",
    name_ar: "النوغا والملبن وراحة الحلقوم التراثية",
    description: "Starch jelly lokums, pistachio-stuffed malban rolls, and mastic-scented nougat bars.",
    subcategories: [
      { name: "Aleppo Pistachio Stuffed Malban Rolls", name_ar: "ملبن سوري محشي بالفستق الحلبي الملكي", description: "Starch and grape syrup sheets rolled around solid cores of emerald nuts." },
      { name: "Pistachio Lokum Turkish Delight Cubes", name_ar: "راحة حلقوم تركية فاخرة بالفستق والنشا", description: "Chewy starch and sugar cubes dusted with powdered sugar and loaded with nuts." },
      { name: "Rosewater & Mastic Turkish Delight Cubes", name_ar: "حلقوم بنكهة ماء الورد والمستكة الطبيعية", description: "Translucent pink and ivory confection with gentle floral elasticity." },
      { name: "Ghazl Al-Banat Halva Fairy Floss (Pismaniye)", name_ar: "غزل البنات الشامي بحلاوة الصوف بالفستق", description: "Fine ethereal spun sugar and flour threads that vanish instantly on the tongue." },
      { name: "White Honey Nougat with Roasted Almonds", name_ar: "نوغا بيضاء بالعسل واللوز المحمص والهيل", description: "Chewy honey and whipped egg white confection studded with crunchy nuts." },
      { name: "Almond Dragées (Sugared Jordan Almonds)", name_ar: "ملبس لوز شامي سكر أبيض للمناسبات والأفراح", description: "Crisp sugar shell enrobing whole roasted Mediterranean almonds." },
      { name: "Pomegranate Double Roasted Pistachio Delight", name_ar: "راحة رمان حامضة بالفستق الحلبي المحمص", description: "Ruby red tart pomegranate jelly packed with double roasted nuts." },
      { name: "Sesame & Peanut Sugar Brittle (Semsemia)", name_ar: "سمسمية وفولية وحمصية حلاوة المولد", description: "Crunchy golden caramelized seed and nut bars celebrated during Mawlid." },
      { name: "Coconut Snowflake Soft Marshmallow Fudge", name_ar: "لديدة وجوز هند طري بالعسل والفواكه", description: "Chewy candied shredded coconut confection bound with orange blossom syrup." },
    ],
  },

  // 41. Arabian Oud, Dehn Al Oud & Perfumes
  {
    name: "Arabian Oud, Dehn Al Oud & Perfumes",
    name_ar: "العود ودهن العود والعطور الشرقية",
    description: "Precious agarwood oils, ambergris, taif rose, and regal oriental spray perfumes.",
    subcategories: [
      { name: "Cambodian Vintage Dehn Al Oud (1 Tola)", name_ar: "دهن عود كمبودي معتق أصلي تولة كاملة", description: "Deep, resinous, sweet balsamic agarwood oil distilled from ancient trees." },
      { name: "Indian Kalakassi Dehn Al Oud Aged", name_ar: "دهن عود كلاكاسي هندي معتق فواح", description: "Intense, animalic, earthy, and leathery agarwood oil of supreme prestige." },
      { name: "Taif Rose Pure Essential Oil (Ward Taifi)", name_ar: "دهن ورد طائفي نخب أول قطفة أولى", description: "Exquisite crystalline rose essence harvested from high mountain terraces of Taif." },
      { name: "White Musk Pure Silky Perfume Oil (Misk Abyad)", name_ar: "مسك الطهارة الأبيض الحريري الأصلي", description: "Clean, powdery, velvety white musk oil beloved for personal fragrance." },
      { name: "Oriental Amber & Vanilla Attar Oil", name_ar: "عطر عنبر شرقي مركز بالتوابل والفانيليا", description: "Warm, enveloping golden amber resin blended with sandalwood and spices." },
      { name: "Regal Oud Eau de Parfum Spray (100ml)", name_ar: "عطر بخاخ شرقي بالعود والزعفران والجلود", description: "Modern spray perfume harmonizing smoky agarwood, saffron, and leather." },
      { name: "Black Musk Gazelle Vintage Oil (Misk Aswad)", name_ar: "مسك أسود كشميري دافئ وثابت", description: "Deep, mysterious, warm oriental musk offering legendary longevity." },
      { name: "Sandalwood Pure Mysore Essential Oil", name_ar: "زيت صندل ميسور هندي نقي أصلي", description: "Creamy, smooth, woody base oil used for balancing sacred attars." },
      { name: "Pocket Rollerball Non-Alcoholic Attar", name_ar: "تولة رول عطر زيتي خالي من الكحول للجيب", description: "Convenient travel perfume oils with concentrated alcohol-free longevity." },
    ],
  },

  // 42. Bukhoor, Incense & Charcoal Burners
  {
    name: "Bukhoor, Incense & Charcoal Burners",
    name_ar: "البخور والمعمول والمباخر الفاخرة",
    description: "Fragrant wood chips, pressed scented tablets, and ornate brass and ceramic censers.",
    subcategories: [
      { name: "Natural Agarwood Incense Wood Chips (Khasab)", name_ar: "خشب عود طبيعي موروكي وسيلاني للبخور", description: "Pure resinous wood splinters that bubble and emit rich heavenly smoke on coal." },
      { name: "Maamoul Bukhoor Perfumed Tablets", name_ar: "معمول بخور دوسري ملكي بالمسك والعنبر", description: "Artisanal dough balls of powdered agarwood soaked in fine floral oils." },
      { name: "Frankincense Royal Hojari Luban", name_ar: "لبان حوجري عماني ملكي نخب أول للأكل والتبخير", description: "Highest grade green and white Boswellia sacra tears from the hills of Dhofar." },
      { name: "Myrrh Natural Gum Resin Tears", name_ar: "مر بطارخ بلدي طبيعي للبخور والعلاج", description: "Ancient bitter aromatic gum resin renowned for purification and smoke rituals." },
      { name: "Scented Wood Chips in Perfume Oil (Mabsous)", name_ar: "مبسوس فاخر مشبع بدهن الورد والمسك", description: "Coarsely crushed agarwood soaked in floral attars and fragrant musk." },
      { name: "Electric Ceramic Bukhoor Incense Burner", name_ar: "مبخرة كهربائية ذكية بالسيراميك بدون فحم", description: "Thermostat-controlled flameless burner preventing scorching of fine oils." },
      { name: "Handcrafted Brass Mabkhara Censer", name_ar: "مبخرة نحاسية تقليدية منقوشة باليد", description: "Ornate traditional metal censer with perforated dome for charcoal ember." },
      { name: "Quick-Light Odorless Charcoal Discs", name_ar: "فحم سريع الاشتعال دائري بدون رائحة ودخان", description: "Convenient coal tablets that ignite in seconds for continuous bukhoor heat." },
      { name: "Car Vent Clip-On Bukhoor Diffuser", name_ar: "فواحة بخور عصرية للسيارة بالزيوت الشرقية", description: "Automobile air outlet fragrance holder diffusing authentic oud aroma." },
    ],
  },

  // 43. Traditional Hammam, Aleppo Soaps & Skincare
  {
    name: "Traditional Hammam, Aleppo Soaps & Skincare",
    name_ar: "صابون الغار ومستلزمات الحمام المغربي والعناية",
    description: "Olive and laurel oil soaps, Moroccan eucalyptus black soap, and volcanic rhassoul clay.",
    subcategories: [
      { name: "Aged Aleppo Soap 40% Laurel Oil", name_ar: "صابون غار حلبي أصلي معتق 40% زيت غار", description: "Centuries-old Syrian cold-stirred olive and laurel oil bar dried for 9 months." },
      { name: "Moroccan Black Soap with Eucalyptus (Beldi)", name_ar: "صابون بلدي مغربي بالكينا وزيت الزيتون", description: "Pasty olive oil potash soap that softens dead skin layers in steam baths." },
      { name: "Atlas Mountain Rhassoul Clay Powder", name_ar: "طين غاسول مغربي بركاني نقي للشعر والجسم", description: "Mineral-packed saponiferous clay for purifying masks and natural hair wash." },
      { name: "Authentic Kessa Exfoliating Hammam Glove", name_ar: "كيس حمام مغربي خشن للتقشير وإزالة الجلد الميت", description: "Coarse crepe fabric mitt designed to roll away impurities after black soap." },
      { name: "Nabulsi Olive Oil Soap Bar (Camel Brand)", name_ar: "صابون نابلسي فلسطيني بزيت الزيتون الصافي", description: "Virgin olive oil soap crafted according to ancient soap-boiling heritage." },
      { name: "Organic Cold Pressed Argan Body Oil", name_ar: "زيت أركان تجميلي مغربي نقي 100% للبشرة", description: "Unroasted pure argan oil rich in vitamin E for skin barrier hydration." },
      { name: "Aker Fassi Pomegranate Clay Lip Stain", name_ar: "عكر فاسي مغربي أصلي بدم الغزال", description: "Terracotta pot infused with poppy petals and pomegranate rind for natural tint." },
      { name: "Alum Stone Natural Crystal Deodorant", name_ar: "حجر شبه بلدي طبيعي مزيل لرائحة العرق", description: "Natural mineral potassium alum stone providing clean antimicrobial protection." },
      { name: "Pumice Volcanic Foot Scrubber Stone", name_ar: "حجر خفاف بركاني طبيعي لتقشير القدمين", description: "Cellular volcanic rock for smoothing rough calluses and heels in the bath." },
    ],
  },

  // 44. Kohl, Henna & Natural Oriental Botanicals
  {
    name: "Kohl, Henna & Natural Oriental Botanicals",
    name_ar: "الحناء والكحل والأعشاب التجميلية الطبيعية",
    description: "Traditional cooling mineral eye cosmetics, herbal hair dyes, and bridal skin adornments.",
    subcategories: [
      { name: "Pure Ithmid Kohl Eyeliner Powder (Black)", name_ar: "كحل إثمد أصلي نقي حجري أسود بارد", description: "Finely ground natural stibnite mineral that cools eyes and strengthens lashes." },
      { name: "Red Ithmid Natural Kohl Powder", name_ar: "كحل إثمد أحمر أصفهاني أصيل للعين", description: "Rare reddish mineral powder celebrated in traditional prophetic medicine." },
      { name: "Rajasthani & Madinah Hair Henna Powder", name_ar: "حناء شعر طبيعية فاخرة من مزارع المدينة", description: "Triple-sifted pure Lawsonia inermis powder imparting rich auburn conditioning." },
      { name: "Bridal Henna Paste Cones for Body Art", name_ar: "أقماع حناء جاهزة لنقش العرائس برائحة القرنفل", description: "Ready-to-squeeze smooth henna cones creating deep maroon skin tattoos." },
      { name: "Pure Indigo Powder for Black Hair Dye", name_ar: "وسمة / كتم نباتي لصبغ الشعر الأسود طبيعياً", description: "Indigofera plant powder paired with henna to create jet-black glossy hair." },
      { name: "Sidr (Jujube) Leaf Powder for Hair Wash", name_ar: "ورق سدر مطحون ناعم كشامبو وغسول طبيعي", description: "Saponin-rich crushed leaves that foam gently to cleanse hair and scalp." },
      { name: "Mahlab Ground Fragrant Cherry Seeds", name_ar: "محلب أبيض مطحون لتعطير الشعر والمخبوزات", description: "Fragrant kernel powder lending sweet nutty aroma to hair oils and pastries." },
      { name: "Castor & Black Seed Botanical Hair Elixir", name_ar: "زيت خروع وحبة بركة مقوي لبصيلات الشعر", description: "Viscous nourishing oil blend designed to stimulate thick eyebrow and hair growth." },
      { name: "Handmade Wooden & Brass Kohl Applicator (Mirwad)", name_ar: "مرود ومكحلة خشبية ونحاسية تراثية", description: "Smooth wooden wand and censer for precise, safe application of powder kohl." },
    ],
  },

  // 45. Dallah, Ibrik & Gahwa Serving Sets
  {
    name: "Dallah, Ibrik & Gahwa Serving Sets",
    name_ar: "الدلال والأباريق وأطقم تقديم القهوة العربية",
    description: "Beaked brass coffee pots, fine porcelain finjans, and traditional thermal hospitality flasks.",
    subcategories: [
      { name: "Traditional Brass Qasimi Dallah Pot", name_ar: "دلة قهوة عربية نحاسية قاسمية كلاسيكية", description: "Curved beak brass coffee pot designed for stovetop brewing and pouring." },
      { name: "Haili Stainless Steel Boiling Dallah", name_ar: "دلة حائلية ستانلس ستيل لغلي القهوة", description: "Sturdy long-spouted stainless pot engineered for daily family gatherings." },
      { name: "Porcelain Finjan Cups Golden Filigree", name_ar: "فناجين قهوة عربية سيراميك مذهبة بدون أيدي", description: "Handle-less ceremonial cups bordered with Islamic geometric gold rims." },
      { name: "Copper Turkish Ibrik / Cezve Wood Handle", name_ar: "كنكة / ركوة قهوة تركية نحاس أحمر بمقبض خشب", description: "Hammered thick red copper pot with narrow neck for rich velvet crema." },
      { name: "Thermal Vacuum Flask for Gahwa & Tea", name_ar: "ترموس / ترامس شاي وقهوة فاخرة للمجالس", description: "Insulated double-walled carafes keeping hospitality beverages steaming for 24h." },
      { name: "Mirrored Arabesque Hospitality Serving Tray", name_ar: "صينية تقديم فاخرة مرايا ومعدن ذهبي للمجلس", description: "Ornate gold-plated metal tray framed with arabesque fretwork for majlis guests." },
      { name: "Brass Sugar Bowl & Date Serving Dish", name_ar: "تمرية وسكرية نحاسية بغطاء تراثي فاخر", description: "Lidded brass and crystal vessel dedicated to presenting fresh dates." },
      { name: "Istikana Clear Tea Glasses with Saucers", name_ar: "كاسات شاي استكانات زجاجية مذهبة مع الصحون", description: "Hourglass-shaped delicate glass cups designed for admiring rich tea color." },
      { name: "Charcoal Brazier Stove for Majlis (Mawaqid)", name_ar: "وجار وموقد فحم تراثي لإعداد القهوة بالمجلس", description: "Artisanal hearth stove setup for preparing continuous coffee before seated guests." },
    ],
  },

  // 46. Clay Cookware, Tagines & Pottery
  {
    name: "Clay Cookware, Tagines & Pottery",
    name_ar: "الفخاريات والطواجن وأواني الطين التراثية",
    description: "Conical Moroccan clay tagines, Egyptian clay stew pots (Bram), and natural porous water carafes.",
    subcategories: [
      { name: "Glazed Moroccan Conical Tagine Pot (30cm)", name_ar: "طاجين مغربي فخاري مزجج للطبخ البطيء", description: "Conical lid circulates steam condensation to yield succulent melt-in-mouth meats." },
      { name: "Unglazed Terracotta Bread & Meat Tagine", name_ar: "طاجين طين خام غير مزجج للنكهة التراثية", description: "Natural porous clay dish that imparts earthy ancient mineral flavor to stews." },
      { name: "Egyptian Glazed Clay Bram for Rice & Meat", name_ar: "برام فخار مصري أصلي للأرز المعمر واللحم", description: "Deep rounded baking vessel delivering the crispy browned milk crust of Roz Meammar." },
      { name: "Aswan Porous Clay Water Jug (Qullah)", name_ar: "قلة فخار قناوية أسوانية لتبريد الماء طبيعياً", description: "Evaporative cooling jug keeping drinking water cold through porous terracotta walls." },
      { name: "Zir Large Clay Water Storage Urn", name_ar: "زير ماء فخاري ريفي كبير للتنقية والتبريد", description: "Large village urn functioning as natural passive water filter and cooler." },
      { name: "Clay Yogurt & Curd Pots (Zabadi)", name_ar: "قوالب فخار صغيرة لتخمير الزبادي البلدي", description: "Individual terracotta cups that absorb excess whey for dense creamy curd." },
      { name: "Clay Bean Pot for Foul Mudammas (Qidra)", name_ar: "قدرة فول فخارية للتدميس البطيء على الجمر", description: "Narrow-necked pot preserving steam during overnight gentle bean simmering." },
      { name: "Terracotta Gratin & Dip Dishes Set", name_ar: "أطباق فخارية لتقديم المقبلات الساخنة والفرن", description: "Oven-to-table small dishes for hot hummus, baked feta, and garlic prawns." },
      { name: "Clay Charcoal Roasting Stand (Majmar)", name_ar: "مجمر فخاري تقليدي للطهي والتدفئة بالجمر", description: "Sturdy clay basin designed to cradle glowing coals beneath tagines and kettles." },
    ],
  },

  // 47. Brass, Copper & Handcrafted Metalware
  {
    name: "Brass, Copper & Handcrafted Metalware",
    name_ar: "النحاسيات والمشغولات المعدنية التراثية",
    description: "Tinned heavy copper pans, embossed brass trays, and traditional lantern lighting.",
    subcategories: [
      { name: "Heavy Tinned Copper Frying Pan (Taweleh)", name_ar: "مقلاة نحاس أحمر مبيضة بالقصدير للبيض والفول", description: "Hand-hammered red copper pan providing instantaneous uniform heat distribution." },
      { name: "Embossed Brass Hanging Ramadan Fanous", name_ar: "فانوس رمضان نحاسي زجاج ملون أصلي", description: "Geometric brass lantern set with colored stained glass casting festive shadows." },
      { name: "Hand-Chiseled Brass Tea Tray (Siniyeh)", name_ar: "صينية نحاس صفراء منقوشة باليد بالخط العربي", description: "Circular heavy brass tray engraved with intricate calligraphy and floral arabesques." },
      { name: "Hammered Copper Water Pitcher & Tumbler", name_ar: "إبريق وكوب ماء نحاسي نقي لفوائد النحاس", description: "Traditional drinking vessel that infuses trace minerals into resting water." },
      { name: "Brass Spice Grinder Mill with Crank", name_ar: "مطحنة بهارات نحاسية يدوية بكرنك دوران", description: "Heavy steel-burr hand mill for pulverizing pepper, cumin, and sea salt." },
      { name: "Copper Turkish Delight & Sweet Pedestal Dish", name_ar: "طبق حلويات نحاسي بقاعدة وغطاء مخروطي", description: "Elevated covered sweet bowl for serving lokum, dates, and sugar almonds." },
      { name: "Brass Charcoal Tongs & Poker Set", name_ar: "ملقاط ومجرفة فحم نحاسية للمباخر والمواقد", description: "Sturdy engraved metal tongs for safely adjusting glowing embers." },
      { name: "Handcrafted Copper Knafeh Baking Pan", name_ar: "صينية كنافة نحاسية أصلية لتوزيع الحرارة", description: "Low-rimmed round heavy copper pan ensuring golden even crispness." },
      { name: "Brass Handwashing Ewer & Basin (Tisht)", name_ar: "طست وإبريق نحاسي تراثي لغسيل الأيدي بالورد", description: "Historic ceremonial ewer and perforated basin for washing guests' hands before dining." },
    ],
  },

  // 48. Arabesque Linens, Carpets & Majlis Textiles
  {
    name: "Arabesque Linens, Carpets & Majlis Textiles",
    name_ar: "المفروشات والمنسوجات التراثية وأثاث المجلس",
    description: "Red and black Sadu weave patterns, Egyptian Khayamiya tapestries, and plush majlis cushions.",
    subcategories: [
      { name: "Authentic Bedouin Sadu Pattern Floor Cushion", name_ar: "تكاية ومسند مجلس نقشة سدو بدوي أصيلة", description: "Firm geometric patterned cushion featuring red, black, and cream desert wool motifs." },
      { name: "Egyptian Khayamiya Appliqué Wall Banner", name_ar: "مفرش خيامية مصري يدوي قماش قطن تراثي", description: "Hand-stitched layered fabric art with centuries-old geometric tent designs." },
      { name: "Woven Arabesque Dining Table Runner", name_ar: "مفرش سفرة قماش عربي بنقوش إسلامية وزخارف", description: "Heavy woven jacquard runner that sets a regal tone for family feasts." },
      { name: "Silk Touch Velvet Prayer Mat (Sajjadah)", name_ar: "سجادة صلاة مخملية حريرية مبطنة مريحة", description: "Memory foam padded prayer rug embossed with Mihrab arch patterns." },
      { name: "Low Seating Majlis Floor Mattress", name_ar: "مرتبة مجلس عربي أرضي فوم عالي الكثافة", description: "Traditional low-profile seating mattress designed for long comfortable gatherings." },
      { name: "Sadu Patterned Outdoor Picnic Mat", name_ar: "بساط رحلات وكشتات بر مقاوم للماء بنقشة سدو", description: "Foldable durable ground sheet for desert camping and outdoor barbecues." },
      { name: "Embroidered Velvet Cushion Covers Set", name_ar: "أغطية خداديات مخمل مطرزة بالخيوط الذهبية", description: "Square accent pillow slips featuring gold cord embroidery and tassels." },
      { name: "Traditional Wool Striped Kelim Rug", name_ar: "سجاد كليم يدوي صوف طبيعي بنقوش شرقية", description: "Flat-woven durable wool rug with vibrant earth pigments and tribal stripes." },
      { name: "Arabesque Printed Tea Towels & Napkins", name_ar: "فوط ومناديل سفرة قطنية بزخارف أندلسية", description: "Absorbent 100% Egyptian cotton linens printed with Mediterranean tile motifs." },
    ],
  },

  // 49. Traditional Apparel, Thobes & Shemaghs
  {
    name: "Traditional Apparel, Thobes & Shemaghs",
    name_ar: "الأزياء التقليدية والأثواب والشماغات",
    description: "Pristine white cotton thobes, red and white checkered shemaghs, and gold embroidered bishts.",
    subcategories: [
      { name: "Classic White Saudi Thobe Fine Cotton", name_ar: "ثوب سعودي رجالي أبيض كلاسيك قماش فاخر", description: "Crisp tailored ankle-length robe with structured mandarin collar and cuffs." },
      { name: "Emirati Kandura with Long Tassel (Tarbousha)", name_ar: "كندورة إماراتية عربية بتطريز وطربوشة", description: "Collarless flowing white robe distinguished by its scented chest tassel." },
      { name: "Red & White Jacquard Shemagh Headscarf", name_ar: "شماغ أحمر ملكي قطن نخب أول دم الغزال", description: "Premium woven checkered cotton headdress draped over the head with the Igal." },
      { name: "Pure White Ghutra Lightweight Headdress", name_ar: "غترة بيضاء نقية سويسرية ناعمة وخفيفة", description: "Featherlight crisp white voile cotton cloth popular in hot Gulf summers." },
      { name: "Traditional Black Wool Igal Headband", name_ar: "عقال أسود مرعز صوف طبيعي فاخر", description: "Double-ringed weighted cord securing the shemagh with dignity." },
      { name: "Gold Trimmed Royal Bisht Cloak (Mishlah)", name_ar: "بشت / مشلح حساوي ملكي مطرز بالقصب الذهبي", description: "Ceremonial sheer cape bordered with hand-applied French metallic gold bullion." },
      { name: "Kuwaiti Cut Everyday Dishdasha", name_ar: "دشداشة كويتية رسمية بقصة أنيقة ومريحة", description: "Sharp tailored silhouette with point collar and clean minimalist front." },
      { name: "Omani Traditional Dishdasha with Short Tassel", name_ar: "دشداشة عمانية أصلية بتطريز العنق والمحزام", description: "Hand-embroidered neckline with subtle chest tassel worn with the Kumma cap." },
      { name: "Hand-Embroidered Omani Kumma Cap", name_ar: "كمة عمانية أصلية مطرزة باليد بدقة عالية", description: "Intricately needle-worked stiffened round cap worn proudly across the Sultanate." },
    ],
  },

  // 50. Abayas, Kaftans & Oriental Embroidery
  {
    name: "Abayas, Kaftans & Oriental Embroidery",
    name_ar: "العبايات والقفاطين والتطريز الشرقي",
    description: "Modest couture black and pastel abayas, silk Moroccan kaftans, and hand-embroidered thobes.",
    subcategories: [
      { name: "Classic Jet Black Crepe Abaya", name_ar: "عباية كريب سوداء كلاسيكية يومية سادة", description: "Breathable Korean crepe fabric with fluid drape and concealed snap closures." },
      { name: "Moroccan Royal Velvet Kaftan with Gold Sfifa", name_ar: "قفطان مغربي ملكي مخملي مطرز بالسفيفة والحزام", description: "Opulent full-length evening gown braided with metallic silk cord and jeweled belt." },
      { name: "Palestinian Hand-Embroidered Tatreez Thobe", name_ar: "ثوب فلسطيني مطرز بتطريز الفلاحي اليدوي التراثي", description: "Cross-stitch embroidered masterpiece celebrating heirloom motifs of Ramallah and Hebron." },
      { name: "Modern Pastel Linen Open-Front Abaya", name_ar: "عباية لينن كاجوال مفتوحة بألوان الباستيل", description: "Contemporary airy linen over-garment styled for modern working professionals." },
      { name: "Embroidered Bisht-Style Butterfly Abaya", name_ar: "عباية بشت فراشة واسعة بتطريز على الأكمام", description: "Voluminous batwing silhouette featuring gold braided embroidery on cuffs." },
      { name: "Chiffon & Georgette Hijab Scarves Set", name_ar: "طرح وشيلات شيفون وجورجيت بألوان ترابية", description: "Breathable anti-slip hair scarves in versatile neutral and rich jewel tones." },
      { name: "Dubai Designer Crystal Embellished Abaya", name_ar: "عباية سهرة فاخرة مرصعة بكريستال سواروفسكي", description: "Glamorous dark evening wear adorned with hand-placed light-reflecting crystals." },
      { name: "Traditional Jalabiya with Golden Trim", name_ar: "جلابية منزلية قطنية مريحة بتطريز شرقي", description: "Soft Egyptian cotton house dress accented with cheerful metallic braid." },
      { name: "Modest Swimwear Burkini Three-Piece Set", name_ar: "مايوه شرعي بوركيني تركي سريع الجفاف", description: "Full-coverage UPF 50+ water-resistant tunic, leggings, and swim hijab." },
    ],
  },
];
