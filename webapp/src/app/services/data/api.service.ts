import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';



@Injectable({
  providedIn: 'root'
})
export class APIService {

  private http = inject(HttpClient);
  private apiresponse: any;

  constructor() { }

  public getAPIResponse() {
    return this.apiresponse;
  }

  public sendCoordinates(jsonData: any): Promise<any> {
    const apiUrl = environment.useWindowOrigin ? `${window.location.origin}/api` : environment.apiUrl;

    return new Promise((resolve, reject) => {
      this.http.post(apiUrl, jsonData)
        .subscribe({
          next: (data) => {
            this.apiresponse = data;
            resolve(data);
          },
          error: (err) => reject(err)
        });
    });
  }
}
