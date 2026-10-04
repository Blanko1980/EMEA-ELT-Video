import personalRaw from "../data/personal.json";

const groups = (personalRaw as unknown as { peopleGroups: Record<string, { rows: number[]; labels: string[] }> }).peopleGroups;

export const PEOPLE_ORDER = ["teachers", "waves", "tenth"];
// Seconds between pops: icons arrive faster with every wave.
const POP = [0.045, 0.035, 0.025, 0.02, 0.016];

export type PeopleRow = { count: number; label: string; start: number; pop: number; active: boolean; index: number };

// Rows shown for the active group (earlier groups are already complete). Times are seconds since the event started.
export const peopleRows = (group: string): PeopleRow[] => {
  const gi = PEOPLE_ORDER.indexOf(group);
  const rows: PeopleRow[] = [];
  let index = 0;
  PEOPLE_ORDER.slice(0, gi + 1).forEach((g) => {
    const def = groups[g];
    let start = 0.2;
    def.rows.forEach((count, i) => {
      const pop = POP[Math.min(index, POP.length - 1)];
      rows.push({ count, label: def.labels[i] ?? "", start, pop, active: g === group, index });
      start += count * pop + 0.35;
      index++;
    });
  });
  return rows;
};
