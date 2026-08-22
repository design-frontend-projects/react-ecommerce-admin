import prisma from '@/lib/prisma'

export interface SeedLookupType {
  code: string
  name: string
  description?: string
  is_system: boolean
  sort_order: number
  values: {
    code: string
    name: string
    name_ar?: string
    description?: string
    color?: string
    icon?: string
    is_default?: boolean
    sort_order?: number
  }[]
}

export const SEED_LOOKUP_TYPES: SeedLookupType[] = [
  {
    code: 'address_type',
    name: 'Address Type',
    description: 'Types of physical/mailing addresses for tenants, suppliers, and customers',
    is_system: true,
    sort_order: 1,
    values: [
      { code: 'billing', name: 'Billing Address', name_ar: 'عنوان الفواتير', icon: 'Receipt', is_default: true, sort_order: 1 },
      { code: 'shipping', name: 'Shipping Address', name_ar: 'عنوان الشحن', icon: 'Truck', sort_order: 2 },
      { code: 'warehouse', name: 'Warehouse Address', name_ar: 'عنوان المستودع', icon: 'Warehouse', sort_order: 3 },
      { code: 'office', name: 'Office / HQ', name_ar: 'المكتب الرئيسي', icon: 'Building2', sort_order: 4 },
      { code: 'branch', name: 'Branch Location', name_ar: 'موقع الفرع', icon: 'MapPin', sort_order: 5 },
    ],
  },
  {
    code: 'uom_category',
    name: 'Unit of Measure Category',
    description: 'Physical classification groups for Units of Measure',
    is_system: true,
    sort_order: 2,
    values: [
      { code: 'count', name: 'Count & Units', name_ar: 'العدد والوحدات', icon: 'Boxes', is_default: true, sort_order: 1 },
      { code: 'weight', name: 'Weight & Mass', name_ar: 'الوزن والكتلة', icon: 'Scale', sort_order: 2 },
      { code: 'volume', name: 'Volume & Liquids', name_ar: 'الحجم والسوائل', icon: 'Droplets', sort_order: 3 },
      { code: 'length', name: 'Length & Distance', name_ar: 'الطول والمسافة', icon: 'Ruler', sort_order: 4 },
      { code: 'area', name: 'Area & Surface', name_ar: 'المساحة والسطح', icon: 'Square', sort_order: 5 },
      { code: 'time', name: 'Time & Duration', name_ar: 'الوقت والمدة', icon: 'Clock', sort_order: 6 },
    ],
  },
  {
    code: 'tax_classification',
    name: 'Tax Classification',
    description: 'Product and service tax classification categories',
    is_system: true,
    sort_order: 3,
    values: [
      { code: 'standard', name: 'Standard Rate (VAT)', name_ar: 'الضريبة القياسية', is_default: true, color: '#3b82f6', sort_order: 1 },
      { code: 'reduced', name: 'Reduced Rate', name_ar: 'الضريبة المخفضة', color: '#10b981', sort_order: 2 },
      { code: 'zero_rated', name: 'Zero-Rated (0%)', name_ar: 'نسبة صفرية', color: '#f59e0b', sort_order: 3 },
      { code: 'exempt', name: 'Tax Exempt', name_ar: 'معفى من الضريبة', color: '#6b7280', sort_order: 4 },
    ],
  },
  {
    code: 'price_list_type',
    name: 'Price List Type',
    description: 'Categories of pricing strategies for customers and sales channels',
    is_system: false,
    sort_order: 4,
    values: [
      { code: 'retail', name: 'Standard Retail', name_ar: 'سعر التجزئة', is_default: true, color: '#2563eb', sort_order: 1 },
      { code: 'wholesale', name: 'Wholesale / B2B', name_ar: 'سعر الجملة', color: '#059669', sort_order: 2 },
      { code: 'vip', name: 'VIP / Loyalty', name_ar: 'سعر كبار العملاء', color: '#d97706', sort_order: 3 },
      { code: 'black_friday', name: 'Seasonal / Promotion', name_ar: 'عروض موسمية', color: '#dc2626', sort_order: 4 },
      { code: 'staff', name: 'Staff / Employee', name_ar: 'سعر الموظفين', color: '#7c3aed', sort_order: 5 },
    ],
  },
  {
    code: 'adjustment_reason',
    name: 'Stock Adjustment Reason',
    description: 'Structured reasons for increasing or decreasing stock counts',
    is_system: false,
    sort_order: 5,
    values: [
      { code: 'damage', name: 'Damaged Goods', name_ar: 'بضاعة تالفة', color: '#ef4444', sort_order: 1 },
      { code: 'expired', name: 'Expired Products', name_ar: 'بضاعة منتهية الصلاحية', color: '#f97316', sort_order: 2 },
      { code: 'theft', name: 'Theft / Shrinkage', name_ar: 'عجز / سرقة', color: '#b91c1c', sort_order: 3 },
      { code: 'data_entry_error', name: 'Data Entry Error', name_ar: 'خطأ إدخال بيانات', color: '#6b7280', sort_order: 4 },
      { code: 'stocktake_discrepancy', name: 'Stocktake Discrepancy', name_ar: 'فروقات جرد', color: '#eab308', sort_order: 5 },
      { code: 'count_correction', name: 'Count Correction', name_ar: 'تصحيح عد مخزني', color: '#3b82f6', sort_order: 6 },
      { code: 'loss', name: 'Lost in Facility', name_ar: 'فقدان أثناء التخزين', color: '#991b1b', sort_order: 7 },
      { code: 'found', name: 'Found Inventory', name_ar: 'مخزون تم العثور عليه', color: '#10b981', sort_order: 8 },
      { code: 'system_correction', name: 'System Balance Correction', name_ar: 'تسوية نظامية', color: '#8b5cf6', sort_order: 9 },
      { code: 'spoilage', name: 'Spoilage & Waste', name_ar: 'هدر وتلف طبيعي', color: '#ea580c', sort_order: 10 },
    ],
  },
  {
    code: 'store_type',
    name: 'Store Type',
    description: 'Operating roles of stores and points of sale',
    is_system: false,
    sort_order: 6,
    values: [
      { code: 'main', name: 'Main Store / HQ', name_ar: 'الفرع الرئيسي', is_default: true, sort_order: 1 },
      { code: 'retail', name: 'Retail Store', name_ar: 'متجر تجزئة', sort_order: 2 },
      { code: 'damaged', name: 'Damaged Goods Holding', name_ar: 'مستودع تالف', sort_order: 3 },
      { code: 'returns', name: 'Returns Processing Hub', name_ar: 'مركز المرتجعات', sort_order: 4 },
      { code: 'virtual', name: 'Online / Virtual Store', name_ar: 'متجر إلكتروني افتراضي', sort_order: 5 },
      { code: 'cold_storage', name: 'Cold Storage Room', name_ar: 'غرفة تبريد', sort_order: 6 },
    ],
  },
  {
    code: 'location_type',
    name: 'Warehouse Location Type',
    description: 'Spatial hierarchy within a warehouse (zone, rack, shelf, bin, etc.)',
    is_system: false,
    sort_order: 7,
    values: [
      { code: 'zone', name: 'Zone / Area', name_ar: 'منطقة / قطاع', is_default: true, sort_order: 1 },
      { code: 'rack', name: 'Storage Rack', name_ar: 'حامل تخزين (رف رئيسي)', sort_order: 2 },
      { code: 'shelf', name: 'Shelf Level', name_ar: 'رف فرعي', sort_order: 3 },
      { code: 'bin', name: 'Bin / Compartment', name_ar: 'صندوق تخزين فرعي', sort_order: 4 },
      { code: 'pallet', name: 'Pallet Position', name_ar: 'موقع طبلية (باليت)', sort_order: 5 },
      { code: 'bay', name: 'Staging / Loading Bay', name_ar: 'رصيف تحميل واستلام', sort_order: 6 },
    ],
  },
  {
    code: 'product_type',
    name: 'Product Type',
    description: 'Catalog behavior and tracking profile for products',
    is_system: false,
    sort_order: 8,
    values: [
      { code: 'simple', name: 'Simple Stock Item', name_ar: 'منتج مخزني فردي', is_default: true, sort_order: 1 },
      { code: 'variant', name: 'Variant Parent Item', name_ar: 'منتج متعدد الخصائص', sort_order: 2 },
      { code: 'bundle', name: 'Kit / Bundle', name_ar: 'حزمة / طقم مجمع', sort_order: 3 },
      { code: 'service', name: 'Non-Stock Service', name_ar: 'خدمة غير مخزنية', sort_order: 4 },
      { code: 'composite', name: 'Composite / Manufactured', name_ar: 'منتج مصنع / مركب', sort_order: 5 },
      { code: 'raw_material', name: 'Raw Material / Ingredient', name_ar: 'مادة خام / مكون أولي', sort_order: 6 },
    ],
  },
  {
    code: 'promotion_type',
    name: 'Promotion Type',
    description: 'Marketing campaign and discount mechanics',
    is_system: false,
    sort_order: 9,
    values: [
      { code: 'order_discount', name: 'Order Total Discount', name_ar: 'خصم على إجمالي الطلب', is_default: true, sort_order: 1 },
      { code: 'item_discount', name: 'Line Item Discount', name_ar: 'خصم على صنف محدد', sort_order: 2 },
      { code: 'buy_x_get_y', name: 'Buy X Get Y (BOGO)', name_ar: 'اشتر X واحصل على Y مجاناً', sort_order: 3 },
      { code: 'free_shipping', name: 'Free Shipping Voucher', name_ar: 'شحن مجاني', sort_order: 4 },
    ],
  },
  {
    code: 'sales_channel',
    name: 'Sales Channel',
    description: 'Source or platform where the transaction originated',
    is_system: false,
    sort_order: 10,
    values: [
      { code: 'counter', name: 'In-Store POS Counter', name_ar: 'كاشير نقطة البيع', is_default: true, icon: 'Receipt', sort_order: 1 },
      { code: 'online', name: 'E-Commerce Website', name_ar: 'الموقع الإلكتروني', icon: 'Globe', sort_order: 2 },
      { code: 'marketplace', name: 'Marketplace Integration', name_ar: 'منصة تسوق خارجية', icon: 'Store', sort_order: 3 },
      { code: 'wholesale', name: 'Direct B2B Wholesale', name_ar: 'مبيعات الجملة المباشرة', icon: 'Building2', sort_order: 4 },
      { code: 'mobile_app', name: 'Mobile App', name_ar: 'تطبيق الهاتف', icon: 'Smartphone', sort_order: 5 },
    ],
  },
  {
    code: 'payment_status',
    name: 'Payment Status',
    description: 'Financial settlement states for invoices and orders',
    is_system: false,
    sort_order: 11,
    values: [
      { code: 'pending', name: 'Payment Pending', name_ar: 'قيد الانتظار', color: '#f59e0b', is_default: true, sort_order: 1 },
      { code: 'partial', name: 'Partially Paid', name_ar: 'مدفوع جزئياً', color: '#3b82f6', sort_order: 2 },
      { code: 'paid', name: 'Fully Paid', name_ar: 'مدفوع بالكامل', color: '#10b981', sort_order: 3 },
      { code: 'overdue', name: 'Payment Overdue', name_ar: 'متأخر السداد', color: '#ef4444', sort_order: 4 },
      { code: 'refunded', name: 'Refunded', name_ar: 'مسترد', color: '#6b7280', sort_order: 5 },
    ],
  },
  {
    code: 'return_reason',
    name: 'Return Reason',
    description: 'Customer and supplier merchandise return reasons',
    is_system: false,
    sort_order: 12,
    values: [
      { code: 'defective', name: 'Defective / Damaged', name_ar: 'تالف أو به عيب مصنعي', color: '#ef4444', is_default: true, sort_order: 1 },
      { code: 'wrong_item', name: 'Wrong Item Shipped', name_ar: 'صنف خاطئ تم إرساله', color: '#f97316', sort_order: 2 },
      { code: 'expired', name: 'Expired Product', name_ar: 'منتهي الصلاحية', color: '#dc2626', sort_order: 3 },
      { code: 'customer_mind', name: 'Customer Changed Mind', name_ar: 'تراجع العميل عن الشراء', color: '#6b7280', sort_order: 4 },
      { code: 'not_as_described', name: 'Not As Described', name_ar: 'غير مطابق للمواصفات', color: '#8b5cf6', sort_order: 5 },
    ],
  },
  {
    code: 'shipment_carrier',
    name: 'Logistics Carrier',
    description: 'Couriers and freight companies handling deliveries',
    is_system: false,
    sort_order: 13,
    values: [
      { code: 'self_delivery', name: 'Company Fleet / In-House', name_ar: 'توصيل عبر أسطول الشركة', is_default: true, sort_order: 1 },
      { code: 'fedex', name: 'FedEx Express', name_ar: 'فيديكس', sort_order: 2 },
      { code: 'dhl', name: 'DHL Express', name_ar: 'دي إتش إل', sort_order: 3 },
      { code: 'aramex', name: 'Aramex', name_ar: 'أرامكس', sort_order: 4 },
      { code: 'ups', name: 'UPS', name_ar: 'يو بي إس', sort_order: 5 },
    ],
  },
  {
    code: 'customer_type',
    name: 'Customer Type',
    description: 'Customer segmentation category for CRM and compliance',
    is_system: false,
    sort_order: 14,
    values: [
      { code: 'individual', name: 'Individual / Retail', name_ar: 'فرد / مستهلك نهائي', is_default: true, sort_order: 1 },
      { code: 'business', name: 'Corporate / B2B', name_ar: 'شركة / قطاع أعمال', sort_order: 2 },
      { code: 'government', name: 'Government Entity', name_ar: 'جهة حكومية', sort_order: 3 },
      { code: 'hospital', name: 'Healthcare / Hospital', name_ar: 'مستشفى / قطاع صحي', sort_order: 4 },
      { code: 'partner', name: 'Partner / Reseller', name_ar: 'شريك / موزع معتمد', sort_order: 5 },
    ],
  },
  {
    code: 'supplier_category',
    name: 'Supplier Category',
    description: 'Vendor classifications for procurement and evaluation',
    is_system: false,
    sort_order: 15,
    values: [
      { code: 'manufacturer', name: 'Direct Manufacturer', name_ar: 'مصنع مباشر', is_default: true, sort_order: 1 },
      { code: 'distributor', name: 'Authorized Distributor', name_ar: 'موزع معتمد', sort_order: 2 },
      { code: 'wholesaler', name: 'Local Wholesaler', name_ar: 'تاجر جملة محلي', sort_order: 3 },
      { code: 'importer', name: 'International Importer', name_ar: 'مستورد خارجي', sort_order: 4 },
      { code: 'service_provider', name: 'Service / Utility Provider', name_ar: 'مزود خدمات ولوجستيات', sort_order: 5 },
    ],
  },
  {
    code: 'warehouse_type',
    name: 'Warehouse Type',
    description: 'Physical and operational roles of warehouse facilities',
    is_system: false,
    sort_order: 16,
    values: [
      { code: 'main_dc', name: 'Central Distribution Center', name_ar: 'مركز توزيع رئيسي', is_default: true, sort_order: 1 },
      { code: 'transit', name: 'In-Transit Hub', name_ar: 'مستودع عبور / شحن', sort_order: 2 },
      { code: 'quarantine', name: 'Quarantine & Inspection', name_ar: 'مستودع حجر وفحص الجودة', sort_order: 3 },
      { code: 'cold_storage', name: 'Cold Chain Refrigerated', name_ar: 'مستودع تبريد وتجميد', sort_order: 4 },
      { code: 'store_backroom', name: 'Store Backroom Storage', name_ar: 'مستودع خلفي للمتجر', sort_order: 5 },
    ],
  },
]

export async function seedLookups() {
  console.log('Seeding lookup types and default values...')

  for (const item of SEED_LOOKUP_TYPES) {
    const lookupType = await prisma.lookup_types.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description ?? null,
        is_system: item.is_system,
        sort_order: item.sort_order,
      },
      create: {
        code: item.code,
        name: item.name,
        description: item.description ?? null,
        is_system: item.is_system,
        sort_order: item.sort_order,
      },
    })

    for (const val of item.values) {
      const existingVal = await prisma.lookup_values.findFirst({
        where: {
          lookup_type_id: lookupType.id,
          tenant_id: null,
          code: val.code,
        },
      })

      if (existingVal) {
        await prisma.lookup_values.update({
          where: { id: existingVal.id },
          data: {
            name: val.name,
            name_ar: val.name_ar ?? null,
            description: val.description ?? null,
            color: val.color ?? null,
            icon: val.icon ?? null,
            is_default: val.is_default ?? false,
            is_system: true,
            sort_order: val.sort_order ?? 0,
          },
        })
      } else {
        await prisma.lookup_values.create({
          data: {
            lookup_type_id: lookupType.id,
            tenant_id: null,
            code: val.code,
            name: val.name,
            name_ar: val.name_ar ?? null,
            description: val.description ?? null,
            color: val.color ?? null,
            icon: val.icon ?? null,
            is_default: val.is_default ?? false,
            is_system: true,
            sort_order: val.sort_order ?? 0,
          },
        })
      }
    }
  }

  console.log(`Successfully seeded ${SEED_LOOKUP_TYPES.length} lookup types with default global values.`)
}
