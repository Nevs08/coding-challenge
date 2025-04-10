# 🚀 Drone Route Planner

This CLI tool calculates optimized drone flight routes and dock location for surveying a list of GPS coordinates, considering mission constraints like flight speed, survey time, max flight duration, and charging breaks.

## ⚡ Features

- Read coordinates from a text file (lat, lon per line)
- Specify flight parameters via CLI options
- Auto-calculates the best dock location if none is given
- Supports mission radius filtering and unreachable point handling
- Outputs JSON to console or file

## 🛠️ Installation

Install dependencies using [Bun](https://bun.sh):

```bash
bun install
```

## 🚀 Usage

Run the script via Bun:

```bash
bun run dev
# or
bun run src/index.ts
```

### ✍️ Command Line Arguments

| Argument         | Type   | Default | Description                                                                 |
|------------------|--------|---------|-----------------------------------------------------------------------------|
| `--file`         | string | _none_  | **Required**. Path to coordinate file (`lat,lon` per line).                |
| `--speed`        | float  | 15      | Drone flight speed in meters/second.                                       |
| `--survey`       | int    | 600     | Time in seconds spent surveying each point.                                |
| `--flight`       | int    | 2400    | Maximum flight time before return, in seconds.                             |
| `--charge`       | int    | 2100    | Charging after each leg, in seconds.                         |
| `--radius`       | float  | 10000   | Maximum allowed mission radius from start point, in meters.                |
| `--dock`         | string | _none_  | Optional coordinate for a custom dock location                             |
| `--output`       | string | _none_  | Optional path to write the result as a JSON file.                          |

### 🗺️ Coordinate File Format

Provide a simple `.txt` file where each line contains one coordinate in the format:

```
lat, lon
```

Example:

```
49.15868902252248, 9.111073073485683
49.1582580129513, 9.113612777241652
```

### 📤 Example

```bash
bun run src/index.ts --file <path-to-coordinates.txt> --speed 12 --output result.json
```

This will calculate the route based on the coordinates in `points.txt` and write the result to `result.json`.

---

## 🛠️ Development

This project was created using:

```bash
bun init
```

> Bun version: **v1.2.8**  
> Bun is a fast all-in-one JavaScript runtime. Learn more at [https://bun.sh](https://bun.sh)

---