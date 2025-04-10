import type { NamedCoordinate } from "./interfaces/coordinate.interface";
import { routePlanner } from "./routePlanner";
import type { MissionData } from "./interfaces/missiondata.interface";

const server = Bun.serve({
  async fetch(req) {
    const path = new URL(req.url).pathname;

    // respond with text --> can also be used for monitoring
    if (path === "/") return new Response("Welcome to the Backend Server!");

    // CORS
    if (req.method === "OPTIONS" && path === "/api") {
      const res = new Response();
      res.headers.set('Access-Control-Allow-Origin', '*');
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', '*');

      return res;
    }

    // receive JSON data from the webapp, calculate and send the result as response
    if (req.method === "POST" && path === "/api") {

      const data = JSON.stringify(await req.json());
      const missionData: MissionData = JSON.parse(data)
      const coord: NamedCoordinate[] = missionData.coordinates;

      const planner = new routePlanner(missionData);
      let result = '{ success: false, error: "Something went wrong." }';
      if (missionData.CUSTOM_DOCK_LOCATION != null) {
        result = JSON.stringify(planner.runPlanner(coord, missionData.CUSTOM_DOCK_LOCATION))
      } else {
        result = JSON.stringify(planner.runPlanner(coord));
      }

      const res = new Response(result, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Content-Type': 'application/json',
        }
      });

      return res;
    }    

    // 404s
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server is listening on ${server.url}`);