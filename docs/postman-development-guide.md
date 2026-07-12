# Postman Development Guide

## Import

Import both files into Postman:

1. `rest-api-node-microservices.postman_collection.json`
2. `rest-api-node-local.postman_environment.json`

Select **REST API Node Local Microservices** as the active environment.

All normal requests use the API Gateway at `{{baseUrl}}`, which defaults to `http://localhost:5002`. The individual service URL variables are intended only for health checks and debugging.

## Start the development stack

Set development secrets before starting Docker Compose:

```bash
export JWT_SECRET='replace-with-a-long-development-secret'
export JWT_REFRESH_SECRET='replace-with-another-long-development-secret'
docker compose up --build
```

When running services outside Docker, start the infrastructure dependencies first and use the root npm scripts such as `npm run dev:auth`, `npm run dev:catalog`, and `npm run dev:gateway`.

## Recommended request order

1. Run **Health / Gateway aggregate health**.
2. Run **Auth Service / Register customer** or **Login**.
3. Confirm that the `accessToken` and `userId` environment variables were populated.
4. Use **User Service / Get current user** to verify authentication.
5. For staff setup, authenticate as an administrator before running create/update/delete requests.
6. Create a brand and category.
7. Create a product, then copy its returned ID into `productId` if it was not captured automatically.
8. Create a stock location and supplier.
9. Add the product to the cart, select delivery, and run checkout.
10. Copy returned order/payment identifiers into `orderId` and `paymentId` when required.

## Authentication behavior

The collection stores the access token returned by register/login in `{{accessToken}}`. Collection-level bearer authentication sends it on protected requests.

The refresh token is an HTTP-only cookie. Postman stores it in its cookie jar for `localhost`; run **Refresh token** using the same host and port. Refresh-token rotation invalidates the previous refresh session.

Registration creates a customer account. Administrative endpoints for product creation, suppliers, locations, fulfillment, manual payment confirmation, and user management require an administrator token. Log in with an existing admin account and let the Login request replace `{{accessToken}}` before testing those endpoints.

If the server is configured with `API_KEY`, protected requests can alternatively send:

```text
x-api-key: <configured API_KEY>
```

The configured `API_KEY_ROLE` must be `ADMIN` for administrative requests.

## Useful environment variables

| Variable | Purpose |
| --- | --- |
| `baseUrl` | API Gateway URL |
| `accessToken` | JWT automatically saved by register/login |
| `authEmail` / `authPassword` | Development login credentials |
| `userId` | Current or selected user |
| `brandId`, `categoryId`, `productId`, `variantId` | Catalog resources |
| `stockLocationId`, `supplierId`, `inventoryUnitId` | Inventory resources |
| `deliveryId` | Selected delivery setting |
| `orderId`, `paymentId` | Checkout results |

## Troubleshooting

- A `401` means the access token is absent, expired, or invalid. Run Login again.
- A `403` usually means a customer token was used for an administrator endpoint.
- A gateway `502` means the target service is not running or its configured URL is incorrect.
- A gateway health response of `503` identifies the unavailable downstream service in its `services` array.
- If Refresh returns `401`, log in again. Refresh tokens are rotated and can only be used once.
- The collection uses Postman's cookie jar. Disabling cookie persistence prevents refresh/logout testing.

