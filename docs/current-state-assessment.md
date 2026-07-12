# Current-State Assessment and Migration Plan

Date: 2026-07-12

This assessment compares the current repository with `docs/ecommerce-full-business-flow.drawio`. It is the Phase 0 baseline and intentionally precedes implementation changes.

## Current state

The repository is already partway through a modular-monolith-to-services migration. It has the seven target runtime applications and required default ports:

| Application | Port | Current scope |
| --- | ---: | --- |
| API Gateway | 5002 | Versioned proxy routes, CORS, request IDs, basic rate limiting and health |
| Auth Service | 5101 | Registration/login and role APIs; no durable refresh-session lifecycle |
| User Service | 5102 | User profile/status APIs; no address module |
| Catalog Service | 5103 | Categories, brands, products, variants, reviews, wishlist and reports |
| Inventory Service | 5104 | Suppliers, locations, serialized units, movements and delivery settings |
| Order Service | 5105 | Cart, coupons, checkout and orders |
| Payment Service | 5106 | Payment records and local payment gateway adapters |

The repository uses Express, TypeScript, Mongoose, Redis, RabbitMQ, Vitest and Supertest dependencies. Services share one MongoDB database, matching the target V1 strategy. Module code generally follows route/controller/service/repository/model layering, but repository layers are not consistent across every module.

## Inventory of existing domain modules

- Identity: users, roles, basic auth.
- Catalog: categories, brands, products, product variants, reviews, wishlist and sidebar reports.
- Inventory: suppliers, stock locations, serialized inventory units, movements and delivery settings.
- Sales: carts, coupons/coupon usage, checkout and orders.
- Payments: payments and card, bank-transfer, cash-on-delivery and normal/mock gateway adapters.
- Legacy root application: older routes, jobs and operational scripts remain for compatibility and migration support.

## Architecture gap analysis

| Area | Existing capability | Target gap | Priority |
| --- | --- | --- | --- |
| Service boundaries | Separate service entry points | Production imports cross domain boundaries (Auth to User, Inventory to Catalog, Order to Catalog/Inventory/Payment, Payment to Order/Catalog/Inventory, Catalog to Order/Inventory) | Critical |
| Shared foundations | Shared middleware/helpers and DB bootstrap | Typed contracts, validated config, structured logger, normalized errors, transaction helper, HTTP client, event envelope and outbox/inbox are incomplete | Critical |
| Identity | Users, login/register, roles | `customerNumber`, auth sessions, refresh rotation/revocation, addresses and default-address transaction | High |
| Catalog | Product variants and derived stock summary exist | Product still contains legacy variants/stock/pricing fields; codes are incomplete; review order item reference is unstable | High |
| Inventory | Serialized units and movement ledger exist | Purchase orders, bulk balances, durable reservations, expiry, receiving idempotency, transfer/adjust/return workflows and target identifiers | Critical |
| Checkout | Cart and order/payment creation exist | Direct model/service imports, no durable reservation-first saga, incomplete request idempotency and compensation | Critical |
| Payment | Payment records and adapters exist | Signed/deduplicated webhooks, payment events, invoices, allocations, receipts, refunds, credit notes and reconciliation | Critical |
| Fulfillment | Order delivery state exists | Shipments, tracking events, returns, delivery proof and atomic bill close | High |
| Messaging | RabbitMQ jobs exist in legacy root | Reliable exchange/queue declarations, retry/DLQ, transactional outbox, idempotent inbox and dedicated workers | Critical |
| Runtime | Compose runs infrastructure and seven apps | MongoDB is standalone rather than replica set; no workers; no private network/readiness dependency checks | Critical |
| Security | JWT middleware, bcrypt and CORS exist | Refresh-token hashing/rotation, service authentication, Helmet, environment validation, redaction and webhook signatures | High |
| Observability | Basic health and request IDs | Structured service/correlation logs, readiness dependency probes, health aggregation and metrics interface | Medium |
| Migrations | Product/image scripts exist | Restartable target migration, duplicate/orphan report, backup instructions and migration report | High |
| Documentation | Draw.io diagrams, Postman collection and older restructure plan | Target architecture/API/events/env/migration/sequences/state machines/compensation documentation | Medium |

## Direct cross-domain dependencies to remove

Production dependencies identified during assessment include:

- Auth repository imports the User service model.
- Inventory unit service imports Catalog models and repository.
- Cart and checkout import Catalog and Inventory models.
- Checkout and Order services call the Payment service class directly.
- Payment service imports Order, Catalog and Inventory models/services.
- Catalog review service imports the Order model.
- Catalog wishlist service calls the Order cart service.
- Catalog product service imports an Inventory publisher.
- A shared cart helper imports an Inventory delivery model.

Cross-service model imports used only by integration-test fixture setup and operational migration/seed scripts are tracked separately. They do not create runtime service coupling, but should eventually move behind a shared testing/migration interface.

## Risks and conflicts

1. The diagram requires transactions, but the current Compose MongoDB has no replica set.
2. Several target operations span HTTP calls. A local MongoDB transaction cannot cover them, so checkout and payment completion require idempotent sagas and compensations plus outbox delivery.
3. Existing API consumers may depend on legacy names (`user`, `code`, product-level variant/stock fields and older statuses). Migration must retain read aliases or compatibility DTOs while canonical writes move to target fields.
4. MongoDB unique indexes can fail on existing duplicates. Migrations must report conflicts and stop before creating unsafe indexes; inconsistent data must not be deleted automatically.
5. A TTL index cannot itself perform reservation compensation. It may clean records only after business release, so expiry must be owned by a claim-safe worker.
6. Provider credentials are absent. Provider interfaces and signed mock webhook behavior can be completed; real-provider activation remains configuration-dependent.
7. Existing unit/integration tests may encode legacy behavior. Compatibility should be preserved unless it conflicts with inventory, payment or financial invariants.

## Ordered implementation plan

1. Foundations: stable errors, config validation, logging, request/correlation IDs, identifiers, transactions, internal HTTP contracts, RabbitMQ envelope, outbox/inbox and health/readiness.
2. Schemas and migrations: identifiers/indexes, sessions/addresses, catalog normalization, purchase orders/balances/reservations, stable order snapshots, billing and fulfillment models.
3. Catalog/inventory ownership: receiving, serialized/bulk stock, availability, atomic reserve/release/consume, movements and catalog stock-summary events.
4. Checkout: versioned Catalog/Inventory/Payment clients, server-side pricing, idempotency, coupon reservation, immutable order snapshots and compensation.
5. Payment/billing: signed webhook deduplication, success/failure orchestration, invoice/allocation/receipt issuance, reconciliation and idempotency.
6. Fulfillment/close bill: shipment state machine, tracking/delivery, close rules, immutable invoice protections and audit events.
7. Returns/refunds: inspection/disposition, bounded refunds and credit notes.
8. Hardening: replica-set Compose, workers, migrations, OpenAPI/docs, security, observability and full unit/integration/concurrency verification.

## Proposed file changes

Changes will remain incremental within the current `services/` layout:

- `packages/shared/src`: config, logger, errors, identifiers, state transitions, Mongo transaction helper, internal HTTP client/contracts, event envelope, outbox/inbox models and workers, health/readiness helpers.
- `services/auth-service/src`: session model/repository/service, refresh/logout/current-user routes and identity client/ownership cleanup.
- `services/user-service/src`: customer identifiers, addresses and default-address transaction.
- `services/catalog-service/src`: business codes, product normalization, review relationship repair, wishlist index repair, internal validation API and inventory-event consumer.
- `services/inventory-service/src`: purchase orders, balances, reservations, availability, stock-in/transfer/adjust/return operations, reservation expiry worker and internal APIs.
- `services/order-service/src`: canonical carts/coupon usage, order snapshots/state transitions, typed service clients, checkout saga/idempotency, shipments/returns and close-bill orchestration.
- `services/payment-service/src`: payment identifiers/transitions, payment events/webhooks, invoices, allocations, receipts, refunds, credit notes and reconciliation worker.
- `services/api-gateway/src`: normalized proxy errors, timeouts, rate limiting, service routing and aggregated health.
- `scripts/` and `docs/`: restartable migrations, reports, OpenAPI, architecture/event/env/local-development/state-machine/sequence/failure documentation.
- `docker-compose.yml` and environment examples: MongoDB replica set, private network, workers, dependency health and safe configuration.

## Assumptions

- V1 continues to use one shared MongoDB database while each service owns its runtime domain logic.
- The current seven-service directory structure is retained; moving to `apps/` would add risk without improving business correctness.
- Test-only fixture imports may access shared-database models temporarily; production paths may not import another service's controllers, services or repositories.
- Existing public APIs remain compatible where safe, with `/api/v1` canonical routes and internal `/internal/v1` contracts added as needed.
- Money remains stored using the repository's current numeric convention during compatibility migration; all new calculations round deterministically and currency must match. A minor-unit integer migration should be planned separately if current production data uses decimal values.
- External card/bank/carrier/message providers use interfaces and local deterministic adapters until real credentials and provider-specific contracts are supplied.

