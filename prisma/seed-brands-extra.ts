export interface BrandSeedItem {
  name: string;
  code: string;
  description: string;
  category: string;
  region: 'Middle East' | 'Worldwide';
  domain?: string;
}

export const EXTRA_BRANDS_DATA: BrandSeedItem[] = [
  // =========================================================================
  // ADDITIONAL NOTABLE MIDDLE EASTERN & GLOBAL ICONS (70 brands)
  // =========================================================================
  { name: 'Al Rabie', code: 'AL_RABIE', description: 'Pioneer juice and beverage manufacturer in Saudi Arabia and the Gulf', category: 'Juices & Beverages', region: 'Middle East', domain: 'alrabie.com' },
  { name: 'Sun Top', code: 'SUN_TOP', description: 'Beloved fruit juice pouch drink enriched with Vitamin C for kids in MENA', category: 'Fruit Beverages', region: 'Middle East', domain: 'co-ro.com' },
  { name: 'Capri-Sun Middle East', code: 'CAPRI_SUN_ME', description: 'Iconic foil-pouch natural fruit juice drink popular with families across MENA', category: 'Fruit Drinks', region: 'Middle East', domain: 'capri-sun.com' },
  { name: 'Barbican', code: 'BARBICAN_MALT', description: 'Leading non-alcoholic flavored malt beverage brand in the Middle East', category: 'Malt Beverages', region: 'Middle East', domain: 'barbicanworld.com' },
  { name: 'Moussy', code: 'MOUSSY_MALT', description: 'Swiss-brewed premium non-alcoholic malt beverage popular in the GCC', category: 'Malt Beverages', region: 'Middle East', domain: 'moussy.ch' },
  { name: 'Rani Float', code: 'RANI_FLOAT', description: 'Iconic fruit juice drink featuring real fruit chunks and peach/orange pulp', category: 'Fruit Drinks', region: 'Middle East', domain: 'ranifloat.com' },
  { name: 'Vimto Middle East', code: 'VIMTO_ME', description: 'Essential Ramadan family cordial and fruit berry syrup tradition in the Gulf', category: 'Cordial & Syrups', region: 'Middle East', domain: 'vimto.com' },
  { name: 'London Dairy', code: 'LONDON_DAIRY', description: 'Premium rich ice cream and dessert brand crafted in the UAE by IFFCO', category: 'Premium Ice Cream', region: 'Middle East', domain: 'londondairy.com' },
  { name: 'Igloo Ice Cream', code: 'IGLOO_ICE_CREAM', description: 'Classic ice cream cones, popsicles, and family tubs across the Gulf', category: 'Ice Cream', region: 'Middle East', domain: 'iffco.com' },
  { name: 'Quanta Ice Cream', code: 'QUANTA_ICE_CREAM', description: 'Indulgent chocolate-coated ice cream bars and dessert treats in MENA', category: 'Ice Cream Bars', region: 'Middle East', domain: 'iffco.com' },
  { name: 'Christian Louboutin', code: 'LOUBOUTIN', description: 'French high luxury footwear and accessories maison famous for lacquered red soles', category: 'Luxury Footwear', region: 'Worldwide', domain: 'christianlouboutin.com' },
  { name: 'Manolo Blahnik', code: 'MANOLO_BLAHNIK', description: 'Legendary Spanish luxury footwear designer renowned for stiletto pumps (Hangisi)', category: 'Haute Footwear', region: 'Worldwide', domain: 'manoloblahnik.com' },
  { name: 'Jimmy Choo', code: 'JIMMY_CHOO', description: 'British global luxury shoes, handbags, and accessories brand favored by red carpet icons', category: 'Luxury Shoes & Bags', region: 'Worldwide', domain: 'jimmychoo.com' },
  { name: 'Aquazzura', code: 'AQUAZZURA_FIRENZE', description: 'Florentine luxury footwear brand combining sophisticated Italian craftsmanship with comfort', category: 'Italian Footwear', region: 'Worldwide', domain: 'aquazzura.com' },
  { name: 'Gianvito Rossi', code: 'GIANVITO_ROSSI', description: 'Italian luxury shoe designer renowned for sensual elegance, comfort, and Portofino sandals', category: 'Italian Luxury Shoes', region: 'Worldwide', domain: 'gianvitorossi.com' },
  { name: 'Roger Vivier', code: 'ROGER_VIVIER', description: 'Historic French luxury footwear maison, inventor of the stiletto heel and Belle Vivier buckle', category: 'French Luxury Footwear', region: 'Worldwide', domain: 'rogervivier.com' },
  { name: 'Goyard', code: 'GOYARD_PARIS', description: 'Historic Parisian trunkmaker and leather goods house established in 1792 (Goyardine canvas)', category: 'Ultra Exclusive Trunks', region: 'Worldwide', domain: 'goyard.com' },
  { name: 'Moynat', code: 'MOYNAT_PARIS', description: 'French luxury trunk and leather goods maker established in Paris in 1849', category: 'Luxury Trunks & Leather', region: 'Worldwide', domain: 'moynat.com' },
  { name: 'Delvaux', code: 'DELVAUX_BRUSSELS', description: 'Oldest fine luxury leather goods house in the world, founded in Brussels in 1829', category: 'Royal Leather Goods', region: 'Worldwide', domain: 'delvaux.com' },
  { name: 'Valextra', code: 'VALEXTRA_MILANO', description: 'Milanese luxury leather goods brand characterized by architectural minimalism and Costagura edges', category: 'Minimalist Leather', region: 'Worldwide', domain: 'valextra.com' },
  { name: 'Tod\'s', code: 'TODS_ITALY', description: 'Italian luxury leather company celebrated for handcrafted Gommino pebbled driving shoes', category: 'Luxury Driving Shoes', region: 'Worldwide', domain: 'tods.com' },
  { name: 'Hogan', code: 'HOGAN_SNEAKERS', description: 'Italian luxury casual footwear brand pioneer of the luxury sneaker concept (Interactive)', category: 'Luxury Sneakers', region: 'Worldwide', domain: 'hogan.com' },
  { name: 'Bally', code: 'BALLY_SWISS', description: 'Swiss luxury brand established in 1851 with heritage in shoemaking, leather bags, and ready-to-wear', category: 'Swiss Luxury Leather', region: 'Worldwide', domain: 'bally.com' },
  { name: 'Lancel', code: 'LANCEL_PARIS', description: 'French luxury leather goods company founded in Paris in 1876 creator of Premier Flirt bucket bag', category: 'French Leather Goods', region: 'Worldwide', domain: 'lancel.com' },
  { name: 'Jabra', code: 'JABRA_GN', description: 'Danish engineering leader in true wireless noise-canceling earbuds and professional office headsets', category: 'Wireless Audio', region: 'Worldwide', domain: 'jabra.com' },
  { name: 'Poly (Plantronics)', code: 'POLY_PLANTRONICS', description: 'Global communications technology provider specializing in enterprise headsets and video conference bars', category: 'Enterprise Communications', region: 'Worldwide', domain: 'poly.com' },
  { name: 'Soundcore', code: 'SOUNDCORE_ANKER', description: 'Anker\'s audio brand delivering high-fidelity wireless headphones (Space One, Liberty 4)', category: 'Wireless Headphones', region: 'Worldwide', domain: 'soundcore.com' },
  { name: 'EarFun', code: 'EARFUN_AUDIO', description: 'Award-winning wireless audio company delivering CES honored noise-canceling Bluetooth earbuds', category: 'Wireless Earbuds', region: 'Worldwide', domain: 'myearfun.com' },
  { name: '1MORE', code: 'ONE_MORE_AUDIO', description: 'Acoustic audio brand delivering multi-driver in-ear monitors and Hi-Res certified headphones', category: 'Hi-Res Audio', region: 'Worldwide', domain: '1more.com' },
  { name: 'FiiO', code: 'FIIO_ELECTRONICS', description: 'Leader in portable high-resolution lossless music players, DAC headphone amplifiers, and IEMs', category: 'Audiophile DACs', region: 'Worldwide', domain: 'fiio.com' },
  { name: 'HiFiMAN', code: 'HIFIMAN_AUDIO', description: 'High-end manufacturer of planar magnetic audiophile headphones and reference audio players', category: 'Planar Headphones', region: 'Worldwide', domain: 'hifiman.com' },
  { name: 'Moondrop', code: 'MOONDROP_LAB', description: 'Acclaimed in-ear monitor brand with Harma-target acoustic tuning and anime aesthetics', category: 'In-Ear Monitors', region: 'Worldwide', domain: 'moondroplab.com' },
  { name: 'Bialetti', code: 'BIALETTI_ITALY', description: 'Iconic Italian manufacturer of the Moka Express stovetop octagonal espresso coffee maker', category: 'Moka Coffee Makers', region: 'Worldwide', domain: 'bialetti.com' },
  { name: 'Bodum', code: 'BODUM_COFFEE', description: 'Danish-Swiss designer of French press coffee makers, double-wall bistro glassware, and teapots', category: 'French Press & Glassware', region: 'Worldwide', domain: 'bodum.com' },
  { name: 'Hario', code: 'HARIO_JAPAN', description: 'King of Glass - Japanese manufacturer of the world-standard V60 manual pour-over coffee dripper', category: 'Pour-Over Coffee', region: 'Worldwide', domain: 'hario-official.net' },
  { name: 'Chemex', code: 'CHEMEX_CORP', description: 'Iconic hourglass glass coffeemaker designed by chemist Peter Schlumbohm and displayed at MoMA', category: 'Hourglass Coffee Makers', region: 'Worldwide', domain: 'chemexcoffeemaker.com' },
  { name: 'AeroPress', code: 'AEROPRESS_COFFEE', description: 'Invented by Alan Adler, patented immersion coffee press delivering smooth, rich, low-acidity coffee', category: 'Manual Coffee Press', region: 'Worldwide', domain: 'aeropress.com' },
  { name: 'Fellow', code: 'FELLOW_PRODUCTS', description: 'Design-forward specialty coffee gear: Stagg EKG electric gooseneck kettle and Ode grinder', category: 'Design Specialty Coffee', region: 'Worldwide', domain: 'fellowproducts.com' },
  { name: 'Baratza', code: 'BARATZA_GRINDERS', description: 'Pioneer manufacturer of conical and flat burr home coffee grinders (Encore, Sette)', category: 'Coffee Grinders', region: 'Worldwide', domain: 'baratza.com' },
  { name: 'Eureka Grinders', code: 'EUREKA_FLORENCE', description: 'Florentine manufacturer of precision silent espresso grinders (Mignon Specialita) since 1920', category: 'Espresso Grinders', region: 'Worldwide', domain: 'eureka.co.it' },
  { name: 'Rocket Espresso', code: 'ROCKET_ESPRESSO', description: 'Handcrafted Italian domestic and commercial E61 group espresso machines made in Milan (Giotto)', category: 'Handmade Espresso', region: 'Worldwide', domain: 'rocket-espresso.com' },
  { name: 'La Marzocco', code: 'LA_MARZOCCO', description: 'Handmade espresso machinery from Florence, Italy, setting global cafe and Linea Micra standards', category: 'Commercial & Home Espresso', region: 'Worldwide', domain: 'lamarzocco.com' },
  { name: 'Gaggia', code: 'GAGGIA_MILANO', description: 'Historic Italian company that invented the modern crema espresso extraction in Milan in 1938', category: 'Italian Espresso', region: 'Worldwide', domain: 'gaggia.com' },
  { name: 'Rancilio', code: 'RANCILIO_COFFEE', description: 'Italian coffee machine manufacturer famous for the legendary Silvia domestic espresso machine', category: 'Espresso Machines', region: 'Worldwide', domain: 'ranciliogroup.com' },
  { name: 'Sinn Spezialuhren', code: 'SINN_WATCHES', description: 'Frankfurt manufacturer of professional pilot chronographs and German submarine steel dive watches', category: 'German Tool Watches', region: 'Worldwide', domain: 'sinn.de' },
  { name: 'Junghans', code: 'JUNGHANS_GERMANY', description: 'German watchmaker renowned for minimalist Bauhaus design timepieces created by Max Bill', category: 'Bauhaus Watches', region: 'Worldwide', domain: 'junghans.de' },
  { name: 'Nomos Glashütte', code: 'NOMOS_GLASHUTTE', description: 'German manufacture of fine mechanical timepieces in Glashütte with in-house movements and Bauhaus lines', category: 'Glashütte Manufacture', region: 'Worldwide', domain: 'nomos-glashuette.com' },
  { name: 'Certina', code: 'CERTINA_SWISS', description: 'Swiss sports watchmaker since 1888 pioneer of DS (Double Security) concept for extreme durability', category: 'Swiss Sport Watches', region: 'Worldwide', domain: 'certina.com' },
  { name: 'Mido', code: 'MIDO_WATCHES', description: 'Swiss watchmaker inspired by architectural masterpieces (Ocean Star, Commander, Baroncelli)', category: 'Architectural Watches', region: 'Worldwide', domain: 'midowatches.com' },
  { name: 'Christopher Ward', code: 'CHRISTOPHER_WARD', description: 'British luxury horology pioneer of direct-to-consumer Swiss-made mechanical watches (The Twelve)', category: 'Modern Horology', region: 'Worldwide', domain: 'christopherward.com' },
  { name: 'Baltic Watches', code: 'BALTIC_WATCHES', description: 'French independent watch brand designing vintage-inspired mechanical neo-vintage chronographs', category: 'Neo-Vintage Watches', region: 'Worldwide', domain: 'baltic-watches.com' },
  { name: 'Zodiac Watches', code: 'ZODIAC_WATCHES', description: 'Historic Swiss watch brand established in 1882 celebrated for Sea Wolf heritage dive watches', category: 'Heritage Dive Watches', region: 'Worldwide', domain: 'zodiacwatches.com' },
  { name: 'Yema Watches', code: 'YEMA_FRANCE', description: 'Historic French watchmaker founded in 1948 famous for the Superman military dive watch', category: 'French Dive Watches', region: 'Worldwide', domain: 'yema.com' },
  { name: 'Doxa Watches', code: 'DOXA_WATCHES', description: 'Legendary Swiss dive watch manufacturer with iconic orange dial worn by Jacques Cousteau (SUB 300)', category: 'Professional Dive Watches', region: 'Worldwide', domain: 'doxawatches.com' },
  { name: 'Squale', code: 'SQUALE_DIVE', description: 'Historic Swiss dive watch case manufacturer and watchmaker featuring the curved shark logo', category: 'Dive Watches', region: 'Worldwide', domain: 'squale.ch' },
];
