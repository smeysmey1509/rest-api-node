import { describe, it } from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';
import { calculateCartSubtotal } from '../src/main/routes/cart';
import type { ICart } from '../src/models/Cart';

describe('calculateCartSubtotal', () => {
  it('computes subtotal correctly', () => {
    const cart = {
      items: [
        { product: { price: 10 }, quantity: 2 },
        { product: { price: 5 }, quantity: 3 },
      ],
    } as unknown as ICart;
    const subtotal = calculateCartSubtotal(cart);
    assert.strictEqual(subtotal, 10 * 2 + 5 * 3);
  });

  it('executes in under 10ms', () => {
    const cart = {
      items: Array.from({ length: 100 }, (_, i) => ({
        product: { price: i + 1 },
        quantity: 1,
      })),
    } as unknown as ICart;
    const start = performance.now();
    calculateCartSubtotal(cart);
    const duration = performance.now() - start;
    assert(duration < 10, `Expected <10ms, got ${duration}ms`);
  });
});
