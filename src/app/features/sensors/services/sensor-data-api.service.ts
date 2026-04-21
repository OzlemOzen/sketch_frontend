import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SensorDataItem {
  id: number;
  sensor_id: number;
  room_id: number;
  sicaklik: number | string | null;
  nem: number | string | null;
  timestamp: number;
  created_at?: string;
}

export interface SensorAverageResponse {
  avg_sicaklik: number | string | null;
  avg_nem: number | string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SensorDataApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/sensor-data';

  getAll(limit = 100): Observable<SensorDataItem[]> {
    return this.http.get<SensorDataItem[]>(`${this.baseUrl}?limit=${limit}`);
  }

  getByRoomId(roomId: number, limit = 100): Observable<SensorDataItem[]> {
    return this.http.get<SensorDataItem[]>(`${this.baseUrl}/room/${roomId}?limit=${limit}`);
  }

  getLatestByRoomId(roomId: number): Observable<SensorDataItem[]> {
    return this.http.get<SensorDataItem[]>(`${this.baseUrl}/room/${roomId}/latest`);
  }

  getBySensorId(sensorId: number, limit = 100): Observable<SensorDataItem[]> {
    return this.http.get<SensorDataItem[]>(`${this.baseUrl}/sensor/${sensorId}?limit=${limit}`);
  }

  getLatestBySensorId(sensorId: number): Observable<SensorDataItem> {
    return this.http.get<SensorDataItem>(`${this.baseUrl}/sensor/${sensorId}/latest`);
  }

  getAverageBySensorId(sensorId: number): Observable<SensorAverageResponse> {
    return this.http.get<SensorAverageResponse>(`${this.baseUrl}/sensor/${sensorId}/average`);
  }

  getLastNBySensorId(sensorId: number, limit = 20): Observable<SensorDataItem[]> {
    return this.http.get<SensorDataItem[]>(`${this.baseUrl}/sensor/${sensorId}/last?limit=${limit}`);
  }

  getBySensorIdBetweenDates(
    sensorId: number,
    startTs: number,
    endTs: number
  ): Observable<SensorDataItem[]> {
    return this.http.get<SensorDataItem[]>(
      `${this.baseUrl}/sensor/${sensorId}/range?startTs=${startTs}&endTs=${endTs}`
    );
  }

  deleteOldSensorData(olderThanTs: number): Observable<{ message: string; deletedCount?: number }> {
  return this.http.delete<{ message: string; deletedCount?: number }>(
    `${this.baseUrl}/old?olderThanTs=${olderThanTs}`
  );
}
}