# 🚀 Drone Route Planner API

This is a lightweight backend server written with [Bun](https://bun.sh) to expose a route planning algorithm for drone missions as a REST API. It is designed to work seamlessly with a frontend client like Angular.

## ⚡ Features

- Accepts `POST` requests with mission data and coordinates
- Returns optimal route planning and starting point results as JSON

---

## 📦 Installation

Install all dependencies using Bun:

```bash
bun install
```

---

## 🚀 Running the Server

To start the backend server:

```bash
bun run dev
# or
bun run src/index.ts
```

The server will listen on a URL like:

```
Server is listening on http://localhost:3000
```

---

## 🔌 API Usage

### `POST /api`

Accepts a JSON payload with mission parameters and coordinates. Responds with the optimized route.

**Request body:**

```json
{
  "SPEED_M_PER_S": 15,
  "MAX_FLIGHT_TIME_S": 2400,
  "CHARGING_TIME_S": 2100,
  "SURVEY_TIME_S": 600,
  "MISSION_RADIUS_M": 10000,
  "CUSTOM_DOCK_LOCATION": { "lat": 49.1234, "lon": 9.5678 },
  "coordinates": [
    { "name": "A", "lat": 49.1, "lon": 9.5 },
    { "name": "B", "lat": 49.11, "lon": 9.51 }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    // optimized route and mission info
  }
}
```

> If `CUSTOM_DOCK_LOCATION` is omitted or `null`, the best location for the dock / starting point is automatically calculated.

---

## 🌐 CORS

The server includes default CORS headers to allow communication from frontends during development. This attempt should not be used in production!

---

## 🛠️ Development Notes

This project was initialized using:

```bash
bun init
```

> Bun version: **v1.2.8**  
> Bun is a fast all-in-one JavaScript runtime. Learn more at [https://bun.sh](https://bun.sh)