// ============================================================
// ARGENTINA SYSTEM — границы, биомы, проверка конфликтов
// Только Аргентина доступна в MVP v1.0
// ============================================================
import * as THREE from 'three';

export const ARGENTINA_BOUNDS = {
  latMin: -55,
  latMax: -21,
  lonMin: -73,
  lonMax: -53,
};

export const PLAYABLE_BIOMES = [
  { id: 'rio_salado',     level: 1, lat: -35.5, lon: -63.2, name: 'Río Salado' },
  { id: 'nahuel_huapi',   level: 2, lat: -41.1, lon: -71.4, name: 'Nahuel Huapi' },
  { id: 'lago_argentino', level: 3, lat: -50.3, lon: -72.3, name: 'Lago Argentino' },
] as const;

export interface MapObject {
  lat: number;
  lon: number;
  level?: number;
  type: string;
}

/** Проверяет находится ли точка внутри границ Аргентины */
export function isInArgentinaBounds(lat: number, lon: number): boolean {
  return (
    lat >= ARGENTINA_BOUNDS.latMin &&
    lat <= ARGENTINA_BOUNDS.latMax &&
    lon >= ARGENTINA_BOUNDS.lonMin &&
    lon <= ARGENTINA_BOUNDS.lonMax
  );
}

/**
 * Радиус территории деревни по формуле из тз/11_GAME_CONFIGS.md:
 * territoryRadius = baseRadius × (1 + villageLevel × 0.15) × (1 + buildings × 0.08)
 * baseRadius: L1=0.5°, L2=0.4°, L3=0.3°
 */
const BASE_RADIUS: Record<number, number> = { 1: 0.5, 2: 0.4, 3: 0.3 };

export function calcTerritoryRadius(
  biomeLevel: number,
  villageLevel: number,
  buildingCount: number = 0
): number {
  const base = BASE_RADIUS[biomeLevel] ?? 0.5;
  return base * (1 + villageLevel * 0.15) * (1 + buildingCount * 0.08);
}

/**
 * Проверяет конфликт с существующими деревнями.
 */
export function checkVillageConflict(
  existing: MapObject[],
  lat: number,
  lon: number,
  biomeLevel: number = 1
): boolean {
  return existing.some(v => {
    const r = calcTerritoryRadius(biomeLevel, v.level || 1);
    return Math.sqrt((v.lat - lat) ** 2 + (v.lon - lon) ** 2) < r;
  });
}

/** Конвертация lat/lon → позиция на сфере Three.js (радиус по умолчанию 4) */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number = 4
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** Обратная конвертация: Vector3 → lat/lon */
export function vector3ToLatLon(
  pos: THREE.Vector3,
  radius: number = 4
): { lat: number; lon: number } {
  const normalized = pos.clone().normalize();
  const lat = 90 - Math.acos(normalized.y) * (180 / Math.PI);
  const lon =
    -(Math.atan2(-normalized.z, -normalized.x) * (180 / Math.PI)) - 180;
  return { lat, lon: lon < -180 ? lon + 360 : lon > 180 ? lon - 360 : lon };
}
