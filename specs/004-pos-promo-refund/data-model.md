# Data Model: Promotions and Order Refund

## ResPromotion (Entity)
- `promotion_id`: number (Primary key)
- `code`: string (Unique, used for input)
- `name`: string
- `description`: string (optional)
- `discount_type`: 'percent' | 'amount'
- `discount_value`: number (amount or percentage value)
- `minimum_purchase`: number (threshold for validity)
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)
- `usage_limit`: number (max total usage)
- `is_active`: boolean
- `created_at`: string

## ResPromotionUsage (Linker)
- `id`: string (UUID)
- `promotion_id`: number
- `order_id`: string
- `applied_at`: string

## ResOrder (Updated with discount info)
- `id`: string (UUID)
- `total_amount`: number (final paid amount)
- `subtotal`: number (items total)
- `tax_amount`: number
- `discount_amount`: number (calculated from applied promo)
- `applied_promotion_id`: number (FK to ResPromotion)
- `status`: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled' | 'refunded'
