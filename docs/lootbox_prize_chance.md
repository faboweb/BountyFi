# Lootbox prize chance (campaign lootbox)

Campaign lootbox uses **quantity** and **value** (price) to set per-pull probabilities.

## Formula

- **Weight** for prize `i`: `weight_i = amount_i / (value_i + 1)`
- **Effect**: higher value (price) → lower chance; more quantity → higher chance.

So:
- Cheap, abundant prizes are more likely (e.g. 100×1 USD).
- Expensive, scarce prizes are rarer (e.g. 1 phone).

## Example: 10 coffee, 100×1 USD, 1 phone

Assume **amount** = quantity, **value** = unit price (same scale, e.g. USD or wei):

| Prize   | amount | value | weight = amount/(value+1) |
|--------|--------|-------|----------------------------|
| Coffee | 10     | 2     | 10/3 ≈ 3.33                |
| 1 USD  | 100    | 1     | 100/2 = 50                 |
| Phone  | 1      | 300   | 1/301 ≈ 0.0033             |

Total weight ≈ 53.3. Then (with 40% no-prize slice):

- **1 USD**: ~94% of the “win something” outcomes → most common.
- **Coffee**: ~6% → uncommon.
- **Phone**: ~0.006% → very rare.

So “higher price, lower probability” and “more quantity, higher probability” are both reflected.

## Where it’s used

- **Contract**: `Lootbox.sol` `fulfillRandomWords` for campaign lootbox uses  
  `weight = (amount * 1e18) / (value + 1e18)` (same idea in fixed-point).
- **Supabase**: `campaign_lootbox_pull` edge function uses  
  `weight = amount / (value + 1)` for the off-chain draw.
