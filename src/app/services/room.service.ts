// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';

// const payload: CreateRoomRequest = {
//   title: formValue.title.trim(),
//   floor_number: formValue.roomFloor as number,
//   building_id: this.currentBuildingId as number,
//   coordinate: {
//     start_coordinate_x: formValue.x as number,
//     start_coordinate_y: formValue.y as number,
//     width: formValue.width as number,
//     height: formValue.height as number
//   }
// };

// @Injectable({
//   providedIn: 'root'
// })
// export class RoomService {
//   private apiUrl = 'http://localhost:3000/api/rooms';

//   constructor(private http: HttpClient) {}

//   createRoom(payload: CreateRoomPayload): Observable<any> {
//     return this.http.post<any>(this.apiUrl, payload);
//   }
// }