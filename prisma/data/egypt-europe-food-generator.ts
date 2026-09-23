/**
 * Egypt & Europe Traditional Food & Drinks Generator Engine
 * Generates 3,000 authentic food and beverage products across 12 culinary sectors,
 * with ~7,800 variants mapped to real companies, categories, and GS1 EAN-13 barcodes.
 */

export interface ProductVariantTemplate {
  name: string;
  sku_suffix: string;
  barcode_suffix: string;
  weight: number; // in kg
  dimensions: { length: number; width: number; height: number; unit: string };
  uom_code: string;
  cost_multiplier: number;
  price_multiplier: number;
  shelf_life_months: number;
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
  shelf_life_months: number;
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

// GS1 EAN-13 Check Digit Calculator
export function generateEan13(prefix: string, numberSequence: number): string {
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

// Variant packaging templates by food/drink type
export function generateVariantsForType(
  varType: string,
  baseCost: number,
  basePrice: number,
  productSku: string,
  countryPrefix: string,
  barcodeSeqBase: number
): GeneratedVariant[] {
  let templates: ProductVariantTemplate[] = [];

  switch (varType) {
    case 'cheese_block':
      templates = [
        { name: '250g Vacuum Block (250 جم)', sku_suffix: '250G', barcode_suffix: '1', weight: 0.26, dimensions: { length: 12, width: 8, height: 4, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 0.55, price_multiplier: 0.55, shelf_life_months: 9 },
        { name: '500g Fresh Deli Block (500 جم)', sku_suffix: '500G', barcode_suffix: '2', weight: 0.52, dimensions: { length: 15, width: 10, height: 5, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 9 },
        { name: '1kg Family Block (1 كجم)', sku_suffix: '1KG', barcode_suffix: '3', weight: 1.04, dimensions: { length: 20, width: 12, height: 6, unit: 'cm' }, uom_code: 'kg', cost_multiplier: 1.9, price_multiplier: 1.9, shelf_life_months: 9 },
      ];
      break;

    case 'cheese_aged':
      templates = [
        { name: '200g Fresh Cut Vacuum (200 جم)', sku_suffix: '200G', barcode_suffix: '1', weight: 0.21, dimensions: { length: 12, width: 8, height: 3, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 0.45, price_multiplier: 0.45, shelf_life_months: 12 },
        { name: '450g Gourmet Wedge (450 جم)', sku_suffix: '450G', barcode_suffix: '2', weight: 0.47, dimensions: { length: 16, width: 10, height: 4, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 12 },
        { name: '900g Full Quarter Wheel (900 جم)', sku_suffix: '900G', barcode_suffix: '3', weight: 0.93, dimensions: { length: 22, width: 14, height: 6, unit: 'cm' }, uom_code: 'kg', cost_multiplier: 1.95, price_multiplier: 1.95, shelf_life_months: 12 },
      ];
      break;

    case 'mish_jar':
    case 'pickle_jar':
      templates = [
        { name: '350g Glass Jar (350 جم)', sku_suffix: '350G', barcode_suffix: '1', weight: 0.55, dimensions: { length: 8, width: 8, height: 12, unit: 'cm' }, uom_code: 'jar', cost_multiplier: 0.7, price_multiplier: 0.7, shelf_life_months: 18 },
        { name: '700g Family Glass Jar (700 جم)', sku_suffix: '700G', barcode_suffix: '2', weight: 1.05, dimensions: { length: 10, width: 10, height: 16, unit: 'cm' }, uom_code: 'jar', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 18 },
        { name: '1.5kg Catering Pail (1.5 كجم)', sku_suffix: '1.5KG', barcode_suffix: '3', weight: 1.65, dimensions: { length: 15, width: 15, height: 18, unit: 'cm' }, uom_code: 'tub', cost_multiplier: 1.9, price_multiplier: 1.9, shelf_life_months: 18 },
      ];
      break;

    case 'dairy_tub':
      templates = [
        { name: '170g Snack Tub (170 جم)', sku_suffix: '170G', barcode_suffix: '1', weight: 0.18, dimensions: { length: 8, width: 8, height: 5, unit: 'cm' }, uom_code: 'tub', cost_multiplier: 0.65, price_multiplier: 0.65, shelf_life_months: 3 },
        { name: '350g Family Tub (350 جم)', sku_suffix: '350G', barcode_suffix: '2', weight: 0.37, dimensions: { length: 11, width: 11, height: 6, unit: 'cm' }, uom_code: 'tub', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 3 },
      ];
      break;

    case 'drink_bottle':
    case 'water_bottle':
      templates = [
        { name: '330ml Glass Bottle (330 مل)', sku_suffix: '330ML', barcode_suffix: '1', weight: 0.55, dimensions: { length: 6, width: 6, height: 22, unit: 'cm' }, uom_code: 'btl', cost_multiplier: 0.5, price_multiplier: 0.5, shelf_life_months: 12 },
        { name: '750ml Premium Glass (750 مل)', sku_suffix: '750ML', barcode_suffix: '2', weight: 1.15, dimensions: { length: 8, width: 8, height: 29, unit: 'cm' }, uom_code: 'btl', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 12 },
        { name: '1.5L Family PET (1.5 لتر)', sku_suffix: '1.5L', barcode_suffix: '3', weight: 1.55, dimensions: { length: 10, width: 10, height: 32, unit: 'cm' }, uom_code: 'btl', cost_multiplier: 1.7, price_multiplier: 1.7, shelf_life_months: 12 },
      ];
      break;

    case 'juice_pack':
      templates = [
        { name: '200ml Lunchbox Pack (200 مل)', sku_suffix: '200ML', barcode_suffix: '1', weight: 0.22, dimensions: { length: 5, width: 4, height: 12, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 0.35, price_multiplier: 0.35, shelf_life_months: 12 },
        { name: '1L Family Tetra Brik (1 لتر)', sku_suffix: '1L', barcode_suffix: '2', weight: 1.06, dimensions: { length: 7, width: 7, height: 24, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 12 },
        { name: '1.5L Big Party Bottle (1.5 لتر)', sku_suffix: '1.5L', barcode_suffix: '3', weight: 1.58, dimensions: { length: 9, width: 9, height: 30, unit: 'cm' }, uom_code: 'btl', cost_multiplier: 1.45, price_multiplier: 1.45, shelf_life_months: 12 },
      ];
      break;

    case 'canned_tin':
      templates = [
        { name: '400g Easy-Open Tin (400 جم)', sku_suffix: '400G', barcode_suffix: '1', weight: 0.46, dimensions: { length: 7.5, width: 7.5, height: 11, unit: 'cm' }, uom_code: 'tin', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 24 },
        { name: '800g Family Club Tin (800 جم)', sku_suffix: '800G', barcode_suffix: '2', weight: 0.90, dimensions: { length: 10, width: 10, height: 12, unit: 'cm' }, uom_code: 'tin', cost_multiplier: 1.85, price_multiplier: 1.85, shelf_life_months: 24 },
      ];
      break;

    case 'grain_bag':
    case 'rice_bag':
      templates = [
        { name: '500g Vacuum Pouch (500 جم)', sku_suffix: '500G', barcode_suffix: '1', weight: 0.51, dimensions: { length: 14, width: 6, height: 20, unit: 'cm' }, uom_code: 'pouch', cost_multiplier: 0.55, price_multiplier: 0.55, shelf_life_months: 24 },
        { name: '1kg Master Bag (1 كجم)', sku_suffix: '1KG', barcode_suffix: '2', weight: 1.02, dimensions: { length: 16, width: 8, height: 24, unit: 'cm' }, uom_code: 'kg', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 24 },
        { name: '5kg Family Sack (5 كجم)', sku_suffix: '5KG', barcode_suffix: '3', weight: 5.08, dimensions: { length: 28, width: 12, height: 42, unit: 'cm' }, uom_code: 'bag', cost_multiplier: 4.6, price_multiplier: 4.6, shelf_life_months: 24 },
      ];
      break;

    case 'tahini_jar':
    case 'molasses_jar':
      templates = [
        { name: '250g Glass Jar (250 جم)', sku_suffix: '250G', barcode_suffix: '1', weight: 0.42, dimensions: { length: 7, width: 7, height: 10, unit: 'cm' }, uom_code: 'jar', cost_multiplier: 0.55, price_multiplier: 0.55, shelf_life_months: 18 },
        { name: '500g Heritage Jar (500 جم)', sku_suffix: '500G', barcode_suffix: '2', weight: 0.78, dimensions: { length: 9, width: 9, height: 14, unit: 'cm' }, uom_code: 'jar', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 18 },
        { name: '1kg Family Bucket (1 كجم)', sku_suffix: '1KG', barcode_suffix: '3', weight: 1.08, dimensions: { length: 13, width: 13, height: 15, unit: 'cm' }, uom_code: 'tub', cost_multiplier: 1.85, price_multiplier: 1.85, shelf_life_months: 18 },
      ];
      break;

    case 'halawa_tub':
      templates = [
        { name: '300g Sealed Tub (300 جم)', sku_suffix: '300G', barcode_suffix: '1', weight: 0.33, dimensions: { length: 12, width: 8, height: 5, unit: 'cm' }, uom_code: 'tub', cost_multiplier: 0.65, price_multiplier: 0.65, shelf_life_months: 12 },
        { name: '600g Family Tub (600 جم)', sku_suffix: '600G', barcode_suffix: '2', weight: 0.65, dimensions: { length: 15, width: 10, height: 6, unit: 'cm' }, uom_code: 'tub', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 12 },
        { name: '1.2kg Catering Block (1.2 كجم)', sku_suffix: '1.2KG', barcode_suffix: '3', weight: 1.28, dimensions: { length: 20, width: 12, height: 8, unit: 'cm' }, uom_code: 'tub', cost_multiplier: 1.85, price_multiplier: 1.85, shelf_life_months: 12 },
      ];
      break;

    case 'pastry_box':
      templates = [
        { name: '250g Boutique Box (250 جم)', sku_suffix: '250G', barcode_suffix: '1', weight: 0.30, dimensions: { length: 18, width: 12, height: 4, unit: 'cm' }, uom_code: 'box', cost_multiplier: 0.55, price_multiplier: 0.55, shelf_life_months: 6 },
        { name: '500g Gift Tin (500 جم)', sku_suffix: '500G', barcode_suffix: '2', weight: 0.62, dimensions: { length: 22, width: 16, height: 5, unit: 'cm' }, uom_code: 'box', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 6 },
        { name: '1kg Majlis Banquet Box (1 كجم)', sku_suffix: '1KG', barcode_suffix: '3', weight: 1.18, dimensions: { length: 28, width: 20, height: 6, unit: 'cm' }, uom_code: 'box', cost_multiplier: 1.9, price_multiplier: 1.9, shelf_life_months: 6 },
      ];
      break;

    case 'biscuit_pack':
      templates = [
        { name: '120g Single Snack Pack (120 جم)', sku_suffix: '120G', barcode_suffix: '1', weight: 0.13, dimensions: { length: 14, width: 4, height: 4, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 0.5, price_multiplier: 0.5, shelf_life_months: 12 },
        { name: '250g Tea Time Pack (250 جم)', sku_suffix: '250G', barcode_suffix: '2', weight: 0.27, dimensions: { length: 18, width: 6, height: 6, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 12 },
        { name: '500g Family Pack (500 جم)', sku_suffix: '500G', barcode_suffix: '3', weight: 0.53, dimensions: { length: 22, width: 8, height: 8, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 1.8, price_multiplier: 1.8, shelf_life_months: 12 },
      ];
      break;

    case 'frozen_pouch':
      templates = [
        { name: '400g Fresh Frozen Pouch (400 جم)', sku_suffix: '400G', barcode_suffix: '1', weight: 0.42, dimensions: { length: 16, width: 4, height: 22, unit: 'cm' }, uom_code: 'pouch', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 18 },
        { name: '800g Value Double Pack (800 جم)', sku_suffix: '800G', barcode_suffix: '2', weight: 0.83, dimensions: { length: 20, width: 6, height: 26, unit: 'cm' }, uom_code: 'pouch', cost_multiplier: 1.85, price_multiplier: 1.85, shelf_life_months: 18 },
      ];
      break;

    case 'fish_pack':
      templates = [
        { name: '250g Vacuum Skin Pack (250 جم)', sku_suffix: '250G', barcode_suffix: '1', weight: 0.28, dimensions: { length: 20, width: 12, height: 2, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 0.65, price_multiplier: 0.65, shelf_life_months: 6 },
        { name: '500g Gourmet Pack (500 جم)', sku_suffix: '500G', barcode_suffix: '2', weight: 0.54, dimensions: { length: 24, width: 15, height: 3, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 6 },
      ];
      break;

    case 'pasta_box':
      templates = [
        { name: '500g Semolina Box (500 جم)', sku_suffix: '500G', barcode_suffix: '1', weight: 0.52, dimensions: { length: 18, width: 5, height: 12, unit: 'cm' }, uom_code: 'box', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 36 },
        { name: '1kg Foodservice Pack (1 كجم)', sku_suffix: '1KG', barcode_suffix: '2', weight: 1.03, dimensions: { length: 22, width: 8, height: 16, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 1.85, price_multiplier: 1.85, shelf_life_months: 36 },
      ];
      break;

    case 'sauce_jar':
    case 'condiment_jar':
    case 'conserve_jar':
      templates = [
        { name: '200g Small Glass Jar (200 جم)', sku_suffix: '200G', barcode_suffix: '1', weight: 0.38, dimensions: { length: 6, width: 6, height: 9, unit: 'cm' }, uom_code: 'jar', cost_multiplier: 0.6, price_multiplier: 0.6, shelf_life_months: 24 },
        { name: '370g Classic Glass Jar (370 جم)', sku_suffix: '370G', barcode_suffix: '2', weight: 0.58, dimensions: { length: 7.5, width: 7.5, height: 12, unit: 'cm' }, uom_code: 'jar', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 24 },
        { name: '700g Family Cruet (700 جم)', sku_suffix: '700G', barcode_suffix: '3', weight: 1.05, dimensions: { length: 9.5, width: 9.5, height: 15, unit: 'cm' }, uom_code: 'jar', cost_multiplier: 1.75, price_multiplier: 1.75, shelf_life_months: 24 },
      ];
      break;

    case 'coffee_tin':
      templates = [
        { name: '250g Ground Vacuum Tin (250 جم)', sku_suffix: '250G', barcode_suffix: '1', weight: 0.32, dimensions: { length: 9, width: 9, height: 13, unit: 'cm' }, uom_code: 'tin', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 24 },
        { name: '500g Aroma Canister (500 جم)', sku_suffix: '500G', barcode_suffix: '2', weight: 0.61, dimensions: { length: 11, width: 11, height: 16, unit: 'cm' }, uom_code: 'tin', cost_multiplier: 1.85, price_multiplier: 1.85, shelf_life_months: 24 },
        { name: '1kg Barista Roast Beans (1 كجم)', sku_suffix: '1KG', barcode_suffix: '3', weight: 1.05, dimensions: { length: 14, width: 9, height: 32, unit: 'cm' }, uom_code: 'bag', cost_multiplier: 3.4, price_multiplier: 3.4, shelf_life_months: 24 },
      ];
      break;

    case 'capsule_box':
      templates = [
        { name: '10 Capsules Sleeve (10 كبسولات)', sku_suffix: '10CAP', barcode_suffix: '1', weight: 0.12, dimensions: { length: 28, width: 4, height: 4, unit: 'cm' }, uom_code: 'box', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 18 },
        { name: '30 Capsules Multipack (30 كبسولة)', sku_suffix: '30CAP', barcode_suffix: '2', weight: 0.35, dimensions: { length: 28, width: 12, height: 4, unit: 'cm' }, uom_code: 'box', cost_multiplier: 2.8, price_multiplier: 2.8, shelf_life_months: 18 },
      ];
      break;

    case 'choc_box':
      templates = [
        { name: '150g Gift Box (150 جم)', sku_suffix: '150G', barcode_suffix: '1', weight: 0.20, dimensions: { length: 14, width: 14, height: 4, unit: 'cm' }, uom_code: 'box', cost_multiplier: 0.65, price_multiplier: 0.65, shelf_life_months: 12 },
        { name: '300g Master Ballotin (300 جم)', sku_suffix: '300G', barcode_suffix: '2', weight: 0.38, dimensions: { length: 18, width: 18, height: 5, unit: 'cm' }, uom_code: 'box', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 12 },
      ];
      break;

    case 'choc_bar':
      templates = [
        { name: '100g Classic Tablet (100 جم)', sku_suffix: '100G', barcode_suffix: '1', weight: 0.11, dimensions: { length: 16, width: 8, height: 1, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 12 },
        { name: '300g Giant Gold Bar (300 جم)', sku_suffix: '300G', barcode_suffix: '2', weight: 0.32, dimensions: { length: 24, width: 10, height: 1.5, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 2.6, price_multiplier: 2.6, shelf_life_months: 12 },
      ];
      break;

    case 'mixer_bottle':
      templates = [
        { name: '200ml Glass Bottle (200 مل)', sku_suffix: '200ML', barcode_suffix: '1', weight: 0.38, dimensions: { length: 5.5, width: 5.5, height: 18, unit: 'cm' }, uom_code: 'btl', cost_multiplier: 0.65, price_multiplier: 0.65, shelf_life_months: 18 },
        { name: '4x200ml Multipack (4 قوارير)', sku_suffix: '4PACK', barcode_suffix: '2', weight: 1.52, dimensions: { length: 11, width: 11, height: 18, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 2.4, price_multiplier: 2.4, shelf_life_months: 18 },
      ];
      break;

    case 'tea_box':
      templates = [
        { name: '50 Tea Bags Tin (125 جم)', sku_suffix: '50BAG', barcode_suffix: '1', weight: 0.18, dimensions: { length: 14, width: 8, height: 9, unit: 'cm' }, uom_code: 'tin', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 36 },
        { name: '100 Tea Bags Family Box (250 جم)', sku_suffix: '100BAG', barcode_suffix: '2', weight: 0.32, dimensions: { length: 16, width: 9, height: 14, unit: 'cm' }, uom_code: 'box', cost_multiplier: 1.8, price_multiplier: 1.8, shelf_life_months: 36 },
      ];
      break;

    case 'cereal_box':
      templates = [
        { name: '375g Breakfast Box (375 جم)', sku_suffix: '375G', barcode_suffix: '1', weight: 0.43, dimensions: { length: 19, width: 5, height: 26, unit: 'cm' }, uom_code: 'box', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 18 },
        { name: '750g Family Mega Pack (750 جم)', sku_suffix: '750G', barcode_suffix: '2', weight: 0.82, dimensions: { length: 24, width: 7, height: 32, unit: 'cm' }, uom_code: 'box', cost_multiplier: 1.8, price_multiplier: 1.8, shelf_life_months: 18 },
      ];
      break;

    case 'snack_tin':
    case 'snack_bag':
    default:
      templates = [
        { name: '165g Resealable Canister (165 جم)', sku_suffix: '165G', barcode_suffix: '1', weight: 0.20, dimensions: { length: 7.5, width: 7.5, height: 23, unit: 'cm' }, uom_code: 'tin', cost_multiplier: 1.0, price_multiplier: 1.0, shelf_life_months: 15 },
        { name: '3x165g Party Tri-Pack (3 علب)', sku_suffix: '3PACK', barcode_suffix: '2', weight: 0.62, dimensions: { length: 23, width: 8, height: 23, unit: 'cm' }, uom_code: 'pack', cost_multiplier: 2.7, price_multiplier: 2.7, shelf_life_months: 15 },
      ];
      break;
  }

  return templates.map((tmpl, idx) => {
    const cost = Math.round(baseCost * tmpl.cost_multiplier * 100) / 100;
    const price = Math.round(basePrice * tmpl.price_multiplier * 100) / 100;
    const minPrice = Math.round(price * 0.85 * 100) / 100;
    const variantBarcode = generateEan13(countryPrefix, barcodeSeqBase + idx);

    return {
      sku: `${productSku}-${tmpl.sku_suffix}`,
      name: tmpl.name,
      barcode: variantBarcode,
      weight: tmpl.weight,
      dimensions: tmpl.dimensions,
      uom_code: tmpl.uom_code,
      cost_price: cost,
      price,
      min_price: minPrice,
      shelf_life_months: tmpl.shelf_life_months,
    };
  });
}

// 12 Culinary Sectors (6 Egypt, 6 Europe) - each generating exactly 250 products
export const FOOD_DRINKS_SECTORS = [
  // =========================================================================
  // SECTOR 1: Egyptian Dairy, Feta & Traditional Artisan Cheeses (Egypt - 250)
  // =========================================================================
  {
    sector: "Egyptian Dairy & Cheeses",
    country_prefix: "622",
    sku_prefix: "EG-DAI",
    base_uom_code: "gram",
    brand_candidates: [
      'Juhayna', 'Domty', 'Lamar', 'Obour Land Dairy Co', 'dina farms', 'Katilo Egyptian Cheeses'
    ],
    category_candidates: [
      'Dairy, Artisan Cheeses & Eggs',
      'Soft Cheeses & Spreadables',
      'Aged, Hard & Semi-Hard Cheeses',
      'Halloumi, Feta & White Cheeses'
    ],
    items: [
      { name_en: "Domiati Full Cream Traditional White Cheese", name_ar: "جبنة دمياطي بلدي كاملة الدسم", base_cost: 45, base_price: 85, var_type: "cheese_block" },
      { name_en: "Aged Egyptian Roumy Cheese Extra Sharp", name_ar: "جبنة رومي مصري معتقة قديمة فاخرة", base_cost: 95, base_price: 175, var_type: "cheese_aged" },
      { name_en: "Traditional Mish Falahi Spicy Clay Fermented", name_ar: "مش فلاحي صعيدي أصلي بالفلفل والشطة", base_cost: 35, base_price: 68, var_type: "mish_jar" },
      { name_en: "Istanbulli Spicy White Cheese with Green Chilies", name_ar: "جبنة إسطنبولي حارة بالفلفل الأخضر", base_cost: 48, base_price: 89, var_type: "cheese_block" },
      { name_en: "Fresh Baladi Qeshta Clotted Cream", name_ar: "قشطة بلدي طازجة فلاحي طبيعية", base_cost: 55, base_price: 105, var_type: "dairy_tub" },
      { name_en: "Baramili Aged Brined Salty White Cheese", name_ar: "جبنة براميلي فلاحي بالزيتون وحبة البركة", base_cost: 50, base_price: 92, var_type: "cheese_block" },
    ]
  },

  // =========================================================================
  // SECTOR 2: Egyptian Heritage Juices, Nectars & Cold Drinks (Egypt - 250)
  // =========================================================================
  {
    sector: "Egyptian Juices & Drinks",
    country_prefix: "622",
    sku_prefix: "EG-JUI",
    base_uom_code: "ml",
    brand_candidates: [
      'Juhayna', 'Lamar', 'Beyti Pure Fruit & Milk', 'Faragalla', 'Baraka Water'
    ],
    category_candidates: [
      'Freshly Squeezed Juices',
      'Cold Beverages & Mocktails',
      'Mineral & Sparkling Waters'
    ],
    items: [
      { name_en: "Aswan Organic Hibiscus Cold Infusion (Karkadeh)", name_ar: "كركديه أسواني مثلج طبيعي فاخر", base_cost: 15, base_price: 32, var_type: "drink_bottle" },
      { name_en: "Traditional Egyptian Tamarind Juice (Tamr Hindi)", name_ar: "عصير تمر هندي بلدي مروي مركز", base_cost: 18, base_price: 36, var_type: "drink_bottle" },
      { name_en: "Heritage Mediterranean Carob Nectar (Kharroub)", name_ar: "عصير خروب بلدي مصفى طبيعي", base_cost: 18, base_price: 36, var_type: "drink_bottle" },
      { name_en: "Creamy Egyptian Coconut & Rice Drink (Sobia)", name_ar: "مشروب سوبيا رحماني بلدي بالحليب وجوز الهند", base_cost: 20, base_price: 42, var_type: "drink_bottle" },
      { name_en: "Egyptian Mango Zebda Rich Pulp Nectar", name_ar: "نكتار مانجو زبدة مصري بالقطع الطبيعية", base_cost: 28, base_price: 58, var_type: "juice_pack" },
      { name_en: "Egyptian Guava Nectar with Natural Pulp", name_ar: "نكتار جوافة بلدي مصري بالبذور المنقاة", base_cost: 22, base_price: 46, var_type: "juice_pack" },
      { name_en: "Doum Palm Herbal Egyptian Refreshing Drink", name_ar: "عصير دوم بلدي مثلج للأعصاب والانتعاش", base_cost: 16, base_price: 34, var_type: "drink_bottle" },
    ]
  },

  // =========================================================================
  // SECTOR 3: Egyptian Legumes, Fava Beans (Foul) & Grains (Egypt - 250)
  // =========================================================================
  {
    sector: "Egyptian Legumes & Grains",
    country_prefix: "622",
    sku_prefix: "EG-LEG",
    base_uom_code: "gram",
    brand_candidates: [
      'Americana Beans', 'Americana Canned Fava', 'Faragalla', 'Harvest Canned Foods Egypt', 'Abu Auf'
    ],
    category_candidates: [
      'Legumes, Lentils & Chickpeas',
      'Pantry Staples, Grains & Rice'
    ],
    items: [
      { name_en: "Foul Mudammas Plain Heritage Recipe", name_ar: "فول مدمس مصري سادة بالخلطة البلدية", base_cost: 14, base_price: 28, var_type: "canned_tin" },
      { name_en: "Foul Mudammas with Roasted Tahini & Cumin", name_ar: "فول مدمس بالطحينة البيضاء والكمون", base_cost: 18, base_price: 35, var_type: "canned_tin" },
      { name_en: "Alexandrian Foul with Tomato Salsa & Chili", name_ar: "فول إسكندراني بالصلصة والفلفل الحار", base_cost: 18, base_price: 35, var_type: "canned_tin" },
      { name_en: "Egyptian Golden Split Yellow Lentils", name_ar: "عدس أصفر مصري منقى فاخر للشوربة", base_cost: 25, base_price: 48, var_type: "grain_bag" },
      { name_en: "Whole Brown Egyptian Lentils (Koshary Grade)", name_ar: "عدس بجبة مصري بلدي للكشري الفاخر", base_cost: 24, base_price: 46, var_type: "grain_bag" },
      { name_en: "Egyptian Short-Grain Camolino White Rice", name_ar: "أرز مصري كامولينو عريض الحبة ممتاز", base_cost: 32, base_price: 62, var_type: "rice_bag" },
      { name_en: "Saidi Green Roasted Wheat Freekeh", name_ar: "فريك صعيدي أخضر بلدي محمص فاخر", base_cost: 38, base_price: 74, var_type: "grain_bag" },
    ]
  },

  // =========================================================================
  // SECTOR 4: Egyptian Tahina, Halawa & Sesame Specialties (Egypt - 250)
  // =========================================================================
  {
    sector: "Egyptian Halawa & Tahina",
    country_prefix: "622",
    sku_prefix: "EG-HAL",
    base_uom_code: "gram",
    brand_candidates: [
      'El Rashidi El Mizan', 'El Bawadi Halva Egypt', 'Halwani Bros Tahini', 'Abu Auf Tahini Mills'
    ],
    category_candidates: [
      'Sauces, Condiments & Dips',
      'Oriental & Heritage Sweets'
    ],
    items: [
      { name_en: "100% Pure Stone-Ground White Sesame Tahini", name_ar: "طحينة بيضاء سمسم صافي 100% معصورة بالحجر", base_cost: 45, base_price: 88, var_type: "tahini_jar" },
      { name_en: "Traditional Red Sesame Roasted Tahini", name_ar: "طحينة حمراء محمصة بلدية عريقة", base_cost: 48, base_price: 92, var_type: "tahini_jar" },
      { name_en: "Plain Traditional Egyptian Halawa Block", name_ar: "حلاوة طحينية سادة بلدي فاخرة", base_cost: 38, base_price: 72, var_type: "halawa_tub" },
      { name_en: "Halawa with Roasted Golden Pistachios", name_ar: "حلاوة طحينية بالفستق الحلبي المحمص", base_cost: 65, base_price: 125, var_type: "halawa_tub" },
      { name_en: "Hair Halawa Cotton Candy (Halawa Sha'ar)", name_ar: "حلاوة شعر غزالة حريرية بالمكسرات", base_cost: 42, base_price: 82, var_type: "halawa_tub" },
      { name_en: "Pure Egyptian Black Cane Molasses (Asal Eswed)", name_ar: "عسل أسود قصب مصري بلدي نقي 100%", base_cost: 22, base_price: 45, var_type: "molasses_jar" },
    ]
  },

  // =========================================================================
  // SECTOR 5: Egyptian Bakery, Pastries & Biscuits (Egypt - 250)
  // =========================================================================
  {
    sector: "Egyptian Bakery & Pastries",
    country_prefix: "622",
    sku_prefix: "EG-BAK",
    base_uom_code: "gram",
    brand_candidates: [
      'El Abd Patisserie', 'Tseppas', 'Monginis Sweets', 'Bisco Misr', 'Corona Biscuits Egypt', 'Edita', 'Molto'
    ],
    category_candidates: [
      'Egyptian Pastries & Oriental Sweets',
      'Bakery & Artisan Bread'
    ],
    items: [
      { name_en: "Heritage Baladi Fiteer Meshaltet with Pure Ghee", name_ar: "فطير مشلتت فلاحي مورق بالسمن البلدي", base_cost: 60, base_price: 120, var_type: "pastry_box" },
      { name_en: "Kahk El Eid Filled with Honey Agameya", name_ar: "كحك العيد الفاخر محشو بالعجمية البلدية", base_cost: 75, base_price: 150, var_type: "pastry_box" },
      { name_en: "Melt-in-Mouth Ghorayeba with Almonds", name_ar: "غريبة دايبة بالسمن البلدي واللوز", base_cost: 80, base_price: 160, var_type: "pastry_box" },
      { name_en: "Bisco Misr Classic Luxury Tea Biscuits", name_ar: "بسكويت شاي لوكس بسكو مصر الأصلي", base_cost: 15, base_price: 30, var_type: "biscuit_pack" },
      { name_en: "Traditional Egyptian Date Menenas (Agwa Rolls)", name_ar: "منين مصري بلدي بالعجوة والسمسم", base_cost: 45, base_price: 90, var_type: "pastry_box" },
      { name_en: "Corona Vintage Cocoa Sandwich Biscuits", name_ar: "بسكويت كورونا بالكاكاو والكراميل العريق", base_cost: 18, base_price: 36, var_type: "biscuit_pack" },
      { name_en: "Molto Hazelnut Cream Layered Croissant", name_ar: "مولتو كرواسون طبقات بكريمة البندق والشوكولاتة", base_cost: 12, base_price: 24, var_type: "biscuit_pack" },
    ]
  },

  // =========================================================================
  // SECTOR 6: Egyptian Molokhia, Pickles & Marine Harvest (Egypt - 250)
  // =========================================================================
  {
    sector: "Egyptian Pickles & Harvest",
    country_prefix: "622",
    sku_prefix: "EG-PIC",
    base_uom_code: "gram",
    brand_candidates: [
      'Americana Frozen', 'Faragalla Canned Tomato', 'Koki Americana Egypt', 'Al-Bustan Marine Harvest', 'Hurghada Marine Harvest'
    ],
    category_candidates: [
      'Pickles, Olives & Pickled Veggies',
      'Fresh Meats & Poultry',
      'Salmon Fillets & Tuna Steaks'
    ],
    items: [
      { name_en: "Finely Minced Egyptian Green Molokhia", name_ar: "ملوخية خضراء مصرية مخروطة مجمدة فاخرة", base_cost: 14, base_price: 26, var_type: "frozen_pouch" },
      { name_en: "Baby Okra Grade Zero (Bamia Zero)", name_ar: "بامية زيرو مصرية بلدية خضراء منتقاة", base_cost: 26, base_price: 49, var_type: "frozen_pouch" },
      { name_en: "Egyptian Torchi Baladi Pickles in Vinegar Brine", name_ar: "طرشي بلدي مصري مشكل باللفت والليمون والفلفل", base_cost: 18, base_price: 35, var_type: "pickle_jar" },
      { name_en: "Alexandria Mediterranean Sardines in Spicy Oil", name_ar: "سردين إسكندراني معلب بالزيت الحار والليمون", base_cost: 24, base_price: 48, var_type: "canned_tin" },
      { name_en: "Smoked Herring Fillet (Renga Extra Vacuum)", name_ar: "رنجة هولندية مدخنة فاخرة سوبر بطارخ مفرغة", base_cost: 55, base_price: 105, var_type: "fish_pack" },
      { name_en: "Traditional Egyptian Beef Pastrami with Fenugreek (Basturma)", name_ar: "بسطرمة بلدي مصري بالثوم والحلبة الفاخرة", base_cost: 120, base_price: 220, var_type: "fish_pack" },
    ]
  },

  // =========================================================================
  // SECTOR 7: Italian Artisan Pasta, Gnocchi & Pomodoro Sauces (Europe - 250)
  // =========================================================================
  {
    sector: "Italian Pasta & Sauces",
    country_prefix: "800",
    sku_prefix: "EU-PAS",
    base_uom_code: "gram",
    brand_candidates: [
      'Barilla', 'De Cecco', 'Kraft Heinz', 'Heinz', 'Knorr'
    ],
    category_candidates: [
      'Dry Pastas, Noodles & Vermicelli',
      'Handmade Fresh Pastas',
      'Sauces, Condiments & Dips'
    ],
    items: [
      { name_en: "Bronze-Die Extruded Spaghetti No. 5", name_ar: "سباغيتي إيطالية كلاسيكية مقذوفة بالبرونز", base_cost: 24, base_price: 46, var_type: "pasta_box" },
      { name_en: "Penne Rigate Durum Wheat Semolina Pasta", name_ar: "مكرونة بيني ريجاتي سميد القمح الصلب", base_cost: 24, base_price: 46, var_type: "pasta_box" },
      { name_en: "Egg Tagliatelle Matassine all'Uovo", name_ar: "تالياتيلي إيطالية بالبيض الطازج أعشاش", base_cost: 32, base_price: 62, var_type: "pasta_box" },
      { name_en: "Potato Gnocchi Traditional Soft Dumplings", name_ar: "نيوكي بطاطس إيطالي تقليدي طري", base_cost: 26, base_price: 52, var_type: "pasta_box" },
      { name_en: "Sugo al Basilico Vine Tomato & Basil Sauce", name_ar: "صلصة طماطم إيطالية بالريحان الطازج وزيت الزيتون", base_cost: 28, base_price: 56, var_type: "sauce_jar" },
      { name_en: "Arrabbiata Spicy Chili Tomato Pasta Sauce", name_ar: "صلصة أرابياتا حارة بالفلفل الأحمر والثوم", base_cost: 28, base_price: 56, var_type: "sauce_jar" },
      { name_en: "D.O.P. San Marzano Whole Peeled Plum Tomatoes", name_ar: "طماطم سان مارزانو إيطالية مقشرة كاملة بعصيرها", base_cost: 30, base_price: 60, var_type: "canned_tin" },
      { name_en: "Pesto alla Genovese with Fresh Basil & Pine Nuts", name_ar: "بيستو جنوفيزي إيطالي بالريحان والصنوبر وجبن البارميزان", base_cost: 45, base_price: 88, var_type: "sauce_jar" },
    ]
  },

  // =========================================================================
  // SECTOR 8: European Espresso, Coffee & Chocolates (Europe - 250)
  // =========================================================================
  {
    sector: "European Coffee & Chocolates",
    country_prefix: "801",
    sku_prefix: "EU-COF",
    base_uom_code: "gram",
    brand_candidates: [
      'Lavazza', 'Illy', 'Nespresso', 'Ferrero', 'Lindt & Sprüngli', 'Toblerone', 'Milka', 'Kinder', 'Nutella'
    ],
    category_candidates: [
      'Espresso & Handcrafted Coffee',
      'Hot Chocolate & Sweet Mocha'
    ],
    items: [
      { name_en: "Qualità Rossa Italian Espresso Roast Ground", name_ar: "قهوة إسبريسو كواليتا روسا إيطالية مطحونة", base_cost: 55, base_price: 105, var_type: "coffee_tin" },
      { name_en: "Illy 100% Arabica Medium Roast Coffee Beans", name_ar: "حبوب بن إيلي 100% أرابيكا تحميص كلاسيكي", base_cost: 95, base_price: 185, var_type: "coffee_tin" },
      { name_en: "Nespresso Ispirazione Ristretto Italiano Capsules", name_ar: "كبسولات نسبريسو ريستريتو إيطالياني مركزة", base_cost: 65, base_price: 125, var_type: "capsule_box" },
      { name_en: "Lindor Swiss Milk Chocolate Melt Truffles", name_ar: "شوكولاتة ليندور سويسرية بالحليب بحشوة ناعمة", base_cost: 60, base_price: 120, var_type: "choc_box" },
      { name_en: "Toblerone Honey & Almond Nougat Milk Chocolate Bar", name_ar: "شوكولاتة توبليرون سويسرية مثلثة بالعسل واللوز", base_cost: 22, base_price: 44, var_type: "choc_bar" },
      { name_en: "Milka Alpine Milk Classic Chocolate Bar", name_ar: "شوكولاتة ميلكا كلاسيكية بحليب جبال الألب", base_cost: 20, base_price: 39, var_type: "choc_bar" },
      { name_en: "Ferrero Rocher Whole Hazelnut Pralines Box", name_ar: "شوكولاتة فيريرو روشيه بالبندق المقرمش الفاخر", base_cost: 58, base_price: 115, var_type: "choc_box" },
      { name_en: "Nutella Hazelnut Cocoa Spread Jar", name_ar: "شوكولاتة نوتيلا كريمية قابلة للدهن بالبندق والكاكاو", base_cost: 42, base_price: 82, var_type: "sauce_jar" },
    ]
  },

  // =========================================================================
  // SECTOR 9: European Mineral Waters & Premium Mixers (Europe - 250)
  // =========================================================================
  {
    sector: "European Waters & Mixers",
    country_prefix: "300",
    sku_prefix: "EU-WAT",
    base_uom_code: "ml",
    brand_candidates: [
      'S.Pellegrino', 'Evian', 'Perrier', 'Volvic', 'Voss', 'Fever-Tree', 'Schweppes', 'Fanta', 'Sprite'
    ],
    category_candidates: [
      'Mineral & Sparkling Waters',
      'Cold Beverages & Mocktails'
    ],
    items: [
      { name_en: "S.Pellegrino Italian Sparkling Natural Mineral Water", name_ar: "مياه معدنية فوارة سان بيليجرينو إيطالية طبيعية", base_cost: 25, base_price: 48, var_type: "water_bottle" },
      { name_en: "Evian Natural Alpine Spring Still Mineral Water", name_ar: "مياه معدنية طبيعية إيفيان من جبال الألب الفرنسية", base_cost: 22, base_price: 42, var_type: "water_bottle" },
      { name_en: "Perrier Naturally Carbonated French Mineral Water", name_ar: "مياه بيرييه فرنسية معدنية فوارة بالغازات الطبيعية", base_cost: 26, base_price: 50, var_type: "water_bottle" },
      { name_en: "Fever-Tree Premium Indian Tonic Water with Quinine", name_ar: "مياه تونيك هندية فاخرة فيفر تري بالكينا الطبيعية", base_cost: 28, base_price: 55, var_type: "mixer_bottle" },
      { name_en: "Schweppes Classic Sparkling Bitter Lemon Mixer", name_ar: "مشروب شويدس كلاسيكي فوار بالليمون المنعش", base_cost: 16, base_price: 32, var_type: "mixer_bottle" },
      { name_en: "San Pellegrino Aranciata Sparkling Blood Orange", name_ar: "مشروب سان بيليجرينو فوار بالبرتقال الأحمر الإيطالي", base_cost: 26, base_price: 52, var_type: "water_bottle" },
    ]
  },

  // =========================================================================
  // SECTOR 10: French Condiments, Mustards & Fruit Conserves (Europe - 250)
  // =========================================================================
  {
    sector: "French Condiments & Jams",
    country_prefix: "301",
    sku_prefix: "EU-CON",
    base_uom_code: "gram",
    brand_candidates: [
      'Maille', 'Bonne Maman', 'Colman\'s', 'Hellmann\'s', 'Danone'
    ],
    category_candidates: [
      'Sauces, Condiments & Dips',
      'Oriental & Heritage Sweets'
    ],
    items: [
      { name_en: "Maille Moutarde à l'Ancienne Whole Grain Dijon Mustard", name_ar: "خردل ماي ديجون فرنسي قديم بحبوب الخردل الكاملة", base_cost: 32, base_price: 64, var_type: "condiment_jar" },
      { name_en: "Maille Traditional Smooth Dijon Mustard", name_ar: "خردل ماي ديجون فرنسي ناعم كلاسيكي أصلي", base_cost: 30, base_price: 60, var_type: "condiment_jar" },
      { name_en: "Maille Extra-Fine Cornichons in White Wine Vinegar", name_ar: "خيار مخلل كورنيشون فرنسي رفيع في خل النبيذ الأبيض", base_cost: 35, base_price: 68, var_type: "condiment_jar" },
      { name_en: "Bonne Maman Wild Strawberry Gourmet Fruit Conserve", name_ar: "مربى بون ميمان فرنسية بالتوت البري الفاخر", base_cost: 42, base_price: 82, var_type: "conserve_jar" },
      { name_en: "Bonne Maman Four Fruits Mixed Berry Preserves", name_ar: "مربى بون ميمان فرنسية مشكلة بأربعة فواكه حمراء", base_cost: 40, base_price: 78, var_type: "conserve_jar" },
      { name_en: "Bonne Maman Bitter Orange Seville Marmalade", name_ar: "مارملاد بون ميمان بالبرتقال المر الإشبيلي الفرنسي", base_cost: 38, base_price: 75, var_type: "conserve_jar" },
      { name_en: "Hellmann's Real Creamy French Style Mayonnaise", name_ar: "مايونيز هيلمانز كلاسيكي بالبيض والليمون", base_cost: 28, base_price: 55, var_type: "condiment_jar" },
    ]
  },

  // =========================================================================
  // SECTOR 11: British Teas, Biscuits & Breakfast Staples (Europe - 250)
  // =========================================================================
  {
    sector: "British Teas & Biscuits",
    country_prefix: "501",
    sku_prefix: "EU-TEA",
    base_uom_code: "gram",
    brand_candidates: [
      'Twinings', 'Lipton', 'Cadbury', 'Haribo', 'Kraft Heinz', 'Hellmann\'s'
    ],
    category_candidates: [
      'Black & Green Artisan Teas',
      'Bakery & Artisan Bread'
    ],
    items: [
      { name_en: "Twinings Classic Earl Grey Bergamot Black Tea", name_ar: "شاي تويننجز إنجليزي إيرل جراي بزيت البرغموت العطري", base_cost: 42, base_price: 82, var_type: "tea_box" },
      { name_en: "Twinings Traditional English Breakfast Rich Golden Tea", name_ar: "شاي تويننجز إفطار إنجليزي ذهبي قوي ومميز", base_cost: 38, base_price: 74, var_type: "tea_box" },
      { name_en: "Twinings Lady Grey Citrus & Orange Peel Infusion", name_ar: "شاي ليدي جراي بالبرغموت وقشور البرتقال والليمون", base_cost: 44, base_price: 86, var_type: "tea_box" },
      { name_en: "Twinings Pure Peppermint Refreshing Herbal Leaves", name_ar: "شاي أعشاب تويننجز بالنعناع الفلفلي النقي المنعش", base_cost: 36, base_price: 70, var_type: "tea_box" },
      { name_en: "Cadbury Dairy Milk Pure English Chocolate Bar", name_ar: "شوكولاتة كادبوري ديري ميلك بالحليب الإنجليزي الأصلي", base_cost: 22, base_price: 44, var_type: "choc_bar" },
      { name_en: "Haribo Goldbears Classic Fruity Gummy Candies", name_ar: "حلوى هريبو جولدن بيرز دباديب الفواكه الأصلية", base_cost: 16, base_price: 32, var_type: "choc_bar" },
    ]
  },

  // =========================================================================
  // SECTOR 12: European Cereals, Oats & Mediterranean Snacks (Europe - 250)
  // =========================================================================
  {
    sector: "European Cereals & Snacks",
    country_prefix: "400",
    sku_prefix: "EU-CER",
    base_uom_code: "gram",
    brand_candidates: [
      'Kellogg\'s', 'Quaker Oats', 'Pringles', 'Doritos', 'Unilever', 'Danone', 'Al Safi Danone GCC', 'Candia Algerie Dairy'
    ],
    category_candidates: [
      'Pantry Staples, Grains & Rice',
      'Dairy, Artisan Cheeses & Eggs'
    ],
    items: [
      { name_en: "Kellogg's Original Golden Toasted Corn Flakes", name_ar: "رقائق ذرة كورن فليكس كلوقز الأصلية الذهبية المقرمشة", base_cost: 34, base_price: 68, var_type: "cereal_box" },
      { name_en: "Quaker Whole Rolled Oats 100% Wholegrain", name_ar: "شوفان كويكر كامل الحبة طبيعي 100% للشوربة والإفطار", base_cost: 28, base_price: 56, var_type: "cereal_box" },
      { name_en: "Kellogg's Crunchy Nut Honey & Almond Clusters", name_ar: "رقائق حبوب كلوقز كرانشي نات بالعسل واللوز المحمص", base_cost: 45, base_price: 88, var_type: "cereal_box" },
      { name_en: "Pringles Original Stacked Salted Potato Crisps", name_ar: "شيبس برينجلز بطاطس كلاسيكي مقرمش بالملح البحري", base_cost: 24, base_price: 48, var_type: "snack_tin" },
      { name_en: "Pringles Sour Cream & Onion Stacked Crisps", name_ar: "شيبس برينجلز بالكريمة الحامضة والبصل الأخضر", base_cost: 24, base_price: 48, var_type: "snack_tin" },
      { name_en: "Doritos Nacho Cheese Bold Tortilla Corn Chips", name_ar: "رقائق دوريتوس تورتيلا مقرمشة بجبنة الناتشو الغنية", base_cost: 18, base_price: 36, var_type: "snack_bag" },
      { name_en: "Danone Activia Probiotic Creamy Vanilla Yogurt", name_ar: "زبادي أكتيفيا بروبيوتيك كريمي بالبروبيوتيك والفانيليا", base_cost: 16, base_price: 32, var_type: "dairy_tub" },
    ]
  }
];

// Rich modifiers to ensure each of the 250 items per sector is uniquely named
const adjectivesEn = [
  'Royal Selection', 'Artisanal Reserve', 'Heritage Harvest', 'Supreme Vintage',
  'Master Blend', 'Grand Traditional', 'Old World Special', 'Gourmet Gold',
  'Family Estate', 'Signature Series', 'Handcrafted Classic', 'Imperial Private',
  'Connoisseur Grade', 'Village Kitchen', 'Country Style', 'Golden Batch',
  'Prestige Cuvée', 'Prime Harvest', 'Pure Nature', 'Sun-Ripened Select',
  'Mountain Spring', 'Monastery Blend', 'Centennial Recipe', 'Deluxe Pantry',
  'Farmhouse Natural', 'Mediterranean Classic', 'Royal Orchard', 'Homestyle Craft'
];

const adjectivesAr = [
  'مختارات ملكية', 'محصول تراثي فاخر', 'خلطة المعلم الخاصة', 'عراقة تقليدية أصيلة',
  'إصدار المائدة الذهبي', 'طبيعي معتق فاخر', 'مزارع العائلة المختارة', 'نكهة بلدية عريقة',
  'سر الصنعة الأصيل', 'جودة بلدية ممتازة', 'مذاق الضيافة الفاخر', 'نقاء طبيعي خالص',
  'محصول المروج الذهبية', 'وصفة الأجداد التاريخية', 'صفوة المحصول البلدي', 'خلاصة الخيرات الريفية'
];

/**
 * Main Generator Function: Produces exactly 3,000 products and ~7,800 variants
 */
export function generate3000FoodAndDrinksProducts(): GeneratedProduct[] {
  const products: GeneratedProduct[] = [];
  let globalBarcodeSeq = 50000;
  let globalProductIndex = 0;

  for (const secConfig of FOOD_DRINKS_SECTORS) {
    const targetSectorCount = 250;
    let sectorProdCount = 0;

    while (sectorProdCount < targetSectorCount) {
      for (let iIdx = 0; iIdx < secConfig.items.length && sectorProdCount < targetSectorCount; iIdx++) {
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

        // Structured SKU: e.g. "EG-DAI-00001", "EU-PAS-01501"
        const skuNumber = String(globalProductIndex).padStart(5, '0');
        const productSku = `${secConfig.sku_prefix}-${skuNumber}`;

        const productNameEn = `${brandName} - ${baseItem.name_en} (${adjEn})`;
        const productNameAr = `${baseItem.name_ar} ${adjAr} - ${brandName}`;
        const description = `${productNameEn} / ${productNameAr}. Premium traditional ${secConfig.sector} prepared to authentic heritage standards for connoisseur gastronomy and daily household nutrition.`;

        // GS1 EAN-13 barcode for parent
        globalBarcodeSeq++;
        const productBarcode = generateEan13(secConfig.country_prefix, globalBarcodeSeq);

        // Generate packaging variants
        const variants = generateVariantsForType(
          baseItem.var_type,
          baseItem.base_cost,
          baseItem.base_price,
          productSku,
          secConfig.country_prefix,
          globalBarcodeSeq * 10
        );

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
          is_batch_tracked: true,
          is_serial_tracked: false,
          tracking_mode: 'batch',
          product_type_code: 'non_durable',
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
