export interface Coordinate {
    lat: number;
    lon: number;
  }

export type NamedCoordinate = Coordinate & { name: string };