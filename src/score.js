import { CONFIG } from './config.js';

export function scoreOf(game) {
  const { score } = CONFIG;
  return (
    Math.floor(game.distance / score.metersPerPoint)
    + game.collected * score.perBone
    + game.rescued * score.perDog
    + (game.stopPoints || 0)
  );
}

export function missionStatus(game) {
  return CONFIG.missions.map((mission) => {
    const value = metricValue(game, mission.metric);
    return { ...mission, value, done: value >= mission.target };
  });
}

function metricValue(game, metric) {
  if (metric === 'dogs') return game.rescued;
  if (metric === 'bones') return game.collected;
  if (metric === 'distance') return game.distance;
  return 0;
}
