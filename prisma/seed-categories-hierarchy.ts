import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.qihgtllyfkoynorwazfn:qinuIGJW49YV2MHa@aws-1-eu-west-2.pooler.supabase.com:5432/postgres';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface CategoryDefinition {
  name: string;
  name_ar: string;
  description: string;
  subcategories: Array<{
    name: string;
    name_ar: string;
    description: string;
  }>;
}

export const TAXONOMY_DATA: CategoryDefinition[] = [
  {
    name: 'Hot Beverages',
    name_ar: 'المشروبات الساخنة',
    description: 'Freshly brewed coffees, specialty teas, hot infusions, and warming winter drinks.',
    subcategories: [
      { name: 'Espresso & Handcrafted Coffee', name_ar: 'قهوة إسبريسو ومشروباتها', description: 'Single and double shot espresso, flat whites, cappuccinos, and caffe lattes.' },
      { name: 'Specialty Pour-Over & V60', name_ar: 'قهوة مقطرة ومختصة V60', description: 'Single-origin beans brewed with V60, Chemex, Aeropress, and siphon methods.' },
      { name: 'Traditional Arabic Coffee & Dallah', name_ar: 'قهوة عربية أصيلة ودلة', description: 'Light roast authentic Arabic coffee infused with green cardamom and saffron.' },
      { name: 'Turkish Coffee & Cezve', name_ar: 'قهوة تركية وركوة نحاسية', description: 'Finely ground roasted coffee simmered slowly with cardamom.' },
      { name: 'Black & Green Artisan Teas', name_ar: 'شاي أسود وأخضر فاخر', description: 'Loose-leaf Ceylon, Earl Grey, Sencha, Jasmine, and Moroccan mint teas.' },
      { name: 'Herbal & Fruit Infusions', name_ar: 'شاي أعشاب وزهور طبيعية', description: 'Caffeine-free chamomile, hibiscus, peppermint, and ginger lemon teas.' },
      { name: 'Karak & Spiced Chai', name_ar: 'شاي كرك وشاي بالبهارات', description: 'Slow-simmered spiced milk tea infused with saffron, cardamom, and cloves.' },
      { name: 'Hot Chocolate & Sweet Mocha', name_ar: 'شوكولاتة ساخنة وموكا', description: 'Rich Belgian melted chocolate, Spanish hot cocoa, and white mocha.' },
      { name: 'Ceremonial Matcha & Lattes', name_ar: 'شاي ماتشا ياباني ومشروبات الحليب', description: 'Premium grade Japanese Uji matcha whisks, iced or steamed with milk.' },
    ],
  },
  {
    name: 'Cold Beverages & Mocktails',
    name_ar: 'المشروبات الباردة والكوكتيلات',
    description: 'Iced coffees, cold brewed refreshments, fresh smoothies, and signature mocktails.',
    subcategories: [
      { name: 'Iced Coffees & Cold Brew', name_ar: 'قهوة مثلجة وكولد برو', description: '24-hour slow cold brew, Spanish latte, iced caramel macchiato, and freddo.' },
      { name: 'Freshly Squeezed Juices', name_ar: 'عصائر طازجة طبيعية', description: 'Pure 100% orange, pomegranate, carrot, green apple, and sugarcane juices.' },
      { name: 'Fruit Smoothies & Frappes', name_ar: 'سموذي فواكه وفرابيه مثلج', description: 'Blended berries, mango passionfruit, strawberry banana, and avocado honey.' },
      { name: 'Signature Mojitos & Coolers', name_ar: 'موهيتو منعش ومشروبات منعشة', description: 'Classic lime mint, blue lagoon, passionfruit, and wild berry virgin mojitos.' },
      { name: 'Iced Artisan Teas', name_ar: 'شاي مثلج ونكهات فواكه', description: 'Chilled peach iced tea, hibiscus lemon quencher, and berry green tea.' },
      { name: 'Mineral & Sparkling Waters', name_ar: 'مياه معدنية وفوارة', description: 'Still natural spring waters, San Pellegrino, Perrier, and infused waters.' },
      { name: 'Soft Drinks & Craft Sodas', name_ar: 'مشروبات غازية وصودا حرفية', description: 'Cola, citrus sodas, tonic waters, craft ginger beer, and zero-calorie sodas.' },
      { name: 'Energy & Electrolyte Boosters', name_ar: 'مشروبات الطاقة والترطيب الرياضي', description: 'Natural energy drinks, B-vitamin boosters, and coconut electrolyte waters.' },
    ],
  },
  {
    name: 'Appetizers & Starters',
    name_ar: 'المقبلات والوجبات الخفيفة',
    description: 'Finger foods, cold and hot mezzah platters, shareable starters, and crispy bites.',
    subcategories: [
      { name: 'Cold Mezzah & Gourmet Dips', name_ar: 'مقبلات باردة ومتبلات', description: 'Velvety hummus varieties, mutabbal, baba ghanoush, and labneh dip.' },
      { name: 'Hot Mezzah & Savory Pastries', name_ar: 'مقبلات ساخنة ومعجنات مقرمشة', description: 'Crispy kibbeh, cheese sambousek, spinach fatayer, and falafel bites.' },
      { name: 'Artisan Soups & Broths', name_ar: 'شوربات وحساء ساخن', description: 'Lentil soup with croutons, creamy wild mushroom, minestrone, and seafood bisque.' },
      { name: 'Fresh Greens & Signature Salads', name_ar: 'سلطات خضراء وطازجة', description: 'Fattoush, tabbouleh, classic Caesar, Mediterranean Greek, and quinoa salad.' },
      { name: 'Crispy Wings & Finger Foods', name_ar: 'أجنحة دجاج مقرمشة ولقيمات', description: 'Buffalo wings, honey garlic drumettes, mozzarella sticks, and onion rings.' },
      { name: 'Loaded Gourmet Fries & Nachos', name_ar: 'بطاطس محملة وناتشوز مكسيكي', description: 'Truffle parmesan fries, cheese chili fries, and supreme loaded nachos.' },
      { name: 'Bruschetta & Tapas Platters', name_ar: 'بروسكيتا وأطباق تاباس', description: 'Toasted baguette with tomato basil, smoked salmon tapas, and garlic prawns.' },
    ],
  },
  {
    name: 'Main Dishes & Chef Entrees',
    name_ar: 'الأطباق الرئيسية والوجبات الفاخرة',
    description: 'Hearty meat, chicken, seafood, and traditional specialty dishes.',
    subcategories: [
      { name: 'Prime Steaks & Tenderloins', name_ar: 'شرائح ستيك ولحوم فاخرة', description: 'Black Angus ribeye, tenderloin fillets, striploins, and T-bone cuts.' },
      { name: 'Charcoal Grills & Mixed BBQ', name_ar: 'مشاوي على الفحم ومكس جريل', description: 'Shish tawook, lamb chops, seekh kebabs, kofta skewers, and grilled arayes.' },
      { name: 'Slow-Cooked Stews & Tagines', name_ar: 'طواجن ويخنات مطهوة ببطء', description: 'Moroccan lamb tagines, okra lamb stew, chicken musakhan, and dawood basha.' },
      { name: 'Heritage Rice Platters & Biryani', name_ar: 'أطباق الأرز والكبسة والبرياني', description: 'Saudi Kabsa, Hyderabadi dum biryani, lamb mandi, and smoked Bukhari rice.' },
      { name: 'Rotisserie & Roast Poultry', name_ar: 'دجاج مشوي ومحمر بالفرن', description: 'Herbed rotisserie chicken, peri-peri half chicken, and stuffed roast fowl.' },
      { name: 'Oven Casseroles & Gratins', name_ar: 'صواني بالفرن وجراتان دافئ', description: 'Potato meat gratin, bechamel baked dishes, and vegetable casseroles.' },
    ],
  },
  {
    name: 'Burgers, Sliders & Sandwiches',
    name_ar: 'البرجر والسلايدرز والساندويشات',
    description: 'Gourmet smashed burgers, crispy chicken sandwiches, wraps, and deli toasts.',
    subcategories: [
      { name: 'Smashed & Prime Beef Burgers', name_ar: 'برجر لحم فاخر وسماش', description: 'Double smash Angus beef, truffle mushroom burger, and classic cheeseburgers.' },
      { name: 'Crispy Chicken & Zesty Burgers', name_ar: 'برجر دجاج مقرمش وسبايسي', description: 'Nashville hot chicken, crispy buttermilk crunch, and honey mustard burgers.' },
      { name: 'Gourmet Sliders & Mini Bites', name_ar: 'سلايدرز ميني ومجموعات تذوق', description: 'Trio slider boxes, pulled beef brisket sliders, and buffalo mini burgers.' },
      { name: 'Artisan Paninis & Ciabatta Melts', name_ar: 'بانيني محمص وتوست إيطالي', description: 'Smoked turkey mozzarella panini, grilled halloumi, and roast beef ciabatta.' },
      { name: 'Signature Wraps & Flatbread Rolls', name_ar: 'ساندويشات راب ولفائف التورتيلا', description: 'Chicken Caesar wrap, falafel tahini roll, and Philly cheesesteak wrap.' },
      { name: 'Traditional Shawarma & Doner', name_ar: 'شاورما على الفحم ودونر تركي', description: 'Garlic chicken shawarma platters, meat shawarma with pomegranate, and doner.' },
    ],
  },
  {
    name: 'Pizza & Italian Cuisine',
    name_ar: 'البيتزا والمأكولات الإيطالية',
    description: 'Authentic stone-baked pizza, handmade fresh pasta, creamy risotto, and calzones.',
    subcategories: [
      { name: 'Wood-Fired Neapolitan Pizza', name_ar: 'بيتزا نابوليتان حطبية', description: 'San Marzano Margherita, Buffalo mozzarella, pepperoni, and marinara.' },
      { name: 'Classic & Stuffed-Crust Pizza', name_ar: 'بيتزا كلاسيكية وأطراف محشوة', description: 'BBQ chicken pizza, four cheese quattro formaggi, and supreme vegetarian.' },
      { name: 'Handmade Fresh Pastas', name_ar: 'باستا طازجة ومعكرونة إيطالية', description: 'Fettuccine Alfredo, Penne all Arrabiata, Spaghetti Bolognese, and Pesto.' },
      { name: 'Stuffed Ravioli & Gnocchi', name_ar: 'رافيولي محشو ونيوكي بالبطاطس', description: 'Ricotta spinach ravioli, beef tortellini, and truffle parmesan potato gnocchi.' },
      { name: 'Creamy Risottos', name_ar: 'ريزوتو إيطالي كريمي', description: 'Arborio rice cooked with porcini mushrooms, saffron, or seafood blend.' },
      { name: 'Baked Lasagna & Cannelloni', name_ar: 'لازانيا باللحم وكانيلوني بالفرن', description: 'Classic beef lasagna with bechamel, ricotta cannelloni, and pasta al forno.' },
      { name: 'Calzones & Pizza Rolls', name_ar: 'كالزوني مغلق ولفائف البيتزا', description: 'Folded pizza pockets stuffed with salami, mozzarella, and marinara sauce.' },
    ],
  },
  {
    name: 'Seafood & Catch of the Day',
    name_ar: 'المأكولات البحرية وصيد اليوم',
    description: 'Fresh local fish, jumbo prawns, lobster tails, and gourmet ocean platters.',
    subcategories: [
      { name: 'Whole Grilled & Fried Fish', name_ar: 'أسماك طازجة مشوية ومقلية', description: 'Seabass, Hamour, Sea Bream, red snapper with tahini, lemon garlic, and herbs.' },
      { name: 'Prawns, Shrimp & Scampi', name_ar: 'أطباق الروبيان والجمبري', description: 'Garlic butter jumbo prawns, crispy dynamite shrimp, and grilled skewers.' },
      { name: 'Lobster, Crab & Royal Crustaceans', name_ar: 'لوبستر واستاكوزا وكابوريا', description: 'Thermidor lobster tails, Singapore chili crab, and king crab legs.' },
      { name: 'Calamari, Octopus & Squid', name_ar: 'كاليماري وحبار وأخطبوط', description: 'Salt & pepper fried calamari rings, grilled Mediterranean octopus tentacles.' },
      { name: 'Mussels, Clams & Fresh Oysters', name_ar: 'بلح البحر ومحار طازج', description: 'Steamed black mussels in garlic white sauce and fresh oysters on ice.' },
      { name: 'Salmon Fillets & Tuna Steaks', name_ar: 'فيليه السلمون وستيك التونة', description: 'Pan-seared Norwegian salmon with asparagus and sesame-crusted tuna steak.' },
      { name: 'Seafood Paella & Stews', name_ar: 'باييلا بحرية وشوربات ثمار البحر', description: 'Traditional Spanish seafood paella with saffron rice, clams, and shrimp.' },
    ],
  },
  {
    name: 'Bakery & Artisan Bread',
    name_ar: 'المخبوزات والخبز الحرفي',
    description: 'Daily fresh sourdough, French baguettes, morning pastries, and traditional pitas.',
    subcategories: [
      { name: 'Sourdough Loaves & Boules', name_ar: 'خبز العجين المخمر (ساوردو)', description: 'Country loaves, rye sourdough, multiseed boules with crispy crusts.' },
      { name: 'French Baguettes & Batards', name_ar: 'باجيت فرنسي ومخبوزات مقرمشة', description: 'Crispy traditional French baguettes, epi breads, and batards.' },
      { name: 'Butter Croissants & Viennoiserie', name_ar: 'كرواسون الزبدة ومعجنات فرنسية', description: 'Flaky pure butter croissants, pain au chocolat, almond croissants, and danishes.' },
      { name: 'Pita, Naan & Traditional Flatbreads', name_ar: 'خبز عربي وبيتا ونان', description: 'Tannour bread, Lebanese pocket pita, garlic butter naan, and saj bread.' },
      { name: 'Focaccia, Ciabatta & Olive Loaves', name_ar: 'فوكاتشا وتشاباتا إيطالية', description: 'Rosemary sea salt focaccia, rustic ciabatta bread, and kalamata olive rolls.' },
      { name: 'Burger Buns, Brioche & Slider Rolls', name_ar: 'خبز البريوش ولفائف البرجر', description: 'Golden butter brioche buns, potato buns, pretzel rolls, and slider bread.' },
      { name: 'Savory Hand Pies & Quiches', name_ar: 'فطائر مالحة وتارت الخضار', description: 'Lorraine quiches, chicken leek pies, mushroom tarts, and puff pastry parcels.' },
    ],
  },
  {
    name: 'Desserts, Pastries & Confectionery',
    name_ar: 'الحلويات والمعجنات الغربية',
    description: 'Layered cakes, French tarts, artisanal chocolates, and cold desserts.',
    subcategories: [
      { name: 'Gourmet Cheesecakes', name_ar: 'تشيز كيك بالنكهات الفاخرة', description: 'New York baked cheesecake, San Sebastian burnt cake, and lotus speculoos.' },
      { name: 'Signature Cakes & Layer Slices', name_ar: 'كعكات المناسبات وطبقات الكيك', description: 'Red velvet cake, dark chocolate fudge, carrot walnut cake, and Victoria sponge.' },
      { name: 'French Macarons & Eclairs', name_ar: 'ماكرون ملون وإكلير فرنسي', description: 'Almond macarons with ganache, chocolate choux eclairs, and Paris-Brest.' },
      { name: 'Tarts, Pies & Fruit Galettes', name_ar: 'تارت الفواكه وفطائر التفاح', description: 'Lemon meringue tart, fresh berry custard tart, and warm apple crumble pie.' },
      { name: 'Brownies, Cookies & Blondies', name_ar: 'كوكيز وبراونيز الشوكولاتة', description: 'Fudgy triple chocolate brownies, giant chewy chocolate chip cookies.' },
      { name: 'Tiramisu, Mousses & Puddings', name_ar: 'تراميسو وموس الشوكولاتة', description: 'Traditional Italian espresso tiramisu, dark chocolate mousse, and panna cotta.' },
      { name: 'Molten Lava Cakes & Souffles', name_ar: 'مولتن لافا كيك وسوفليه دافئ', description: 'Warm molten chocolate volcano cake, pistachio lava, and vanilla souffle.' },
      { name: 'Artisan Gelato & Ice Cream', name_ar: 'جيلاتو إيطالي وآيس كريم حرفي', description: 'Pistachio Bronte, Madagascar vanilla, Belgian chocolate, and mango sorbet.' },
    ],
  },
  {
    name: 'Oriental & Heritage Sweets',
    name_ar: 'الحلويات الشرقية والتراثية',
    description: 'Golden baklava, authentic kunafa, maamoul cookies, and honeyed syrups.',
    subcategories: [
      { name: 'Baklava & Filo Pastries', name_ar: 'بقلاوة بالفستق والمكسرات', description: 'Crispy filo layers stuffed with Antep pistachios, walnuts, and orange blossom.' },
      { name: 'Kunafa & Kataifi Pastries', name_ar: 'كنافة نابلسية وبالقشطة', description: 'Hot cheese Nabulsi kunafa, cream-filled kunafa cones, and crunchy kataifi.' },
      { name: 'Basbousa, Harissa & Semolina', name_ar: 'بسبوسة وهريسة باللوز', description: 'Almond basbousa soaked in syrup, coconut semolina cake, and harissa.' },
      { name: 'Maamoul & Stuffed Date Cookies', name_ar: 'معمول بالتمر والمكسرات', description: 'Traditional semolina maamoul filled with Medjool dates, pistachios, or walnuts.' },
      { name: 'Umm Ali & Warm Milk Desserts', name_ar: 'أم علي وحلويات الحليب الدافئة', description: 'Egyptian puff pastry baked with milk, raisins, pistachios, and clotted cream.' },
      { name: 'Halawet El Jibn & Ashta Rolls', name_ar: 'حلاوة الجبن ورولات القشطة', description: 'Sweet cheese rolls filled with clotted ashta cream, rose petal jam, and syrup.' },
      { name: 'Luqaimat & Sweet Dumplings', name_ar: 'لقيمات مقرمشة وعوامة بالدبس', description: 'Golden fried dough puffs drizzled with date molasses, honey, and sesame seeds.' },
    ],
  },
  {
    name: 'Dairy, Artisan Cheeses & Eggs',
    name_ar: 'منتجات الألبان والأجبان والبيض',
    description: 'Fresh farm milk, imported and regional cheeses, butter, and free-range eggs.',
    subcategories: [
      { name: 'Fresh Milk & Plant-Based Milks', name_ar: 'حليب طازج وبدائل نباتية', description: 'Full-fat fresh cow milk, oat milk, almond milk, soy milk, and lactose-free milk.' },
      { name: 'Farm-Fresh & Organic Eggs', name_ar: 'بيض مزارع طازج وبيض عضوي', description: 'Omega-3 enriched eggs, brown free-range eggs, and quail eggs.' },
      { name: 'Pure Butter, Ghee & Whipping Cream', name_ar: 'زبدة طبيعية وسمن وقشطة', description: 'European unsalted butter, clarified butter ghee, double cream, and mascarpone.' },
      { name: 'Soft Cheeses & Spreadables', name_ar: 'أجبان طرية وقابلة للدهن', description: 'Fresh mozzarella, burrata balls, ricotta, cream cheese blocks, and cottage cheese.' },
      { name: 'Aged, Hard & Semi-Hard Cheeses', name_ar: 'أجبان معتقة وصلبة', description: 'Parmigiano Reggiano, aged Dutch gouda, sharp cheddar, and Gruyere.' },
      { name: 'Halloumi, Feta & White Cheeses', name_ar: 'جبنة حلوم وفيتا وجبنة بيضاء', description: 'Cypriot grilling halloumi, Greek feta PDO, Akkawi cheese, and Nabulsi cheese.' },
      { name: 'Yogurt, Greek Labneh & Ayran', name_ar: 'زبادي ولبنة بلدية ولبن عيران', description: 'Full-fat strained Greek yogurt, authentic olive oil labneh, and chilled ayran.' },
    ],
  },
  {
    name: 'Fresh Farm Produce & Greens',
    name_ar: 'الخضروات والفواكه الطازجة',
    description: 'Crisp salad greens, root vegetables, citrus, berries, and culinary mushrooms.',
    subcategories: [
      { name: 'Leafy Greens & Microgreens', name_ar: 'ورقيات خضراء وميكروجرين', description: 'Baby spinach, wild arugula, romaine lettuce, coriander, parsley, and mint.' },
      { name: 'Vine Tomatoes, Peppers & Cucumbers', name_ar: 'طماطم وخيار وفليفلة ملونة', description: 'Cherry tomatoes, heirloom tomatoes, English cucumbers, and bell peppers.' },
      { name: 'Potatoes, Onions & Root Veggies', name_ar: 'بطاطس وبصل وجذور طازجة', description: 'Russet potatoes, sweet red onions, garlic bulbs, ginger roots, and carrots.' },
      { name: 'Citrus & Tropical Fruits', name_ar: 'حمضيات وفواكه استوائية', description: 'Valencia oranges, Eureka lemons, limes, pineapples, mangoes, and passionfruit.' },
      { name: 'Fresh Berries & Stone Fruits', name_ar: 'توتيات وفواكه صيفية', description: 'Strawberries, blueberries, raspberries, peaches, plums, and cherries.' },
      { name: 'Gourmet Mushrooms & Truffles', name_ar: 'فطر ومشروم طازج وكمأة', description: 'Portobello mushrooms, button mushrooms, oyster mushrooms, and truffle products.' },
      { name: 'Avocados, Melons & Orchard Fruits', name_ar: 'أفوكادو وبطيخ وفواكه البساتين', description: 'Hass avocados, sweet watermelon, cantaloupe, Gala apples, and pears.' },
    ],
  },
  {
    name: 'Fresh Meats & Poultry',
    name_ar: 'اللحوم والدواجن الطازجة',
    description: 'Raw butcher cuts, premium steaks, fresh chicken, and minced meats for kitchens.',
    subcategories: [
      { name: 'Prime Beef Cuts & Roasts', name_ar: 'قطعيات لحم بقري طازج', description: 'Tenderloin, ribeye, brisket, short ribs, and top sirloin roast cuts.' },
      { name: 'Fresh Lamb & Goat Cuts', name_ar: 'لحم خروف وضأن وماعز بلدي', description: 'Lamb shank, bone-in lamb shoulder, loin chops, and whole carcass cuts.' },
      { name: 'Fresh Whole & Cut Chicken', name_ar: 'دواجن كاملة ومقطعة طازجة', description: 'Whole chilled chickens, skinless chicken breasts, thighs, and drumsticks.' },
      { name: 'Minced Meat & Raw Burger Patties', name_ar: 'لحم مفروم وأقراص برجر نية', description: 'Coarsely ground beef, lamb keema, and pre-formed 150g burger patties.' },
      { name: 'Veal & Tender Baby Cuts', name_ar: 'لحم بتلو وعجل صغير طازج', description: 'Tender veal cutlets, osso buco shanks, and boneless veal cubes.' },
      { name: 'Artisan Sausages & Raw Kofta', name_ar: 'سجق ونقانق طازجة وكفتة', description: 'Spiced beef sausage, breakfast chipolatas, and spiced minced kofta.' },
    ],
  },
  {
    name: 'Pantry Staples, Grains & Rice',
    name_ar: 'المؤونة والحبوب والأرز',
    description: 'Bulk basmati rice, fine flour, pasta shapes, pulses, and dry cooking goods.',
    subcategories: [
      { name: 'Premium Basmati & Specialty Rice', name_ar: 'أرز بسمتي وأصناف فاخرة', description: 'Long-grain aged basmati, Egyptian calrose, Italian arborio, and jasmine rice.' },
      { name: 'Baking Flours, Starches & Yeast', name_ar: 'دقيق الخَبز والنشا والخميرة', description: 'High-protein bread flour, all-purpose flour, cornstarch, and instant dry yeast.' },
      { name: 'Dry Pastas, Noodles & Vermicelli', name_ar: 'معكرونة جافة ونودلز وشعيرية', description: 'Spaghetti, fusilli, penne rigate, ramen noodles, and roasted vermicelli.' },
      { name: 'Legumes, Lentils & Chickpeas', name_ar: 'بقوليات وعدس وحمص وفول', description: 'Brown lentils, yellow split peas, kabuli chickpeas, fava beans, and kidney beans.' },
      { name: 'Oats, Quinoa & Breakfast Grains', name_ar: 'شوفان وكينوا وحبوب الإفطار', description: 'Rolled jumbo oats, white quinoa, cornflakes, and whole grain granola.' },
      { name: 'Sugars, Syrups & Natural Sweeteners', name_ar: 'سكر وعسل طبيعي ومحليات', description: 'Fine white sugar, raw brown sugar, maple syrup, and raw mountain honey.' },
      { name: 'Nuts, Seeds & Dried Culinary Fruits', name_ar: 'مكسرات وبذور وفواكه مجففة', description: 'Toasted almonds, walnuts, pine nuts, chia seeds, raisins, and dried figs.' },
    ],
  },
  {
    name: 'Cooking Oils, Ghee & Vinegars',
    name_ar: 'الزيوت والسمن والخل',
    description: 'Extra virgin olive oils, neutral frying oils, balsamic vinegars, and cooking ghee.',
    subcategories: [
      { name: 'Extra Virgin Olive Oils', name_ar: 'زيت زيتون بكر ممتاز', description: 'Cold-pressed extra virgin olive oil from Palestine, Spain, Italy, and Greece.' },
      { name: 'Deep Frying & Vegetable Oils', name_ar: 'زيوت القلي والطهي النباتية', description: 'High-smoke point corn oil, sunflower oil, canola oil, and palm olein.' },
      { name: 'Pure Animal & Vegetable Ghee', name_ar: 'سمن بلدي وسمن نباتي نقي', description: 'Traditional cow ghee, sheep ghee, and vegetable shortening.' },
      { name: 'Balsamic & Gourmet Vinegars', name_ar: 'خل بلسميك وخل تفاح معتق', description: 'Modena balsamic vinegar glaze, organic apple cider vinegar, and white wine vinegar.' },
      { name: 'Specialty Infused & Finishing Oils', name_ar: 'زيوت منكهة وزيت السمسم', description: 'White truffle oil, toasted sesame oil, chili infused oil, and garlic olive oil.' },
    ],
  },
  {
    name: 'Sauces, Condiments & Dips',
    name_ar: 'الصلصات والمتبلات ومعجون الطماطم',
    description: 'Tomato sauces, hot chili condiments, mayonnaise, mustard, and international dressings.',
    subcategories: [
      { name: 'Tomato Pastes, Purees & Passata', name_ar: 'معجون طماطم وصلصات مسبكة', description: 'Double concentrated tomato paste, Italian peeled plum tomatoes, and passata.' },
      { name: 'Hot Sauces, Sriracha & Chilies', name_ar: 'شطة وصلصات حارة وسريراتشا', description: 'Louisiana hot sauce, sriracha chili sauce, tabasco, and habanero sauces.' },
      { name: 'Mayonnaise, Mustards & Emulsions', name_ar: 'مايونيز وخردل وصوصات بيضاء', description: 'Real mayonnaise, Dijon mustard, yellow table mustard, and garlic aioli.' },
      { name: 'BBQ, Smoked & Steak Sauces', name_ar: 'صوص باربيكيو وتتبيلات اللحم', description: 'Smoky hickory BBQ sauce, Worcestershire sauce, and peppercorn sauce base.' },
      { name: 'Soy, Teriyaki & Asian Glazes', name_ar: 'صلصة صويا وترياكي وصوصات آسيوية', description: 'Dark soy sauce, gluten-free tamari, teriyaki glaze, oyster sauce, and sesame dressing.' },
      { name: 'Pickles, Olives & Pickled Veggies', name_ar: 'مخللات وزيتون ومقبلات مملحة', description: 'Kalamata olives, green stuffed olives, dill gherkins, and pickled wild turnip.' },
      { name: 'Tahini, Sesame Paste & Hummus Base', name_ar: 'طحينة سمسم فاخرة ومعجون حمص', description: '100% stone-ground white sesame tahini and cooked pureed chickpeas.' },
    ],
  },
  {
    name: 'Spices, Seasonings & Dry Herbs',
    name_ar: 'البهارات والتوابل والأعشاب الجافة',
    description: 'Ground and whole spices, signature seasoning rubs, specialty salts, and culinary herbs.',
    subcategories: [
      { name: 'Whole & Ground Pure Spices', name_ar: 'توابل نقية كاملة ومطحونة', description: 'Black peppercorns, cumin, coriander, turmeric, cardamom pods, and cinnamon sticks.' },
      { name: 'Signature Rubs & Mixed Seasonings', name_ar: 'خلطات بهارات وتتبيلات مشكلة', description: 'Seven spice blend, kabsa spices, biryani masala, shawarma spices, and cajun rub.' },
      { name: 'Sea Salts, Rock Salt & Pepper Mills', name_ar: 'ملح بحري وملح الهملايا وفلفل', description: 'Coarse Mediterranean sea salt, pink Himalayan salt crystals, and cracked pepper.' },
      { name: 'Dried Culinary Herbs', name_ar: 'أعشاب طهي مجففة وعطرية', description: 'Dried oregano, sweet basil, rosemary leaves, thyme, and bay leaves.' },
      { name: 'Zaatar, Sumac & Levantine Blends', name_ar: 'زعتر فلسطيني وسماق بلدي', description: 'Wild thyme zaatar with toasted sesame, tangy purple sumac, and dukkah.' },
      { name: 'Saffron & Rare Luxury Aromatics', name_ar: 'زعفران أصلي ومطيبات فاخرة', description: 'Super Negin pure saffron threads, vanilla beans, and green cardamom jumbo.' },
    ],
  },
  {
    name: 'Dietary, Organic & Plant-Based',
    name_ar: 'الأغذية العضوية والصحية والبدائل',
    description: 'Gluten-free products, keto snacks, vegan ingredients, and natural superfoods.',
    subcategories: [
      { name: 'Gluten-Free Pastas & Bakery', name_ar: 'مخبوزات ومعكرونة خالية من الغلوتين', description: 'Certified gluten-free penne, almond flour bread, and gluten-free cookies.' },
      { name: 'Plant-Based Meats & Vegan Proteins', name_ar: 'بروتينات نباتية وبدائل اللحوم', description: 'Vegan burger patties, soy protein mince, tofu blocks, and tempeh.' },
      { name: 'Keto, Low-Carb & Sugar-Free', name_ar: 'منتجات كيتو وخالية من السكر', description: 'Monkfruit sweetener, almond flour, keto chocolate bars, and zero-carb bread.' },
      { name: 'Organic Seeds, Superfoods & Powders', name_ar: 'بذور عضوية وأغذية خارقة', description: 'Organic chia seeds, raw flaxseeds, spirulina powder, and acai berry puree.' },
    ],
  },
  {
    name: 'Packaging, Disposables & Takeaway',
    name_ar: 'مواد التعبئة والتغليف والاستهلاك',
    description: 'Food takeaway boxes, paper cups, eco-friendly containers, and cutlery kits.',
    subcategories: [
      { name: 'Takeaway Meal Boxes & Paper Bags', name_ar: 'علب وجبات سفري وأكياس كرافت', description: 'Kraft paper takeout bags with handles, leak-proof burger boxes, and noodle pails.' },
      { name: 'Hot & Cold Drink Cups with Lids', name_ar: 'أكواب ورقية وبلاستيكية مع أغطية', description: 'Double-wall paper coffee cups, clear PET iced cups, sip lids, and cup holders.' },
      { name: 'Eco-Friendly & Bagasse Containers', name_ar: 'عبوات قابلة للتحلل وصديقة للبيئة', description: 'Sugarcane bagasse clamshell containers, birch wood cutlery, and paper straws.' },
      { name: 'Aluminum Foil, Cling Film & Paper', name_ar: 'قصدير ألومنيوم ونايلون وورق زبدة', description: 'Heavy duty commercial aluminum foil rolls, food cling wrap, and baking sheets.' },
      { name: 'Cutlery Packs, Napkins & Wet Wipes', name_ar: 'مجموعات ملاعق ومناديل معطرة', description: 'Individually wrapped cutlery sets, 2-ply dinner napkins, and refreshing wet towels.' },
      { name: 'Sauce Cups, Portion Pots & Ramekins', name_ar: 'علب صوصات صغيرة وأغطية محكمة', description: '1oz, 2oz, and 4oz sauce cups with airtight lids for delivery orders.' },
    ],
  },
  {
    name: 'Kitchen, Barista & Sanitation Tools',
    name_ar: 'مستلزمات المطبخ والباريستا والتعقيم',
    description: 'Commercial kitchen utensils, barista accessories, food safety items, and sanitizers.',
    subcategories: [
      { name: 'Barista Accessories & Espresso Tools', name_ar: 'أدوات باريستا وإكسسوارات القهوة', description: 'Stainless steel milk frothing pitchers, precision tampers, knock boxes, and tamping mats.' },
      { name: 'Chef Utensils, Knives & Smallwares', name_ar: 'أدوات الشيف وسكاكين وملاعق طهي', description: 'Japanese chef knives, silicone tongs, stainless whisks, spatulas, and cutting boards.' },
      { name: 'Food Safety, Gloves & Chef Apparel', name_ar: 'قفازات سلامة الغذاء ومرايل الشيف', description: 'Food-grade nitrile gloves, chef hats, aprons, and digital probe thermometers.' },
      { name: 'Commercial Cleaning Chemicals & Sanitizers', name_ar: 'منظفات ومعقمات معتمدة غذائياً', description: 'Espresso machine descalers, grease strippers, surface sanitizers, and dish soap.' },
      { name: 'Sanitation Wipes, Mops & Paper Rolls', name_ar: 'رولات تجفيف ومماسح وأدوات تنظيف', description: 'Centerpull blue towel rolls, microfibre cleaning cloths, and floor sanitizing mops.' },
    ],
  },
];

async function main() {
  console.log('================================================================');
  console.log('🌱 SEEDING CATEGORIES: HIERARCHICAL STRUCTURE + ARABIC NAMES');
  console.log('================================================================');

  // 1. Fetch existing tenants
  const tenants = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name FROM tenants;
  `;
  if (tenants.length === 0) {
    console.error('❌ No tenants found in database! Exiting.');
    return;
  }
  console.log(`Found ${tenants.length} tenant(s) to seed categories for:`);
  tenants.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  // 2. Update existing categories in DB with Arabic names if matching
  console.log('\n🔄 Step 1: Backfilling Arabic names on existing categories...');
  const existingCategories = await prisma.categories.findMany();
  console.log(`Found ${existingCategories.length} existing categories.`);

  const EXISTING_NAME_ARABIC_MAP: Record<string, { name_ar: string; description?: string }> = {
    'drinks': { name_ar: 'المشروبات والعصائر', description: 'جميع أنواع المشروبات الباردة والساخنة والعصائر' },
    'coffee': { name_ar: 'القهوة ومشروبات الإسبريسو', description: 'أنواع القهوة المتنوعة والمختصة والساخنة والباردة' },
    'tea': { name_ar: 'الشاي والمشروبات العشبية', description: 'الشاي الفاخر بأنواعه والأعشاب الطبيعية والكرك' },
    'sea food': { name_ar: 'المأكولات البحرية والأسماك', description: 'الأسماك الطازجة والروبيان وثمار البحر المتنوعة' },
    'food': { name_ar: 'الأطعمة والمأكولات الرئيسية', description: 'الأطباق والوجبات الغذائية المتنوعة' },
  };

  for (const cat of existingCategories) {
    const key = cat.name.trim().toLowerCase();
    const mapMatch = EXISTING_NAME_ARABIC_MAP[key];
    if (mapMatch) {
      await prisma.categories.update({
        where: { id: cat.id },
        data: {
          name_ar: mapMatch.name_ar,
          description: cat.description || mapMatch.description,
        },
      });
      console.log(`  ✔ Updated existing category "${cat.name}" -> "${mapMatch.name_ar}"`);
    }
  }

  // 3. For each tenant, seed the taxonomy
  console.log('\n🚀 Step 2: Seeding hierarchical taxonomy (Parent + Subcategories)...');
  
  let totalCreatedParents = 0;
  let totalCreatedSubs = 0;

  for (const tenant of tenants) {
    console.log(`\n🏢 Seeding for tenant: "${tenant.name}" (${tenant.id})...`);

    for (const group of TAXONOMY_DATA) {
      // Find or create the root/parent category
      let parent = await prisma.categories.findFirst({
        where: {
          tenant_id: tenant.id,
          name: { equals: group.name, mode: 'insensitive' },
        },
      });

      if (!parent) {
        parent = await prisma.categories.create({
          data: {
            tenant_id: tenant.id,
            name: group.name,
            name_ar: group.name_ar,
            description: group.description,
            is_active: true,
          },
        });
        totalCreatedParents++;
      } else {
        // Update its name_ar if missing
        if (!parent.name_ar) {
          parent = await prisma.categories.update({
            where: { id: parent.id },
            data: {
              name_ar: group.name_ar,
              description: parent.description || group.description,
            },
          });
        }
      }

      // Now create or update subcategories pointing to this parent
      for (const sub of group.subcategories) {
        let child = await prisma.categories.findFirst({
          where: {
            tenant_id: tenant.id,
            name: { equals: sub.name, mode: 'insensitive' },
          },
        });

        if (!child) {
          await prisma.categories.create({
            data: {
              tenant_id: tenant.id,
              name: sub.name,
              name_ar: sub.name_ar,
              description: sub.description,
              is_active: true,
              parent_id: parent.id,
            },
          });
          totalCreatedSubs++;
        } else {
          await prisma.categories.update({
            where: { id: child.id },
            data: {
              name_ar: sub.name_ar,
              description: child.description || sub.description,
              parent_id: parent.id,
            },
          });
        }
      }
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 SEED COMPLETE!`);
  console.log(`  - New Root Categories created: ${totalCreatedParents}`);
  console.log(`  - New Subcategories created: ${totalCreatedSubs}`);

  // Count total categories in DB
  const finalCount = await prisma.categories.count();
  const rootsCount = await prisma.categories.count({ where: { parent_id: null } });
  const subsCount = await prisma.categories.count({ where: { parent_id: { not: null } } });
  const withArabicCount = await prisma.categories.count({ where: { name_ar: { not: null } } });

  console.log(`\n📊 DATABASE SUMMARY:`);
  console.log(`  - Total Categories: ${finalCount}`);
  console.log(`  - Root / Parent Categories: ${rootsCount}`);
  console.log(`  - Child / Subcategories: ${subsCount}`);
  console.log(`  - Categories with Arabic Name: ${withArabicCount}`);
  console.log('================================================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
