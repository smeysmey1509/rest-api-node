# Node.js E-commerce Backend Restructure Plan

## 1) Problems in the Current Structure

This codebase already has useful separation in some places, but the overall layout will become hard to maintain as the project grows.

### Current pain points

1. **Technical layers and business domains are mixed together**
   - HTTP routes and controllers live under `src/main`, while database models live in `src/models`, middleware lives in `src/middleware`, and uploads config lives in `src/config`.
   - A single feature such as `products` spans multiple top-level folders, which makes onboarding and feature work slower.

2. **Routes still contain business logic and direct database access**
   - Some route files query Mongoose models directly instead of delegating to controllers/services/repositories.
   - This makes routes harder to test and creates inconsistent boundaries.

3. **Controllers are too large and contain parsing/normalization logic**
   - Product creation includes slug generation, JSON parsing, variant normalization, validation-like checks, image handling, stock calculations, and notification publishing in one controller.
   - That makes reuse difficult and increases regression risk.

4. **No consistent service and repository boundary**
   - There are service files, but they are mostly cross-cutting helpers and not feature-centered application services.
   - Data access is tightly coupled to controllers/routes through direct model usage.

5. **Naming is inconsistent**
   - Examples include singular and plural route naming (`/product` and `/products`), inconsistent file suffixes, and typos like `createReview.controller.ts.ts`.
   - Inconsistent naming makes the codebase feel larger and less predictable than it is.

6. **Cross-cutting concerns are not centralized enough**
   - App bootstrapping, DB connection, environment setup, Redis, upload handling, and logging are spread across unrelated folders.
   - This can make production configuration and troubleshooting harder.

7. **No obvious home for validation, error handling, events, constants, or shared DTOs**
   - The current structure does not clearly show where request schemas, domain errors, event contracts, or module-specific constants should live.
   - These concerns usually become essential in a medium/large backend.

8. **`src/main` is not a strong architectural boundary**
   - The name suggests execution context rather than responsibility.
   - A feature-based or app/core/modules layout will scale better and be easier for teams to navigate.

9. **Build output is committed alongside source-oriented navigation**
    - `dist/` mirrors the app structure and adds noise when trying to understand architecture.
    - The source tree should be the primary place for design clarity.

## 2) Recommended Folder Structure

The most practical fit for this project is a **feature-first modular monolith**:
- keep each business domain together,
- keep cross-cutting infrastructure shared,
- avoid over-engineering with excessive layers where they are not needed.

### Proposed folder tree

```text
src/
  app/
    app.ts
    server.ts
    routes.ts
    bootstrap/
      load-env.ts
      register-middlewares.ts
      register-routes.ts
      register-swagger.ts
    middleware/
      auth.middleware.ts
      authorize.middleware.ts
      error-handler.middleware.ts
      not-found.middleware.ts
      request-logger.middleware.ts
      validate-request.middleware.ts
    common/
      constants/
        app.constants.ts
        http-status.constants.ts
        roles.constants.ts
        permissions.constants.ts
        queue.constants.ts
      errors/
        app-error.ts
        validation-error.ts
        auth-error.ts
        not-found-error.ts
      utils/
        async-handler.ts
        pagination.ts
        slugify.ts
        date.util.ts
      types/
        api-response.types.ts
        express.types.ts
      logger/
        index.ts
      events/
        event-bus.ts
        event.types.ts

  config/
    env/
      index.ts
      validate-env.ts
    database/
      mongo.ts
      redis.ts
    uploads/
      multer.ts
    docs/
      swagger.ts

  modules/
    auth/
      auth.route.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.validation.ts
      auth.types.ts
    users/
      user.route.ts
      user.controller.ts
      user.service.ts
      user.repository.ts
      user.model.ts
      user.validation.ts
      user.mapper.ts
    products/
      product.route.ts
      product.controller.ts
      product.service.ts
      product.repository.ts
      product.model.ts
      product.validation.ts
      product.constants.ts
      product.mapper.ts
      product.events.ts
    categories/
      category.route.ts
      category.controller.ts
      category.service.ts
      category.repository.ts
      category.model.ts
      category.validation.ts
    carts/
      cart.route.ts
      cart.controller.ts
      cart.service.ts
      cart.repository.ts
      cart.model.ts
      cart.validation.ts
      cart.utils.ts
    orders/
      order.route.ts
      order.controller.ts
      order.service.ts
      order.repository.ts
      order.model.ts
      order.validation.ts
      order.events.ts
    payments/
      payment.route.ts
      payment.controller.ts
      payment.service.ts
      payment.repository.ts
      payment.model.ts
      payment.validation.ts
      providers/
        stripe.provider.ts
        sslcommerz.provider.ts
    inventory/
      inventory.route.ts
      inventory.controller.ts
      inventory.service.ts
      inventory.repository.ts
      inventory.model.ts
      inventory.validation.ts
      stock-movement.model.ts
    uploads/
      upload.route.ts
      upload.controller.ts
      upload.service.ts
      upload.validation.ts
      storage/
        local.storage.ts
        s3.storage.ts
    reviews/
      review.route.ts
      review.controller.ts
      review.service.ts
      review.repository.ts
      review.model.ts
      review.validation.ts
    notifications/
      notification.route.ts
      notification.controller.ts
      notification.service.ts
      notification.repository.ts
      notification.model.ts
      notification.events.ts
    brands/
      brand.route.ts
      brand.controller.ts
      brand.service.ts
      brand.repository.ts
      brand.model.ts
      brand.validation.ts
    delivery/
      delivery.route.ts
      delivery.controller.ts
      delivery.service.ts
      delivery.repository.ts
      delivery.model.ts
      delivery.validation.ts
    promocodes/
      promocode.route.ts
      promocode.controller.ts
      promocode.service.ts
      promocode.repository.ts
      promocode.model.ts
      promocode.validation.ts
    wishlist/
      wishlist.route.ts
      wishlist.controller.ts
      wishlist.service.ts
      wishlist.repository.ts
      wishlist.model.ts

  scripts/
    migrate-images.ts
    review-script.ts
    seed-phone-products.ts
```

## 3) Why Each Main Folder Exists

### `src/app`
Application assembly only.
- Holds Express app creation, server startup, middleware registration, global route mounting, and shared app-level concerns.
- Keeps bootstrapping separate from business logic.

### `src/config`
Infrastructure configuration.
- Central place for environment parsing, database connections, queue clients, upload engine setup, and documentation config.
- Anything that wires external systems into the app should live here.

### `src/modules`
Business features grouped by domain.
- Each module owns its route, controller, service, repository, validation, and model.
- This is the most important structural change because it reduces feature sprawl.
- Teams can work within one module without scanning unrelated folders.

### `src/scripts`
One-off or operational scripts.
- Data migration, seed scripts, and repair scripts should stay here.
- Keeps them outside request/response application code.

## 4) Recommended Internal Module Pattern

Each module should use this practical flow:

```text
route -> controller -> service -> repository -> model/database
```

### Responsibilities
- **route**: define endpoints and attach middleware.
- **controller**: translate HTTP request/response to application calls.
- **service**: business rules, orchestration, transactions, event publishing.
- **repository**: database access and query composition.
- **model**: Mongoose schema/model only.
- **validation**: request body/query/params schemas.
- **mapper/types**: shape internal entities to response DTOs when needed.

This gives clear separation without adding enterprise-style complexity.

## 5) Where Specific Concerns Should Go

### Environment config
- Put environment loading and validation in `src/config/env/`.
- Example files:
  - `src/config/env/index.ts`
  - `src/config/env/validate-env.ts`
- Load once during bootstrap, export a typed config object everywhere else.

### Database connection
- Mongo connection: `src/config/database/mongo.ts`
- Redis connection: `src/config/database/redis.ts`
- If the app later uses a read replica or analytics DB, keep those in the same area.

### Error handling
- Global error classes: `src/app/common/errors/`
- Express middleware:
  - `src/app/middleware/error-handler.middleware.ts`
  - `src/app/middleware/not-found.middleware.ts`
- Prefer throwing typed errors from services instead of returning ad hoc JSON from many places.

### Logging
- Put a shared logger in `src/app/common/logger/`.
- Request logging middleware belongs in `src/app/middleware/request-logger.middleware.ts`.
- Avoid scattered `console.log` usage in controllers and boot files.

### Authentication / authorization
- Middleware: `src/app/middleware/auth.middleware.ts`, `authorize.middleware.ts`
- Auth feature behavior: `src/modules/auth/`
- Role/permission constants: `src/app/common/constants/roles.constants.ts` and `permissions.constants.ts`

### Payment integration
- Keep payment domain logic in `src/modules/payments/`.
- Third-party providers should live in `src/modules/payments/providers/`.
- This makes it easy to swap providers or support more than one.

### Image / file uploads
- Multer or storage adapters: `src/config/uploads/`
- Upload business rules/endpoints: `src/modules/uploads/`
- Keep raw storage concerns separate from upload-related API behavior.

### Background jobs
- Put queue consumers, producers, and scheduled jobs under `src/jobs/`.
- Example:
  - `src/jobs/queues/notification.consumer.ts`
  - `src/jobs/producers/notification.producer.ts`
  - `src/jobs/processors/notification.processor.ts`

### Shared helpers
- Pure reusable helpers: `src/app/common/utils/`
- Avoid putting feature-specific helpers in shared utils; keep those inside the owning module.

## 6) Naming Conventions

Use conventions consistently so engineers can guess file locations.

### Folder names
- Use **plural** domain folders for modules: `products`, `orders`, `categories`.
- Use **kebab-case** or simple lowercase for infrastructure folders, but keep it consistent.
- Recommended here: lowercase folder names, no spaces, no mixed conventions.

### File names
- Prefer `<entity>.<layer>.ts`
  - `product.route.ts`
  - `product.controller.ts`
  - `product.service.ts`
  - `product.repository.ts`
  - `product.validation.ts`
- Middleware files should end in `.middleware.ts`.
- Constants files should end in `.constants.ts`.
- Error classes should end in `.error.ts` or be grouped in `errors/`.
- Queue files should end in `.consumer.ts`, `.producer.ts`, or `.job.ts`.

### Route naming
- Prefer plural REST resources:
  - `GET /products`
  - `GET /products/:id`
  - `POST /products`
  - `PATCH /products/:id`
  - `DELETE /products/:id`
- Avoid mixing `/product` and `/products` for equivalent concepts.

### Class/function naming
- Controllers/services/repositories: `ProductService`, `ProductRepository`
- Middleware functions: `authenticate`, `authorize`, `validateRequest`
- Validation schemas: `createProductSchema`, `updateProductSchema`

## 7) Practical Grouping by Feature

For this e-commerce project, these modules make sense immediately:

- `auth`
- `users`
- `products`
- `categories`
- `carts`
- `orders`
- `payments`
- `inventory`
- `uploads`
- `reviews`
- `notifications`
- `brands`
- `delivery`
- `promocodes`
- `wishlist`

### When to keep code shared instead of per-module
Keep code in `src/app/common` only if it is:
- generic,
- reused across several modules,
- not owned by one business feature.

Examples:
- pagination helpers,
- global API response helpers,
- central error classes,
- logger,
- auth token extraction helper if used globally.

## 8) Bad Patterns in the Current Project That Should Change

1. **Direct model queries inside route files**
   - Move all DB access into repositories or, at minimum, services.

2. **Fat controllers**
   - Move parsing, normalization, and stock calculations into services or dedicated module utilities.

3. **Mixed app/runtime naming**
   - Replace `src/main` with `src/app` + `src/modules` so the tree reflects responsibility.

4. **Cross-cutting infrastructure scattered across source root**
   - Consolidate DB, queue, env, and upload setup under `src/config`.

5. **Inconsistent or typo-prone filenames**
   - Fix files like `createReview.controller.ts.ts` during migration.

6. **Global utilities without ownership boundaries**
   - Move feature-specific utilities closer to their modules, and keep only truly shared helpers in common utils.

## 9) Step-by-Step Migration Plan

Do this incrementally to avoid breaking the app.

### Phase 1 — Establish the new skeleton
1. Create `src/app`, `src/config`, `src/modules`, and `src/jobs`.
2. Add central bootstrap files for env, middleware, routes, DB, and Redis.
3. Keep existing code working by re-exporting or temporarily importing old modules.

### Phase 2 — Move cross-cutting infrastructure first
1. Move `src/middleware/*` into `src/app/middleware/`.
2. Move `src/config/multer.ts` into `src/config/uploads/multer.ts`.
3. Move cache/Redis connection setup into `src/config/database/`.
4. Add global error handler and request logger middleware.

### Phase 3 — Migrate one module at a time
Start with a heavily used module such as `products`.
1. Create `src/modules/products/`.
2. Move product routes, controllers, model-adjacent logic, validators, and helpers there.
3. Extract DB access to `product.repository.ts`.
4. Extract business rules to `product.service.ts`.
5. Keep route handlers very thin.
6. Run tests and smoke checks before moving the next module.

Suggested migration order:
1. `auth`
2. `users`
3. `products`
4. `categories`
5. `carts`
6. `orders`
7. `payments`
8. `inventory`
9. `reviews`
10. `notifications`
11. remaining supporting modules

### Phase 4 — Standardize names and endpoints
1. Normalize singular/plural route naming.
2. Rename typo files.
3. Align controller/service/repository naming patterns.
4. Add validation files for all request entry points.

### Phase 5 — Remove transitional code
1. Delete compatibility imports and old directories.
2. Update build/dev scripts if entry points changed.
3. Refresh API docs and onboarding docs.

## 10) Keep It Practical: What Not to Over-Engineer

For a medium-to-large Node.js backend, avoid adding all of the following too early:
- separate DTO folders for every trivial endpoint,
- interfaces for every single service when there is only one implementation,
- complex domain-driven design layers unless the team already works that way,
- deep `core/application/infrastructure/domain` nesting if the team is small.

A modular monolith with clear services/repositories is usually enough.

## 11) Recommended First Refactor Targets in This Repository

If you want to start with the highest-impact improvements, do these first:
1. Create `src/modules/products` and move the product route/controller logic out of `src/main`.
2. Introduce `product.service.ts` and `product.repository.ts`.
3. Centralize Mongo/Redis/env setup under `src/config`.
4. Add shared error and logging middleware.
5. Normalize route naming and fix typo files.

## 12) Summary Recommendation

The best next-state architecture for this repository is:
- **feature-first modules for business domains**,
- **shared app/common layer for cross-cutting code**,
- **central config layer for infrastructure wiring**,
- **dedicated jobs layer for background processing**.

That structure gives you:
- better maintainability,
- cleaner ownership,
- easier onboarding,
- safer scaling for new features,
- and a production-ready layout without unnecessary complexity.
