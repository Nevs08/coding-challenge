import type { Coordinate, NamedCoordinate } from "./coordinate.interface";

export interface MissionData {
    SPEED_M_PER_S: number;
    MAX_FLIGHT_TIME_S: number;
    CHARGING_TIME_S: number;
    SURVEY_TIME_S: number;
    MISSION_RADIUS_M: number;
    CUSTOM_DOCK_LOCATION: Coordinate | null;
    coordinates: NamedCoordinate[];
}