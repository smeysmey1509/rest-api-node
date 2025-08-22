import { describe, it } from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';
import { calculateCartTotals, SERVICE_TAX_RATE, DELIVERY_FEE } from '../src/main/utils/cartTotals';

describe('calculateCartTotals', () => {
  it('calculates totals without discount', () => {
    const subtotal = 100;
    const { serviceTax, deliveryFee, total } = calculateCartTotals(subtotal);
    assert.strictEqual(serviceTax, (subtotal * SERVICE_TAX_RATE) / 100);
    assert.strictEqual(deliveryFee, DELIVERY_FEE);
    assert.strictEqual(total, subtotal + serviceTax + DELIVERY_FEE);
  });

  it('prevents negative totals when discount exceeds subtotal', () => {
    const subtotal = 50;
    const discount = 100;
    const { serviceTax, deliveryFee, total } = calculateCartTotals(subtotal, discount);
    assert.strictEqual(serviceTax, 0);
    assert.strictEqual(deliveryFee, DELIVERY_FEE);
    assert.strictEqual(total, DELIVERY_FEE);
  });

  it('executes in under 10ms', () => {
    const start = performance.now();
    calculateCartTotals(100);
    const duration = performance.now() - start;
    assert(duration < 10, `Expected <10ms, got ${duration}ms`);
  });
});
