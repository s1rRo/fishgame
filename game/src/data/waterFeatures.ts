// ============================================================
// WATER FEATURES — водоёмы Аргентины для snap-to-water
// Основные озёра и реки по 3 игровым биомам
// ============================================================

export interface WaterFeature {
  id: string;
  name: string;
  type: 'river' | 'lake';
  biomeId: string;
  /** Polyline of lat/lon points tracing the water body */
  points: Array<{ lat: number; lon: number }>;
}

export const WATER_FEATURES: WaterFeature[] = [
  // ── Биом 1: Río Salado (Пампа) ─────────────────────────
  {
    id: 'rio_salado_main', name: 'Río Salado', type: 'river', biomeId: 'rio_salado',
    points: [
      { lat: -34.0, lon: -61.0 }, { lat: -34.5, lon: -61.8 },
      { lat: -35.0, lon: -62.5 }, { lat: -35.5, lon: -63.2 },
      { lat: -36.0, lon: -63.8 }, { lat: -36.5, lon: -64.0 },
    ],
  },
  {
    id: 'laguna_mar_chiquita', name: 'Laguna Mar Chiquita', type: 'lake', biomeId: 'rio_salado',
    points: [
      { lat: -30.5, lon: -62.5 }, { lat: -30.3, lon: -62.8 },
      { lat: -30.7, lon: -63.0 }, { lat: -31.0, lon: -62.7 },
      { lat: -30.5, lon: -62.5 },
    ],
  },
  {
    id: 'rio_parana_south', name: 'Río Paraná (Sur)', type: 'river', biomeId: 'rio_salado',
    points: [
      { lat: -32.0, lon: -60.7 }, { lat: -33.0, lon: -60.5 },
      { lat: -34.0, lon: -59.5 }, { lat: -34.6, lon: -58.5 },
    ],
  },

  // ── Биом 2: Nahuel Huapi (Патагония северная) ───────────
  {
    id: 'lago_nahuel_huapi', name: 'Lago Nahuel Huapi', type: 'lake', biomeId: 'nahuel_huapi',
    points: [
      { lat: -41.0, lon: -71.2 }, { lat: -40.9, lon: -71.5 },
      { lat: -41.1, lon: -71.8 }, { lat: -41.3, lon: -71.6 },
      { lat: -41.2, lon: -71.3 }, { lat: -41.0, lon: -71.2 },
    ],
  },
  {
    id: 'lago_gutierrez', name: 'Lago Gutiérrez', type: 'lake', biomeId: 'nahuel_huapi',
    points: [
      { lat: -41.2, lon: -71.4 }, { lat: -41.15, lon: -71.45 },
      { lat: -41.25, lon: -71.5 }, { lat: -41.3, lon: -71.42 },
      { lat: -41.2, lon: -71.4 },
    ],
  },
  {
    id: 'rio_limay', name: 'Río Limay', type: 'river', biomeId: 'nahuel_huapi',
    points: [
      { lat: -41.1, lon: -71.3 }, { lat: -40.8, lon: -71.0 },
      { lat: -40.5, lon: -70.5 }, { lat: -40.0, lon: -70.0 },
    ],
  },

  // ── Биом 3: Lago Argentino (Патагония южная) ────────────
  {
    id: 'lago_argentino', name: 'Lago Argentino', type: 'lake', biomeId: 'lago_argentino',
    points: [
      { lat: -50.0, lon: -72.0 }, { lat: -49.8, lon: -72.5 },
      { lat: -50.2, lon: -73.0 }, { lat: -50.5, lon: -72.8 },
      { lat: -50.4, lon: -72.2 }, { lat: -50.0, lon: -72.0 },
    ],
  },
  {
    id: 'lago_viedma', name: 'Lago Viedma', type: 'lake', biomeId: 'lago_argentino',
    points: [
      { lat: -49.5, lon: -71.8 }, { lat: -49.3, lon: -72.2 },
      { lat: -49.6, lon: -72.5 }, { lat: -49.8, lon: -72.1 },
      { lat: -49.5, lon: -71.8 },
    ],
  },
  {
    id: 'rio_santa_cruz', name: 'Río Santa Cruz', type: 'river', biomeId: 'lago_argentino',
    points: [
      { lat: -50.3, lon: -72.3 }, { lat: -50.2, lon: -71.5 },
      { lat: -50.1, lon: -70.5 }, { lat: -50.0, lon: -69.5 },
      { lat: -50.1, lon: -68.5 },
    ],
  },
];

/**
 * Ближайшая точка воды к заданным координатам.
 * Возвращает null если нет воды в пороге.
 */
export function snapToNearestWater(
  lat: number,
  lon: number,
  threshold = 2.0, // градусы
): { lat: number; lon: number; featureId: string; distance: number } | null {
  let best: { lat: number; lon: number; featureId: string; distance: number } | null = null;

  for (const feature of WATER_FEATURES) {
    for (let i = 0; i < feature.points.length - 1; i++) {
      const p1 = feature.points[i];
      const p2 = feature.points[i + 1];
      const closest = closestPointOnSegment(lat, lon, p1.lat, p1.lon, p2.lat, p2.lon);
      const dist = Math.sqrt((closest.lat - lat) ** 2 + (closest.lon - lon) ** 2);

      if (dist <= threshold && (!best || dist < best.distance)) {
        best = { lat: closest.lat, lon: closest.lon, featureId: feature.id, distance: dist };
      }
    }
  }

  return best;
}

/** Проверка близости к воде */
export function isNearWater(lat: number, lon: number, threshold = 2.0): boolean {
  return snapToNearestWater(lat, lon, threshold) !== null;
}

/** Все водоёмы конкретного биома */
export function getWaterFeaturesByBiome(biomeId: string): WaterFeature[] {
  return WATER_FEATURES.filter(w => w.biomeId === biomeId);
}

// ── Утилита: ближайшая точка на отрезке ─────────────────────
function closestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): { lat: number; lon: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { lat: ax, lon: ay };

  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  return { lat: ax + t * dx, lon: ay + t * dy };
}
