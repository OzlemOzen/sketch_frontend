import { ModalComponent } from '../shared/components/modal/modal.component';
import { BuildingFormComponent } from '../features/buildings/building-form/building-form.component';
import { FloorFormComponent } from '../features/floors/floor-form/floor-form.component';
import { RoomFormComponent } from '../features/rooms/room-form/room-form.component';
import { SensorFormComponent } from '../features/sensors/sensor-form/sensor-form.component';
import { CommonModule } from '@angular/common';
import { BuildingApiService } from '../features/buildings/services/building-api.service';
import { SensorApiService } from '../features/sensors/services/sensor-api.service';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import {
  RestrictedAreaApiService,
  RestrictedAreaDto
} from '../features/restrictedArea/services/restricted-area-api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import {
  CreateRoomRequest,
  UpdateRoomRequest,
  RestrictedAreaRequest
} from '../features/rooms/models/room-request.model';

import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';

import { RoomApiService } from '../features/rooms/services/room-api.service';
import { RoomFormValue } from '../features/rooms/models/room-form-value.model';
import {
  mapRoomFormToCreateRoomRequest,
  mapRoomFormToUpdateRoomRequest
} from '../features/rooms/mappers/room.mapper';

import {
  CreateBuildingRequest,
  UpdateBuildingRequest
} from '../features/buildings/models/building-request.model';

import {
  Building,
  Coordinate,
  Room,
  Sensor,
  RoomViewModel,
  SensorViewModel,
  RestrictedArea,
  RestrictedAreaViewModel
} from '../models/data';

import { FloorFormValue } from '../features/floors/floor-form/floor-form.component';
import { SensorFormValue } from '../features/sensors/sensor-form/sensor-form.component';
import { BuildingFormValue } from '../features/buildings/building-form/building-form.component';

interface RulerTick {
  position: number;
  value: number;
  label: string;
}


interface FaultySensorItem {
  sensorId: number;
  title: string;
  floorNumber: number | string;
  roomTitle: string;
  type: string;
  status: 'warning' | 'critical' | 'offline';
  statusText: string;
  message: string;
  updatedAt: string;
  sicaklik?: number;
  nem?: number;
}


interface BuildingSensorGroup {
  buildingId: number;
  buildingTitle: string;
  warningCount: number;
  criticalCount: number;
  sensors: FaultySensorItem[];
}

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};


type SensorStatus = 'green' | 'yellow' | 'red' | 'unknown';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ModalComponent,
    BuildingFormComponent,
    FloorFormComponent,
    RoomFormComponent,
    SensorFormComponent,
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly roomApiService = inject(RoomApiService);
  private readonly buildingApiService = inject(BuildingApiService);
  private readonly sensorApiService = inject(SensorApiService);
  private readonly restrictedAreaApiService = inject(RestrictedAreaApiService);
  private route = inject(ActivatedRoute);


  private pendingBuildingIdFromUrl: number | null = null;
  private pendingFloorFromUrl: number | null = null;

  selectedFloorNumber: number | null = null;
  title = 'sketch_frontend';

  scale = 1;
  readonly minScale = 0.4;
  readonly maxScale = 2;
  readonly zoomStep = 0.025;

  baseGridSize = 50;
  gridSize = 50;

  isDragging = false;
  startX = 0;
  startY = 0;

  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  containerWidth = 0;
  containerHeight = 0;

  posX = 0;
  posY = 0;

  buildings: Building[] = [];
  currentBuildingId: number | null = null;


  rooms: RoomViewModel[] = [];
  sensors: SensorViewModel[] = [];

  buildingModalOpen = false;
  buildingUpdateModalOpen = false;
  floorModalOpen = false;
  roomModalOpen = false;
  roomUpdateModalOpen = false;
  roomDeleteModalOpen = false;
  buildingDeleteModalOpen = false;
  sensorModalOpen = false;
  sensorUpdateModalOpen = false;
  sensorDeleteModalOpen = false;

  selectedBuildingIdForUpdate: number | null = null;
  selectedBuildingIdForDelete: number | null = null;
  selectedRoomIdForUpdate: number | null = null;
  selectedRoomIdForDelete: number | null = null;
  selectedSensorIdForUpdate: number | null = null;
  selectedSensorIdForDelete: number | null = null;

  buildingFormData: BuildingFormValue = this.createEmptyBuildingForm();
  buildingUpdateFormData: BuildingFormValue = this.createEmptyBuildingForm();
  floorFormData: FloorFormValue = this.createEmptyFloorForm();
  roomFormData: RoomFormValue = this.createEmptyRoomForm();
  roomUpdateFormData: RoomFormValue = this.createEmptyRoomForm();
  sensorFormData: SensorFormValue = this.createEmptySensorForm();
  sensorUpdateFormData: SensorFormValue = this.createEmptySensorForm();

  floors: { floor_number: number }[] = [];

  


private normalizeRect(rect: Rect): Rect | null {
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return rect;
}

private rectsIntersect(a: Rect, b: Rect): boolean {
  const aRight = a.left + a.width;
  const aBottom = a.top + a.height;

  const bRight = b.left + b.width;
  const bBottom = b.top + b.height;

  return !(
    aRight <= b.left ||
    a.left >= bRight ||
    aBottom <= b.top ||
    a.top >= bBottom
  );
}


private subtractRect(container: Rect, obstacle: Rect): Rect[] {
  if (!this.rectsIntersect(container, obstacle)) {
    return [container];
  }

  const result: Rect[] = [];

  const cLeft = container.left;
  const cTop = container.top;
  const cRight = container.left + container.width;
  const cBottom = container.top + container.height;

  const oLeft = Math.max(obstacle.left, cLeft);
  const oTop = Math.max(obstacle.top, cTop);
  const oRight = Math.min(obstacle.left + obstacle.width, cRight);
  const oBottom = Math.min(obstacle.top + obstacle.height, cBottom);

  const topRect = this.normalizeRect({
    left: cLeft,
    top: cTop,
    width: container.width,
    height: oTop - cTop
  });

  const bottomRect = this.normalizeRect({
    left: cLeft,
    top: oBottom,
    width: container.width,
    height: cBottom - oBottom
  });

  const leftRect = this.normalizeRect({
    left: cLeft,
    top: oTop,
    width: oLeft - cLeft,
    height: oBottom - oTop
  });

  const rightRect = this.normalizeRect({
    left: oRight,
    top: oTop,
    width: cRight - oRight,
    height: oBottom - oTop
  });

  if (topRect) result.push(topRect);
  if (bottomRect) result.push(bottomRect);
  if (leftRect) result.push(leftRect);
  if (rightRect) result.push(rightRect);

  return result;
}

private getRestrictedRectsInsideRoom(room: RoomViewModel): Rect[] {
  if (
    room.x === null ||
    room.y === null ||
    room.width === null ||
    room.height === null
  ) {
    return [];
  }

  return room.restrictedAreas.map((area) => ({
    left: area.x - room.x!,
    top: room.y! - area.y,
    width: area.width,
    height: area.height
  }));
}

private getFreeRectsInsideRoom(room: RoomViewModel): Rect[] {
  if (room.width === null || room.height === null) {
    return [];
  }

  let freeRects: Rect[] = [
    {
      left: 0,
      top: 0,
      width: room.width,
      height: room.height
    }
  ];

  const restrictedRects = this.getRestrictedRectsInsideRoom(room);

  for (const obstacle of restrictedRects) {
    const next: Rect[] = [];

    for (const freeRect of freeRects) {
      next.push(...this.subtractRect(freeRect, obstacle));
    }

    freeRects = next;
  }

  return freeRects;
}

private getBestRoomTitlePosition(room: RoomViewModel): { left: number; top: number } {
  if (
    room.width === null ||
    room.height === null
  ) {
    return { left: 8, top: 8 };
  }

  const titleWidth = 90;
  const titleHeight = 28;
  const padding = 6;

  const freeRects = this.getFreeRectsInsideRoom(room)
    .filter(rect => rect.width >= titleWidth + padding * 2 && rect.height >= titleHeight + padding * 2)
    .sort((a, b) => (b.width * b.height) - (a.width * a.height));

  if (freeRects.length > 0) {
    const best = freeRects[0];

    return {
      left: best.left + (best.width - titleWidth) / 2,
      top: best.top + (best.height - titleHeight) / 2
    };
  }

  return {
    left: Math.max(8, room.width / 2 - titleWidth / 2),
    top: 8
  };
}

get warningSensorCount(): number {
  return this.visibleSensors.filter(
    sensor => sensor.statusColor === 'yellow'
  ).length;
}

get criticalSensorCount(): number {
  return this.visibleSensors.filter(
    sensor => sensor.statusColor === 'red'
  ).length;
}

get totalProblemSensorCount(): number {
  return this.visibleSensors.filter(
    sensor => sensor.statusColor === 'yellow' || sensor.statusColor === 'red'
  ).length;
}

private getRoomBySensor(sensor: SensorViewModel): RoomViewModel | undefined {
  return this.rooms.find(room => room.id === sensor.room_id);
}


private evaluateMetricStatus(
  currentValue: number | null | undefined,
  minValue: number | null | undefined,
  maxValue: number | null | undefined,
  optimumValue: number | null | undefined
): SensorStatus {
  if (currentValue == null) {
    return 'unknown';
  }

  if (minValue != null && currentValue < minValue) {
    return 'red';
  }

  if (maxValue != null && currentValue > maxValue) {
    return 'red';
  }

  if (optimumValue == null) {
    return 'green';
  }

  const safeMin = minValue ?? optimumValue;
  const safeMax = maxValue ?? optimumValue;
  const range = Math.max(safeMax - safeMin, 1);
  const warningBand = range * 0.2;

  if (Math.abs(currentValue - optimumValue) <= warningBand) {
    return 'green';
  }

  return 'yellow';
}

private calculateSensorStatusFromRoom(sensor: SensorViewModel): SensorStatus {
  const room = this.getRoomBySensor(sensor);

  if (!room) {
    return 'unknown';
  }

  const temperatureStatus = this.evaluateMetricStatus(
    sensor.sicaklik ?? null,
    room.temperature_min_value ?? null,
    room.temperature_max_value ?? null,
    room.temperature_optimum_value ?? null
  );

  const humidityStatus = this.evaluateMetricStatus(
    sensor.nem ?? null,
    room.humidity_min_value ?? null,
    room.humidity_max_value ?? null,
    room.humidity_optimum_value ?? null
  );

  if (temperatureStatus === 'red' || humidityStatus === 'red') {
    return 'red';
  }

  if (temperatureStatus === 'yellow' || humidityStatus === 'yellow') {
    return 'yellow';
  }

  if (temperatureStatus === 'green' || humidityStatus === 'green') {
    return 'green';
  }

  return 'unknown';
}

handleSensorStreamMessage(message: any): void {
  if (!message || typeof message.sensor_id !== 'number') {
    return;
  }

  const index = this.sensors.findIndex(sensor => sensor.id === message.sensor_id);

  if (index === -1) {
    console.warn('Sensör bulunamadı:', message.sensor_id);
    return;
  }

  const currentSensor = this.sensors[index];

  const sicaklik =
    typeof message.sicaklik === 'number'
      ? message.sicaklik
      : currentSensor.sicaklik ?? null;

  const nem =
    typeof message.nem === 'number'
      ? message.nem
      : currentSensor.nem ?? null;

  const lastUpdated =
    typeof message.timestamp === 'number'
      ? message.timestamp
      : currentSensor.lastUpdated ?? null;

  const updatedSensor: SensorViewModel = {
    ...currentSensor,
    sicaklik,
    nem,
    lastUpdated,
    current_value: sicaklik,
  };

  updatedSensor.statusColor = this.calculateSensorStatusFromRoom(updatedSensor);

  this.sensors[index] = updatedSensor;
  this.sensors = [...this.sensors];

  if (this.isAnyFormOpen) {
    return;
  }

  this.refreshRoomStatuses();
  this.refreshFaultySensors();
}

private updateAllSensorStatuses(): void {
  this.sensors = this.sensors.map(sensor => ({
    ...sensor,
    statusColor: this.calculateSensorStatusFromRoom(sensor)
  }));
}

upsertFaultySensor(item: FaultySensorItem): void {
  const index = this.faultySensors.findIndex(x => x.sensorId === item.sensorId);

  if (index === -1) {
    this.faultySensors = [item, ...this.faultySensors];
    return;
  }

  this.faultySensors = this.faultySensors.map(x =>
    x.sensorId === item.sensorId ? item : x
  );
}

removeFaultySensor(sensorId: number): void {
  this.faultySensors = this.faultySensors.filter(x => x.sensorId !== sensorId);
}

   constructor(
   private cd: ChangeDetectorRef,
   private router: Router
 ) {}

  alertModalOpen = false;
  alertModalTitle = 'Uyarı';
  alertModalMessage = '';

  openAlert(message: string, title = 'Uyarı'): void {
  this.alertModalTitle = title;
  this.alertModalMessage = message;
  this.alertModalOpen = true;
}

closeAlert(): void {
  this.alertModalOpen = false;
  this.alertModalMessage = '';
}


ws?: WebSocket;

ngOnInit(): void {
  console.log('ngOnInit çalıştı');

  this.route.queryParams.subscribe((params) => {
    this.pendingBuildingIdFromUrl =
      params['buildingId'] != null ? Number(params['buildingId']) : null;

    this.pendingFloorFromUrl =
      params['floor'] != null ? Number(params['floor']) : null;

    this.loadBuildings();
  });

  this.initWebSocket();
}

initWebSocket(): void {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    console.log('WS zaten açık');
    return;
  }

  if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
    console.log('WS zaten bağlanıyor');
    return;
  }

  console.log('initWebSocket çağrıldı');

  this.ws = new WebSocket('ws://localhost:3000');

  this.ws.onopen = () => {
    console.log('WS bağlandı');
  };

  this.ws.onerror = (error) => {
    console.error('WS hata:', error);
  };

  this.ws.onclose = () => {
    console.log('WS bağlantısı kapandı');
    this.ws = undefined;
  };

  this.ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'initial' && Array.isArray(message.data)) {
      message.data.forEach((item: any) => this.handleSensorStreamMessage(item));
      return;
    }

    this.handleSensorStreamMessage(message);
  };
}

faultySensors: FaultySensorItem[] = [];


get isAnyFormOpen(): boolean {
  return (
    this.buildingModalOpen ||
    this.buildingUpdateModalOpen ||
    this.buildingDeleteModalOpen ||
    this.floorModalOpen ||
    this.roomModalOpen ||
    this.roomUpdateModalOpen ||
    this.roomDeleteModalOpen ||
    this.sensorModalOpen ||
    this.sensorUpdateModalOpen ||
    this.sensorDeleteModalOpen
  );
}

/*
handleSensorStreamMessage(message: any): void {
  if (!message || typeof message.sensor_id !== 'number') {
    return;
  }

  console.log('WS sensor_id:', message.sensor_id);
console.log('this.sensors ids:', this.sensors.map(s => s.id));
  const index = this.sensors.findIndex(
    sensor => sensor.id === message.sensor_id
  );

  if (index === -1) {
    console.warn('Sensör bulunamadı:', message.sensor_id);
    return;
  }

  const updatedSensor: SensorViewModel = {
    ...this.sensors[index],
    sicaklik: typeof message.sicaklik === 'number'
      ? message.sicaklik
      : this.sensors[index].sicaklik,
    nem: typeof message.nem === 'number'
      ? message.nem
      : this.sensors[index].nem,
    lastUpdated: typeof message.timestamp === 'number'
      ? message.timestamp
      : this.sensors[index].lastUpdated
  };

  updatedSensor.current_value =
    typeof updatedSensor.sicaklik === 'number'
      ? updatedSensor.sicaklik
      : null;

  updatedSensor.statusColor = 'unknown';


  this.sensors[index] = updatedSensor;
  this.sensors = [...this.sensors];

  if (this.isAnyFormOpen) {
    return;
  }
  this.refreshRoomStatuses();
  this.refreshFaultySensors();
}
*/


get problematicRooms(): RoomViewModel[] {
  return this.rooms.filter(
    room =>
      !room.is_corridor &&
      (room.statusColor === 'warning' || room.statusColor === 'critical')
  );
}

get warningRoomCount(): number {
  return this.problematicRooms.filter(room => room.statusColor === 'warning').length;
}

get criticalRoomCount(): number {
  return this.problematicRooms.filter(room => room.statusColor === 'critical').length;
}

trackByProblematicRoom(index: number, room: RoomViewModel): number {
  return room.id ?? index;
}
getRoomStatusText(status?: 'normal' | 'warning' | 'critical' | 'unknown'): string {
  switch (status) {
    case 'critical':
      return 'Kritik';
    case 'warning':
      return 'Uyarı';
    case 'normal':
      return 'Normal';
    default:
      return 'Bilinmiyor';
  }
}

getRoomStatusMessage(room: RoomViewModel): string {
  const messages: string[] = [];

  if (
    room.avgTemperature != null &&
    room.temperature_min_value != null &&
    room.temperature_max_value != null
  ) {
    if (room.avgTemperature < room.temperature_min_value) {
      messages.push('Ortalama sıcaklık minimum eşik altındadır.');
    } else if (room.avgTemperature > room.temperature_max_value) {
      messages.push('Ortalama sıcaklık maksimum eşik üstündedir.');
    }
  }

  if (
    room.avgHumidity != null &&
    room.humidity_min_value != null &&
    room.humidity_max_value != null
  ) {
    if (room.avgHumidity < room.humidity_min_value) {
      messages.push('Ortalama nem minimum eşik altındadır.');
    } else if (room.avgHumidity > room.humidity_max_value) {
      messages.push('Ortalama nem maksimum eşik üstündedir.');
    }
  }

  if (messages.length === 0) {
    return 'Oda değerleri izleniyor.';
  }

  return messages.join(' ');
}

refreshFaultySensors(): void {
  this.faultySensors = this.sensors
    .filter(sensor => sensor.statusColor === 'red' || sensor.statusColor === 'yellow')
    .map(sensor => {
      const room = this.rooms.find(r => r.id === sensor.room_id);

      let status: 'warning' | 'critical' | 'offline' = 'offline';
      let statusText = 'Bilinmiyor';
      let message = 'Sensör verisi değerlendirilemedi.';

      if (sensor.statusColor === 'red') {
        status = 'critical';
        statusText = 'Kritik';
        message = `${sensor.title} sensörü eşik değer aralığının dışına çıktı.`;
      } else if (sensor.statusColor === 'yellow') {
        status = 'warning';
        statusText = 'Uyarı';
        message = `${sensor.title} sensörü optimum değerden sapma gösteriyor.`;
      }

      return {
  sensorId: sensor.id,
  title: sensor.title,
  floorNumber: room?.floor_number ?? '-',
  roomTitle: room?.title ?? '-',
  type: sensor.type,
  status,
  statusText,
  message,
  updatedAt: sensor.lastUpdated
    ? new Date(sensor.lastUpdated * 1000).toLocaleTimeString('tr-TR')
    : '-',
  sicaklik: sensor.sicaklik,
  nem: sensor.nem
};
    });
}

trackByFaultySensor(index: number, item: FaultySensorItem): number {
  return item.sensorId;
}


prepareSensorMonitorData(): BuildingSensorGroup[] {
  console.log('this.sensors:', this.sensors);
  console.log('this.rooms:', this.rooms);
  console.log('this.buildings:', this.buildings);

  const groupedMap = new Map<number, BuildingSensorGroup>();

  this.sensors
    .filter(sensor => sensor.statusColor === 'red' || sensor.statusColor === 'yellow')
    .forEach(sensor => {
      console.log('problemli sensör:', sensor);

      const room = this.rooms.find(r => r.id === sensor.room_id);
      console.log('eşleşen room:', room);

      if (!room) {
        return;
      }

      const building = this.buildings.find(b => b.id === room.building_id);
      console.log('eşleşen building:', building);

      if (!building || building.id === undefined) {
        return;
      }

      let status: 'warning' | 'critical' | 'offline' = 'offline';
      let statusText = 'Bilinmiyor';
      let message = 'Sensör verisi değerlendirilemedi.';

      if (sensor.statusColor === 'red') {
        status = 'critical';
        statusText = 'Kritik';
        message = `${sensor.title} sensörü eşik değer aralığının dışına çıktı.`;
      } else if (sensor.statusColor === 'yellow') {
        status = 'warning';
        statusText = 'Uyarı';
        message = `${sensor.title} sensörü optimum değerden sapma gösteriyor.`;
      }

      const item: FaultySensorItem = {
        sensorId: sensor.id as number,
        title: sensor.title,
        floorNumber: room.floor_number ?? '-',
        roomTitle: room.title ?? '-',
        type: sensor.type,
        status,
        statusText,
        message,
        updatedAt: sensor.lastUpdated
          ? new Date(sensor.lastUpdated * 1000).toLocaleTimeString('tr-TR')
          : '-'
      };

      if (!groupedMap.has(building.id)) {
        groupedMap.set(building.id, {
          buildingId: building.id,
          buildingTitle: building.title,
          warningCount: 0,
          criticalCount: 0,
          sensors: []
        });
      }

      const group = groupedMap.get(building.id)!;
      group.sensors.push(item);

      if (status === 'warning') {
        group.warningCount++;
      } else if (status === 'critical') {
        group.criticalCount++;
      }
    });

  const result = Array.from(groupedMap.values());
  console.log('hazırlanan monitor data:', result);

  return result;
}

openSensorMonitorPage(): void {
  const monitorData = this.prepareSensorMonitorData();
  console.log('monitorData:', monitorData);

  this.router.navigate(['/sensor-monitor'], {
    state: { monitorData }
  });
}

ngOnDestroy(): void {
  if (this.ws) {
    this.ws.close();
    this.ws = undefined;
  }
}

private updateContainerSize(): void {
  if (!this.container?.nativeElement) {
    return;
  }

  this.containerWidth = this.container.nativeElement.clientWidth;
  this.containerHeight = this.container.nativeElement.clientHeight;
}

trackByRulerTick(index: number, tick: RulerTick): number {
  return tick.value;
}


  ngAfterViewInit(): void {
    const rect = this.container.nativeElement.getBoundingClientRect();

    this.containerWidth = rect.width;
    this.containerHeight = rect.height;

    this.posX = this.containerWidth / 2;
    this.posY = this.containerHeight / 2;

    this.cd.detectChanges();
    this.updateContainerSize();
  }

  createEmptyBuildingForm(): BuildingFormValue {
  return {
    title: '',
    city: '',
    county: '',
    postcode: '',
    address: ''
  };
}

  createEmptyFloorForm(): FloorFormValue {
    return {
      floor_number: null
    };
  }

  createEmptyRoomForm(): RoomFormValue {
    return {
      title: '',
      buildingId: this.currentBuildingId,
      floorNumber: null,
      x: null,
      y: null,
      width: null,
      height: null,
      last_x: null,
      last_y: null,
      temperature_min_value: null,
      temperature_max_value: null,
      temperature_optimum_value: null,
      humidity_min_value: null,
      humidity_max_value: null,
      humidity_optimum_value: null
    };
  }


  createEmptySensorForm(): SensorFormValue {
  return {
    title: '',
    type: '',
    sensorRoom: null,
    x: null,
    y: null
  };
}

  selectBuilding(buildingId: number): void {
    this.currentBuildingId = buildingId;
  }

  get visibleRooms(): RoomViewModel[] {
  if (this.currentBuildingId === null) {
    return [];
  }

  return this.rooms.filter(
    (room) =>
      room.building_id === this.currentBuildingId &&
      room.is_corridor !== true
  );
}

  get visibleSensors(): SensorViewModel[] {
  if (this.currentBuildingId === null || this.selectedFloorNumber === null) {
    return [];
  }

  const currentFloorRoomIds = new Set(
    this.rooms
      .filter(
        (room) =>
          room.building_id === this.currentBuildingId &&
          room.floor_number === this.selectedFloorNumber &&
          room.id !== undefined
      )
      .map((room) => room.id as number)
  );

  return this.sensors.filter((sensor) => currentFloorRoomIds.has(sensor.room_id));
}

  trackByRoom(index: number, room: RoomViewModel): number | string {
    return room.id ?? `${room.title}-${room.floor_number}-${room.x}-${room.y}`;
  }

  trackByRestrictedRoom(index: number, room: RestrictedAreaViewModel): number | string {
    return room.id ?? `${room.title}-${room.room_id}-${room.x}-${room.y}`;
  }

  trackBySensor(index: number, sensor: SensorViewModel): number | string {
    return sensor.id ?? `${sensor.title}-${sensor.room_id}-${sensor.x}-${sensor.y}`;
  }

private isSensorInsideRoom(
  x: number,
  y: number,
  room: RoomViewModel
): boolean {
  if (
    room.x === null ||
    room.y === null ||
    room.width === null ||
    room.height === null
  ) {
    return false;
  }

  const roomLeft = room.x;
  const roomRight = room.x + room.width;
  const roomTop = room.y;
  const roomBottom = room.y - room.height;

  return x >= roomLeft && x <= roomRight && y <= roomTop && y >= roomBottom;
}

get topLevelRooms(): RoomViewModel[] {
  return this.rooms.filter((room) => {
    if (room.is_corridor) {
      return false;
    }

    return !this.rooms.some((candidate) => {
      if (candidate.is_corridor) {
        return false;
      }

      if (candidate.id === room.id) {
        return false;
      }

      if (candidate.building_id !== room.building_id) {
        return false;
      }

      if (candidate.floor_number !== room.floor_number) {
        return false;
      }

      if (
        room.x === null || room.y === null || room.width === null || room.height === null ||
        candidate.x === null || candidate.y === null || candidate.width === null || candidate.height === null
      ) {
        return false;
      }

      const currentRoom = {
        x: room.x,
        y: room.y,
        width: room.width,
        height: room.height
      };

      const candidateRoom = {
        x: candidate.x,
        y: candidate.y,
        width: candidate.width,
        height: candidate.height
      };

      const isSame = this.isExactlySameRoom(currentRoom, candidateRoom);
      const isInside = this.isRoomFullyInside(currentRoom, candidateRoom);

      return !isSame && isInside;
    });
  });
}

  private getRoomBounds(room: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return {
    left: room.x,
    right: room.x + room.width,
    top: room.y,
    bottom: room.y - room.height
  };
}

private isExactlySameRoom(
  first: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  second: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
): boolean {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.width === second.width &&
    first.height === second.height
  );
}

private isRoomFullyInside(
  inner: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  outer: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
): boolean {
  const innerBounds = this.getRoomBounds(inner);
  const outerBounds = this.getRoomBounds(outer);

  return (
    innerBounds.left >= outerBounds.left &&
    innerBounds.right <= outerBounds.right &&
    innerBounds.top <= outerBounds.top &&
    innerBounds.bottom >= outerBounds.bottom
  );
}

private isRoomIntersecting(
  first: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  second: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
): boolean {
  const firstBounds = this.getRoomBounds(first);
  const secondBounds = this.getRoomBounds(second);

  const noIntersection =
    firstBounds.right <= secondBounds.left ||
    firstBounds.left >= secondBounds.right ||
    firstBounds.top <= secondBounds.bottom ||
    firstBounds.bottom >= secondBounds.top;

  return !noIntersection;
}

private isInvalidRoomPlacement(
  newRoom: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  existingRoom: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
): boolean {
  if (!this.isRoomIntersecting(newRoom, existingRoom)) {
    return false;
  }

  if (this.isExactlySameRoom(newRoom, existingRoom)) {
    return true;
  }

  const newInsideExisting = this.isRoomFullyInside(newRoom, existingRoom);
  const existingInsideNew = this.isRoomFullyInside(existingRoom, newRoom);

  if (newInsideExisting || existingInsideNew) {
    return false;
  }

  return true;
}

private hasInvalidRoomPlacement(formValue: RoomFormValue): boolean {
  const buildingId = formValue.buildingId ?? this.currentBuildingId;
  const floorNumber = formValue.floorNumber ?? this.selectedFloorNumber;

  if (
    buildingId === null ||
    floorNumber === null ||
    formValue.x === null ||
    formValue.y === null ||
    formValue.width === null ||
    formValue.height === null
  ) {
    return false;
  }

  const newRoom = {
    x: formValue.x,
    y: formValue.y,
    width: formValue.width,
    height: formValue.height
  };

  return this.rooms.some((room) => {
  if (room.is_corridor) {
    return false;
  }

  if (room.building_id !== buildingId) {
    return false;
  }

  if (room.floor_number !== floorNumber) {
    return false;
  }

  if (
    room.x === null || room.y === null || room.width === null || room.height === null
  ) {
    return false;
  }
  

  return this.isInvalidRoomPlacement(newRoom, {
    x: room.x,
    y: room.y,
    width: room.width,
    height: room.height
  });
});
}

private hasInvalidRoomPlacementForUpdate(
  roomId: number,
  formValue: RoomFormValue
): boolean {
  const buildingId = formValue.buildingId ?? this.currentBuildingId;
  const floorNumber = formValue.floorNumber ?? this.selectedFloorNumber;

  if (
    buildingId === null ||
    floorNumber === null ||
    formValue.x === null ||
    formValue.y === null ||
    formValue.width === null ||
    formValue.height === null
  ) {
    return false;
  }

  const updatedRoom = {
    x: formValue.x,
    y: formValue.y,
    width: formValue.width,
    height: formValue.height
  };

  return this.rooms.some((room) => {
    if (room.is_corridor) {
      return false;
    }

    if (room.id === roomId) {
      return false;
    }

    if (room.building_id !== buildingId) {
      return false;
    }

    if (room.floor_number !== floorNumber) {
      return false;
    }

    if (
      room.x === null || room.y === null || room.width === null || room.height === null
    ) {
      return false;
    }

    return this.isInvalidRoomPlacement(updatedRoom, {
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height
    });
  });
}

  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.startX = event.clientX - this.posX;
    this.startY = event.clientY - this.posY;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) {
      return;
    }

    this.posX = event.clientX - this.startX;
    this.posY = event.clientY - this.startY;
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();

    const oldScale = this.scale;
    const delta = event.deltaY < 0 ? this.zoomStep : -this.zoomStep;
    const newScale = Math.max(
      this.minScale,
      Math.min(this.scale + delta, this.maxScale)
    );

    if (newScale === oldScale) {
      return;
    }

    const rect = this.container.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldX = (mouseX - this.posX) / oldScale;
    const worldY = (mouseY - this.posY) / oldScale;

    this.scale = newScale;
    this.gridSize = this.baseGridSize * this.scale;

    this.posX = mouseX - worldX * this.scale;
    this.posY = mouseY - worldY * this.scale;
  }

readonly rulerValueStep = 100;

get horizontalRulerTicks(): RulerTick[] {
  const ticks: RulerTick[] = [];
  const step = this.gridSize;

  if (!this.containerWidth || step <= 0) {
    return ticks;
  }

  const startIndex = Math.floor(-this.posX / step) - 2;
  const endIndex = Math.ceil((this.containerWidth - this.posX) / step) + 2;

  for (let i = startIndex; i <= endIndex; i++) {
    const actualValue = i * this.baseGridSize;

    if (actualValue % this.rulerValueStep !== 0) {
      continue;
    }

    ticks.push({
      position: this.posX + i * step,
      value: actualValue,
      label: String(actualValue)
    });
  }

  return ticks;
}

get verticalRulerTicks(): RulerTick[] {
  const ticks: RulerTick[] = [];
  const step = this.gridSize;

  if (!this.containerHeight || step <= 0) {
    return ticks;
  }

  const startIndex = Math.floor(-this.posY / step) - 2;
  const endIndex = Math.ceil((this.containerHeight - this.posY) / step) + 2;

  for (let i = startIndex; i <= endIndex; i++) {
    const actualValue = -i * this.baseGridSize;

    if (actualValue % this.rulerValueStep !== 0) {
      continue;
    }

    ticks.push({
      position: this.posY + i * step,
      value: actualValue,
      label: String(actualValue)
    });
  }

  return ticks;
}

@HostListener('window:resize')
onWindowResize(): void {
  this.updateContainerSize();
}

  openAddBuildingModal(): void {
    this.buildingFormData = this.createEmptyBuildingForm();
    this.buildingModalOpen = true;
  }

  openAddFloorModal(): void {
    if(this.buildings.length === 0){
      this.openAlert('Önce bir bina eklemelisiniz.');
      return;
    }

  if (this.currentBuildingId === null) {
    this.openAlert('Önce bir bina seçmelisiniz.');
    return;
  }

  this.floorFormData = this.createEmptyFloorForm();
  this.floorModalOpen = true;
}

  openAddRoomModal(): void {
    if(this.buildings.length === 0){
      this.openAlert('Önce bir bina eklemelisiniz.');
      return;
    }
  if (this.currentBuildingId === null) {
    this.openAlert('Önce bir bina seçmelisiniz.');
    return;
  }

  if (this.selectedFloorNumber === null) {
    this.openAlert('Önce bir kat seçmelisiniz.');
    return;
  }

  this.roomFormData = {
    ...this.createEmptyRoomForm(),
    buildingId: this.currentBuildingId,
    floorNumber: this.selectedFloorNumber
  };

  this.roomModalOpen = true;
}

  openAddSensorModal(): void {
    if(this.buildings.length === 0){
      this.openAlert('Önce bir bina eklemelisiniz.');
      return;
    }
    if (this.currentBuildingId === null) {
    this.openAlert('Önce bir bina seçmelisiniz.');
    return;
  }

  if (this.selectedFloorNumber === null) {
    this.openAlert('Önce bir kat seçmelisiniz.');
    return;
  }

    if (this.rooms.length === 0) {
      this.openAlert('Seçili bina ve katta sensör eklenecek oda yok.');
      return;
    }
    this.sensorFormData = this.createEmptySensorForm();
    this.sensorModalOpen = true;
  }

  openUpdateBuildingModal(): void {
  if (this.buildings.length === 0) {
    this.openAlert('Önce bina eklemelisiniz.');
    return;
  }

  this.selectedBuildingIdForUpdate = null;
  this.buildingUpdateFormData = this.createEmptyBuildingForm();
  this.buildingUpdateModalOpen = true;
}

openUpdateRoomModal(): void {
  if(this.buildings.length === 0){
      this.openAlert('Önce bir bina eklemelisiniz.');
      return;
    }
  if (this.currentBuildingId === null) {
    this.openAlert('Önce bir bina seçmelisiniz.');
    return;
  }

  if (this.selectedFloorNumber === null) {
    this.openAlert('Önce bir kat seçmelisiniz.');
    return;
  }

  if (this.visibleRooms.length === 0) {
    this.openAlert('Seçili bina ve katta güncellenecek oda yok.');
    return;
  }

  this.selectedRoomIdForUpdate = null;
  this.roomUpdateFormData = this.createEmptyRoomForm();
  this.roomUpdateModalOpen = true;
}

openDeleteBuildingModal(): void {
  if (this.buildings.length === 0) {
    this.openAlert('Önce bina eklemelisiniz.');
    return;
  }

  this.selectedBuildingIdForDelete = null;
  this.buildingDeleteModalOpen = true;
}

openDeleteRoomModal(): void {
  if(this.buildings.length === 0){
      this.openAlert('Önce bir bina eklemelisiniz.');
      return;
    }

  if (this.currentBuildingId === null) {
    this.openAlert('Önce bir bina seçmelisiniz.');
    return;
  }

  if (this.selectedFloorNumber === null) {
    this.openAlert('Önce bir kat seçmelisiniz.');
    return;
  }

  if (this.visibleRooms.length === 0) {
    this.openAlert('Seçili bina ve katta silinecek oda yok.');
    return;
  }

  this.selectedRoomIdForDelete = null;
  this.roomDeleteModalOpen = true;
}


  openUpdateSensorModal(): void {
    if(this.buildings.length === 0){
      this.openAlert('Önce bir bina eklemelisiniz.');
      return;
    }
  if (this.currentBuildingId === null) {
    this.openAlert('Önce bir bina seçmelisiniz.');
    return;
  }

  if (this.selectedFloorNumber === null) {
    this.openAlert('Önce bir kat seçmelisiniz.');
    return;
  }

  if (this.visibleSensors.length === 0) {
    this.openAlert('Seçili bina ve katta güncellenecek sensör yok.');
    return;
  }

  this.selectedSensorIdForUpdate = null;
  this.sensorUpdateFormData = this.createEmptySensorForm();
  this.sensorUpdateModalOpen = true;
}

  openDeleteSensorModal(): void {
    if(this.buildings.length === 0){
      this.openAlert('Önce bir bina eklemelisiniz.');
      return;
    }
  if (this.currentBuildingId === null) {
    this.openAlert('Önce bir bina seçmelisiniz.');
    return;
  }

  if (this.selectedFloorNumber === null) {
    this.openAlert('Önce bir kat seçmelisiniz.');
    return;
  }

  if (this.visibleSensors.length === 0) {
    this.openAlert('Seçili bina ve katta silinecek sensör yok.');
    return;
  }

  this.selectedSensorIdForDelete = null;
  this.sensorDeleteModalOpen = true;
}

onBuildingSave(formValue: BuildingFormValue): void {
  const payload: CreateBuildingRequest = {
    title: String(formValue.title ?? '').trim(),
    city: String(formValue.city ?? '').trim(),
    county: String(formValue.county ?? '').trim(),
    postcode: String(formValue.postcode ?? '').trim(),
    address: String(formValue.address ?? '').trim()
  };

  this.buildingApiService.createBuilding(payload).subscribe({
    next: (createdBuilding: any) => {
      this.buildingModalOpen = false;
      this.buildingFormData = this.createEmptyBuildingForm();

      const newBuildingId =
        createdBuilding?.id ?? createdBuilding?.response?.id ?? null;

      const newBuilding =
        createdBuilding?.response ?? createdBuilding ?? null;

      if (newBuilding) {
        this.buildings = [...this.buildings, newBuilding];
      } else {
        this.loadBuildings();
      }

      if (newBuildingId !== null) {
        this.currentBuildingId = newBuildingId;
        this.selectedFloorNumber = 0;

        this.router.navigate([], {
  relativeTo: this.route,
  queryParams: {
    buildingId: this.currentBuildingId,
    floor: this.selectedFloorNumber
  },
  queryParamsHandling: 'merge'
});

        this.floors = [{ floor_number: 0 }];
        this.rooms = [];
        this.sensors = [];

        this.loadFloorsByBuilding(newBuildingId);
        this.loadRooms(newBuildingId, 0);
      }
    },
    error: (error: any) => {
      console.error('Bina kaydedilemedi:', error);
      this.openAlert(error?.error?.message ?? 'Bina kaydedilemedi.');
    }
  });
}


onFloorSave(formValue: FloorFormValue): void {
  if (this.buildings.length === 0) {
    this.openAlert('Önce bir bina eklemelisiniz.');
    return;
  }

  if (this.currentBuildingId === null) {
    this.openAlert('Önce bir bina seçmelisiniz.');
    return;
  }

  const exists = this.floors.some(
    f => f.floor_number === formValue.floor_number
  );

  if (exists) {
    this.openAlert('Bu kat zaten mevcut.');
    return;
  }

  const newFloorNumber = formValue.floor_number as number;

  const corridorPayload = {
    title: 'Koridor',
    floor_number: newFloorNumber,
    building_id: this.currentBuildingId,
    is_corridor: true
  };

  this.roomApiService.createRoom(corridorPayload as any).subscribe({
    next: () => {
      this.floors = [
        ...this.floors,
        { floor_number: newFloorNumber }
      ].sort((a, b) => a.floor_number - b.floor_number);

      this.selectedFloorNumber = newFloorNumber;
      this.floorModalOpen = false;

      this.loadRooms(this.currentBuildingId!, newFloorNumber);
    },
    error: (error) => {
      console.error('Koridor oluşturulamadı:', error);
      this.openAlert(error?.error?.message ?? 'Kat için koridor oluşturulamadı.');
    }
  });
}


loadBuildings(): void {
  console.log('loadBuildings çağrıldı');

  this.buildingApiService.getBuildings().subscribe({
    next: (result: any) => {
      console.log('getBuildings result:', result);

      this.buildings = Array.isArray(result)
        ? result
        : Array.isArray(result?.response)
          ? result.response
          : [];

      console.log('this.buildings:', this.buildings);

      if (
        this.pendingBuildingIdFromUrl != null &&
        this.buildings.some((b) => b.id === this.pendingBuildingIdFromUrl)
      ) {
        this.currentBuildingId = this.pendingBuildingIdFromUrl;
        this.loadFloorsByBuilding(this.pendingBuildingIdFromUrl);

        if (this.pendingFloorFromUrl != null) {
          this.selectedFloorNumber = this.pendingFloorFromUrl;
          this.loadRooms(this.pendingBuildingIdFromUrl, this.pendingFloorFromUrl);
        }
      }
    },
    error: (error: any) => {
      console.error('Binalar alınamadı:', error);
      this.buildings = [];
    }
  });
}

loadFloorsByBuilding(buildingId: number): void {
  this.roomApiService.getRoomsByBuildingId(buildingId).subscribe({
    next: (rooms: Room[]) => {
      const floorNumbers = [...new Set(
        rooms
          .map(room => room.floor_number)
          .filter((floorNumber): floorNumber is number => floorNumber !== null && floorNumber !== undefined)
      )].sort((a, b) => a - b);

      const mappedFloors = floorNumbers.map(floorNumber => ({ floor_number: floorNumber }));
      const hasZeroFloor = mappedFloors.some(floor => floor.floor_number === 0);
      this.floors = hasZeroFloor
      ? mappedFloors
      : [{ floor_number: 0 }, ...mappedFloors];
    },
    error: (error) => {
      console.error('Kat bilgileri alınamadı:', error);
      this.floors = [];
    }
  });
}

rebuildRoomHierarchy(): void {
  const clonedRooms: RoomViewModel[] = this.rooms.map((room) => ({
    ...room,
    restrictedAreas: []
  }));

  for (const current of clonedRooms) {
    if (current.is_corridor) {
      continue;
    }

    for (const candidate of clonedRooms) {
      if (candidate.is_corridor) {
        continue;
      }

      if (current.id === candidate.id) {
        continue;
      }

      if (current.building_id !== candidate.building_id) {
        continue;
      }

      if (current.floor_number !== candidate.floor_number) {
        continue;
      }

      if (
        current.x === null || current.y === null || current.width === null || current.height === null ||
        candidate.x === null || candidate.y === null || candidate.width === null || candidate.height === null
      ) {
        continue;
      }

      const currentRoom = {
        x: current.x,
        y: current.y,
        width: current.width,
        height: current.height
      };

      const candidateRoom = {
        x: candidate.x,
        y: candidate.y,
        width: candidate.width,
        height: candidate.height
      };

      const isSame = this.isExactlySameRoom(currentRoom, candidateRoom);
      const isInside = this.isRoomFullyInside(currentRoom, candidateRoom);

      if (!isSame && isInside) {
        const alreadyExists = candidate.restrictedAreas.some(
          (area) => area.id === current.id
        );

        console.log('restricted current statusColor:', current.title, current.statusColor);
        if (!alreadyExists) {
          candidate.restrictedAreas.push({
            id: current.id,
            room_id: candidate.id ?? 0,
            title: current.title,
            x: current.x,
            y: current.y,
            width: current.width,
            height: current.height,
            x_last: current.x_last!,
            y_last: current.y_last!,
            statusColor: current.statusColor ?? 'unknown',
            avgTemperature: current.avgTemperature ?? null,
            avgHumidity: current.avgHumidity ?? null
          });
        }
        console.log('candidate restrictedAreas:', candidate.title, candidate.restrictedAreas);
      }
    }
  }

  this.rooms = clonedRooms.map((room) => {
    if (room.is_corridor) {
      return room;
    }

    const titlePosition = this.getBestRoomTitlePosition(room);

    return {
      ...room,
      titleLeft: titlePosition.left,
      titleTop: titlePosition.top
    };
  });
}


private hasInitializedProblemRoomKeys = false;

loadRooms(buildingId: number, floorNumber: number, afterLoad?: () => void): void {
  this.roomApiService.getRoomsByBuildingIdAndFloorNumber(buildingId, floorNumber).subscribe({
    next: (rooms: Room[]) => {
      console.log('Backendden gelen rooms:', rooms);

      this.rooms = rooms.map(room => this.roomToViewModel(room));

      this.sensors = rooms.flatMap((room) =>
        (room.sensors ?? []).map((sensor) =>
          this.sensorToViewModel(sensor, room.floor_number)
        )
      );

      console.log('ViewModel rooms:', this.rooms);
      console.log('ViewModel sensors:', this.sensors);

      this.rebuildRoomHierarchy();
      this.refreshRoomStatuses();
      this.refreshFaultySensors();
      

      if (!this.hasInitializedProblemRoomKeys) {
  this.previousProblemRoomKeys = new Set(
    this.problematicRooms.map(room => this.getProblemRoomKey(room))
  );
  this.hasInitializedProblemRoomKeys = true;
}

      if (afterLoad) {
        afterLoad();
      }
    },
    error: (error) => {
      console.error('Odalar alınamadı:', error);
      this.rooms = [];
      this.sensors = [];
    }
  });
}

loadSensorsForCurrentRooms(): void {
  const roomIds = this.rooms
    .map(room => room.id)
    .filter((id): id is number => id !== null && id !== undefined);

  if (roomIds.length === 0) {
    this.sensors = [];
    this.refreshRoomStatuses();
    return;
  }

  this.sensorApiService.getSensorsByRoomIds(roomIds).subscribe({
    next: (sensors: Sensor[]) => {
      console.log('API den gelen sensors:', sensors);

      this.sensors = sensors.map((sensor) => {
        const relatedRoom = this.rooms.find(room => room.id === sensor.room_id);
        return this.sensorToViewModel(sensor, relatedRoom?.floor_number);
      });

      this.refreshRoomStatuses();

      console.log('view model sensors:', this.sensors);
    },
    error: (error) => {
      console.error('Sensörler alınamadı:', error);
      this.sensors = [];
      this.refreshRoomStatuses();
    }
  });
}

getSensorIcon(sensor: SensorViewModel): string {
  const type = (sensor.type ?? '').toLowerCase().trim();


  if (type.includes('kamera')) {
    return 'videocam';
  }
  else{
    return 'sensors';
  }
}


onBuildingChange(buildingId: number | null, autoSelectFirstFloor = false): void {
  this.currentBuildingId = buildingId;

  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: {
      buildingId: this.currentBuildingId,
      floor: null
    },
    queryParamsHandling: 'merge'
  });

  console.log('currentBuildingId:', this.currentBuildingId);
  console.log('floors:', this.floors);

  this.selectedFloorNumber = null;
  this.rooms = [];
  this.sensors = [];
  this.floors = [];

  if (buildingId === null) {
    return;
  }

  this.loadFloorsByBuilding(buildingId);

  if (autoSelectFirstFloor) {
    this.selectedFloorNumber = 0;
    this.floors = [{ floor_number: 0 }];
    this.loadRooms(buildingId, 0);
  }
}

onFloorChange(floorNumber: number): void {
  if (this.currentBuildingId === null) {
    return;
  }

  this.selectedFloorNumber = floorNumber;

  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: {
      buildingId: this.currentBuildingId,
      floor: this.selectedFloorNumber
    },
    queryParamsHandling: 'merge'
  });

  this.loadRooms(this.currentBuildingId, floorNumber);
}

private hasSensorConflictForRestrictedArea(
  formValue: RoomFormValue,
  excludeRoomId?: number
): boolean {
  const buildingId = formValue.buildingId ?? this.currentBuildingId;
  const floorNumber = formValue.floorNumber ?? this.selectedFloorNumber;

  if (
    buildingId == null ||
    floorNumber == null ||
    formValue.x == null ||
    formValue.y == null ||
    formValue.width == null ||
    formValue.height == null
  ) {
    console.log('hasSensorConflictForRestrictedArea -> eksik form/building/floor bilgisi');
    return false;
  }

  const newRoomRect = {
    x: formValue.x,
    y: formValue.y,
    width: formValue.width,
    height: formValue.height
  };

  console.log('newRoomRect:', newRoomRect);
  console.log('buildingId:', buildingId, 'floorNumber:', floorNumber);
  console.log('excludeRoomId:', excludeRoomId);
  console.log('this.rooms:', this.rooms);
  console.log('this.sensors:', this.sensors);

  const parentRooms = this.rooms.filter((room) => {
    if (room.is_corridor) {
      return false;
    }

    if (excludeRoomId != null && room.id === excludeRoomId) {
      return false;
    }

    if (room.building_id !== buildingId || room.floor_number !== floorNumber) {
      return false;
    }

    if (
      room.x == null ||
      room.y == null ||
      room.width == null ||
      room.height == null
    ) {
      return false;
    }

    const parentRect = {
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height
    };

    const isSame = this.isExactlySameRoom(newRoomRect, parentRect);
    const isInsideParent = this.isRoomFullyInside(newRoomRect, parentRect);

    console.log('room candidate:', room.title, {
      roomId: room.id,
      parentRect,
      isSame,
      isInsideParent
    });

    return !isSame && isInsideParent;
  });

  console.log('parentRooms:', parentRooms);

  for (const parentRoom of parentRooms) {
    console.log('checking parentRoom:', parentRoom);

    if (parentRoom.id == null) {
      continue;
    }

    const parentSensors = this.sensors.filter(
      (sensor) => sensor.room_id === parentRoom.id
    );

    console.log('parentSensors for room', parentRoom.title, ':', parentSensors);

    const hasConflict = parentSensors.some((sensor) => {
      console.log('checking sensor:', sensor);
      console.log('sensor point:', sensor.x, sensor.y);

      if (sensor.x == null || sensor.y == null) {
        return false;
      }
      const isInsideRestrictedCandidate =
      sensor.x >= newRoomRect.x &&
      sensor.x <= newRoomRect.x + newRoomRect.width &&
      sensor.y >= newRoomRect.y &&
      sensor.y <= newRoomRect.y + newRoomRect.height;

      console.log(
        'sensor inside newRoomRect?:',
        isInsideRestrictedCandidate
      );

      return isInsideRestrictedCandidate;
    });

    console.log('hasConflict for parentRoom:', parentRoom.title, hasConflict);

    if (hasConflict) {
      return true;
    }
  }

  console.log('No sensor conflict found for restricted area.');
  return false;
}


private hasCorridorSensorConflict(
  formValue: RoomFormValue
): boolean {
  const buildingId = formValue.buildingId ?? this.currentBuildingId;
  const floorNumber = formValue.floorNumber ?? this.selectedFloorNumber;

  if (
    buildingId == null ||
    floorNumber == null ||
    formValue.x == null ||
    formValue.y == null ||
    formValue.width == null ||
    formValue.height == null
  ) {
    return false;
  }

  const newRoomRect = {
    x: formValue.x,
    y: formValue.y,
    width: formValue.width,
    height: formValue.height
  };

  const corridorRooms = this.rooms.filter((room) => {
    return (
      room.is_corridor === true &&
      room.building_id === buildingId &&
      room.floor_number === floorNumber
    );
  });

  for (const corridorRoom of corridorRooms) {
    if (corridorRoom.id == null) {
      continue;
    }

    const corridorSensors = this.sensors.filter(
      (sensor) => sensor.room_id === corridorRoom.id
    );

    const hasConflict = corridorSensors.some((sensor) => {
      if (sensor.x == null || sensor.y == null) {
        return false;
      }

      return (
        sensor.x >= newRoomRect.x &&
        sensor.x <= newRoomRect.x + newRoomRect.width &&
        sensor.y >= newRoomRect.y &&
        sensor.y <= newRoomRect.y + newRoomRect.height
      );
    });

    if (hasConflict) {
      return true;
    }
  }

  return false;
}


private validateRoomThresholds(formValue: RoomFormValue): string | null {
  const {
    temperature_min_value,
    temperature_optimum_value,
    temperature_max_value,
    humidity_min_value,
    humidity_optimum_value,
    humidity_max_value
  } = formValue;

  if (
    temperature_min_value != null &&
    temperature_optimum_value != null &&
    temperature_min_value > temperature_optimum_value
  ) {
    return 'Minimum sıcaklık değeri optimum sıcaklık değerinden büyük olamaz.';
  }

  if (
    temperature_max_value != null &&
    temperature_optimum_value != null &&
    temperature_max_value < temperature_optimum_value
  ) {
    return 'Maksimum sıcaklık değeri optimum sıcaklık değerinden küçük olamaz.';
  }

  if (
    temperature_min_value != null &&
    temperature_max_value != null &&
    temperature_min_value > temperature_max_value
  ) {
    return 'Minimum sıcaklık değeri maksimum sıcaklık değerinden büyük olamaz.';
  }

  if (
    humidity_min_value != null &&
    humidity_optimum_value != null &&
    humidity_min_value > humidity_optimum_value
  ) {
    return 'Minimum nem değeri optimum nem değerinden büyük olamaz.';
  }

  if (
    humidity_max_value != null &&
    humidity_optimum_value != null &&
    humidity_max_value < humidity_optimum_value
  ) {
    return 'Maksimum nem değeri optimum nem değerinden küçük olamaz.';
  }

  if (
    humidity_min_value != null &&
    humidity_max_value != null &&
    humidity_min_value > humidity_max_value
  ) {
    return 'Minimum nem değeri maksimum nem değerinden büyük olamaz.';
  }

  return null;
}

private validateRoomDimensionInputs(formValue: RoomFormValue): string | null {
  const hasWidthHeight =
    formValue.width != null && formValue.height != null;

  const hasLastCoordinates =
    formValue.last_x != null && formValue.last_y != null;

  const hasPartialWidthHeight =
    formValue.width != null || formValue.height != null;

  const hasPartialLastCoordinates =
    formValue.last_x != null || formValue.last_y != null;

  if (!hasWidthHeight && !hasLastCoordinates) {
    return 'Genişlik-yükseklik veya Son X-Son Y bilgilerinden biri girilmelidir.';
  }

  if (hasPartialWidthHeight && !hasWidthHeight) {
    return 'Genişlik ve yükseklik birlikte girilmelidir.';
  }

  if (hasPartialLastCoordinates && !hasLastCoordinates) {
    return 'Son X ve Son Y birlikte girilmelidir.';
  }

  return null;
}

onRoomSave(formValue: RoomFormValue): void {
  if (this.buildings.length === 0) {
    this.openAlert('Önce bir bina eklemelisiniz.');
    return;
  }

  if (this.currentBuildingId === null) {
    this.openAlert('Önce bir bina seçmelisiniz.');
    return;
  }

  if (this.selectedFloorNumber === null) {
    this.openAlert('Önce bir kat seçmelisiniz.');
    return;
  }

  if (
    formValue.temperature_max_value == null ||
    formValue.temperature_min_value == null ||
    formValue.temperature_optimum_value == null ||
    formValue.humidity_max_value == null ||
    formValue.humidity_min_value == null ||
    formValue.humidity_optimum_value == null
  ) {
    this.openAlert('Eksik verilerle oda ekleyemezsiniz.');
    return;
  }

  try {
    const normalizedFormValue: RoomFormValue = {
      ...formValue,
      buildingId: formValue.buildingId ?? this.currentBuildingId,
      floorNumber: formValue.floorNumber ?? this.selectedFloorNumber
    };

    const dimensionInputError = this.validateRoomDimensionInputs(normalizedFormValue);

if (dimensionInputError) {
  this.openAlert(dimensionInputError);
  return;
}

    const normalizedFormValueWithDimensions = this.normalizeRoomFormDimensions(
  normalizedFormValue
);

    const thresholdError = this.validateRoomThresholds(normalizedFormValueWithDimensions);
    if (thresholdError) {
      this.openAlert(thresholdError);
      return;
    }

    if (this.hasInvalidRoomPlacement(normalizedFormValueWithDimensions)) {
      this.openAlert('Bu oda yerleşimi geçersiz. Oda başka bir odayla birebir aynı olamaz ve yalnızca kısmi çakışma da içeremez.');
      return;
    }

if (this.hasCorridorSensorConflict(normalizedFormValueWithDimensions)) {
  this.openAlert(
    'Koridorda sensör bulunan bir alana oda eklenemez.'
  );
  return;
}

if (this.hasSensorConflictForRestrictedArea(normalizedFormValueWithDimensions)) {
  this.openAlert(
    'Ana odada sensör bulunan bir alana restricted area oluşturulamaz.'
  );
  return;
}

    console.log('onRoomSave this.rooms:', this.rooms);
    console.log('onRoomSave this.sensors:', this.sensors);
    console.log('onRoomSave formValue:', normalizedFormValueWithDimensions);

    if (this.hasSensorConflictForRestrictedArea(normalizedFormValueWithDimensions)) {
      this.openAlert(
        'Ana odada sensör bulunan bir alana restricted area oluşturulamaz.'
      );
      return;
    }

    const parentRooms = this.findParentRoomsForForm(normalizedFormValueWithDimensions);

    const payload: CreateRoomRequest = {
      ...mapRoomFormToCreateRoomRequest(normalizedFormValueWithDimensions)
    };

    this.roomApiService.createRoom(payload).subscribe({
      next: () => {
        this.roomModalOpen = false;
        this.roomFormData = this.createEmptyRoomForm();

        if (this.currentBuildingId !== null && this.selectedFloorNumber !== null) {
          this.loadFloorsByBuilding(this.currentBuildingId);

          this.syncParentRoomRestrictedAreas(parentRooms).subscribe({
            next: () => {
              this.loadRooms(this.currentBuildingId!, this.selectedFloorNumber!);
            },
            error: (error: unknown) => {
              console.error('Restricted area senkron hatası:', error);
              this.loadRooms(this.currentBuildingId!, this.selectedFloorNumber!);
            }
          });
        }
      },
      error: (error) => {
        console.error('Oda kaydedilemedi:', error);
        this.openAlert('Oda kaydedilemedi.');
      }
    });
  } catch (error) {
    console.error('Form verisi hatalı:', error);
    this.openAlert('Form verisi geçersiz.');
  }
}



onRoomUpdate(formValue: RoomFormValue): void {
  if (this.selectedRoomIdForUpdate === null) {
    return;
  }

  if (
    formValue.temperature_max_value == null ||
    formValue.temperature_min_value == null ||
    formValue.temperature_optimum_value == null ||
    formValue.humidity_max_value == null ||
    formValue.humidity_min_value == null ||
    formValue.humidity_optimum_value == null
  ) {
    this.openAlert('Eksik verilerle oda güncelleyemezsiniz.');
    return;
  }

  const selectedRoom = this.visibleRooms.find(
    (room) => room.id === this.selectedRoomIdForUpdate
  );

  if (!selectedRoom) {
    this.openAlert('Güncellenecek oda bulunamadı.');
    return;
  }

  try {
    const normalizedFormValue: RoomFormValue = {
      ...formValue,
      buildingId: formValue.buildingId ?? this.currentBuildingId,
      floorNumber: formValue.floorNumber ?? this.selectedFloorNumber
    };
    const dimensionInputError = this.validateRoomDimensionInputs(normalizedFormValue);

if (dimensionInputError) {
  this.openAlert(dimensionInputError);
  return;
}

    const normalizedFormValueWithDimensions = this.normalizeRoomFormDimensions(
  normalizedFormValue
);

    const thresholdError = this.validateRoomThresholds(normalizedFormValueWithDimensions);
    if (thresholdError) {
      this.openAlert(thresholdError);
      return;
    }

    if (
      this.hasInvalidRoomPlacementForUpdate(
        this.selectedRoomIdForUpdate,
        normalizedFormValueWithDimensions
      )
    ) {
      this.openAlert(
        'Bu oda yerleşimi geçersiz. Oda başka bir odayla birebir aynı olamaz ve yalnızca kısmi çakışma da içeremez.'
      );
      return;
    }

    console.log('onRoomUpdate this.rooms:', this.rooms);
    console.log('onRoomUpdate this.sensors:', this.sensors);
    console.log('onRoomUpdate formValue:', normalizedFormValueWithDimensions);
    console.log('selectedRoomIdForUpdate:', this.selectedRoomIdForUpdate);

    if (
      this.hasSensorConflictForRestrictedArea(
        normalizedFormValueWithDimensions,
        this.selectedRoomIdForUpdate
      )
    ) {
      this.openAlert(
        'Ana odada sensör bulunan bir alana restricted area taşınamaz.'
      );
      return;
    }


if (this.hasCorridorSensorConflict(normalizedFormValueWithDimensions)) {
  this.openAlert(
    'Koridorda sensör bulunan bir alana oda taşınamaz.'
  );
  return;
}

    const parentRooms = this.findParentRoomsForForm(
      normalizedFormValueWithDimensions,
      this.selectedRoomIdForUpdate
    );

    const payload: UpdateRoomRequest = {
      ...mapRoomFormToUpdateRoomRequest(normalizedFormValueWithDimensions),
      coordinate_id: selectedRoom.coordinate_id ?? null
    };

    this.roomApiService.updateRoom(this.selectedRoomIdForUpdate, payload).subscribe({
      next: () => {
        this.roomUpdateModalOpen = false;
        this.selectedRoomIdForUpdate = null;

        if (this.currentBuildingId !== null && this.selectedFloorNumber !== null) {
          this.syncParentRoomRestrictedAreas(
            parentRooms,
            selectedRoom.id
          ).subscribe({
            next: () => {
              this.loadRooms(this.currentBuildingId!, this.selectedFloorNumber!);
            },
            error: (error: unknown) => {
              console.error('Restricted area senkron hatası:', error);
              this.loadRooms(this.currentBuildingId!, this.selectedFloorNumber!);
            }
          });
        }
      },
      error: (error) => {
        console.error('Oda güncellenemedi:', error);
        this.openAlert('Oda güncellenemedi.');
      }
    });
  } catch (error) {
    console.error('Form verisi hatalı:', error);
    this.openAlert('Form verisi geçersiz.');
  }
}


private normalizeRoomFormDimensions(formValue: RoomFormValue): RoomFormValue {
  let width = formValue.width;
  let height = formValue.height;

  const hasWidthHeight =
    formValue.width != null && formValue.height != null;

  const hasLastCoordinates =
    formValue.x != null &&
    formValue.y != null &&
    formValue.last_x != null &&
    formValue.last_y != null;

  if (!hasWidthHeight && hasLastCoordinates) {
    width = formValue.last_x! - formValue.x!;
    height = formValue.y! - formValue.last_y!;
  }

  return {
    ...formValue,
    width,
    height
  };
}

onBuildingUpdate(formValue: BuildingFormValue): void {
  if (this.selectedBuildingIdForUpdate === null) {
    this.openAlert('Güncellenecek bina seçilmedi.');
    return;
  }

  const payload: UpdateBuildingRequest = {
    title: String(formValue.title ?? '').trim(),
    city: String(formValue.city ?? '').trim(),
    county: String(formValue.county ?? '').trim(),
    postcode: String(formValue.postcode ?? '').trim(),
    address: String(formValue.address ?? '').trim()
  };

  console.log('building update id:', this.selectedBuildingIdForUpdate);
  console.log('building update payload:', payload);

  this.buildingApiService.updateBuilding(this.selectedBuildingIdForUpdate, payload).subscribe({
    next: () => {
      this.buildingUpdateModalOpen = false;
      this.selectedBuildingIdForUpdate = null;
      this.buildingUpdateFormData = this.createEmptyBuildingForm();
      this.loadBuildings();
    },
    error: (error: any) => {
      console.error('Bina güncellenemedi:', error);
      this.openAlert(error?.error?.message ?? 'Bina güncellenemedi.');
    }
  });
}


private buildRestrictedAreasPayloadForCandidate(
  candidateRoom: RoomViewModel,
  excludeRoomId?: number
): RestrictedAreaDto[] {
  if (
    candidateRoom.id == null ||
    candidateRoom.x == null ||
    candidateRoom.y == null ||
    candidateRoom.width == null ||
    candidateRoom.height == null
  ) {
    return [];
  }

  const candidateRect = {
    x: candidateRoom.x,
    y: candidateRoom.y,
    width: candidateRoom.width,
    height: candidateRoom.height
  };

  const restrictedAreas: RestrictedAreaDto[] = [];

  for (const room of this.rooms) {
    if (room.is_corridor) {
      continue;
    }

    if (excludeRoomId != null && room.id === excludeRoomId) {
      continue;
    }

    if (room.id === candidateRoom.id) {
      continue;
    }

    if (
      room.building_id !== candidateRoom.building_id ||
      room.floor_number !== candidateRoom.floor_number
    ) {
      continue;
    }

    if (
      room.x == null ||
      room.y == null ||
      room.width == null ||
      room.height == null ||
      room.coordinate_id == null
    ) {
      continue;
    }

    const roomRect = {
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height
    };

    const isSame = this.isExactlySameRoom(candidateRect, roomRect);
    const roomInsideCandidate = this.isRoomFullyInside(roomRect, candidateRect);

    if (!isSame && roomInsideCandidate) {
      restrictedAreas.push({
        room_id: candidateRoom.id,
        coordinate_id: room.coordinate_id
      });
    }
  }

  return restrictedAreas;
}

private syncParentRoomRestrictedAreas(
  parentRooms: RoomViewModel[],
  excludeRoomId?: number
): Observable<null> {
  const validParentRooms = parentRooms.filter(
    (parentRoom) => parentRoom.id != null
  );

  if (!validParentRooms.length) {
    return of(null);
  }

  const requests = validParentRooms.map((parentRoom) => {
    const newRestrictedAreas = this.buildRestrictedAreasPayloadForCandidate(
      parentRoom,
      excludeRoomId
    );

    return this.restrictedAreaApiService
      .getRestrictedAreasByRoomId(parentRoom.id as number)
      .pipe(
        switchMap((existingRestrictedAreas) => {
          const deleteRequests = existingRestrictedAreas.map((area) =>
            this.restrictedAreaApiService.deleteRestrictedArea(area.id as number)
          );

          const deleteAll$ = deleteRequests.length > 0
            ? forkJoin(deleteRequests)
            : of([]);

          return deleteAll$.pipe(
            switchMap(() => {
              const createRequests = newRestrictedAreas.map((area) =>
                this.restrictedAreaApiService.createRestrictedArea(area)
              );

              return createRequests.length > 0
                ? forkJoin(createRequests)
                : of([]);
            })
          );
        })
      );
  });

  return forkJoin(requests).pipe(map(() => null));
}

private findParentRoomsForForm(
  formValue: RoomFormValue,
  excludeRoomId?: number
): RoomViewModel[] {
  const buildingId = formValue.buildingId ?? this.currentBuildingId;
  const floorNumber = formValue.floorNumber ?? this.selectedFloorNumber;

  if (
    buildingId == null ||
    floorNumber == null ||
    formValue.x == null ||
    formValue.y == null ||
    formValue.width == null ||
    formValue.height == null
  ) {
    return [];
  }

  const currentRect = {
    x: formValue.x,
    y: formValue.y,
    width: formValue.width,
    height: formValue.height
  };

  return this.rooms.filter(room => {
    if (room.is_corridor) {
      return false;
    }

    if (excludeRoomId != null && room.id === excludeRoomId) {
      return false;
    }

    if (
      room.building_id !== buildingId ||
      room.floor_number !== floorNumber
    ) {
      return false;
    }

    if (
      room.x == null ||
      room.y == null ||
      room.width == null ||
      room.height == null
    ) {
      return false;
    }

    const parentRect = {
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height
    };

    const isSame = this.isExactlySameRoom(currentRect, parentRect);
    const currentInsideParent = this.isRoomFullyInside(currentRect, parentRect);

    return !isSame && currentInsideParent;
  });
}

get visibleBuildingUpdateOptions(): { id: number; title: string }[] {
  return this.buildings
    .filter((building) => building.id !== undefined)
    .map((building) => ({
      id: building.id as number,
      title: building.title
    }));
}

get visibleBuildingDeleteOptions(): { id: number; title: string }[] {
  return this.buildings
    .filter((building) => building.id !== undefined)
    .map((building) => ({
      id: building.id as number,
      title: building.title
    }));
}

  get visibleRoomUpdateOptions(): { id: number; title: string }[] {
  return this.visibleRooms
    .filter((room) => room.id !== undefined)
    .map((room) => ({
      id: room.id as number,
      title: room.title
    }));
}
get visibleRoomDeleteOptions(): { id: number; title: string }[] {
  return this.visibleRooms
    .filter((room) => room.id !== undefined)
    .map((room) => ({
      id: room.id as number,
      title: room.title
    }));
}

get visibleSensorUpdateOptions(): { id: number; title: string }[] {
  return this.visibleSensors
    .filter((sensor) => sensor.id !== undefined)
    .map((sensor) => ({
      id: sensor.id as number,
      title: sensor.title
    }));
}

get visibleSensorDeleteOptions(): { id: number; title: string }[] {
  return this.visibleSensors
    .filter((sensor) => sensor.id !== undefined)
    .map((sensor) => ({
      id: sensor.id as number,
      title: sensor.title
    }));
}

onBuildingSelectedForUpdate(buildingId: number | null): void {
  console.log('buildingId:', buildingId);
  console.log('this.buildings:', this.buildings);
  this.selectedBuildingIdForUpdate = buildingId;

  if (buildingId === null) {
    this.buildingUpdateFormData = this.createEmptyBuildingForm();
    return;
  }

  const target = this.buildings.find((building) => building.id === buildingId);
  console.log('target:', target);

  console.log('Seçilen bina:', target);

  if (!target) {
    return;
  }

  this.buildingUpdateFormData = {
    title: target.title ?? '',
    city: target.city ?? '',
    county: target.county ?? '',
    postcode: target.postcode ?? '',
    address: target.address ?? ''
  };
}

onRoomSelectedForUpdate(roomId: number): void {
  this.selectedRoomIdForUpdate = roomId;

  const target = this.visibleRooms.find((room) => room.id === roomId);
  if (!target) {
    return;
  }

  this.roomUpdateFormData = {
    title: target.title,
    buildingId: target.building_id,
    floorNumber: target.floor_number,
    x: target.x,
    y: target.y,
    width: target.width,
    height: target.height,
    last_x:
    target.x != null && target.width != null
      ? target.x + target.width
      : null,
    last_y:
    target.y != null && target.height != null
      ? target.y - target.height
      : null,
    temperature_min_value: target.temperature_min_value ?? null,
    temperature_max_value: target.temperature_max_value ?? null,
    temperature_optimum_value: target.temperature_optimum_value ?? null,

    humidity_min_value: target.humidity_min_value ?? null,
    humidity_max_value: target.humidity_max_value ?? null,
    humidity_optimum_value: target.humidity_optimum_value ?? null
    };
  
}

onSensorSelectedForUpdate(sensorId: number): void {
  this.selectedSensorIdForUpdate = sensorId;

  const target = this.visibleSensors.find((sensor) => sensor.id === sensorId);
  if (!target) {
    return;
  }
  this.sensorUpdateFormData = {
  title: target.title,
  type: target.type,
  sensorRoom: Number(target.room_id),
  x: target.x,
  y: target.y
};
console.log('sensorUpdateFormData:', this.sensorUpdateFormData);
}

onBuildingDelete(): void {
  if (this.selectedBuildingIdForDelete === null) {
    this.openAlert('Silinecek bina seçilmedi.');
    return;
  }

  const buildingIdToDelete = this.selectedBuildingIdForDelete;

  this.buildingApiService.deleteBuilding(buildingIdToDelete).subscribe({
    next: () => {
      this.buildings = this.buildings.filter(
        (building) => building.id !== buildingIdToDelete
      );

      if (this.currentBuildingId === buildingIdToDelete) {
        this.currentBuildingId = null;
        this.selectedFloorNumber = null;
        this.floors = [];
        this.rooms = [];
        this.sensors = [];
      }

      this.buildingDeleteModalOpen = false;
      this.selectedBuildingIdForDelete = null;

      this.loadBuildings();
    },
    error: (error) => {
      console.error('Bina silinemedi:', error);
      this.openAlert(error?.error?.message ?? 'Bina silinemedi.');
    }
  });
}

  onRoomDelete(): void {
  if (this.selectedRoomIdForDelete === null) {
    return;
  }

  const roomIdToDelete = this.selectedRoomIdForDelete;

  this.roomApiService.deleteRoom(roomIdToDelete).subscribe({
    next: () => {
      this.rooms = this.rooms.filter((room) => room.id !== roomIdToDelete);
      this.sensors = this.sensors.filter(
        (sensor) => sensor.room_id !== roomIdToDelete
      );

      this.rebuildRoomHierarchy();

      this.roomDeleteModalOpen = false;
      this.selectedRoomIdForDelete = null;
    },
    error: (error) => {
      console.error('Oda silinemedi:', error);
      this.openAlert('Oda silinemedi.');
    }
  });
}


private isPointInsideRestrictedArea(
  x: number,
  y: number,
  area: RestrictedAreaViewModel
): boolean {
  const left = area.x;
  const right = area.x + area.width;
  const top = area.y;
  const bottom = area.y - area.height;

  return x >= left && x <= right && y <= top && y >= bottom;
}

private isSensorInsideAnyRestrictedArea(
  x: number,
  y: number,
  room: RoomViewModel
): boolean {
  return room.restrictedAreas.some((area) =>
    this.isPointInsideRestrictedArea(x, y, area)
  );
}

onSensorSave(formValue: SensorFormValue): void {
  if (
    formValue.sensorRoom == null ||
    formValue.x == null ||
    formValue.y == null
  ) {
    this.openAlert('Geçersiz sensör verisi.');
    return;
  }

  const roomId = Number(formValue.sensorRoom);

  const targetRoom = this.rooms.find(room => room.id === roomId);

  if (!targetRoom) {
    this.openAlert('Seçilen oda bulunamadı.');
    return;
  }

  const payload = {
    title: formValue.title.trim(),
    type: formValue.type.trim(),
    room_id: roomId,
    coordinate: {
      start_coordinate_x: formValue.x,
      start_coordinate_y: formValue.y,
      width: 1,
      height: 1
    }
  };

  this.sensorApiService.createSensor(payload).subscribe({
    next: () => {
      this.sensorModalOpen = false;
      this.sensorFormData = this.createEmptySensorForm();
      // this.loadSensorsForCurrentRooms();
      if (this.currentBuildingId !== null && this.selectedFloorNumber !== null) {
        this.loadRooms(this.currentBuildingId, this.selectedFloorNumber);
      }
    },
    error: (error) => {
      console.error('Sensör kaydedilemedi:', error);
      this.openAlert(error?.error?.message ?? 'Sensör kaydedilemedi.');
    }
  });
}

onSensorUpdate(formValue: SensorFormValue): void {
  if (this.selectedSensorIdForUpdate === null) {
    return;
  }

  if (
  formValue.sensorRoom === null ||
  formValue.x === null ||
  formValue.y === null 
) {
  this.openAlert('Geçersiz sensör verisi.');
  return;
}

  const roomId = Number(formValue.sensorRoom);
  const targetRoom = this.rooms.find((room) => room.id === roomId);

  if (!targetRoom) {
    this.openAlert('Seçilen oda bulunamadı.');
    return;
  }

  const sameNameSensorExists = this.sensors.some((sensor) =>
    sensor.id !== this.selectedSensorIdForUpdate &&
    sensor.room_id === roomId &&
    sensor.title.trim().toLowerCase() === formValue.title.trim().toLowerCase()
  );

  if (sameNameSensorExists) {
    this.openAlert('Aynı odada aynı adda başka bir sensör zaten mevcut.');
    return;
  }

  if (formValue.x === null || formValue.y === null) {
    this.openAlert('Geçersiz sensör koordinatı.');
    return;
  }

  const sensorX = formValue.x;
  const sensorY = formValue.y;


  if (!targetRoom.is_corridor) {
  const isInsideRoom = this.isSensorInsideRoom(sensorX, sensorY, targetRoom);

  if (!isInsideRoom) {
    this.openAlert('Girilen koordinatlar seçilen odanın sınırları ile uyuşmuyor. Sensör güncellenemedi.');
    return;
  }

  const isInsideRestrictedArea = this.isSensorInsideAnyRestrictedArea(sensorX, sensorY, targetRoom);

  if (isInsideRestrictedArea) {
    this.openAlert("Girilen koordinat restricted area içinde bulunuyor. Sensör bu alana taşınamaz.");
    return;
  }
}


const payload = {
  title: formValue.title.trim(),
  type: formValue.type.trim(),
  room_id: roomId,
  coordinate: {
    start_coordinate_x: sensorX,
    start_coordinate_y: sensorY,
    width: 1,
    height: 1
  },
};

  this.sensorApiService.updateSensor(this.selectedSensorIdForUpdate, payload).subscribe({
    next: () => {
      this.sensorUpdateModalOpen = false;
      this.selectedSensorIdForUpdate = null;
      // this.loadSensorsForCurrentRooms();
      if (this.currentBuildingId !== null && this.selectedFloorNumber !== null) {
        this.loadRooms(this.currentBuildingId, this.selectedFloorNumber);
      }
    },
    error: (error) => {
      console.error('Sensör güncellenemedi:', error);
      this.openAlert(error?.error?.message ?? 'Sensör güncellenemedi.');
    }
  });
}

onSensorDelete(): void {
  if (this.selectedSensorIdForDelete === null) {
    return;
  }

  this.sensorApiService.deleteSensor(this.selectedSensorIdForDelete).subscribe({
    next: () => {
      this.sensorDeleteModalOpen = false;
      this.selectedSensorIdForDelete = null;
      // this.loadSensorsForCurrentRooms();
      if (this.currentBuildingId !== null && this.selectedFloorNumber !== null) {
        this.loadRooms(this.currentBuildingId, this.selectedFloorNumber);
      }
    },
    error: (error) => {
      console.error('Sensör silinemedi:', error);
      this.openAlert('Sensör silinemedi.');
    }
  });
}

  addBuilding(): void {
    this.openAddBuildingModal();
  }

  updateBuilding(): void {
  this.openUpdateBuildingModal();
}
  
  deleteBuilding(): void {
  this.openDeleteBuildingModal();
}

  addFloor(): void {
    this.openAddFloorModal();
  }

  addRoom(): void {
    this.openAddRoomModal();
  }

  updateRoom(): void {
    this.openUpdateRoomModal();
  }

  deleteRoom(): void {
  this.openDeleteRoomModal();
}

  addSensor(): void {
    this.openAddSensorModal();
  }

  updateSensor(): void {
    this.openUpdateSensorModal();
  }

  deleteSensor(): void {
    this.openDeleteSensorModal();
  }

  coordinateToViewModel(coordinate: Coordinate) {
    return {
      x: coordinate.start_coordinate_x,
      y: coordinate.start_coordinate_y,
      width: coordinate.width,
      height: coordinate.height,
      x_last: coordinate.start_coordinate_x + coordinate.width,
      y_last: coordinate.start_coordinate_y - coordinate.height
    };
  }

roomToViewModel(room: any): RoomViewModel {
  const restrictedAreasSource = room.restrictedAreas ?? room.restricted_areas ?? [];

  const coordinateValues = room.coordinate
    ? this.coordinateToViewModel(room.coordinate)
    : {
        x: null,
        y: null,
        width: null,
        height: null,
        x_last: null,
        y_last: null
      };

  return {
    id: room.id,
    title: room.title,
    floor_number: room.floor_number,
    building_id: room.building_id,
    coordinate_id: room.coordinate_id ?? null,
    is_corridor: room.is_corridor === true,
    titleLeft: 8,
    titleTop: 8,
    temperature_min_value: room.temperature_min_value ?? null,
    temperature_max_value: room.temperature_max_value ?? null,
    temperature_optimum_value: room.temperature_optimum_value ?? null,

    humidity_min_value: room.humidity_min_value ?? null,
    humidity_max_value: room.humidity_max_value ?? null,
    humidity_optimum_value: room.humidity_optimum_value ?? null,

    statusColor: 'unknown',
    avgTemperature: null,
    avgHumidity: null,

    ...coordinateValues,
    restrictedAreas: restrictedAreasSource.map((area: RestrictedArea) =>
      this.restrictedAreaToViewModel(area)
    )
  };
}

  restrictedAreaToViewModel(area: RestrictedArea): RestrictedAreaViewModel {
    const coordinateValues = this.coordinateToViewModel(area.coordinate);

    return {
      id: area.id,
      room_id: area.room_id,
      title: `Restricted-${area.id ?? 'temp'}`,
      ...coordinateValues
    };
  }


private getSensorsByRoomId(roomId: number): SensorViewModel[] {
  return this.sensors.filter(sensor => sensor.room_id === roomId);
}


private getRoomAverageValues(roomId: number): {
  avgTemperature: number | null;
  avgHumidity: number | null;
} {
  const roomSensors = this.getSensorsByRoomId(roomId);

  const temperatureValues = roomSensors
    .map(sensor => sensor.sicaklik)
    .filter((value): value is number => typeof value === 'number');

  const humidityValues = roomSensors
    .map(sensor => sensor.nem)
    .filter((value): value is number => typeof value === 'number');

  const avgTemperature =
    temperatureValues.length > 0
      ? temperatureValues.reduce((sum, value) => sum + value, 0) / temperatureValues.length
      : null;

  const avgHumidity =
    humidityValues.length > 0
      ? humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length
      : null;

  return {
    avgTemperature,
    avgHumidity
  };
}

private getRoomStatus(
  avgTemp: number | null,
  avgHumidity: number | null,
  room: RoomViewModel
): 'normal' | 'warning' | 'critical' | 'unknown' {
  let tempStatus: 'normal' | 'warning' | 'critical' | 'unknown' = 'unknown';
  let humidityStatus: 'normal' | 'warning' | 'critical' | 'unknown' = 'unknown';

  if (
    avgTemp != null &&
    room.temperature_min_value != null &&
    room.temperature_max_value != null &&
    room.temperature_optimum_value != null
  ) {
    if (avgTemp < room.temperature_min_value || avgTemp > room.temperature_max_value) {
      tempStatus = 'critical';
    } else if (Math.abs(avgTemp - room.temperature_optimum_value) < 0.0001) {
      tempStatus = 'normal';
    } else {
      tempStatus = 'warning';
    }
  }

  if (
    avgHumidity != null &&
    room.humidity_min_value != null &&
    room.humidity_max_value != null &&
    room.humidity_optimum_value != null
  ) {
    if (avgHumidity < room.humidity_min_value || avgHumidity > room.humidity_max_value) {
      humidityStatus = 'critical';
    } else if (Math.abs(avgHumidity - room.humidity_optimum_value) < 0.0001) {
      humidityStatus = 'normal';
    } else {
      humidityStatus = 'warning';
    }
  }

  if (tempStatus === 'critical' || humidityStatus === 'critical') {
    return 'critical';
  }

  if (tempStatus === 'warning' || humidityStatus === 'warning') {
    return 'warning';
  }

  if (tempStatus === 'normal' || humidityStatus === 'normal') {
    return 'normal';
  }

  return 'unknown';
}

private refreshRoomStatuses(): void {
  this.rooms = this.rooms.map(room => {
    if (room.is_corridor || room.id == null) {
      return {
        ...room,
        statusColor: 'unknown',
        avgTemperature: null,
        avgHumidity: null
      };
    }

    const { avgTemperature, avgHumidity } = this.getRoomAverageValues(room.id);
    const statusColor = this.getRoomStatus(avgTemperature, avgHumidity, room);

    return {
      ...room,
      avgTemperature,
      avgHumidity,
      statusColor
    };
  });

  this.rebuildRoomHierarchy();
  this.rebuildRoomHierarchy();
  // this.notifyIfRoomStatusIncreased();
  this.notifyNewProblemRooms();
}



sensorToViewModel(sensor: Sensor, floor_number?: number): SensorViewModel {
  return {
    id: sensor.id,
    title: sensor.title,
    type: sensor.type,
    room_id: sensor.room_id,
    coordinate_id: sensor.coordinate_id,
    floor_number,
    x: sensor.coordinate?.start_coordinate_x ?? 0,
    y: sensor.coordinate?.start_coordinate_y ?? 0,
    current_value: null,
    statusColor: 'unknown'
  };
}

  viewModelToCoordinate(
    x: number,
    y: number,
    width: number,
    height: number,
    coordinate_id?: number
  ): Coordinate {
    return {
      id: coordinate_id,
      start_coordinate_x: x,
      start_coordinate_y: y,
      width,
      height
    };
  }


viewModelToRoom(room: RoomViewModel): Room {
  return {
    id: room.id,
    title: room.title,
    floor_number: room.floor_number,
    building_id: room.building_id,
    coordinate_id: room.coordinate_id ?? null,
    is_corridor: room.is_corridor,

    temperature_min_value: room.temperature_min_value ?? null,
    temperature_max_value: room.temperature_max_value ?? null,
    temperature_optimum_value: room.temperature_optimum_value ?? null,
    humidity_min_value: room.humidity_min_value ?? null,
    humidity_max_value: room.humidity_max_value ?? null,
    humidity_optimum_value: room.humidity_optimum_value ?? null,

    coordinate:
      room.is_corridor ||
      room.x === null ||
      room.y === null ||
      room.width === null ||
      room.height === null
        ? null
        : this.viewModelToCoordinate(
            room.x,
            room.y,
            room.width,
            room.height,
            room.coordinate_id ?? undefined
          ),

    restricted_areas: room.restrictedAreas.map((area) =>
      this.viewModelToRestrictedArea(area)
    )
  };
}

  viewModelToRestrictedArea(area: RestrictedAreaViewModel): RestrictedArea {
    return {
      id: area.id,
      room_id: area.room_id,
      coordinate: this.viewModelToCoordinate(
        area.x,
        area.y,
        area.width,
        area.height
      )
    };
  }

viewModelToSensor(sensor: SensorViewModel): Sensor {
  if (sensor.id === undefined || sensor.coordinate_id === undefined) {
    throw new Error('Sensör id veya coordinate_id eksik.');
  }

  return {
    id: sensor.id,
    title: sensor.title,
    type: sensor.type,
    room_id: sensor.room_id,
    coordinate_id: sensor.coordinate_id,
    coordinate: {
      id: sensor.coordinate_id,
      start_coordinate_x: sensor.x,
      start_coordinate_y: sensor.y,
      width: 1,
      height: 1
    },
  };
}


lastWarningRoomCount = 0;
lastCriticalRoomCount = 0;

toastVisible = false;
toastMessage = '';
toastType: 'warning' | 'critical' = 'warning';
private toastTimeout: ReturnType<typeof setTimeout> | null = null;

showToast(message: string, type: 'warning' | 'critical'): void {
  this.toastMessage = message;
  this.toastType = type;
  this.toastVisible = true;

  if (this.toastTimeout) {
    clearTimeout(this.toastTimeout);
  }

  this.toastTimeout = setTimeout(() => {
    this.toastVisible = false;
    this.toastTimeout = null;
  }, 3500);
}

closeToast(): void {
  this.toastVisible = false;

  if (this.toastTimeout) {
    clearTimeout(this.toastTimeout);
    this.toastTimeout = null;
  }
}


private previousProblemRoomKeys = new Set<string>();

private getProblemRoomKey(room: RoomViewModel): string {
  return `${room.building_id}-${room.floor_number}-${room.id}-${room.statusColor}`;
}


private notifyNewProblemRooms(): void {
  const currentProblemRooms = this.problematicRooms.filter(
    room => room.statusColor === 'warning' || room.statusColor === 'critical'
  );

  const currentKeys = new Set(
    currentProblemRooms.map(room => this.getProblemRoomKey(room))
  );

  const newCriticalRoom = currentProblemRooms.find(
    room =>
      room.statusColor === 'critical' &&
      !this.previousProblemRoomKeys.has(this.getProblemRoomKey(room))
  );

  if (newCriticalRoom) {
    this.showToast(`Kritik: ${newCriticalRoom.title}`, 'critical');
    this.previousProblemRoomKeys = currentKeys;
    return;
  }

  const newWarningRoom = currentProblemRooms.find(
    room =>
      room.statusColor === 'warning' &&
      !this.previousProblemRoomKeys.has(this.getProblemRoomKey(room))
  );

  if (newWarningRoom) {
    this.showToast(`Uyarı: ${newWarningRoom.title}`, 'warning');
  }

  this.previousProblemRoomKeys = currentKeys;
}

}
