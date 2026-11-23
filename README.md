[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/bisabisanya/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/bisabisanya/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

# BTC Race Bot — Donchian Breakout + Trailing Stop

A bot that trades Coinbase Wrapped BTC (cbBTC) against USDC, minute by minute, in make.fun's
[btc-race-24h-20261123-0511](https://make.fun/bounty/btc-race-24h-20261123-0511) ($50, paper money only).

## Strategy

Long only, one position, full size:

- **Entry:** the close breaks above the highest high of the previous 40 one-minute bars
  (a 40-bar Donchian breakout).
- **Exit:** the whole position when the close falls 2.5% below the highest close since
  entry (a trailing stop). No exit on short-term wiggles: one-minute returns are ~8 bps
  of noise and a full round trip costs ~26 bps, so exits on 1-minute noise bleed the
  account dry. A 2.5% pullback from the peak is a real reversal, not noise.
- **Re-entry** is allowed on a fresh breakout after a stop-out.
- Buys cap slippage at 100 bps (patient); sells at 300 bps (a stop that does not
  execute is not a stop).

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript, stdlib only).
- `vendor/makefun-bars.ts` — byte-for-byte copy of the kit's `agent-fun/bars-replay/v1` shim.

## Run

The grader runs `node /bot/main.ts`; locally:

```
node cli/makefun.mjs grade-local --kit <kit> --bot <this directory> --driver process
```
