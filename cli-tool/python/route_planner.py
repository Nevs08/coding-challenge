from typing import List, Dict, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2
from dataclasses import dataclass


@dataclass
class Coordinate:
    """
    Represents a basic geographical coordinate.
    """
    lat: float
    lon: float


@dataclass
class NamedCoordinate(Coordinate):
    """
    Represents a coordinate with a name (used for stops in the route).
    """
    name: str


@dataclass
class MissionData:
    """
    Represents configuration settings for the route planning mission.
    """
    SPEED_M_PER_S: float
    SURVEY_TIME_S: int
    MAX_FLIGHT_TIME_S: int
    CHARGING_TIME_S: int
    MISSION_RADIUS_M: float


class RoutePlanner:
    """
    The RoutePlanner class calculates an optimal set of drone flight routes (legs)
    based on a list of coordinates and mission constraints such as speed, flight time, etc.
    """

    def __init__(self, mission_data: MissionData):
        """
        Initializes the planner with mission parameters.
        """
        self.SPEED_M_PER_S = mission_data.SPEED_M_PER_S
        self.SURVEY_TIME_S = mission_data.SURVEY_TIME_S
        self.MAX_FLIGHT_TIME_S = mission_data.MAX_FLIGHT_TIME_S
        self.CHARGING_TIME_S = mission_data.CHARGING_TIME_S
        self.MISSION_RADIUS_M = mission_data.MISSION_RADIUS_M

    def run_planner(self, coords: List[NamedCoordinate], custom_start: Optional[Coordinate] = None) -> Dict:
        """
        Executes the route planning algorithm and returns a structured result.

        :param coords: List of coordinates to survey
        :param custom_start: Optional starting point for the drone
        :return: Dictionary containing the planning result, route, and diagnostics
        """
        removed_points = []

        # Determine starting point
        if custom_start:
            start_point = custom_start
            updated_coords = [NamedCoordinate(lat=custom_start.lat, lon=custom_start.lon, name="Custom startpoint")] + coords
        else:
            avg_lat = sum(c.lat for c in coords) / len(coords)
            avg_lon = sum(c.lon for c in coords) / len(coords)
            start_point = Coordinate(avg_lat, avg_lon)
            updated_coords = [NamedCoordinate(lat=avg_lat, lon=avg_lon, name="Calculated best dock location")] + coords

        # Filter out coordinates beyond allowed mission radius
        updated_coords = [
            c for i, c in enumerate(updated_coords)
            if i == 0 or self.haversine_distance(start_point, c) <= self.MISSION_RADIUS_M or removed_points.append(c)
        ]

        start_idx = 0
        distance_matrix = self.create_distance_matrix(updated_coords)
        max_attempts = len(updated_coords) - 1

        # Try route planning, remove unreachable points iteratively if needed
        while max_attempts > 0:
            try:
                route = self.plan_full_route(start_idx, updated_coords, distance_matrix)
                duration, distance = self.get_route_duration_and_distance(route, updated_coords, start_idx, distance_matrix)
                output = self.build_route_output(route, updated_coords, start_idx, distance_matrix)

                return {
                    "success": True,
                    "startPoint": updated_coords[start_idx],
                    "totalDuration": duration,
                    "totalDistance": distance,
                    "removedPoints": removed_points,
                    "legs": output
                }
            except Exception:
                candidates = updated_coords[1:]
                found = False

                for candidate in candidates:
                    test_coords = [c for c in updated_coords if c != candidate]
                    test_matrix = self.create_distance_matrix(test_coords)
                    try:
                        self.plan_full_route(start_idx, test_coords, test_matrix)
                        updated_coords = test_coords
                        distance_matrix = test_matrix
                        removed_points.append(candidate)
                        found = True
                        break
                    except Exception:
                        continue

                if not found:
                    return {
                        "success": False,
                        "error": "No valid route possible after removing all candidates.",
                        "removedPoints": removed_points
                    }

            max_attempts -= 1

        return {
            "success": False,
            "error": "There is no possible route.",
            "removedPoints": removed_points
        }

    def haversine_distance(self, a: Coordinate, b: Coordinate) -> float:
        """
        Calculates the haversine distance (in meters) between two geographic points.
        """
        R = 6371000  # Earth radius in meters
        d_lat = radians(b.lat - a.lat)
        d_lon = radians(b.lon - a.lon)
        lat1 = radians(a.lat)
        lat2 = radians(b.lat)

        a_calc = sin(d_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(d_lon / 2) ** 2
        c = 2 * atan2(sqrt(a_calc), sqrt(1 - a_calc))
        return R * c

    def create_distance_matrix(self, coords: List[Coordinate]) -> List[List[float]]:
        """
        Creates a 2D matrix of distances between all coordinate pairs.

        :param coords: List of coordinates
        :return: Distance matrix
        """
        return [
            [0 if i == j else self.haversine_distance(coords[i], coords[j]) for j in range(len(coords))]
            for i in range(len(coords))
        ]

    def compute_travel_time(self, distance: float) -> float:
        """
        Converts a distance (in meters) to travel time (in seconds).
        """
        return distance / self.SPEED_M_PER_S

    def can_add_to_leg(self, current_time: float, travel_time: float, return_time: float) -> bool:
        """
        Checks whether a point can be added to the current leg
        without exceeding the drone's max flight time.
        """
        return current_time + travel_time + self.SURVEY_TIME_S + return_time <= self.MAX_FLIGHT_TIME_S

    def plan_leg(self, start_idx: int, unvisited: set, distance_matrix: List[List[float]]) -> List[int]:
        """
        Plans a single leg of the flight using a greedy approach.

        :param start_idx: Index of the dock/start coordinate
        :param unvisited: Set of remaining point indices
        :param distance_matrix: Precomputed distance matrix
        :return: List of point indices visited in this leg
        """
        leg = []
        time_used = 0
        current = start_idx

        while True:
            next_point = None
            shortest_time = float("inf")

            for idx in unvisited:
                travel_time = self.compute_travel_time(distance_matrix[current][idx])
                return_time = self.compute_travel_time(distance_matrix[idx][start_idx])

                if self.can_add_to_leg(time_used, travel_time, return_time) and travel_time < shortest_time:
                    next_point = idx
                    shortest_time = travel_time

            if next_point is None:
                break

            travel = self.compute_travel_time(distance_matrix[current][next_point])
            time_used += travel + self.SURVEY_TIME_S
            leg.append(next_point)
            unvisited.remove(next_point)
            current = next_point

        return leg

    def plan_full_route(self, start_idx: int, coords: List[NamedCoordinate], distance_matrix: List[List[float]]) -> List[List[int]]:
        """
        Plans the full route including multiple legs until all points are visited.

        :raises: Exception if a valid route cannot be completed
        """
        unvisited = set(range(len(coords)))
        unvisited.remove(start_idx)
        route = []

        while unvisited:
            leg = self.plan_leg(start_idx, unvisited, distance_matrix)
            if not leg:
                raise Exception("Some points are not reachable.")
            route.append(leg)

        return route

    def get_route_duration_and_distance(
        self,
        route: List[List[int]],
        coords: List[NamedCoordinate],
        start_idx: int,
        distance_matrix: List[List[float]]
    ) -> Tuple[float, float]:
        """
        Calculates total flight time and distance across all legs.

        :return: Tuple (total_duration_in_seconds, total_distance_in_meters)
        """
        total_time = 0
        total_distance = 0
        current = start_idx

        for leg in route:
            for next_idx in leg:
                dist = distance_matrix[current][next_idx]
                total_time += self.compute_travel_time(dist) + self.SURVEY_TIME_S
                total_distance += dist
                current = next_idx

            return_dist = distance_matrix[current][start_idx]
            total_time += self.compute_travel_time(return_dist) + self.CHARGING_TIME_S
            total_distance += return_dist
            current = start_idx

        return total_time, total_distance

    def build_route_output(
        self,
        route: List[List[int]],
        coords: List[NamedCoordinate],
        start_idx: int,
        distance_matrix: List[List[float]]
    ) -> List[Dict]:
        """
        Builds the final structured output for all legs and stops.

        :return: List of dictionaries representing each leg
        """
        output = []
        current = start_idx
        index = 1
        global_stop_index = 1

        for leg in route:
            leg_distance = 0
            leg_time = 0
            stops = []

            for next_idx in leg:
                dist = distance_matrix[current][next_idx]
                time = self.compute_travel_time(dist)
                leg_distance += dist
                leg_time += time + self.SURVEY_TIME_S

                stops.append({
                    "stopIndex": global_stop_index,
                    "name": coords[next_idx].name,
                    "lat": coords[next_idx].lat,
                    "lon": coords[next_idx].lon,
                    "distance": dist,
                    "flightTime": time,
                    "surveyTime": self.SURVEY_TIME_S
                })

                global_stop_index += 1
                current = next_idx

            return_dist = distance_matrix[current][start_idx]
            return_time = self.compute_travel_time(return_dist)
            leg_distance += return_dist
            leg_time += return_time + self.CHARGING_TIME_S

            stops.append({
                "stopIndex": global_stop_index,
                "name": "Dock",
                "lat": coords[start_idx].lat,
                "lon": coords[start_idx].lon,
                "distance": return_dist,
                "flightTime": return_time,
                "chargingTime": self.CHARGING_TIME_S
            })

            global_stop_index += 1
            output.append({
                "legIndex": index,
                "duration": leg_time,
                "distance": leg_distance,
                "returnToHome": {
                    "distance": return_dist,
                    "flightTime": return_time,
                    "chargingTime": self.CHARGING_TIME_S
                },
                "stops": stops
            })

            current = start_idx
            index += 1

        return output