# Hydro Oasis Calculators

This repository collects the standalone calculators that power Hydro Oasis' Shopify embeds along with the JSON data they consume. Each calculator is written as a single HTML document with its own scoped styles and scripts so it can be dropped straight into a theme section without leaking styles into the storefront.

## Repository layout

### Calculators
- `Calculators/Electricity/index.html` – electricity cost estimator that imports the Shopify `/_sdk/element_sdk.js` and `/_sdk/data_sdk.js` helpers alongside jsPDF, then renders a fully scoped layout for entering tariff windows, equipment schedules, and per-equipment runtime. 【F:Calculators/Electricity/index.html†L1-L167】
- `Calculators/Water/index.html` – water cost calculator that mirrors the Hydro Oasis visual system, loads the element SDK and jsPDF, and exposes controls for plant counts, watering frequency, provider selection, rounding, and PDF export. 【F:Calculators/Water/index.html†L1-L200】
- `Calculators/Nutrient-Program/index.html` – nutrient program builder that conditionally loads the same SDKs when it detects a Shopify domain, pulls nutrient programs, and renders configurable vegetative/flowering schedules, reservoir settings, and a printable matrix. 【F:Calculators/Nutrient-Program/index.html†L1-L184】

### Data files
- `data/electricity_tariffs.json` – master tariff catalogue grouped by retailer.
- `data/water_providers.json` – list of provider rates per Australian state and tier.
- `data/Nutrient_Programs.json` – nutrient feed programs split into vegetative and flowering stages.

## Data formats

### Electricity tariffs
`electricity_tariffs.json` exposes a `retailers` object. Each retailer entry supplies a human-friendly `displayName`, a list of `regions`, and one or more plan definitions. Every plan provides a `title`, a `byRegion` map of day/shoulder/off-peak rates, and `windows` that describe the exact day/time coverage for each rate bucket. This structure lets the electricity calculator render both flat-rate and time-of-use options without guessing at the underlying tariff rules. 【F:data/electricity_tariffs.json†L1-L67】

### Water providers
`water_providers.json` is an array of simple objects, one per rate tier. Each record spells out the provider `name`, the `state` it applies to, the dollar `rate` per kilolitre, and a `tier` label so the UI can display contextual helper text when a user picks their supplier. Because multiple entries can share the same provider, you can represent multi-tier schemes (e.g., Icon Water Tier 1 vs Tier 2). 【F:data/water_providers.json†L1-L35】

### Nutrient programs
`Nutrient_Programs.json` is a dictionary keyed by a slug such as `canna_aqua_au`. Every program stores a `name` plus two arrays, `vegetative` and `flowering`. Each array is a chronological list of weeks, and each week lists the `products` required with their `rate` per litre. This schema keeps the calculator flexible enough to render branded recipes and lets growers edit or extend week-by-week targets. 【F:data/Nutrient_Programs.json†L1-L70】

## Updating or extending the calculators
1. **Add or modify data first.** Update the JSON files above with any new tariffs, providers, or nutrient schedules so the calculators can load the latest information. The structures described in the previous section must stay intact for the existing JavaScript to keep working.
2. **Work inside the scoped HTML files.** Each calculator uses fully scoped CSS variables, Shopify SDK scripts, and jsPDF helpers already referenced at the top of the respective HTML document. Keeping new markup and scripts within the existing wrapper elements (`#ecalc`, `#water-calc`, `#npcalc`) ensures Shopify theme styles will not bleed into the tools. 【F:Calculators/Electricity/index.html†L15-L200】【F:Calculators/Water/index.html†L13-L200】【F:Calculators/Nutrient-Program/index.html†L20-L184】
3. **Validate embeds locally.** Because `/_sdk/element_sdk.js` and `/_sdk/data_sdk.js` only exist on the Shopify domain, the nutrient calculator already guards against 404s by loading them conditionally. Follow the same pattern if you add new calculators or external dependencies so local testing remains noise-free. 【F:Calculators/Nutrient-Program/index.html†L3-L14】

Keeping these notes with the source saves time when the calculators or datasets need to be refreshed for future tariff changes or product launches.
