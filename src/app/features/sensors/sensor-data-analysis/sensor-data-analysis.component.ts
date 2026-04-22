import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

import { BuildingApiService } from '../../buildings/services/building-api.service';
import { RoomApiService } from '../../rooms/services/room-api.service';
import { SensorApiService } from '../services/sensor-api.service';
import {
  SensorDataApiService,
  SensorDataItem,
  SensorAverageResponse
} from '../services/sensor-data-api.service';
import { Building, Room, Sensor } from '../../../models/data';

type AnalysisType =
  | 'room-latest'
  | 'room-history'
  | 'sensor-latest'
  | 'sensor-average'
  | 'sensor-last-n'
  | 'sensor-range';

@Component({
  selector: 'app-sensor-data-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './sensor-data-analysis.component.html',
  styleUrls: ['./sensor-data-analysis.component.scss']
})
export class SensorDataAnalysisComponent implements OnInit {
  private readonly buildingApiService = inject(BuildingApiService);
  private readonly roomApiService = inject(RoomApiService);
  private readonly sensorApiService = inject(SensorApiService);
  private readonly sensorDataApiService = inject(SensorDataApiService);

  buildings: Building[] = [];
  rooms: Room[] = [];
  sensors: Sensor[] = [];

  selectedBuildingId: number | null = null;
  selectedFloorNumber: number | null = null;
  selectedRoomId: number | null = null;
  selectedSensorId: number | null = null;

  analysisType: AnalysisType = 'room-latest';

  limit = 20;
  startDateTime = '';
  endDateTime = '';

  loading = false;
  errorMessage = '';

  roomLatestData: SensorDataItem[] = [];
  roomHistoryData: SensorDataItem[] = [];
  sensorLatestData: SensorDataItem | null = null;
  sensorAverageData: SensorAverageResponse | null = null;
  sensorLastNData: SensorDataItem[] = [];
  sensorRangeData: SensorDataItem[] = [];

  roomAverageTemp: number | null = null;
  roomAverageHumidity: number | null = null;

  ngOnInit(): void {
    this.loadBuildings();
  }

  

  get isFloorDisabled(): boolean {
  return this.selectedBuildingId == null;
}

get isRoomDisabled(): boolean {
  return this.selectedBuildingId == null || this.selectedFloorNumber == null;
}

get isSensorDisabled(): boolean {
  return (
    this.selectedBuildingId == null ||
    this.selectedFloorNumber == null ||
    this.selectedRoomId == null
  );
}

get floorPlaceholder(): string {
  return this.selectedBuildingId == null ? 'Önce bina seçiniz' : 'Kat seçiniz';
}

get roomPlaceholder(): string {
  if (this.selectedBuildingId == null) {
    return 'Önce bina seçiniz';
  }

  if (this.selectedFloorNumber == null) {
    return 'Önce kat seçiniz';
  }

  return 'Oda seçiniz';
}

get sensorPlaceholder(): string {
  if (this.selectedBuildingId == null) {
    return 'Önce bina seçiniz';
  }

  if (this.selectedFloorNumber == null) {
    return 'Önce kat seçiniz';
  }

  if (this.selectedRoomId == null) {
    return 'Önce oda seçiniz';
  }

  return 'Sensör seçiniz';
}

  get visibleRooms(): Room[] {
    return this.rooms.filter((room) => {
      if (this.selectedBuildingId == null) {
        return false;
      }

      if (room.building_id !== this.selectedBuildingId) {
        return false;
      }

      if (this.selectedFloorNumber == null) {
        return true;
      }

      return room.floor_number === this.selectedFloorNumber;
    });
  }

  get visibleSensors(): Sensor[] {
  if (this.selectedRoomId == null) {
    return [];
  }

  const selectedRoom = this.visibleRooms.find(
    (room) => room.id === this.selectedRoomId
  );

  return selectedRoom?.sensors ?? [];
}

  onBuildingChange(buildingId: number | null): void {
  this.selectedBuildingId = buildingId;
  this.selectedFloorNumber = null;
  this.selectedRoomId = null;
  this.selectedSensorId = null;
  this.rooms = [];
  this.sensors = [];
  this.clearResults();

  if (buildingId == null) {
    return;
  }

  this.loadRoomsByBuilding(buildingId);
}

onFloorChange(): void {
  this.selectedRoomId = null;
  this.selectedSensorId = null;
  this.sensors = [];
  this.clearResults();
}

onRoomChange(roomId: number | null): void {
  this.selectedRoomId = roomId;
  this.selectedSensorId = null;
  this.clearResults();
}

  onSensorChange(sensorId: number | null): void {
    this.selectedSensorId = sensorId;
    this.clearResults();
  }

  private validateAnalysisSelection(): string | null {
  if (this.selectedBuildingId == null) {
    return 'Önce bina seçiniz.';
  }

  if (this.selectedFloorNumber == null) {
    return 'Önce kat seçiniz.';
  }

  const roomRequiredTypes: AnalysisType[] = ['room-latest', 'room-history'];
  const sensorRequiredTypes: AnalysisType[] = [
    'sensor-latest',
    'sensor-average',
    'sensor-last-n',
    'sensor-range'
  ];

  if (roomRequiredTypes.includes(this.analysisType) && this.selectedRoomId == null) {
    return 'Önce oda seçiniz.';
  }

  if (sensorRequiredTypes.includes(this.analysisType)) {
    if (this.selectedRoomId == null) {
      return 'Önce oda seçiniz.';
    }

    if (this.visibleSensors.length === 0) {
      return 'Seçilen odaya ait sensör bulunmuyor.';
    }

    if (this.selectedSensorId == null) {
      return 'Önce sensör seçiniz.';
    }
  }

  return null;
}

  runAnalysis(): void {
  this.loading = true;
  this.errorMessage = '';
  this.clearResults();

  const validationMessage = this.validateAnalysisSelection();

  if (validationMessage) {
    this.errorMessage = validationMessage;
    this.loading = false;
    return;
  }

  switch (this.analysisType) {
    case 'room-latest':
      this.runRoomLatest();
      break;
    case 'room-history':
      this.runRoomHistory();
      break;
    case 'sensor-latest':
      this.runSensorLatest();
      break;
    case 'sensor-average':
      this.runSensorAverage();
      break;
    case 'sensor-last-n':
      this.runSensorLastN();
      break;
    case 'sensor-range':
      this.runSensorRange();
      break;
  }
}

  private runRoomLatest(): void {
    if (this.selectedRoomId == null) {
      this.finishWithError('Lütfen bir oda seçin.');
      return;
    }

    this.sensorDataApiService.getLatestByRoomId(this.selectedRoomId).subscribe({
      next: (data) => {
  const activeSensorIds = this.getActiveSensorIdsForSelectedRoom();
  const filteredData = data.filter(item => activeSensorIds.has(item.sensor_id));

  console.log('roomLatest raw:', data);
  console.log('visibleSensors:', this.visibleSensors);
  console.log('roomLatest filtered:', filteredData);

  this.roomLatestData = filteredData;
  this.calculateRoomAverages(filteredData);
  this.loading = false;
},
      error: () => this.finishWithError('Odaya ait son veriler alınamadı.')
    });
  }

  private runRoomHistory(): void {
    if (this.selectedRoomId == null) {
      this.finishWithError('Lütfen bir oda seçin.');
      return;
    }

    this.sensorDataApiService.getByRoomId(this.selectedRoomId, this.limit).subscribe({
      next: (data) => {
  const activeSensorIds = this.getActiveSensorIdsForSelectedRoom();
  const filteredData = data.filter(item => activeSensorIds.has(item.sensor_id));

  console.log('roomHistory raw:', data);
  console.log('visibleSensors:', this.visibleSensors);
  console.log('roomHistory filtered:', filteredData);

  this.roomHistoryData = filteredData;
  this.loading = false;
},
      error: () => this.finishWithError('Odaya ait geçmiş veriler alınamadı.')
    });
  }

  private runSensorLatest(): void {
    if (this.selectedSensorId == null) {
      this.finishWithError('Lütfen bir sensör seçin.');
      return;
    }

    this.sensorDataApiService.getLatestBySensorId(this.selectedSensorId).subscribe({
      next: (data) => {
        this.sensorLatestData = data;
        this.loading = false;
      },
      error: () => this.finishWithError('Sensöre ait son veri alınamadı.')
    });
  }

  private runSensorAverage(): void {
    if (this.selectedSensorId == null) {
      this.finishWithError('Lütfen bir sensör seçin.');
      return;
    }

    this.sensorDataApiService.getAverageBySensorId(this.selectedSensorId).subscribe({
      next: (data) => {
        this.sensorAverageData = data;
        this.loading = false;
      },
      error: () => this.finishWithError('Sensör ortalama verisi alınamadı.')
    });
  }

  private runSensorLastN(): void {
    if (this.selectedSensorId == null) {
      this.finishWithError('Lütfen bir sensör seçin.');
      return;
    }

    this.sensorDataApiService.getLastNBySensorId(this.selectedSensorId, this.limit).subscribe({
      next: (data) => {
        this.sensorLastNData = data;
        this.loading = false;
      },
      error: () => this.finishWithError('Sensörün son kayıtları alınamadı.')
    });
  }

  private runSensorRange(): void {
    if (this.selectedSensorId == null) {
      this.finishWithError('Lütfen bir sensör seçin.');
      return;
    }

    if (!this.startDateTime || !this.endDateTime) {
      this.finishWithError('Lütfen başlangıç ve bitiş tarihi seçin.');
      return;
    }

    const startTs = Math.floor(new Date(this.startDateTime).getTime() / 1000);
    const endTs = Math.floor(new Date(this.endDateTime).getTime() / 1000);

    this.sensorDataApiService.getBySensorIdBetweenDates(this.selectedSensorId, startTs, endTs).subscribe({
      next: (data) => {
        this.sensorRangeData = data;
        this.loading = false;
      },
      error: () => this.finishWithError('Seçilen tarih aralığındaki veriler alınamadı.')
    });
  }

  private calculateRoomAverages(data: SensorDataItem[]): void {
  const tempValues = data
    .map((item) =>
      item.sicaklik !== null && item.sicaklik !== undefined
        ? Number(item.sicaklik)
        : null
    )
    .filter((value): value is number => value !== null && !Number.isNaN(value));

  const humidityValues = data
    .map((item) =>
      item.nem !== null && item.nem !== undefined
        ? Number(item.nem)
        : null
    )
    .filter((value): value is number => value !== null && !Number.isNaN(value));

  this.roomAverageTemp = tempValues.length
    ? tempValues.reduce((sum, value) => sum + value, 0) / tempValues.length
    : null;

  this.roomAverageHumidity = humidityValues.length
    ? humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length
    : null;
}

  private loadBuildings(): void {
    this.buildingApiService.getBuildings().subscribe({
      next: (result: any) => {
        this.buildings = Array.isArray(result)
          ? result
          : Array.isArray(result?.response)
            ? result.response
            : [];
      },
      error: () => {
        this.errorMessage = 'Binalar yüklenemedi.';
      }
    });
  }

  private loadRoomsByBuilding(buildingId: number): void {
  this.roomApiService.getRoomsByBuildingId(buildingId).subscribe({
    next: (rooms: Room[]) => {
      this.rooms = rooms;

      this.sensors = rooms.flatMap((room) => room.sensors ?? []);

      console.log('Analiz ekranı rooms:', this.rooms);
      console.log('Analiz ekranı sensors:', this.sensors);
    },
    error: () => {
      this.errorMessage = 'Odalar yüklenemedi.';
      this.rooms = [];
      this.sensors = [];
    }
  });
}


  private clearResults(): void {
    this.roomLatestData = [];
    this.roomHistoryData = [];
    this.sensorLatestData = null;
    this.sensorAverageData = null;
    this.sensorLastNData = [];
    this.sensorRangeData = [];
    this.roomAverageTemp = null;
    this.roomAverageHumidity = null;
  }

  private finishWithError(message: string): void {
    this.errorMessage = message;
    this.loading = false;
  }

  formatTimestamp(timestamp: number | null | undefined): string {
    if (!timestamp) {
      return '-';
    }

    return new Date(timestamp * 1000).toLocaleString('tr-TR');
  }

get availableFloors(): number[] {
  if (this.selectedBuildingId == null) {
    return [];
  }

  return [...new Set(
    this.rooms
      .filter(room => room.building_id === this.selectedBuildingId)
      .map(room => room.floor_number)
      .filter((floor): floor is number => floor !== null && floor !== undefined)
  )].sort((a, b) => a - b);
}


deleteOlderThanDateTime = '';
deleteLoading = false;
deleteMessage = '';
deleteErrorMessage = '';


confirmDeleteModalOpen = false;
pendingDeleteOlderThanTs: number | null = null;

deleteOldData(): void {
  this.deleteMessage = '';
  this.deleteErrorMessage = '';

  if (!this.deleteOlderThanDateTime) {
    this.deleteErrorMessage = 'Lütfen bir tarih seçin.';
    return;
  }

  const olderThanTs = Math.floor(new Date(this.deleteOlderThanDateTime).getTime() / 1000);

  if (!olderThanTs || Number.isNaN(olderThanTs)) {
    this.deleteErrorMessage = 'Geçerli bir tarih seçin.';
    return;
  }

  this.pendingDeleteOlderThanTs = olderThanTs;
  this.confirmDeleteModalOpen = true;
}

confirmDeleteOldData(): void {
  if (this.pendingDeleteOlderThanTs == null) {
    this.deleteErrorMessage = 'Silme işlemi için geçerli tarih bulunamadı.';
    this.confirmDeleteModalOpen = false;
    return;
  }

  this.deleteLoading = true;
  this.confirmDeleteModalOpen = false;

  this.sensorDataApiService.deleteOldSensorData(this.pendingDeleteOlderThanTs).subscribe({
    next: (result) => {
      this.deleteMessage = result?.message ?? 'Eski sensör verileri silindi.';
      this.deleteLoading = false;
      this.pendingDeleteOlderThanTs = null;
    },
    error: (error: unknown) => {
      console.error('Eski veriler silinemedi:', error);
      this.deleteErrorMessage = 'Eski veriler silinemedi.';
      this.deleteLoading = false;
      this.pendingDeleteOlderThanTs = null;
    }
  });
}

cancelDeleteOldData(): void {
  this.confirmDeleteModalOpen = false;
  this.pendingDeleteOlderThanTs = null;
}

getSensorTitle(sensorId: number): string {
  const sensor = this.visibleSensors.find((s) => s.id === sensorId);
  return sensor?.title ?? `Sensör ${sensorId}`;
}


private getActiveSensorIdsForSelectedRoom(): Set<number> {
  return new Set(this.visibleSensors.map(sensor => sensor.id));
}

}