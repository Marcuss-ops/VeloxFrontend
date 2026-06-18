export type ManagerChannel = {
  id: string;
  title?: string;
  name?: string;
  thumbnail?: string;
  language?: string;
};

export type ManagerGroup = {
  name?: string;
  channels?: ManagerChannel[];
};

export type ManagerGroupsResponse = {
  ok?: boolean;
  groups?: Record<string, ManagerGroup> | ManagerGroup[];
};

export function normalizeManagerGroups(groups: ManagerGroupsResponse['groups']): ManagerGroup[] {
  if (!groups) return [];

  const entries = Array.isArray(groups)
    ? groups.map(group => [group.name || '', group] as const)
    : Object.entries(groups);

  return entries
    .filter(([groupName]) => Boolean(groupName))
    .map(([groupName, group]) => ({
      name: group.name || groupName,
      channels: Array.isArray(group.channels) ? group.channels : [],
    }))
    .filter(group => Boolean(group.name))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export function normalizeManagerGroupsToRecord(groups: ManagerGroupsResponse['groups']): Record<string, ManagerGroup> {
  return Object.fromEntries(
    normalizeManagerGroups(groups).map(group => [String(group.name || '').trim(), group] as const)
      .filter(([name]) => Boolean(name))
  );
}

export function flattenManagerChannels(groups: ManagerGroupsResponse['groups']): ManagerChannel[] {
  const seen = new Map<string, ManagerChannel>();
  for (const group of normalizeManagerGroups(groups)) {
    for (const channel of group.channels || []) {
      if (!channel?.id || seen.has(channel.id)) continue;
      seen.set(channel.id, channel);
    }
  }
  return Array.from(seen.values());
}
