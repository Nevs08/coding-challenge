import argparse
import json
from dataclasses import asdict
from route_planner import RoutePlanner, MissionData, NamedCoordinate, Coordinate


def parse_coordinates(file_path: str) -> list[NamedCoordinate]:
    """
    Reads coordinates from a text file and converts them into NamedCoordinate objects.

    Each line in the file should contain a latitude and longitude, separated by a comma.

    Example line: 51.1234,7.5678

    :param file_path: Path to the text file containing coordinates.
    :return: List of NamedCoordinate objects.
    """
    coords = []
    with open(file_path, "r") as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            try:
                lat_str, lon_str = line.split(",")
                coords.append(NamedCoordinate(name=f"Point {i+1}", lat=float(lat_str), lon=float(lon_str)))
            except ValueError:
                print(f"Skipping invalid line: {line}")
    return coords


def convert_to_serializable(obj):
    """
    Recursively converts dataclass-based objects into dictionaries/lists
    so they can be serialized to JSON.

    :param obj: Any Python object (possibly a dataclass)
    :return: JSON-serializable structure
    """
    if isinstance(obj, list):
        return [convert_to_serializable(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif hasattr(obj, '__dict__'):
        return convert_to_serializable(asdict(obj))
    else:
        return obj


def main():
    """
    Command-line interface for the drone route planner.

    Allows passing mission parameters and a coordinate file to compute a valid drone flight route.
    Outputs the result as JSON to console or file.
    """
    parser = argparse.ArgumentParser(description="Drone Route Planner CLI")
    parser.add_argument("--file", "-f", required=True,
                        help="Path to coordinates text file (lat,lon per line)")
    parser.add_argument("--speed", type=float, default=15,
                        help="Flight speed in m/s (default: 15)")
    parser.add_argument("--survey", type=int, default=600,
                        help="Survey time per coordinate in seconds (default: 600)")
    parser.add_argument("--flight", type=int, default=2400,
                        help="Max flight time before return in seconds (default: 2400)")
    parser.add_argument("--charge", type=int, default=2100,
                        help="Charging or break time after each leg in seconds (default: 2100)")
    parser.add_argument("--radius", type=float, default=10000,
                        help="Max allowed radius from start point in meters (default: 10000)")
    parser.add_argument("--output", "-o",
                        help="Optional path to write output as JSON file")

    args = parser.parse_args()

    # Read coordinate list from text file
    coords = parse_coordinates(args.file)
    if not coords:
        print("No valid coordinates found. Aborting.")
        return

    # Create mission settings object
    mission = MissionData(
        SPEED_M_PER_S=args.speed,
        SURVEY_TIME_S=args.survey,
        MAX_FLIGHT_TIME_S=args.flight,
        CHARGING_TIME_S=args.charge,
        MISSION_RADIUS_M=args.radius
    )

    # Instantiate route planner and run the algorithm
    planner = RoutePlanner(mission)
    result = planner.run_planner(coords)

    # Convert output to a JSON-serializable structure
    serializable_result = convert_to_serializable(result)

    # Output to file or console
    if args.output:
        with open(args.output, "w") as f:
            json.dump(serializable_result, f, indent=2)
        print(f"Result written to {args.output}")
    else:
        print(json.dumps(serializable_result, indent=2))


if __name__ == "__main__":
    main()
