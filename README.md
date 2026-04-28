erDiagram
  USER ||--|| CART : "has"
  CART ||--o{ CART_ITEM : "contains"
  PRODUCT ||--o{ CART_ITEM : "in carts"
  USER ||--o{ ORDER : "places"
  ORDER ||--|{ ORDER_ITEM : "includes"
  PRODUCT ||--o{ ORDER_ITEM : "purchased as"
  ORDER ||--|| PAYMENT : "has"
  ORDER ||--|| DELIVERY : "ships via"
  DELIVERY }o--|| DELIVERY_METHOD : "uses"
  USER ||--o{ REVIEW : "writes"
  PRODUCT ||--o{ REVIEW : "receives"
  USER ||--o{ WISHLIST : "owns"
  PRODUCT ||--o{ WISHLIST : "is wished"
  PRODUCT }o--|| CATEGORY : "belongs to"
  CATEGORY ||--o{ CATEGORY : "parent of"
  SELLER ||--o{ PRODUCT : "lists"
  PRODUCT ||--o{ SKU : "has variants"
  SKU ||--o{ STOCK_MOVEMENT : "tracked by"
  PROMO_CODE ||--o{ PROMO_USAGE : "has usages"
  USER ||--o{ PROMO_USAGE : "applies"
  ORDER ||--o{ PROMO_USAGE : "records"
  PROMO_CODE }o--o{ PRODUCT : "targets"
  PROMO_CODE }o--o{ CATEGORY : "targets"

  %% Entity attributes (key fields first)
  USER {
    string id PK
    string email
    string name
    datetime createdAt
  }

  SELLER {
    string id PK
    string name
    string contactEmail
  }

  CATEGORY {
    string id PK
    string name
    string parentId FK
  }

  PRODUCT {
    string id PK
    string name
    string slug
    string brand
    decimal price
    decimal compareAtPrice
    string currency
    int stock
    string status
    float ratingAvg
    int ratingCount
    int salesCount
    datetime createdAt
    datetime updatedAt
    string sellerId FK
    string categoryId FK
  }

  SKU {
    string id PK
    string productId FK
    string code
    json attributes
    decimal priceOverride
    int stock
  }

  STOCK_MOVEMENT {
    string id PK
    string skuId FK
    string type  "purchase|sale|refund|adjust"
    int qty
    string reason
    datetime occurredAt
  }

  CART {
    string id PK
    string userId FK
    string promoCodeId FK
    string deliveryMethodId FK
    datetime updatedAt
  }

  CART_ITEM {
    string id PK
    string cartId FK
    string productId FK
    string skuId FK
    int quantity
    decimal priceAtAdd
  }

  ORDER {
    string id PK
    string userId FK
    string status  "pending|paid|shipped|delivered|refunded|cancelled"
    decimal subtotal
    decimal discountTotal
    decimal shippingTotal
    decimal taxTotal
    decimal grandTotal
    datetime placedAt
  }

  ORDER_ITEM {
    string id PK
    string orderId FK
    string productId FK
    string skuId FK
    int quantity
    decimal priceAtPurchase
  }

  PAYMENT {
    string id PK
    string orderId FK
    string provider
    string providerRef
    string status  "authorized|captured|failed|refunded"
    decimal amount
    datetime paidAt
  }

  DELIVERY {
    string id PK
    string orderId FK
    string deliveryMethodId FK
    string carrier
    string trackingNumber
    string status  "pending|in_transit|delivered|failed"
    datetime shippedAt
    datetime deliveredAt
  }

  DELIVERY_METHOD {
    string id PK
    string code    "standard|express"
    string name
    boolean isActive
    decimal baseCost
    json rules
  }

  REVIEW {
    string id PK
    string userId FK
    string productId FK
    int rating
    string comment
    datetime createdAt
  }

  WISHLIST {
    string id PK
    string userId FK
    string productId FK
    datetime createdAt
  }

  PROMO_CODE {
    string id PK
    string code
    string discountType "percent|fixed|bogo"
    decimal value
    datetime startsAt
    datetime expiresAt
    boolean isActive
    int maxRedemptions
  }

  PROMO_USAGE {
    string id PK
    string promoCodeId FK
    string userId FK
    string orderId FK
    datetime appliedAt
    decimal discountAmount
  }

## Architecture planning

- See `docs/architecture-restructure-plan.md` for a recommended scalable folder architecture and migration plan.

## Clean API Architecture

This project now uses a modular Express architecture without changing frameworks:

```text
Route -> Controller -> Service -> Repository/Model -> Database
```

The Express app is assembled in `src/app.ts`. Runtime startup stays in
`src/main/server.ts`, which connects MongoDB, Redis, HTTP, and Socket.IO.

### Folder Layout

```text
src/
  config/                 # environment, database, JWT, payment config
  common/
    constants/            # roles, order statuses, payment statuses
    middlewares/          # auth, role, validation, async, global error handling
    utils/                # AppError, API response helper, slug helper
  modules/
    auth/
    users/
    roles/
    brands/
    categories/
    products/
    reviews/
    wishlist/
    cart/
    checkout/
    orders/
    payments/
  app.ts
```

Each module follows the same pattern:

```text
module.routes.ts
module.controller.ts
module.service.ts
module.repository.ts
module.model.ts
module.validation.ts
```

Controllers only handle `req`, `res`, and `next` behavior. Services contain
business rules. Repositories contain database queries. Models define schemas.

### Route Compatibility

The API still uses `/api/v1`. Existing route names such as `/register`,
`/login`, `/refresh`, `/logout`, `/product`, `/product/:id`, `/cart/add`,
`/wishlist/:productId`, `/reviews`, and `/checkout` are kept as aliases where
possible.

Read-only storefront endpoints for brands, categories, products, product
details, and approved reviews are public. User and admin mutations require JWT
authentication. Admin actions use role middleware; an admin is a normal user
with the `ADMIN` role.

### Order And Payment Rules

Order statuses:

```text
PENDING_PAYMENT
PAID
PROCESSING
SHIPPED
DELIVERED
CANCELLED
REFUNDED
FAILED
```

Payment statuses:

```text
PENDING
SUCCESS
FAILED
CANCELLED
REFUNDED
```

Checkout validates the cart, checks stock, calculates totals, creates an order
with `PENDING_PAYMENT`, and creates a payment transaction with `PENDING`.
Checkout does not reduce product stock.

Stock is reduced only after the backend confirms payment success. Manual
methods must be confirmed by the backend before marking the payment `SUCCESS`
and the order `PAID`.

Supported payment methods:

```text
NORMAL_PAYMENT
VISA_MASTER
BANK_TRANSFER
CASH_ON_DELIVERY
```

Do not send or store card numbers or CVV values. Card payments must go through a
PCI-compliant hosted provider flow.

### Environment

Copy `.env.example` and fill in project-specific values. Provider secrets must
stay on the backend. The frontend may receive hosted payment links or manual
payment instructions, but it must never decide whether a payment succeeded.
