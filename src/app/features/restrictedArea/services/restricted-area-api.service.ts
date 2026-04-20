import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RestrictedAreaDto {
  id?: number;
  room_id: number;
  coordinate_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class RestrictedAreaApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/restricted-areas';

  getRestrictedAreasByRoomId(roomId: number): Observable<RestrictedAreaDto[]> {
    return this.http.get<RestrictedAreaDto[]>(`${this.baseUrl}/room/${roomId}`);
  }

  createRestrictedArea(payload: RestrictedAreaDto): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  deleteRestrictedArea(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}