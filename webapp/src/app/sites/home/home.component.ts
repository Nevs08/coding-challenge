import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tabs, TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { Stepper, StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RouterModule, Router } from '@angular/router';
import { APIService } from '../../services/data/api.service';

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterModule, TabsModule, TextareaModule, FileUploadModule, StepperModule, ButtonModule, InputNumberModule, TooltipModule, SelectButtonModule, InputTextModule, ProgressSpinnerModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  @ViewChild('stepper') stepper!: Stepper;
  @ViewChild('tab') tab!: Tabs;
  @ViewChild('fu') fu!: FileUpload;
  fileUpload!: FileUpload;
  showLoadingAnimation: boolean = false;

  DRONE_SPEED: number = 15;
  MAX_FLIGHT_TIME: number = 40;
  CHARGING_TIME: number = 35;
  SURVEY_TIME: number = 10;
  MISSION_RADIUS: number = 10000;

  stateOptions: any[] = [{ label: 'Calculate', value: 'calculate' }, { label: 'Set location', value: 'setlocation' }];

  private regex = /^-?\d+(\.\d+)?,\s?-?\d+(\.\d+)?$/;
  coordinates: string = '';
  coordinatesValid: boolean = false;
  customdocklocationValid: boolean = false;

  mode: string = "calculate"
  customDockLocation: string = "";

  constructor(private router: Router, private api: APIService) { }

  nextStep() {
    if (this.tab.value() == 0) {
      if (this.fu.hasFiles()) {
        this.fileUpload = this.fu;
        this.stepper.updateValue(2);
      }
    } else if (this.tab.value() == 1) {
      if (this.coordinatesValid) {
        this.stepper.updateValue(2);
      }
    }
  }

  async submitData() {
    if (this.coordinatesValid || (this.fileUpload.hasFiles() && !this.coordinatesValid)) {

      if (this.mode == "setlocation" && !this.customdocklocationValid) {

      } else {
        // Update View:
        this.stepper.updateValue(3);
        this.showLoadingAnimation = true;
        const missionObject = await this.createMissionObject();
        // Make request to server:
        await this.api.sendCoordinates(missionObject);
        this.router.navigate(['/result']);
      }
    } else if (!this.coordinatesValid) {

    }
  }

  onCoordinatesInput(): void {
    const lines = this.coordinates.split('\n');
    this.coordinatesValid = lines.every(line => this.regex.test(line.trim()));
  }

  onCustomDockLocationInput(): void {
    this.customdocklocationValid = this.regex.test(this.customDockLocation.trim());
  }

  async createMissionObject() {
    const result: any[] = [];

    const fileInput = this.fileUpload?.files[0];
    if (fileInput) {
      const fileContent = await this.readFile(fileInput);

      const coordinates = this.parseCoordinatesFromFile(fileContent);

      if (this.customDockLocation != "") {
        const match = this.customDockLocation.trim().match(this.regex);
        if (match) {
          const lat = parseFloat(match[0].split(',')[0].trim());
          const lon = parseFloat(match[0].split(',')[1].trim());
          result.push({
            lat: lat,
            lon: lon
          });
          return {
            SPEED_M_PER_S: this.DRONE_SPEED * 60,
            MAX_FLIGHT_TIME_S: this.MAX_FLIGHT_TIME * 60,
            CHARGING_TIME_S: this.CHARGING_TIME * 60,
            SURVEY_TIME_S: this.SURVEY_TIME * 60,
            MISSION_RADIUS_M: this.MISSION_RADIUS,
            CUSTOM_DOCK_LOCATION: result[0],
            coordinates: coordinates
          };
        }
      }

      return {
        SPEED_M_PER_S: this.DRONE_SPEED * 60,
        MAX_FLIGHT_TIME_S: this.MAX_FLIGHT_TIME * 60,
        CHARGING_TIME_S: this.CHARGING_TIME * 60,
        SURVEY_TIME_S: this.SURVEY_TIME * 60,
        MISSION_RADIUS_M: this.MISSION_RADIUS,
        coordinates: coordinates
      };
    }

    if (this.customDockLocation != "") {
      const match = this.customDockLocation.trim().match(this.regex);
      if (match) {
        const lat = parseFloat(match[0].split(',')[0].trim());
        const lon = parseFloat(match[0].split(',')[1].trim());
        result.push({
          lat: lat,
          lon: lon
        });
        return {
          SPEED_M_PER_S: this.DRONE_SPEED * 60,
          MAX_FLIGHT_TIME_S: this.MAX_FLIGHT_TIME * 60,
          CHARGING_TIME_S: this.CHARGING_TIME * 60,
          SURVEY_TIME_S: this.SURVEY_TIME * 60,
          MISSION_RADIUS_M: this.MISSION_RADIUS,
          CUSTOM_DOCK_LOCATION: result[0],
          coordinates: this.convertCoordinatesToJson()
        };
      }
    }

    return {
      SPEED_M_PER_S: this.DRONE_SPEED * 60,
      MAX_FLIGHT_TIME_S: this.MAX_FLIGHT_TIME * 60,
      CHARGING_TIME_S: this.CHARGING_TIME * 60,
      SURVEY_TIME_S: this.SURVEY_TIME * 60,
      MISSION_RADIUS_M: this.MISSION_RADIUS,
      coordinates: this.convertCoordinatesToJson()
    };
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private parseCoordinatesFromFile(fileContent: string): any[] {
    const coordinates: any[] = [];

    const lines = fileContent.split('\n');
    lines.forEach((line, index) => {
      const match = line.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      if (match) {
        const lat = parseFloat(match[0].split(',')[0].trim());
        const lon = parseFloat(match[0].split(',')[1].trim());
        coordinates.push({
          name: this.indexToLetters(index),
          lat: lat,
          lon: lon
        });
      }
    });
    return coordinates;
  }

  convertCoordinatesToJson(): any[] {
    const lines = this.coordinates.split('\n');
    const result: any[] = [];

    lines.forEach((line, index) => {
      const match = line.trim().match(this.regex);
      if (match) {
        const lat = parseFloat(match[0].split(',')[0].trim());
        const lon = parseFloat(match[0].split(',')[1].trim());
        result.push({
          name: this.indexToLetters(index),
          lat: lat,
          lon: lon
        });
      }
    });

    return result;
  }

  indexToLetters(index: number): string {
    let name = "";
    do {
      name = String.fromCharCode((index % 26) + 65) + name;
      index = Math.floor(index / 26) - 1;
    } while (index >= 0);
    return name;
  }
}
