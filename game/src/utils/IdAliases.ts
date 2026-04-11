// Central compatibility layer for legacy MVP ids that still exist in saves.

const BUILDING_ID_ALIASES: Record<string, string> = {
  storage: 'storage_food',
  npcFisher1: 'training_center',
};

const RESOURCE_ID_ALIASES: Record<string, string> = {
  oak_wood: 'wood_oak',
  beech_wood: 'wood_beech',
  iron_ore: 'ore_iron',
  fly: 'fly_lure',
};

const RESOURCE_LEGACY_IDS: Record<string, string[]> = Object.entries(RESOURCE_ID_ALIASES)
  .reduce<Record<string, string[]>>((acc, [legacyId, canonicalId]) => {
    acc[canonicalId] = [...(acc[canonicalId] ?? []), legacyId];
    return acc;
  }, {});

export const resolveBuildingId = (id: string): string => BUILDING_ID_ALIASES[id] ?? id;

export const getBuildingAliasIds = (id: string): string[] => {
  const canonicalId = resolveBuildingId(id);
  return [canonicalId, ...Object.entries(BUILDING_ID_ALIASES)
    .filter(([, target]) => target === canonicalId)
    .map(([legacyId]) => legacyId)];
};

export const resolveResourceId = (id: string): string => RESOURCE_ID_ALIASES[id] ?? id;

export const getResourceAliasIds = (id: string): string[] => {
  const canonicalId = resolveResourceId(id);
  return [canonicalId, ...(RESOURCE_LEGACY_IDS[canonicalId] ?? [])];
};

export const getResourceAmount = (resources: Record<string, number> | undefined, resourceId: string): number => {
  if (!resources) return 0;
  for (const id of getResourceAliasIds(resourceId)) {
    const amount = resources[id];
    if (typeof amount === 'number') return amount;
  }
  return 0;
};

export const spendResourceAmount = (
  resources: Record<string, number> | undefined,
  resourceId: string,
  amount: number,
): boolean => {
  if (!resources) return false;
  for (const id of getResourceAliasIds(resourceId)) {
    const current = resources[id] ?? 0;
    if (current >= amount) {
      resources[id] = current - amount;
      return true;
    }
  }
  return false;
};

export const addResourceAmount = (
  resources: Record<string, number>,
  resourceId: string,
  amount: number,
): void => {
  const canonicalId = resolveResourceId(resourceId);
  resources[canonicalId] = (resources[canonicalId] ?? 0) + amount;
};
