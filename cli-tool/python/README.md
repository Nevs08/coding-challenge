#  U-ROB Coding Challenge - Python CLI Tool

> ⚠️ This code/project was automatically translated by AI using the "server" Project as reference. I just fixed some bugs.  
While efforts have been made to ensure accuracy, there may still be errors or inconsistencies.

---

# 🚀 Drone Route Planner CLI

This CLI tool calculates optimized drone flight routes and dock location for surveying a list of GPS coordinates, considering mission constraints like flight speed, survey time, max flight duration, and charging breaks.

---

## ⚡ Features

- Read coordinates from a text file (lat, lon per line)
- Specify flight parameters via CLI options
- Auto-calculates the best dock location if none is given
- Supports mission radius filtering and unreachable point handling
- Outputs JSON to console or file

---

## 📥 Input Format

A `.txt` file containing one coordinate per line in the format:

```
lat, lon
```

### Example: `coordinates.txt`
```
49.15868902252248, 9.111073073485683
49.1582580129513, 9.113612777241652
```

---

## 🛠️ Usage

```bash
python cli.py --file <path-to-coordinates.txt> [options]
```

### ⚙️ Available Options

| Option            | Description                                      | Default   |
|-------------------|--------------------------------------------------|-----------|
| `--file, -f`      | Path to the coordinate file (required)           | —         |
| `--speed`         | Drone flight speed in m/s                        | `15`      |
| `--survey`        | Survey time per coordinate in seconds            | `600`     |
| `--flight`        | Max flight duration before returning (in sec)    | `2400`    |
| `--charge`        | Charging time between legs (in sec)        | `2100`    |
| `--radius`        | Max radius from home point (in meters)           | `10000`   |
| `--output, -o`    | Output result as JSON to file                    | —         |

---

## ✅ Example

Basic usage:
```bash
python cli.py --file coordinates.txt
```

With custom parameters and output file:
```bash
python cli.py -f coordinates.txt --speed 20 --survey 300 --flight 1800 --charge 1200 -o result.json
```


---

Happy flying! 🚁

