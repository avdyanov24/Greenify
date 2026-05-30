import { latLngToCell, gridDisk, cellToBoundary } from "h3-js";

const RESOLUTION = 9;

export const getHexIndex = (latitude: number, longitude: number): string => {
  return latLngToCell(latitude, longitude, RESOLUTION);
};

export const getNeighboringHexes = (h3Index: string): string[] => {
  return gridDisk(h3Index, 1).filter((hex) => hex !== h3Index);
};

export const calculateDensityMultiplier = (plantCount: number): number => {
  if (plantCount <= 10) return 3;
  if (plantCount <= 30) return 2;
  return 1;
};

export const getHexBoundary = (h3Index: string): [number, number][] => {
  return cellToBoundary(h3Index);
};

export const areHexesContiguous = (_hexIndices: string[]): boolean => {
  return true;
};
