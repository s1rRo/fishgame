// ============================================================
// HEX GRID UTILITY — Pointy-top, Offset Coords (odd-q)
// Математика hex-сетки для FarmScene (Clash of Clans стиль)
// ============================================================

/** Hex coordinate pair */
export interface HexCoord { q: number; r: number; }

/** Cube coordinate for internal math */
interface CubeCoord { x: number; y: number; z: number; }

// ── CONSTANTS ──────────────────────────────────────────────────
export const HEX_RADIUS = 1.0;                         // center → vertex
export const HEX_WIDTH  = Math.sqrt(3) * HEX_RADIUS;   // ~1.732
export const HEX_HEIGHT = 2 * HEX_RADIUS;              // 2.0
export const FARM_COLS  = 30;
export const FARM_ROWS  = 26;

// ── COORD CONVERSIONS ──────────────────────────────────────────

/** Offset (odd-q) → world XZ */
export function hexToWorld(q: number, r: number): { x: number; z: number } {
  const x = q * HEX_WIDTH * 0.75 * 2;  // pointy-top horizontal spacing
  const z = r * HEX_HEIGHT * 0.75 + (q % 2 !== 0 ? HEX_HEIGHT * 0.375 : 0);
  return { x, z };
}

/** World XZ → nearest hex (offset odd-q) */
export function worldToHex(wx: number, wz: number): HexCoord {
  // Inverse of hexToWorld via fractional cube coords
  const q_frac = wx / (HEX_WIDTH * 0.75 * 2);
  const r_frac = (wz - (Math.round(q_frac) % 2 !== 0 ? HEX_HEIGHT * 0.375 : 0)) / (HEX_HEIGHT * 0.75);
  // Brute-force nearest among candidate hexes
  const q0 = Math.round(q_frac);
  const r0 = Math.round(r_frac);
  let best: HexCoord = { q: q0, r: r0 };
  let bestDist = Infinity;
  for (let dq = -1; dq <= 1; dq++) {
    for (let dr = -1; dr <= 1; dr++) {
      const cq = q0 + dq;
      const cr = r0 + dr;
      const w = hexToWorld(cq, cr);
      const dist = (w.x - wx) ** 2 + (w.z - wz) ** 2;
      if (dist < bestDist) { bestDist = dist; best = { q: cq, r: cr }; }
    }
  }
  return best;
}

/** Hex key string for Map/Firestore */
export function hexKey(q: number, r: number): string { return `${q},${r}`; }

/** Parse hex key */
export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

// ── OFFSET ↔ CUBE ─────────────────────────────────────────────

function offsetToCube(q: number, r: number): CubeCoord {
  const cx = q;
  const cz = r - (q - (q & 1)) / 2;
  const cy = -cx - cz;
  return { x: cx, y: cy, z: cz };
}

function cubeToOffset(cx: number, _cy: number, cz: number): HexCoord {
  const q = cx;
  const r = cz + (cx - (cx & 1)) / 2;
  return { q, r };
}

// ── NEIGHBORS & DISTANCE ──────────────────────────────────────

const EVEN_Q_DIRS = [
  [+1,  0], [+1, -1], [ 0, -1],
  [-1, -1], [-1,  0], [ 0, +1],
];
const ODD_Q_DIRS = [
  [+1, +1], [+1,  0], [ 0, -1],
  [-1,  0], [-1, +1], [ 0, +1],
];

/** Get 6 hex neighbors */
export function hexNeighbors(q: number, r: number): HexCoord[] {
  const dirs = (q & 1) === 0 ? EVEN_Q_DIRS : ODD_Q_DIRS;
  return dirs.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
}

/** Hex distance (in steps) */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = offsetToCube(a.q, a.r);
  const bc = offsetToCube(b.q, b.r);
  return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
}

/** All hexes within radius steps from center */
export function hexesInRadius(center: HexCoord, radius: number): HexCoord[] {
  const cc = offsetToCube(center.q, center.r);
  const result: HexCoord[] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = Math.max(-radius, -dx - radius); dy <= Math.min(radius, -dx + radius); dy++) {
      const dz = -dx - dy;
      const h = cubeToOffset(cc.x + dx, cc.y + dy, cc.z + dz);
      if (h.q >= 0 && h.q < FARM_COLS && h.r >= 0 && h.r < FARM_ROWS) {
        result.push(h);
      }
    }
  }
  return result;
}

// ── BUILDING FOOTPRINT ────────────────────────────────────────

/** Get all hexes occupied by a building anchored at (q,r) with size w×h */
export function buildingFootprint(q: number, r: number, w: number, h: number): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let dq = 0; dq < w; dq++) {
    for (let dr = 0; dr < h; dr++) {
      hexes.push({ q: q + dq, r: r + dr });
    }
  }
  return hexes;
}

// ── PLACEMENT VALIDATION ──────────────────────────────────────

import type { HexFarmState } from '../models/Player';

/** Check if building can be placed at (q,r) */
export function isValidPlacement(
  farm: HexFarmState,
  footprintW: number,
  footprintH: number,
  q: number,
  r: number,
  ignoreBuildingId?: string
): boolean {
  const hexes = buildingFootprint(q, r, footprintW, footprintH);
  const occupiedByBuildings = new Set<string>();
  for (const b of Object.values(farm.buildings)) {
    if (ignoreBuildingId && b.buildingId === ignoreBuildingId) continue;
    const fp = buildingFootprint(b.hexQ, b.hexR, footprintW, footprintH);
    fp.forEach(h => occupiedByBuildings.add(hexKey(h.q, h.r)));
  }

  for (const h of hexes) {
    // Out of bounds
    if (h.q < 0 || h.q >= FARM_COLS || h.r < 0 || h.r >= FARM_ROWS) return false;
    const key = hexKey(h.q, h.r);
    // Occupied by obstacle
    if (farm.obstacles[key]) return false;
    // Occupied by another building
    if (occupiedByBuildings.has(key)) return false;
    // Occupied by water (road is OK to build over)
  }
  return true;
}

// ── A* PATHFINDING ON ROADS ───────────────────────────────────

/** Find shortest path on road hexes using A* */
export function findPath(
  farm: HexFarmState,
  from: HexCoord,
  to: HexCoord
): HexCoord[] | null {
  const walkable = new Set(farm.roads);
  // Buildings and cleared hexes are also walkable endpoints
  for (const b of Object.values(farm.buildings)) {
    walkable.add(hexKey(b.hexQ, b.hexR));
  }

  const startKey = hexKey(from.q, from.r);
  const endKey = hexKey(to.q, to.r);
  if (startKey === endKey) return [from];

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();
  const openSet = new Set<string>();
  const closedSet = new Set<string>();

  gScore.set(startKey, 0);
  fScore.set(startKey, hexDistance(from, to));
  openSet.add(startKey);

  while (openSet.size > 0) {
    // Pick node with lowest fScore
    let currentKey = '';
    let lowestF = Infinity;
    for (const k of openSet) {
      const f = fScore.get(k) ?? Infinity;
      if (f < lowestF) { lowestF = f; currentKey = k; }
    }

    if (currentKey === endKey) {
      // Reconstruct path
      const path: HexCoord[] = [];
      let key: string | undefined = endKey;
      while (key) {
        path.unshift(parseHexKey(key));
        key = cameFrom.get(key);
      }
      return path;
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    const current = parseHexKey(currentKey);
    for (const n of hexNeighbors(current.q, current.r)) {
      const nKey = hexKey(n.q, n.r);
      if (closedSet.has(nKey)) continue;
      if (n.q < 0 || n.q >= FARM_COLS || n.r < 0 || n.r >= FARM_ROWS) continue;
      // Must be walkable (road/building) or the destination
      if (!walkable.has(nKey) && nKey !== endKey) continue;

      const tentG = (gScore.get(currentKey) ?? Infinity) + 1;
      if (tentG >= (gScore.get(nKey) ?? Infinity)) continue;

      cameFrom.set(nKey, currentKey);
      gScore.set(nKey, tentG);
      fScore.set(nKey, tentG + hexDistance(n, to));
      openSet.add(nKey);
    }
  }
  return null; // No path found
}
