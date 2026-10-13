import { CONFIG } from './config.js';

export const PX_TO_WORLD = 0.03;
export const ROAD_WIDTH_PX = CONFIG.road.right - CONFIG.road.left;
export const ROAD_HALF_WORLD = (ROAD_WIDTH_PX / 2) * PX_TO_WORLD;
export const VAN_DEPTH_PX = CONFIG.van.screenY;
export const ROAD_CENTER_PX = (CONFIG.road.left + CONFIG.road.right) / 2;

export function worldXOf(px, width = 0) {
  // The camera looks along +Z, whose screen-right axis is world -X.
  // Flip the mapping so a right-lane move is visibly right on screen.
  return -(px + width / 2 - ROAD_CENTER_PX) * PX_TO_WORLD;
}

export function worldZOf(y) {
  return (VAN_DEPTH_PX - y) * PX_TO_WORLD;
}

export function vanWorldX(game) {
  return worldXOf(game.van.x, game.van.width);
}

export const LANE_COUNT = CONFIG.lanes.count;
export const LANE_WIDTH_PX = ROAD_WIDTH_PX / LANE_COUNT;
export const RESCUE_LANE = LANE_COUNT - 1; // rightmost road lane contains the dog stop bays

export function laneBounds(index) {
  const left = CONFIG.road.left + LANE_WIDTH_PX * index;
  return { left, right: left + LANE_WIDTH_PX, center: left + LANE_WIDTH_PX / 2 };
}

export function laneVanX(index) {
  return laneBounds(index).center - CONFIG.van.width / 2;
}

export function clampLane(index) {
  return Math.min(LANE_COUNT, Math.max(0, index));
}

export function clampDrivingLane(index) {
  return Math.min(LANE_COUNT - 1, Math.max(0, index));
}

// Coordinates for the rightmost road lane and its stop bays.
export const RESCUE_LANE_LEFT_PX = CONFIG.road.left + LANE_WIDTH_PX * RESCUE_LANE;
export const RESCUE_LANE_RIGHT_PX = CONFIG.road.right;

export function rescueLaneXRangePx() {
  return { left: RESCUE_LANE_LEFT_PX, right: RESCUE_LANE_RIGHT_PX };
}
