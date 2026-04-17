// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';

// const payload: CreateBuildingRequest = {
//   title: formValue.title.trim(),
//   city: formValue.city.trim(),
//   county: formValue.county.trim(),
//   country_code: formValue.country_code.trim().toUpperCase(),
//   address: formValue.address.trim()
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