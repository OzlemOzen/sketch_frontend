// import { inject, Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { CreateRoomRequest, UpdateRoomRequest } from '../models/room-request.model';

// @Injectable({
//   providedIn: 'root'
// })
// export class RoomApiService {
//   private readonly http = inject(HttpClient);
//   private readonly baseUrl = 'http://localhost:3000/rooms';

//   createRoom(payload: CreateRoomRequest): Observable<void> {
//     return this.http.post<void>(this.baseUrl, payload);
//   }

//   updateRoom(roomId: number, payload: UpdateRoomRequest): Observable<void> {
//     return this.http.put<void>(`${this.baseUrl}/${roomId}`, payload);
//   }

//   deleteRoom(roomId: number): Observable<void> {
//     return this.http.delete<void>(`${this.baseUrl}/${roomId}`);
//   }
// }

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Room } from '../../../models/data';
import { CreateRoomRequest, UpdateRoomRequest } from '../models/room-request.model';

@Injectable({
  providedIn: 'root'
})
export class RoomApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/rooms';

  getAllRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(this.baseUrl);
  }

  getRoomsByBuildingId(buildingId: number): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.baseUrl}/building/${buildingId}`);
  }

  getRoomsByBuildingIdAndFloorNumber(buildingId: number, floorNumber: number): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.baseUrl}/building/${buildingId}/floor/${floorNumber}`);
  }

  createRoom(payload: CreateRoomRequest): Observable<void> {
    return this.http.post<void>(this.baseUrl, payload);
  }

  updateRoom(id: number, payload: UpdateRoomRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, payload);
  }

  deleteRoom(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}