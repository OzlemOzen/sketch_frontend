import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BuildingApiService } from '../../buildings/services/building-api.service';
import { RoomApiService } from '../../rooms/services/room-api.service';
import { SensorApiService } from '../services/sensor-api.service';
import { Building, Room, Sensor, SensorViewModel } from '../../../models/data';

// interface FaultySensorItem {
//   sensorId: number;
//   title: string;
//   floorNumber: number | string;
//   roomTitle: string;
//   type: string;
//   status: 'warning' | 'critical' | 'offline';
//   statusText: string;
//   message: string;
//   updatedAt: string;
// }

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

interface MonitorSensorItem extends SensorViewModel {
  building_id: number;
  building_title: string;
  room_title: string;
}

@Component({
  selector: 'app-sensor-monitor',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sensor-monitor.component.html',
  styleUrls: ['./sensor-monitor.component.scss']
})
export class SensorMonitorComponent implements OnInit, OnDestroy {
  private readonly buildingApiService = inject(BuildingApiService);
  private readonly roomApiService = inject(RoomApiService);
  private readonly sensorApiService = inject(SensorApiService);

  buildingGroups: BuildingSensorGroup[] = [];
  loading = false;

  private ws?: WebSocket;

  private buildings: Building[] = [];
  private rooms: Room[] = [];
  private monitorSensors: MonitorSensorItem[] = [];

  ngOnInit(): void {
    this.loadAllData();
  }

  ngOnDestroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  loadAllData(): void {
    this.loading = true;

    this.buildingApiService.getBuildings().pipe(
      map((result: any) => {
        const buildings: Building[] = Array.isArray(result)
          ? result
          : Array.isArray(result?.response)
            ? result.response
            : [];

        return buildings.filter(
          (building) => building.id !== undefined && building.id !== null
        );
      }),
      switchMap((buildings: Building[]) => {
        this.buildings = buildings;

        if (!buildings.length) {
          return of([]);
        }

        const roomRequests = buildings.map((building) =>
          this.roomApiService.getRoomsByBuildingId(building.id as number).pipe(
            map((rooms: Room[]) => ({
              building,
              rooms
            }))
          )
        );

        return forkJoin(roomRequests);
      }),
      switchMap((roomResults: { building: Building; rooms: Room[] }[]) => {
        this.rooms = roomResults.flatMap((result) => result.rooms);

        const allRoomIds = this.rooms
          .map((room) => room.id)
          .filter((id): id is number => id !== undefined && id !== null);

        if (!allRoomIds.length) {
          return of([] as Sensor[]);
        }

        return this.sensorApiService.getSensorsByRoomIds(allRoomIds);
      })
    ).subscribe({
      next: (sensors: Sensor[]) => {
        this.monitorSensors = sensors
          .map((sensor) => this.mapSensorToMonitorSensor(sensor))
          .filter((sensor): sensor is MonitorSensorItem => sensor !== null);

        this.refreshBuildingGroups();
        this.initWebSocket();
        this.loading = false;
      },
      error: (error: unknown) => {
        console.error('Sensör monitor verileri yüklenemedi:', error);
        this.buildingGroups = [];
        this.loading = false;
      }
    });
  }

  private mapSensorToMonitorSensor(sensor: Sensor): MonitorSensorItem | null {
    const room = this.rooms.find((r) => r.id === sensor.room_id);
    if (!room) {
      return null;
    }

    const building = this.buildings.find((b) => b.id === room.building_id);
    if (!building || building.id === undefined) {
      return null;
    }

    return {
      id: sensor.id,
      title: sensor.title,
      type: sensor.type,
      room_id: sensor.room_id,
      coordinate_id: sensor.coordinate_id,
      floor_number: room.floor_number,
      x: sensor.coordinate?.start_coordinate_x ?? 0,
      y: sensor.coordinate?.start_coordinate_y ?? 0,
      // optimum_value: sensor.optimum_value ?? null,
      // min_value: sensor.min_value ?? null,
      // max_value: sensor.max_value ?? null,
      current_value: null,
      statusColor: 'unknown',
      building_id: building.id,
      building_title: building.title,
      room_title: room.title
    };
  }

  private initWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.ws = new WebSocket('ws://localhost:3000');

    this.ws.onopen = () => {
      console.log('Sensor monitor WS bağlandı');
    };

    this.ws.onerror = (error) => {
      console.error('Sensor monitor WS hata:', error);
    };

    this.ws.onclose = () => {
      console.log('Sensor monitor WS bağlantısı kapandı');
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


private handleSensorStreamMessage(message: any): void {
  if (!message || typeof message.sensor_id !== 'number') {
    return;
  }

  const index = this.monitorSensors.findIndex(
    sensor => sensor.id === message.sensor_id
  );

  if (index === -1) {
    return;
  }

  const sensor = { ...this.monitorSensors[index] };

  sensor.sicaklik =
    typeof message.sicaklik === 'number' ? message.sicaklik : sensor.sicaklik;

  sensor.nem =
    typeof message.nem === 'number' ? message.nem : sensor.nem;

  sensor.lastUpdated =
    typeof message.timestamp === 'number' ? message.timestamp : sensor.lastUpdated;

  // sensor.statusColor = this.getOverallSensorStatus(sensor);
  sensor.statusColor = 'unknown';

  this.monitorSensors[index] = sensor;
  this.monitorSensors = [...this.monitorSensors];

  this.refreshBuildingGroups();
}

// private getOverallSensorStatus(
//   sensor: MonitorSensorItem
// ): 'green' | 'yellow' | 'red' | 'unknown' {
//   const metricStatuses: ('green' | 'yellow' | 'red' | 'unknown')[] = [];

//   if (typeof sensor.sicaklik === 'number') {
//     metricStatuses.push(
//       this.getMetricStatus(
//         sensor.sicaklik,
//         sensor.temperature_optimum_value,
//         sensor.temperature_min_value,
//         sensor.temperature_max_value
//       )
//     );
//   }

//   if (typeof sensor.nem === 'number') {
//     metricStatuses.push(
//       this.getMetricStatus(
//         sensor.nem,
//         sensor.humidity_optimum_value,
//         sensor.humidity_min_value,
//         sensor.humidity_max_value
//       )
//     );
//   }

//   if (!metricStatuses.length) {
//     return 'unknown';
//   }

//   if (metricStatuses.includes('red')) {
//     return 'red';
//   }

//   if (metricStatuses.includes('yellow')) {
//     return 'yellow';
//   }

//   if (metricStatuses.includes('green')) {
//     return 'green';
//   }

//   return 'unknown';
// }

// private getOverallSensorStatus(
//   sensor: MonitorSensorItem
// ): 'green' | 'yellow' | 'red' | 'unknown' {
//   const metricStatuses: ('green' | 'yellow' | 'red' | 'unknown')[] = [];

//   if (typeof sensor.sicaklik === 'number') {
//     metricStatuses.push(
//       this.getMetricStatus(
//         sensor.sicaklik,
//       )
//     );
//   }

//   if (typeof sensor.nem === 'number') {
//     metricStatuses.push(
//       this.getMetricStatus(
//         sensor.nem,
//       )
//     );
//   }

//   if (!metricStatuses.length) {
//     return 'unknown';
//   }

//   if (metricStatuses.includes('red')) {
//     return 'red';
//   }

//   if (metricStatuses.includes('yellow')) {
//     return 'yellow';
//   }

//   if (metricStatuses.includes('green')) {
//     return 'green';
//   }

//   return 'unknown';
// }

private getMetricStatus(
  currentValue: number | null | undefined,
  minValue: number | null,
  maxValue: number | null,
  optimumValue: number | null
): 'green' | 'yellow' | 'red' | 'unknown' {
  if (
    currentValue === null ||
    currentValue === undefined ||
    minValue === null ||
    maxValue === null ||
    optimumValue === null
  ) {
    return 'unknown';
  }

  const isOptimum = Math.abs(currentValue - optimumValue) < 0.0001;

  if (currentValue < minValue || currentValue > maxValue) {
    return 'red';
  }

  if (isOptimum) {
    return 'green';
  }

  return 'yellow';
}

//   private handleSensorStreamMessage(message: any): void {
//   if (!message || typeof message.sensor_id !== 'number') {
//     return;
//   }

//   const index = this.monitorSensors.findIndex(
//     (sensor) => sensor.id === message.sensor_id
//   );

//   console.log('Gelen sensor_id:', message.sensor_id);
//   console.log('Eşleşen index:', index);

//   if (index === -1) {
//     return;
//   }

//   const sensor = { ...this.monitorSensors[index] };
//   const liveValue = this.getLiveValueBySensorType(sensor, message);

//   console.log('Sensör tipi:', sensor.type);
//   console.log('Hesaplanan liveValue:', liveValue);

//   sensor.current_value = liveValue;
//   sensor.statusColor = this.getSensorStatusColor(sensor, liveValue);

//   console.log('Yeni statusColor:', sensor.statusColor);

//   this.monitorSensors[index] = sensor;
//   this.monitorSensors = [...this.monitorSensors];

//   this.refreshBuildingGroups();
// }

private readonly sensorTypeValueKeyMap: Record<string, string> = {
  sicaklik: 'sicaklik',
  sıcaklık: 'sicaklik',
  temperature: 'sicaklik',
  isi: 'sicaklik',
  ısı: 'sicaklik',
  nem: 'nem',
  humidity: 'nem'
};

// private getLiveValueBySensorType(
//   sensor: MonitorSensorItem,
//   message: any
// ): number | null {
//   const sensorType = (sensor.type ?? '').toLowerCase().trim();

//   const matchedEntry = Object.entries(this.sensorTypeValueKeyMap).find(
//     ([typeAlias]) => sensorType.includes(typeAlias)
//   );

//   if (!matchedEntry) {
//     return null;
//   }

//   const valueKey = matchedEntry[1];
//   const value = message[valueKey];

//   return typeof value === 'number' ? value : null;
// }

  // private getSensorStatusColor(
  //   sensor: MonitorSensorItem,
  //   currentValue: number | null | undefined
  // ): 'green' | 'yellow' | 'red' | 'unknown' {
  //   if (
  //     currentValue === null ||
  //     currentValue === undefined ||
  //     sensor.min_value === null ||
  //     sensor.max_value === null ||
  //     sensor.optimum_value === null
  //   ) {
  //     return 'unknown';
  //   }

  //   const isOptimum = Math.abs(currentValue - sensor.optimum_value) < 0.0001;

  //   if (currentValue < sensor.min_value || currentValue > sensor.max_value) {
  //     return 'red';
  //   }

  //   if (isOptimum) {
  //     return 'green';
  //   }

  //   if (
  //     (currentValue >= sensor.min_value && currentValue < sensor.optimum_value) ||
  //     (currentValue > sensor.optimum_value && currentValue <= sensor.max_value)
  //   ) {
  //     return 'yellow';
  //   }

  //   return 'unknown';
  // }

  private refreshBuildingGroups(): void {
    const groupedMap = new Map<number, BuildingSensorGroup>();

    for (const building of this.buildings) {
      if (building.id === undefined) {
        continue;
      }

      groupedMap.set(building.id, {
        buildingId: building.id,
        buildingTitle: building.title,
        warningCount: 0,
        criticalCount: 0,
        sensors: []
      });
    }

    this.monitorSensors
      .filter((sensor) => sensor.statusColor === 'yellow' || sensor.statusColor === 'red')
      .forEach((sensor) => {
        const group = groupedMap.get(sensor.building_id);
        if (!group) {
          return;
        }

        let status: 'warning' | 'critical' | 'offline' = 'offline';
        let statusText = 'Bilinmiyor';
        let message = 'Sensör verisi değerlendirilemedi.';

        if (sensor.statusColor === 'red') {
          status = 'critical';
          statusText = 'Kritik';
          message = `${sensor.title} sensöründe en az bir ölçüm kritik seviyeye çıktı.`;
          group.criticalCount++;
        } else if (sensor.statusColor === 'yellow') {
          status = 'warning';
          statusText = 'Uyarı';
          message = `${sensor.title} sensöründe en az bir ölçüm optimum değerden sapma gösteriyor.`;
          group.warningCount++;
        }

        // group.sensors.push({
        //   sensorId: sensor.id as number,
        //   title: sensor.title,
        //   floorNumber: sensor.floor_number ?? '-',
        //   roomTitle: sensor.room_title,
        //   type: sensor.type,
        //   status,
        //   statusText,
        //   message,
        //   updatedAt: sensor.lastUpdated
        //     ? new Date(sensor.lastUpdated * 1000).toLocaleTimeString('tr-TR')
        //     : '-'
        // });
        group.sensors.push({
          sensorId: sensor.id as number,
          title: sensor.title,
          floorNumber: sensor.floor_number ?? '-',
          roomTitle: sensor.room_title,
          type: sensor.type,
          status,
          statusText,
          message,
          updatedAt: sensor.lastUpdated
          ? new Date(sensor.lastUpdated * 1000).toLocaleTimeString('tr-TR')
          : '-',
          sicaklik: sensor.sicaklik,
          nem: sensor.nem
        });
      });

    this.buildingGroups = Array.from(groupedMap.values());
  }

  trackByBuilding(index: number, item: BuildingSensorGroup): number {
    return item.buildingId;
  }

  trackBySensor(index: number, item: FaultySensorItem): number {
    return item.sensorId;
  }
}

