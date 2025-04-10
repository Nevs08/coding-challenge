import type { MissionData } from "./interfaces/missiondata.interface";
import type { Coordinate, NamedCoordinate } from "./interfaces/coordinate.interface";

/**
 * The routePlanner class calculates optimized drone routes and the perfect starting point.
 * It accounts for multiple variables.
 * A route may include multiple legs (flights), each constrained by the drone's endurance.
 */
export class routePlanner {
    // Default constants 
    SPEED_M_PER_S: number = 15; // Flight speed in meters per second
    SURVEY_TIME_S: number = 600; // Time spent surveying each point (in seconds)
    MAX_FLIGHT_TIME_S: number = 2400; // Maximum flight duration before return (in seconds)
    CHARGING_TIME_S: number = 2100; // Charging or break time between legs (in seconds)
    MISSION_RADIUS_M: number = 10000; // Max distance from start point (in meters)
    CUSTOM_START_CORD: Coordinate = null; // Optional fixed start coordinate

    constructor(missionData: MissionData) {
        this.SPEED_M_PER_S = missionData.SPEED_M_PER_S;
        this.SURVEY_TIME_S = missionData.SURVEY_TIME_S;
        this.MAX_FLIGHT_TIME_S = missionData.MAX_FLIGHT_TIME_S;
        this.CHARGING_TIME_S = missionData.CHARGING_TIME_S;
        this.MISSION_RADIUS_M = missionData.MISSION_RADIUS_M;
    }

    /**
     * Main entry point: Computes the full drone route plan.
     * 
     * @param coords - Array of target coordinates with names
     * @param customStart - Optional custom start coordinate
     * @returns Route result containing legs, removed points, total duration, etc.
     */
    public runPlanner(coords: NamedCoordinate[], customStart?: Coordinate): any {
        let updatedCoords: NamedCoordinate[];
        let startIdx = 0;
        let route: number[][];
        let duration: number;
        let distance: number;
        let startPoint: Coordinate;
        let removedPoints: NamedCoordinate[] = [];

        // Determine start point: use custom if provided, otherwise calculate centroid
        if (customStart) {
            startPoint = customStart;
            updatedCoords = [{ name: "Custom startpoint", ...customStart }, ...coords];
        } else {
            const centroid = coords.reduce(
                (acc, c) => ({ lat: acc.lat + c.lat, lon: acc.lon + c.lon }),
                { lat: 0, lon: 0 }
            );
            centroid.lat /= coords.length;
            centroid.lon /= coords.length;
            startPoint = centroid;
            updatedCoords = [{ name: "Calculated best dock location", ...centroid }, ...coords];
        }

        // Filter out points that exceed the mission radius from the start point
        updatedCoords = updatedCoords.filter((coord, idx) => {
            const dist = this.haversineDistance(startPoint, coord);
            if (dist > this.MISSION_RADIUS_M && idx !== 0) {
                removedPoints.push(coord);
                return false;
            }
            return true;
        });

        let distanceMatrix = this.createDistanceMatrix(updatedCoords);
        let maxAttempts = updatedCoords.length - 1;

        // Try to build a valid route; fallback by removing unreachable points one by one
        while (maxAttempts-- > 0) {
            try {
                route = this.planFullRoute(startIdx, updatedCoords, distanceMatrix);
                const result = this.getRouteDurationAndDistance(route, updatedCoords, startIdx, distanceMatrix);
                duration = result.duration;
                distance = result.distance;
                break;
            } catch (e) {
                const candidates = updatedCoords.slice(1);
                let found = false;

                for (const candidate of candidates) {
                    const testCoords = updatedCoords.filter(c => c !== candidate);
                    const testMatrix = this.createDistanceMatrix(testCoords);

                    try {
                        this.planFullRoute(startIdx, testCoords, testMatrix);
                        updatedCoords = testCoords;
                        removedPoints.push(candidate);
                        distanceMatrix = testMatrix;
                        found = true;
                        break;
                    } catch (_) {
                        continue;
                    }
                }

                if (!found) {
                    return {
                        success: false,
                        error: "No valid route possible after removing all candidates.",
                        removedPoints
                    };
                }
            }
        }

        if (!route) {
            return {
                success: false,
                error: "There is no possible route.",
                removedPoints
            };
        }

        const output = this.buildRouteOutput(route, updatedCoords, startIdx, distanceMatrix);

        return {
            success: true,
            startPoint: updatedCoords[startIdx],
            totalDuration: duration,
            totalDistance: distance,
            removedPoints,
            legs: output
        };
    }

    /** Converts degrees to radians */
    private toRad(deg: number): number {
        return (deg * Math.PI) / 180;
    }

    /** Calculates haversine distance (in meters) between two GPS coordinates */
    private haversineDistance(a: Coordinate, b: Coordinate): number {
        const R = 6371e3; // Earth's radius in meters
        const dLat = this.toRad(b.lat - a.lat);
        const dLon = this.toRad(b.lon - a.lon);
        const lat1 = this.toRad(a.lat);
        const lat2 = this.toRad(b.lat);

        const aCalc =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
        return R * c;
    }

    /** Generates a matrix with pairwise distances between all coordinates */
    private createDistanceMatrix(coords: Coordinate[]): number[][] {
        const matrix: number[][] = Array.from({ length: coords.length }, () => new Array(coords.length).fill(0));
        for (let i = 0; i < coords.length; i++) {
            for (let j = 0; j < coords.length; j++) {
                matrix[i][j] = i === j ? 0 : this.haversineDistance(coords[i], coords[j]);
            }
        }
        return matrix;
    }

    /** Converts distance into flight time */
    private computeTravelTime(distance: number): number {
        return distance / this.SPEED_M_PER_S;
    }

    /** Checks if a point can be added to a leg without exceeding max flight time */
    private canAddToLeg(currentTime: number, travelTime: number, returnTime: number): boolean {
        return currentTime + travelTime + this.SURVEY_TIME_S + returnTime <= this.MAX_FLIGHT_TIME_S;
    }

    /**
     * Plans one flight leg by greedily visiting as many reachable points as possible
     */
    private planLeg(startIdx: number, unvisited: Set<number>, distanceMatrix: number[][]): number[] {
        const leg: number[] = [];
        let timeUsed = 0;
        let current = startIdx;

        while (true) {
            let next: number | null = null;
            let shortestTime = Infinity;

            for (const idx of unvisited) {
                const travelTime = this.computeTravelTime(distanceMatrix[current][idx]);
                const returnTime = this.computeTravelTime(distanceMatrix[idx][startIdx]);

                if (this.canAddToLeg(timeUsed, travelTime, returnTime) && travelTime < shortestTime) {
                    next = idx;
                    shortestTime = travelTime;
                }
            }

            if (next === null) break;

            const travel = this.computeTravelTime(distanceMatrix[current][next]);
            timeUsed += travel + this.SURVEY_TIME_S;
            leg.push(next);
            unvisited.delete(next);
            current = next;
        }

        return leg;
    }

    /**
     * Plans a complete route consisting of multiple flight legs
     * Throws an error if some points are unreachable
     */
    private planFullRoute(startIdx: number, coords: NamedCoordinate[], distanceMatrix: number[][]): number[][] {
        const unvisited = new Set<number>(coords.map((_, i) => i));
        unvisited.delete(startIdx);

        const route: number[][] = [];

        while (unvisited.size > 0) {
            const leg = this.planLeg(startIdx, unvisited, distanceMatrix);
            if (leg.length === 0) throw new Error("Some points are not reachable.");
            route.push(leg);
        }

        return route;
    }

    /** Calculates total route time and distance, including returns and charging times */
    private getRouteDurationAndDistance(
        route: number[][],
        coords: NamedCoordinate[],
        startIdx: number,
        distanceMatrix: number[][]
    ): { duration: number, distance: number } {
        let totalTime = 0;
        let totalDistance = 0;
        let current = startIdx;

        for (const leg of route) {
            for (const next of leg) {
                const dist = distanceMatrix[current][next];
                const toNext = this.computeTravelTime(dist);
                totalTime += toNext + this.SURVEY_TIME_S;
                totalDistance += dist;
                current = next;
            }

            const toBase = distanceMatrix[current][startIdx];
            const toBaseTime = this.computeTravelTime(toBase);
            totalTime += toBaseTime + this.CHARGING_TIME_S;
            totalDistance += toBase;
            current = startIdx;
        }

        return { duration: totalTime, distance: totalDistance };
    }

    /**
     * Converts a raw route into a structured output format containing legs and stops
     */
    private buildRouteOutput(
        route: number[][],
        coords: NamedCoordinate[],
        startIdx: number,
        distanceMatrix: number[][]
    ) {
        const output = [];
        let current = startIdx;
        let index = 1;
        let globalStopIndex = 1;

        for (const leg of route) {
            let legDistance = 0;
            let legTime = 0;
            const stops = [];

            for (const next of leg) {
                const dist = distanceMatrix[current][next];
                const time = this.computeTravelTime(dist);
                legDistance += dist;
                legTime += time + this.SURVEY_TIME_S;

                stops.push({
                    stopIndex: globalStopIndex++,
                    name: coords[next].name,
                    lat: coords[next].lat,
                    lon: coords[next].lon,
                    distance: dist,
                    flightTime: time,
                    surveyTime: this.SURVEY_TIME_S
                });

                current = next;
            }

            const returnDist = distanceMatrix[current][startIdx];
            const returnTime = this.computeTravelTime(returnDist);
            legDistance += returnDist;
            legTime += returnTime + this.CHARGING_TIME_S;

            stops.push({
                stopIndex: globalStopIndex++,
                name: "Dock",
                lat: coords[startIdx].lat,
                lon: coords[startIdx].lon,
                distance: returnDist,
                flightTime: returnTime,
                chargingTime: this.CHARGING_TIME_S
            });

            output.push({
                legIndex: index++,
                duration: legTime,
                distance: legDistance,
                returnToHome: {
                    distance: returnDist,
                    flightTime: returnTime,
                    chargingTime: this.CHARGING_TIME_S
                },
                stops
            });

            current = startIdx;
        }

        return output;
    }
}
