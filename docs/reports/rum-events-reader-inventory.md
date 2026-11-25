# RUM Events Reader Inventory

Generated at: 2026-11-25T02:58:05.582Z

This inventory is generated from `scripts/rum-phase0-inventory.mjs`. It lists SQL functions that read `rum_metrics.events` and application callers of those functions.

Readers: **38**
Application callers: **11**

## SQL readers

| Function | Event types | Fields | Source |
| :--- | :--- | :--- | :--- |
| `analyze_fcp_by_device` | `client-info`, `web-vital` | `connection` (optional), `deviceType` (required), `downlink` (optional), `effectiveType` (optional), `name` (required), `rating` (required), `sessionId` (legacy-only), `siteDomain` (required), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:10` |
| `analyze_lcp_by_device` | `client-info`, `render-blocking-scripts`, `web-vital` | `Finish Time` (optional), `URL` (optional), `attribution` (required), `decodedBodySize` (required), `device` (optional), `deviceMemory` (required), `deviceType` (required), `elementRenderDelay` (optional), `family` (optional), `fetchPriority` (legacy-only), `font` (optional), `fontData` (optional), `name` (required), `rating` (required), `resourceLoadDelay` (optional), `resourceLoadDuration` (optional), `size` (optional), `target` (optional), `timeToFirstByte` (required), `transferSize` (required), `type` (required), `url` (optional), `userAgent` (required), `value` (required), `weight` (optional) | `supabase/migrations/20240101000001_base_functions.sql:132` |
| `analyze_web_vitals_by_page` | shape-dependent | `deviceType` (required), `name` (required), `pageAddress` (legacy-only), `rating` (required), `sessionId` (legacy-only), `siteDomain` (required), `type` (required), `userAgent` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:275` |
| `cache_analysis` | `client-info`, `geo-info`, `origin-info`, `web-vital` | `attribution` (required), `cacheStatus` (required), `city` (required), `connection` (optional), `country` (required), `deviceType` (required), `dnsLookup` (required), `effectiveType` (optional), `name` (required), `originHit` (required), `provider` (required), `requestStart` (optional), `rtt` (optional), `tcpConnection` (optional), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:564` |
| `cls_elements` | `client-info`, `web-vital` | `areaDelta` (optional), `attribution` (required), `current` (optional), `deviceType` (required), `distanceMoved` (optional), `dx` (optional), `dy` (optional), `elements` (optional), `height` (optional), `impact` (optional), `largestShiftTarget` (optional), `loadState` (optional), `name` (required), `previous` (optional), `rect` (optional), `shift` (optional), `shifts` (optional), `time` (optional), `type` (required), `value` (required), `viewportRatio` (optional), `width` (optional), `x` (optional), `y` (optional) | `supabase/migrations/20240101000001_base_functions.sql:605` |
| `cwv_dist_by_connection` | `client-info`, `web-vital` | `connection` (optional), `deviceType` (required), `device_type` (optional), `effectiveType` (optional), `name` (required), `rating` (required), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:714` |
| `font_analysis` | shape-dependent | `attribution` (required), `deviceType` (required), `elementRenderDelay` (optional), `family` (optional), `font` (optional), `fontData` (optional), `rating` (required), `transferSize` (required), `url` (optional), `value` (required), `weight` (optional) | `supabase/migrations/20240101000001_base_functions.sql:843` |
| `get_ai_citation` | `ai-citation-ready`, `client-info` | `deviceType` (required), `domContentLoaded` (optional), `score` (optional), `siteDomain` (required), `ttfb` (optional), `type` (required) | `supabase/migrations/20240101000001_base_functions.sql:913` |
| `get_analytics_by_device_and_country` | `client-info`, `geo-info` | `country` (required), `deviceType` (required), `language` (required), `type` (required) | `supabase/migrations/20240101000001_base_functions.sql:1112` |
| `get_daily_web_metrics` | `client-info`, `geo-info` | `country` (required), `deviceType` (required), `type` (required) | `supabase/migrations/20240101000001_base_functions.sql:1343` |
| `get_lcp_image_metrics` | `client-info`, `web-vital` | `attribution` (required), `decodedBodySize` (required), `deviceType` (required), `elementRenderDelay` (optional), `height` (optional), `isLazy` (optional), `name` (required), `resourceLoadDelay` (optional), `resourceLoadDuration` (optional), `timeToFirstByte` (required), `transferSize` (required), `type` (required), `url` (optional), `value` (required), `width` (optional) | `supabase/migrations/20240101000001_base_functions.sql:1530` |
| `get_rum_web_vitals_metrics` | `client-info`, `web-vital` | `deviceType` (required), `name` (required), `sessionId` (legacy-only), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:1729` |
| `get_web_vital_counts_by_url` | `web-vital` | `name` (required), `rating` (required), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:1906` |
| `get_web_vital_counts_by_url` | `client-info`, `web-vital` | `deviceType` (required), `name` (required), `rating` (required), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:1949` |
| `get_web_vitals_metrics` | `client-info` | `deviceType` (required), `name` (required), `page` (optional), `type` (required), `userAgent` (required), `value` (required), `viewport` (optional), `width` (optional) | `supabase/migrations/20240101000001_base_functions.sql:2012` |
| `get_web_vitals_metrics` | `client-info` | `deviceType` (required), `name` (required), `page` (optional), `type` (required), `userAgent` (required), `value` (required), `viewport` (optional), `width` (optional) | `supabase/migrations/20240101000001_base_functions.sql:2279` |
| `inp_elements` | `client-info` | `URL` (optional), `attribution` (required), `deviceType` (required), `eventType` (optional), `inputDelay` (optional), `name` (required), `presentationDelay` (optional), `processingDuration` (optional), `rating` (required), `target` (optional), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:2546` |
| `lcp_attribution_by_device` | shape-dependent | `attribution` (required), `decodedBodySize` (required), `deviceType` (required), `elementRenderDelay` (optional), `height` (optional), `isLazy` (optional), `resourceLoadDelay` (optional), `resourceLoadDuration` (optional), `target` (optional), `timeToFirstByte` (required), `transferSize` (required), `url` (optional), `value` (required), `width` (optional) | `supabase/migrations/20240101000001_base_functions.sql:2623` |
| `page_performance_analysis` | `client-info`, `web-vital` | `attribution` (required), `deviceType` (required), `largestShiftTarget` (optional), `name` (required), `target` (optional), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:2695` |
| `page_performance_analysis` | `client-info`, `web-vital` | `attribution` (required), `cls_shifts` (optional), `deviceType` (required), `inp` (optional), `largestShiftTarget` (optional), `lcp` (optional), `name` (required), `target` (optional), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20261124062734_canonical_retained_diagnostic_readers.sql:402` |
| `page_performance_analysis` | `client-info`, `web-vital` | `attribution` (required), `cls_shifts` (optional), `deviceType` (required), `inp` (optional), `largestShiftTarget` (optional), `lcp` (optional), `name` (required), `target` (optional), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20261124123405_fix_retained_reader_production_errors.sql:494` |
| `recent_requests` | `client-info`, `geo-info`, `navigation-timings`, `resource-summary` | `backendResponseTime` (required), `cacheStatus` (required), `city` (required), `country` (required), `decodedBodySize` (required), `deviceType` (required), `experienceCategory` (required), `name` (required), `rating` (required), `timeToFirstByte` (required), `transferSize` (required), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:2790` |
| `refresh_rum_daily_distributions` | `client-info`, `web-vital` | `deviceType` (required), `name` (required), `rating` (required), `type` (required) | `supabase/migrations/20240101000001_base_functions.sql:2818` |
| `rum_cls_shifts` | `client-info`, `web-vital` | `areaDelta` (optional), `area_delta` (optional), `attribution` (required), `cls_shifts` (optional), `current` (optional), `current_rect` (optional), `deviceType` (required), `distanceMoved` (optional), `distance_moved` (optional), `dx` (optional), `dy` (optional), `element` (optional), `elements` (optional), `impact` (optional), `involved_elements` (optional), `largestShiftTarget` (optional), `loadState` (optional), `load_state` (optional), `name` (required), `previous` (optional), `previous_rect` (optional), `rect` (optional), `shift` (optional), `shifts` (optional), `target` (optional), `time` (optional), `time_ms` (optional), `timestamp` (required), `type` (required), `value` (required), `viewportRatio` (optional), `viewport_ratio` (optional) | `supabase/migrations/20261124062734_canonical_retained_diagnostic_readers.sql:3` |
| `rum_inp_interactions` | `client-info`, `web-vital` | `attribution` (required), `deviceType` (required), `eventType` (optional), `event_type` (optional), `inp` (optional), `inputDelay` (optional), `input_delay_ms` (optional), `loaf` (optional), `name` (required), `presentationDelay` (optional), `presentation_ms` (optional), `processingDuration` (optional), `processing_ms` (optional), `rating` (required), `scripts` (optional), `sourceURL` (optional), `target` (optional), `timestamp` (required), `type` (required), `url` (optional), `value` (required) | `supabase/migrations/20261124062734_canonical_retained_diagnostic_readers.sql:101` |
| `rum_lcp_candidates` | `client-info` | `attribution` (required), `decodedBodySize` (required), `deviceMemory` (required), `deviceType` (required), `elementRenderDelay` (optional), `family` (optional), `fetchPriority` (legacy-only), `font` (optional), `fontData` (optional), `height` (optional), `isLazy` (optional), `lcp` (optional), `rating` (required), `render_blockers` (optional), `resourceLoadDelay` (optional), `resourceLoadDuration` (optional), `size` (optional), `target` (optional), `timeToFirstByte` (required), `transferSize` (required), `transfer_bytes` (optional), `type` (required), `url` (optional), `value` (required), `weight` (optional), `width` (optional) | `supabase/migrations/20261124062156_canonical_retained_lcp_readers.sql:4` |
| `rum_lcp_candidates` | `client-info`, `web-vital` | `attribution` (required), `decodedBodySize` (required), `deviceMemory` (required), `deviceType` (required), `elementRenderDelay` (optional), `family` (optional), `fetchPriority` (legacy-only), `font` (optional), `fontData` (optional), `height` (optional), `isLazy` (optional), `lcp` (optional), `name` (required), `rating` (required), `render_blockers` (optional), `resourceLoadDelay` (optional), `resourceLoadDuration` (optional), `size` (optional), `target` (optional), `timeToFirstByte` (required), `timestamp` (required), `transferSize` (required), `transfer_bytes` (optional), `type` (required), `url` (optional), `value` (required), `weight` (optional), `width` (optional) | `supabase/migrations/20261124123405_fix_retained_reader_production_errors.sql:655` |
| `rum_metric_readings` | `client-info`, `web-vital` | `connection` (optional), `deviceType` (required), `effectiveType` (optional), `name` (required), `rating` (required), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20261124060651_canonical_retained_aggregate_readers.sql:5` |
| `third_party_domains` | `client-info`, `third-party-asset-summary` | `deviceType` (required), `domains` (optional), `sessionId` (legacy-only), `type` (required) | `supabase/migrations/20240101000001_base_functions.sql:2976` |
| `traffic_source` | `client-info` | `deviceType` (required), `type` (required) | `supabase/migrations/20240101000001_base_functions.sql:3127` |
| `ttfb_contributors` | `client-info`, `geo-info`, `origin-info` | `attribution` (required), `connection` (optional), `country` (required), `deviceType` (required), `dnsLookup` (required), `downlink` (optional), `name` (required), `org` (required), `originHit` (required), `requestStart` (optional), `rtt` (optional), `siteDomain` (required), `tcpConnection` (optional), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:3161` |
| `ttfb_contributors` | `client-info`, `geo-info`, `origin-info`, `web-vital` | `attribution` (required), `connection` (optional), `country` (required), `deviceType` (required), `dnsLookup` (required), `downlink` (optional), `name` (required), `originHit` (required), `provider` (required), `requestStart` (optional), `rtt` (optional), `tcpConnection` (optional), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20261124062734_canonical_retained_diagnostic_readers.sql:309` |
| `ttfb_contributors` | `client-info`, `geo-info`, `origin-info`, `web-vital` | `attribution` (required), `connection` (optional), `country` (required), `deviceType` (required), `dnsLookup` (required), `downlink` (optional), `name` (required), `originHit` (required), `provider` (required), `requestStart` (optional), `rtt` (optional), `tcpConnection` (optional), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20261124123405_fix_retained_reader_production_errors.sql:839` |
| `ttfb_contributors` | `client-info`, `geo-info`, `origin-info`, `web-vital` | `attribution` (required), `connection` (optional), `country` (required), `deviceType` (required), `dnsLookup` (required), `downlink` (optional), `name` (required), `originHit` (required), `provider` (required), `requestStart` (optional), `rtt` (optional), `tcpConnection` (optional), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20261124125351_fix_remaining_retained_reader_errors.sql:193` |
| `user_happiness` | `client-info`, `geo-info`, `slow-api-call`, `tracker-detected`, `web-vital` | `country` (required), `deviceType` (required), `name` (required), `rating` (required), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:3238` |
| `user_happiness_dist` | `client-info`, `geo-info`, `web-vital` | `client` (optional), `country` (required), `device` (optional), `deviceType` (required), `name` (required), `rating` (required), `timestamp` (required), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:3587` |
| `ux_map_data` | `client-info`, `geo-info`, `web-vital` | `connection` (optional), `country` (required), `deviceType` (required), `effectiveType` (optional), `name` (required), `type` (required), `value` (required) | `supabase/migrations/20240101000001_base_functions.sql:3697` |
| `web_vitals` | `client-info`, `geo-info` | `country` (required), `deviceType` (required), `language` (required), `type` (required) | `supabase/migrations/20240101000001_base_functions.sql:3806` |

## Application callers

| Function | Source |
| :--- | :--- |
| `analyze_fcp_by_device` | `src/app/api/rum/elements/fcp/route.ts:73` |
| `analyze_lcp_by_device` | `src/app/api/rum/elements/lcp/route.ts:18` |
| `cls_elements` | `src/app/api/rum/elements/cls/route.ts:37` |
| `cwv_dist_by_connection` | `src/app/api/rum/rum-web-vitals/group-by-connection/route.ts:20` |
| `font_analysis` | `src/app/api/rum/fonts/analysis/route.ts:18` |
| `get_lcp_image_metrics` | `src/app/api/rum/lcp-images/route.ts:24` |
| `get_rum_web_vitals_metrics` | `src/app/api/rum/rum-web-vitals/route.ts:73` |
| `get_web_vital_counts_by_url` | `src/app/api/rum/rum-web-vitals/group-by-page/route.ts:29` |
| `inp_elements` | `src/app/api/rum/elements/inp/route.ts:32` |
| `page_performance_analysis` | `src/app/api/rum/page_performance/route.ts:18` |
| `ttfb_contributors` | `src/app/api/rum/elements/ttfb/route.ts:24` |

## Collector event types not found in SQL readers

- `error`
- `errors`

## Classification

- **required**: currently emitted by the collector and read by at least one SQL reader.
- **optional**: read by a reader but not emitted by the current collector, or emitted only for a specialized branch.
- **legacy-only**: historical shape that the current collector does not emit, including event-level `sessionId`, `pageAddress`, and `origin-info`.
- **unused**: collector event type with no detected SQL reader.

## Product-boundary classification (ADR-0005)

### Retained and migrate to canonical v2

| Function | Reader type |
| :--- | :--- |
| `analyze_fcp_by_device` | Typed aggregate and filter |
| `analyze_lcp_by_device` | LCP element evidence |
| `cls_elements` | CLS element evidence |
| `cwv_dist_by_connection` | Typed aggregate and filter |
| `font_analysis` | LCP font evidence |
| `get_lcp_image_metrics` | LCP image evidence |
| `get_rum_web_vitals_metrics` | Typed aggregate and filter |
| `get_web_vital_counts_by_url` | Typed aggregate and filter |
| `inp_elements` | INP element evidence |
| `page_performance_analysis` | Typed facts and canonical evidence |
| `ttfb_contributors` | Typed navigation, geography, and network facts |

### Retired with their product surfaces

| Function | Retired surface |
| :--- | :--- |
| `recent_requests` | Trace |
| `traffic_source` | Generic Analytics |
| `get_daily_web_metrics` | Generic Analytics |
| `user_happiness_dist` | Generic Analytics |
| `ux_map_data` | Global UX |
| `analyze_web_vitals_by_page` | Unused legacy reader |
| `cache_analysis` | Unused legacy reader |
| `get_ai_citation` | Unused legacy reader |
| `get_analytics_by_device_and_country` | Unused legacy reader |
| `get_web_vitals_metrics` | Unused legacy reader |
| `lcp_attribution_by_device` | Unused legacy reader |
| `third_party_domains` | Unused legacy reader |
| `top_landing_page` | Unused legacy reader |
| `user_happiness` | Unused legacy reader |
| `web_vitals` | Unused legacy reader |
| `refresh_rum_daily_distributions` | Replaced by canonical raw-fact distributions |

Historical SQL definitions remain visible in this inventory because migrations are append-only. Application callers are the authoritative signal for whether a reader is still active.
