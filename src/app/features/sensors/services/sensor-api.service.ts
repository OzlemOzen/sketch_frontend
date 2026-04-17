import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { Sensor } from '../../../models/data';
import { CreateSensorRequest, UpdateSensorRequest } from '../models/sensor-request.model';

@Injectable({
  providedIn: 'root'
})
export class SensorApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/sensors';

  getAllSensors(): Observable<Sensor[]> {
    return this.http.get<Sensor[]>(this.baseUrl);
  }

  getSensorsByRoomId(roomId: number): Observable<Sensor[]> {
    return this.http.get<Sensor[]>(`${this.baseUrl}/room/${roomId}`);
  }

  getSensorsByRoomIds(roomIds: number[]): Observable<Sensor[]> {
    if (!roomIds.length) {
      return new Observable<Sensor[]>((subscriber) => {
        subscriber.next([]);
        subscriber.complete();
      });
    }

    return forkJoin(roomIds.map((roomId) => this.getSensorsByRoomId(roomId))).pipe(
      map((sensorGroups) => sensorGroups.flat())
    );
  }

  createSensor(payload: CreateSensorRequest): Observable<void> {
    return this.http.post<void>(this.baseUrl, payload);
  }

  updateSensor(id: number, payload: UpdateSensorRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, payload);
  }

  deleteSensor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }


  ////////////////////


}
