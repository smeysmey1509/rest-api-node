# Product and Inventory Migration Notes

This project now separates catalog, sellable SKU, physical units, and stock history:

- `Product`: catalog data and merchandising only.
- `ProductVariant`: sellable SKU/options and cached stock summary.
- `InventoryUnit`: one physical serialized/IMEI item.
- `InventoryMovement`: immutable stock audit trail.

## Existing Product Data

Existing product fields are preserved for backwards compatibility:

- `productId` remains supported; new writes also set `productCode`.
- `brand`, `category`, and `seller` remain supported; new writes also set `brandId`, `categoryId`, and `createdBy`.
- Legacy top-level `price` and `stock` remain for old APIs/cart flows.
- Embedded `variants` remain readable, but new SKU work should use `ProductVariant`.

## Suggested Migration

1. Backfill product aliases:
   - `productCode = productId`
   - `brandId = brand`
   - `categoryId = category`
   - `createdBy = seller`
   - `trackingType = "NONE"` for accessories/non-serialized products.
   - `trackingType = "SERIAL"` for phones, laptops, computers, cameras, and similar items.

2. Move embedded variants into `ProductVariant`:
   - `productId = product._id`
   - `sku = embeddedVariant.sku`
   - `optionValues = embeddedVariant.attributes`
   - `pricing.salePrice = embeddedVariant.price`
   - `stockSummary.onHand/available` from embedded inventory or stock.

3. For serialized products, create one `InventoryUnit` per real item and write a `STOCK_IN` `InventoryMovement`.

4. After migration, treat `ProductVariant.stockSummary` as a cache. For `SERIAL` products, rebuild it from `InventoryUnit` status counts.

## Example Seed

Run:

```bash
npm run seed:serialized-inventory
```

The seed creates:

- ASUS ROG Zenfone 10 product.
- Blue 128GB / 16GB variant.
- Three inventory units with serial/IMEI.
- One POS stock location.
- One supplier.
