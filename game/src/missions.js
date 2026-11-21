// Story: Jax Marlowe, a getaway driver back in Solara Bay, owes $8,000 to fixer Rosa
// Delgado. Six jobs pay the debt off, one at a time. All names, places and story are original.
export const STORY = "Jax Marlowe came home to Solara Bay owing $8,000 to Rosa Delgado, the fixer who runs the garage in Old Town. Six jobs. No questions. Pay it off — or the Bay keeps you.";

export const MISSIONS = [
  {
    id: 'm1', title: 'JOB 1 — FIRST WHEELS', reward: 300,
    intro: "Rosa: 'My courier vanished. Get to my garage in Old Town and pick up the package. Drive — don't walk.'",
    objectives: [
      { text: 'Reach Rosa\'s Garage (yellow marker)', type: 'goto', x: 700, y: 1150, radius: 90 },
      { text: 'Deliver the package to City Hall', type: 'goto', x: 700, y: 350, radius: 90 },
    ],
  },
  {
    id: 'm2', title: 'JOB 2 — BEACH RUN', reward: 500,
    intro: "Rosa: 'A client left a briefcase on Solara Beach. Grab it, then drop it at the Marina. Cops watch the beach road — keep it clean.'",
    objectives: [
      { text: 'Collect the briefcase on Solara Beach', type: 'collect', x: 2950, y: 350, radius: 80 },
      { text: 'Deliver it to the Marina Yacht', type: 'goto', x: 2900, y: 1150, radius: 90 },
    ],
  },
  {
    id: 'm3', title: 'JOB 3 — FIVE DROPS', reward: 700,
    intro: "Rosa: 'Five cash drops are stashed around Downtown. Collect them all before the rival crew finds them.'",
    objectives: [
      { text: 'Collect cash drop 1/5 — Downtown', type: 'collect', x: 350, y: 350, radius: 80 },
      { text: 'Collect cash drop 2/5 — Downtown', type: 'collect', x: 1150, y: 350, radius: 80 },
      { text: 'Collect cash drop 3/5 — Downtown', type: 'collect', x: 350, y: 750, radius: 80 },
      { text: 'Collect cash drop 4/5 — Beachside', type: 'collect', x: 1950, y: 350, radius: 80 },
      { text: 'Collect cash drop 5/5 — Old Town', type: 'collect', x: 1150, y: 1150, radius: 80 },
    ],
  },
  {
    id: 'm4', title: 'JOB 4 — HOT PURSUIT', reward: 900,
    intro: "Rosa: 'The Bay Bank job went loud. Lose the cops and reach the Hideout in Palm Heights. Do NOT get busted.'",
    objectives: [
      { text: 'Get a wanted level — then lose the cops', type: 'escape', x: 0, y: 0, radius: 0 },
      { text: 'Reach the Hideout in Palm Heights', type: 'goto', x: 350, y: 2050, radius: 100 },
    ],
  },
  {
    id: 'm5', title: 'JOB 5 — HARBOR AMBUSH', reward: 1200,
    intro: "Rosa: 'The Vipers gang set up at the Harbor. Clear them out, then grab their stash. You have a pistol — use it.'",
    objectives: [
      { text: 'Defeat the Vipers gang at the Harbor (0/4)', type: 'combat', x: 2500, y: 1150, radius: 200, count: 4 },
      { text: 'Collect the gang stash', type: 'collect', x: 2500, y: 1150, radius: 80 },
    ],
  },
  {
    id: 'm6', title: 'JOB 6 — THE LAST GETAWAY', reward: 1500,
    intro: "Rosa: 'Last job. Grab the yacht keys at the Marina, then drive to the Hideout — the whole Bay PD will be on you. Finish this and the debt is gone.'",
    objectives: [
      { text: 'Grab the yacht keys at the Marina', type: 'collect', x: 2900, y: 1150, radius: 80 },
      { text: 'Escape to the Hideout — wanted level will rise', type: 'goto', x: 350, y: 2050, radius: 110 },
    ],
  },
];

export function createMissionState() {
  return { index: 0, obj: 0, active: false, startedAt: 0, escapeTimer: 0, combatKills: 0, message: '', messageT: 0, done: false };
}
export function currentMission(state) { return state.index < MISSIONS.length ? MISSIONS[state.index] : null; }
export function currentObjective(state) {
  const m = currentMission(state); return m ? m.objectives[state.obj] : null;
}
