import { resolve } from "path";
import { parseArgs } from "util";
import { writeFile } from "fs/promises";

import type { NamedCoordinate } from "./interfaces/coordinate.interface";
import { routePlanner } from "./routePlanner";
import type { MissionData } from "./interfaces/missiondata.interface";

/**
 * Converts a numeric index to a string of uppercase letters (e.g. 0 → 'A', 26 → 'AA').
 * @param index - The index to convert.
 * @returns The letter-based identifier.
 */
function indexToLetters(index: number): string {
  let name = "";
  do {
    name = String.fromCharCode((index % 26) + 65) + name;
    index = Math.floor(index / 26) - 1;
  } while (index >= 0);
  return name;
}

/**
 * Parses a coordinate file into an array of named coordinates.
 * Each line of the file must contain a latitude and longitude separated by a comma.
 * @param text - The content of the coordinate file.
 * @returns An array of named coordinates.
 * @throws If a line is malformed or contains invalid numbers.
 */
function parseCoordinates(text: string): NamedCoordinate[] {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "")
    .map((line, index) => {
      const parts = line.split(",").map(part => part.trim());
      if (parts.length !== 2) {
        throw new Error(`Invalid line in the coordinate file! Line: "${line}"`);
      }

      const lat = Number(parts[0]);
      const lon = Number(parts[1]);

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error(`Invalid number in line: "${line}"`);
      }

      const name = indexToLetters(index);
      return { name, lat, lon };
    });
}

/**
 * Parses a lat,lon string into a coordinate object.
 * @param input - A string in the format "lat,lon"
 * @returns A coordinate object or null
 */
function parseDockLocation(input: string | undefined): { lat: number; lon: number } | null {
  if (!input) return null;

  const parts = input.split(",").map(p => p.trim());
  if (parts.length !== 2) throw new Error("Invalid CUSTOM_DOCK_LOCATION format. Expected format: lat,lon");

  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (isNaN(lat) || isNaN(lon)) throw new Error("Invalid numbers in CUSTOM_DOCK_LOCATION.");

  return { lat, lon };
}

// Parse CLI arguments with defaults
const { values } = parseArgs({
  args: Bun.argv,
  options: {
    file: { type: "string" },
    speed: { type: "string", default: "15" },
    survey: { type: "string", default: "600" },
    flight: { type: "string", default: "2400" },
    charge: { type: "string", default: "2100" },
    radius: { type: "string", default: "10000" },
    output: { type: "string" },
    dock: { type: "string" }, // Optional CUSTOM_DOCK_LOCATION
  },
  strict: true,
  allowPositionals: true,
});

// Ensure required --file argument is present
if (!values.file) {
  console.error("Error: --file argument is required.");
  process.exit(1);
}

// Read and parse coordinate file
const path = resolve(values.file);
const content = await Bun.file(path).text();
const coordinates = parseCoordinates(content);

// Optional dock location
let dockLocation = null;
try {
  dockLocation = parseDockLocation(values.dock);
} catch (e) {
  console.error(`❌ Error parsing CUSTOM_DOCK_LOCATION: ${(e as Error).message}`);
  process.exit(1);
}

// Prepare mission data
const missiondata: MissionData = {
  SPEED_M_PER_S: Number(values.speed),
  MAX_FLIGHT_TIME_S: Number(values.flight),
  CHARGING_TIME_S: Number(values.charge),
  SURVEY_TIME_S: Number(values.survey),
  MISSION_RADIUS_M: Number(values.radius),
  CUSTOM_DOCK_LOCATION: dockLocation,
  coordinates,
};

// Execute route planner
const planner = new routePlanner(missiondata);
const result = planner.runPlanner(coordinates, dockLocation ?? undefined);

// Output result
const jsonOutput = JSON.stringify(result, null, 2);
if (values.output) {
  const outputPath = resolve(values.output);
  await writeFile(outputPath, jsonOutput, "utf-8");
  console.log(`✅ Result written to ${outputPath}`);
} else {
  console.log(jsonOutput);
}
