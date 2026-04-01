# Quickstart: Captain POS & Promotions

## For Captains (Ordering)
1. Open the **Captain Station** (Dashboard).
2. Select a table from the floor plan to enter the **POS Screen**.
3. Add items to the cart.
4. (Optional) Enter a **Promo Code** in the sidebar.
5. Review the discounted total.
6. Click **Send to Kitchen** (or Update Order).

## For Admins (Refunds)
1. Navigate to the **POS Screen** for a completed (paid) table.
2. In the Order History panel, click the **Refund** button.
3. Review the order items and confirm the refund.
4. The table will be marked as `refunded` and cleared.

## Configuration
- Add new promotions via the **Admin -> Promotions** module (using `res_promotions` table).
- Codes are case-insensitive and checked against `is_active`, date ranges, and `minimum_purchase`.
