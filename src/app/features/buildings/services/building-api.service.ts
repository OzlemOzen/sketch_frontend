import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Building } from '../../../models/data';
import { CreateBuildingRequest, UpdateBuildingRequest } from '../models/building-request.model';

@Injectable({
  providedIn: 'root'
})
export class BuildingApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  getBuildings(): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/building`);
}
  createBuilding(payload: {
  title: string;
  city: string;
  county: string;
  postcode: string;
  address: string;
}) {
  return this.http.post('http://localhost:3000/building/add', payload);
}
  updateBuilding(id: number, payload: UpdateBuildingRequest): Observable<void> {
  return this.http.put<void>(`http://localhost:3000/building/${id}`, payload);
}

  deleteBuilding(id: number): Observable<void> {
  return this.http.delete<void>(`http://localhost:3000/building/${id}`);
  }
}