import { AfterViewInit, Component, Inject, LOCALE_ID, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import proj4 from 'proj4';
import { SelectModule } from 'primeng/select';
import { PanelModule } from 'primeng/panel';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { APIService } from '../../services/data/api.service';
import { CommonModule } from '@angular/common';
import { CheckboxModule } from 'primeng/checkbox';

interface cordSys {
  name: string,
  code: string
}

@Component({
  selector: 'app-result',
  imports: [FormsModule, CommonModule, SelectModule, PanelModule, TooltipModule, ButtonModule, CheckboxModule],
  templateUrl: './result.component.html',
  styleUrl: './result.component.css'
})
export class ResultComponent implements AfterViewInit, OnInit {

  private map!: L.Map;
  nr: number = 1;
  addedDock: boolean = false;
  legMarkers: any[] = [];
  legPolylines: any[] = [];
  legVisible: boolean[] = [];

  cordsys: cordSys[] = [{ name: 'WGS 84 (lat/lon)', code: 'wgs' }, { name: 'UTM', code: 'utm' }];
  cordsysSelect: cordSys = { name: 'WGS 84 (lat/lon)', code: 'wgs' };

  mouselat: string = "0.0";
  mouselng: string = "0.0";

  decCoordinateString: string = "";
  utmCoordinateString: string = "";
  gkCoordinateString: string = "";

  apiResponse: any;

  constructor(@Inject(LOCALE_ID) locale: string, private router: Router, private api: APIService) { }

  ngOnInit(): void {
    this.apiResponse = this.api.getAPIResponse();

    if (this.apiResponse == null) {
      this.router.navigate(['']);
      return;
    }

    this.apiResponse.legs.forEach((leg: any, legIndex: number) => {
      this.legVisible[legIndex] = true;
      this.legMarkers[legIndex] = [];
      this.legPolylines[legIndex] = [];
    });
  }


  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3
    });

    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    let baseMaps = {
      "OpenStreetMap": osm,
      "Google Hybrid": googleHybrid
    };

    this.map = L.map('map', {
      center: [this.apiResponse.startPoint.lat, this.apiResponse.startPoint.lon],
      zoom: 13,
      layers: [osm]
    });

    this.apiResponse.legs.forEach((leg: any) => {
      let previousStop: L.LatLngExpression = [this.apiResponse.startPoint.lat, this.apiResponse.startPoint.lon];
      const legColor = this.getRandomColor();

      leg.stops.forEach((stop: any) => {
        const { name, lat, lon } = stop;

        if (lat && lon) {
          if (name === "Dock" && !this.addedDock) {
            L.marker([lat, lon])
              .addTo(this.map)
              .bindPopup(`<b>Home Point (${name})</b><br>Lat: ${lat}<br>Lon: ${lon}`)
              .openPopup();
            this.addedDock = true;
          }
          else if (name !== "Dock") {
            const marker = L.marker([lat, lon])
              .addTo(this.map)
              .bindPopup(`<b>Nr: ${this.nr}<br>Field: ${name}</b><br>Lat: ${lat}<br>Lon: ${lon}`);
            this.legMarkers[leg.legIndex - 1].push(marker);

            this.drawSquare(this.map, lat, lon, 200, "blue");
            this.nr++;
          }


          const stopDistance = stop.distance.toFixed(2);
          const stopFlightTime = (stop.flightTime * 60).toFixed(2);
          const polyline = L.polyline([previousStop, [lat, lon]], { color: legColor, weight: 3 }).addTo(this.map).bindPopup(`<b>Leg: ${leg.legIndex}</b><br>Distance: ${stopDistance} m<br>Duration: ${stopFlightTime} s`);
          this.legPolylines[leg.legIndex - 1].push(polyline);

          previousStop = [lat, lon];
        }
      });
    });


    this.apiResponse.removedPoints.forEach((removedPoint: any) => {
      L.marker([removedPoint.lat, removedPoint.lon])
        .addTo(this.map)
        .bindPopup(`Field: ${removedPoint.name}</b><br>Lat: ${removedPoint.lat}<br>Lon: ${removedPoint.lon}`);

      this.drawSquare(this.map, removedPoint.lat, removedPoint.lon, 200, "red");
    });

    this.map.on('mousemove', (e) => {
      this.mouseMove(e);
    });

    L.control.layers(baseMaps).addTo(this.map);
  }

  drawSquare(map: L.Map, centerLat: number, centerLng: number, sideLengthMeters: number, color: string) {
    const halfSide = sideLengthMeters / 2;

    const latOffset = (halfSide / 111320);

    const lngOffset = halfSide / (40075000 * Math.cos(centerLat * Math.PI / 180) / 360);

    const bounds: L.LatLng[] = [
      L.latLng(centerLat + latOffset, centerLng - lngOffset),
      L.latLng(centerLat + latOffset, centerLng + lngOffset),
      L.latLng(centerLat - latOffset, centerLng + lngOffset),
      L.latLng(centerLat - latOffset, centerLng - lngOffset),
    ];

    L.polygon(bounds, { color: color }).addTo(map);
  }

  toggleLegVisibility(index: number): void {
    const isVisible = !this.legVisible[index];

    if (isVisible) {
      this.legMarkers[index].forEach((marker: any) => marker.remove());
      this.legPolylines[index].forEach((polyline: any) => polyline.remove());
    } else {
      this.legMarkers[index].forEach((marker: any) => marker.addTo(this.map));
      this.legPolylines[index].forEach((polyline: any) => polyline.addTo(this.map));

    }
  }

  mouseMove(e: any): void {
    this.mouselat = e.latlng.lat.toString();
    this.mouselng = e.latlng.lng.toString();

    const dmsCoordinates = this.decimalCoordinatesToDMS(parseFloat(this.mouselat), parseFloat(this.mouselng));
    this.decCoordinateString = dmsCoordinates.latitude + " " + dmsCoordinates.longitude + (" (" + parseFloat(this.mouselat).toFixed(10) + ", " + parseFloat(this.mouselng).toFixed(10) + ")");

    const utmCoordinates = this.decimalToUTM(parseFloat(this.mouselat), parseFloat(this.mouselng));
    this.utmCoordinateString = utmCoordinates.zone.toString() + "U " + parseFloat(utmCoordinates.easting.toString()).toFixed(0) + " " + parseFloat(utmCoordinates.northing.toString()).toFixed(0);
  }

  decimalToDMS(decimal: number): string {
    const degrees = Math.floor(decimal);
    const minutesFloat = (decimal - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60);

    return `${degrees}° ${minutes}' ${seconds}"`;
  }

  decimalCoordinatesToDMS(latitude: number, longitude: number): { latitude: string, longitude: string } {
    const latitudeDMS = this.decimalToDMS(latitude);
    const longitudeDMS = this.decimalToDMS(longitude);

    return { latitude: latitudeDMS, longitude: longitudeDMS };
  }

  decimalToUTM(latitude: number, longitude: number): { zone: number, easting: number, northing: number } {
    const utmCoords = proj4('EPSG:4326', "+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs +type=crs", [longitude, latitude]);

    const zone = Math.floor((longitude + 180) / 6) + 1;
    const easting = utmCoords[0];
    const northing = utmCoords[1];

    return { zone, easting, northing };
  }

  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  lettersToIndex(letters: string): number {
    let index = 0;
    for (let i = 0; i < letters.length; i++) {
      index = index * 26 + (letters.charCodeAt(i) - 65);
    }
    return index;
  }

  goToHome() {
    this.router.navigate(['/']);
  }

}