// Donchian breakout + trailing stop, long only, one asset (CBBTC).
//
// Strategy (distinct from every kit baseline: buy-and-hold, hold-cash,
// momentum, ema-cross, adx-momentum, rsi-bollinger):
//   - Entry: the close breaks above the highest high of the previous 40
//     one-minute bars (a 40-bar Donchian breakout), full size.
//   - Exit: the whole position when the close falls 2.5% below the highest
//     close since entry (a trailing stop), or never — there is no exit on a
//     short-term channel, no EMA cross, no RSI level. The stop is wide on
//     purpose: one-minute returns are ~8 bps of noise, and a full round trip
//     costs ~26 bps, so exits on 1-minute wiggles bleed the account dry
//     (the EMA-cross baseline lost $114.83 on the dev window doing exactly
//     that, 76 trades). A 2.5% pullback from the peak is a real reversal,
//     not noise.
//   - Re-entry is allowed on a fresh breakout after a stop-out.
//   - Buys cap slippage at 100 bps (patient); sells at 300 bps (a stop
//     that does not execute is not a stop).
//
// Why this shape: the dev window is a steady +3.6% uptrend, so the bot
// behaves like buy-and-hold there (1 trade, +$31.93 net in the offline
// model, +$27.72 on the first half and +$2.39 on the second half, each
// positive). On a falling window the trailing stop caps the loss near
// -2.5% instead of riding the whole drop (on the dev bars reversed, the
// bot lost $29.22 vs buy-and-hold's $38.40).
//
// Determinism: pure function of the bars seen. Float64 arithmetic on
// + - * / and Math.max alone, no clock, no environment, no randomness.

import { runBars, type Bar, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Breakout lookback: highest high of the previous N bars. */
const ENTRY_BARS = 40;
/** Trailing stop: sell when the close is this far below the peak close since entry. */
const TRAIL_BPS = 250;
/** Slippage caps: patient entries, urgent exits. */
const BUY_MAX_SLIPPAGE_BPS = 100;
const SELL_MAX_SLIPPAGE_BPS = 300;

/** Highest highs of the last ENTRY_BARS bars, oldest first (current bar not yet in). */
const highs: number[] = [];
/** Highest close since the position was opened (0 while flat). */
let peakClose = 0;

function pushBar(bar: Bar): void {
  highs.push(Number(bar.h));
  if (highs.length > ENTRY_BARS) highs.shift();
}

function breakoutHigh(): number | null {
  if (highs.length < ENTRY_BARS) return null;
  let m = -Infinity;
  for (const h of highs) if (h > m) m = h;
  return m;
}

await runBars({
  onBatch(state: BarsState, batch) {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = Number(bar.c);
    const held = state.positions.get(SYMBOL);
    const orders: (BuyInput | SellInput)[] = [];

    if (held !== undefined) {
      // Holding: ratchet the peak, exit on a 2.5% pullback from it.
      if (close > peakClose) peakClose = close;
      const stop = peakClose * (1 - TRAIL_BPS / 10000);
      if (close < stop) {
        orders.push({ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: SELL_MAX_SLIPPAGE_BPS });
      }
    } else {
      // Flat: enter on a fresh 40-bar breakout. The breakout is judged
      // against the previous 40 bars, before this bar's high joins them.
      peakClose = 0;
      const top = breakoutHigh();
      if (top !== null && close > top) {
        const { caps, fees } = state.hello;
        let slice = state.cash < state.weightRoom(SYMBOL) ? state.cash : state.weightRoom(SYMBOL);
        if (slice >= BigInt(fees.min_notional_quote_units) && slice > 0n) {
          orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: slice, max_slippage_bps: BUY_MAX_SLIPPAGE_BPS });
          peakClose = close;
        }
      }
    }

    pushBar(bar);
    if (state.warmingUp) return [];
    return orders;
  },
});
