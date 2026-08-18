# Dashboard and Funil Analytics Fixes

Correct period filtering in the dashboard, ensure reliable tracking for the first stages (Landing/Scenario), remove the legacy "VSL" stage, and add a conversion card crossing analytics with actual paid orders.

## User Review Required

> [!IMPORTANT]
> The conversion card will show data from the `pedidos` table for the selected period. If an order doesn't have a `created_at` or matches the filter, it will be included in the calculation for "Real Conversion".

- The legacy stage "07_vsl" will be removed from the dashboard view.
- `session_id` will be guaranteed at the very top level of the landing page to prevent "anonymous" or missing sessions in early stages.

## Technical Details

### 1. Dashboard Filter Fix (`src/lib/funil.functions.ts`)
- The `carregarFunil` server function currently only filters by `dias` but doesn't handle "Hoje" (today) correctly if it just subtracts 1 day.
- Update to handle specific date ranges:
    - **Hoje**: From `startOfDay(now)` to `now`.
    - **7 days / 30 days**: Subtract N days from `now`.
    - **Tudo**: No filter.
- Also update `carregarFunil` to count unique `session_id`s per stage using SQL `count(distinct session_id)` or processing in JS (current approach is JS, which is fine for current volume, but I'll optimize the query).

### 2. Funnel Tracking Reliability (`src/routes/index.tsx`)
- Currently, `trackEtapa('01_landing')` runs in a `useEffect`. If `localStorage` is empty, `getSessionId()` might be called *after* the track attempt or in parallel.
- I will move `getSessionId()` to the very beginning of the component or even `beforeLoad` if possible to ensure the ID exists before any tracking happens.

### 3. Remove Legacy VSL Stage (`src/routes/funil.tsx`)
- Remove `{ id: "07_vsl", nome: "VSL" }` from the `etapas` array in the dashboard component.

### 4. Conversion Crossing (`src/lib/funil.functions.ts` & `src/routes/funil.tsx`)
- Add a new server function or update `carregarFunil` to also fetch paid orders from the `pedidos` table for the same period.
- Statuses to count as "paid": `pago`, `foto_pronta`, `gerando_foto`.
- Update the UI in `src/routes/funil.tsx` to display this new "Real Conversion" metric.
