// import { CommonModule } from '@angular/common';
// import { Component, OnDestroy, OnInit, inject } from '@angular/core';
// import { RouterModule } from '@angular/router';
// import { forkJoin, of } from 'rxjs';
// import { map, switchMap } from 'rxjs/operators';

// import { BuildingApiService } from '../../buildings/services/building-api.service';
// import { RoomApiService } from '../../rooms/services/room-api.service';
// import { SensorApiService } from '../services/sensor-api.service';
// import { Building, Room, Sensor, SensorViewModel } from '../../../models/data';

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
//   sicaklik?: number;
//   nem?: number;
// }

// interface BuildingSensorGroup {
//   buildingId: number;
//   buildingTitle: string;
//   warningCount: number;
//   criticalCount: number;
//   sensors: FaultySensorItem[];
// }

// interface MonitorSensorItem extends SensorViewModel {
//   building_id: number;
//   building_title: string;
//   room_title: string;
// }

// @Component({
//   selector: 'app-sensor-monitor',
//   standalone: true,
//   imports: [CommonModule, RouterModule],
//   templateUrl: './sensor-monitor.component.html',
//   styleUrls: ['./sensor-monitor.component.scss']
// })
// export class SensorMonitorComponent implements OnInit, OnDestroy {
//   private readonly buildingApiService = inject(BuildingApiService);
//   private readonly roomApiService = inject(RoomApiService);
//   private readonly sensorApiService = inject(SensorApiService);

//   buildingGroups: BuildingSensorGroup[] = [];
//   loading = false;

//   private ws?: WebSocket;

//   private buildings: Building[] = [];
//   private rooms: Room[] = [];
//   private monitorSensors: MonitorSensorItem[] = [];

//   ngOnInit(): void {
//     this.loadAllData();
//   }

//   ngOnDestroy(): void {
//     if (this.ws) {
//       this.ws.close();
//       this.ws = undefined;
//     }
//   }

//   loadAllData(): void {
//     this.loading = true;

//     this.buildingApiService.getBuildings().pipe(
//       map((result: any) => {
//         const buildings: Building[] = Array.isArray(result)
//           ? result
//           : Array.isArray(result?.response)
//             ? result.response
//             : [];

//         return buildings.filter(
//           (building) => building.id !== undefined && building.id !== null
//         );
//       }),
//       switchMap((buildings: Building[]) => {
//         this.buildings = buildings;

//         if (!buildings.length) {
//           return of([]);
//         }

//         const roomRequests = buildings.map((building) =>
//           this.roomApiService.getRoomsByBuildingId(building.id as number).pipe(
//             map((rooms: Room[]) => ({
//               building,
//               rooms
//             }))
//           )
//         );

//         return forkJoin(roomRequests);
//       }),
//       switchMap((roomResults: { building: Building; rooms: Room[] }[]) => {
//         this.rooms = roomResults.flatMap((result) => result.rooms);

//         const allRoomIds = this.rooms
//           .map((room) => room.id)
//           .filter((id): id is number => id !== undefined && id !== null);

//         if (!allRoomIds.length) {
//           return of([] as Sensor[]);
//         }

//         return this.sensorApiService.getSensorsByRoomIds(allRoomIds);
//       })
//     ).subscribe({
//       next: (sensors: Sensor[]) => {
//         this.monitorSensors = sensors
//           .map((sensor) => this.mapSensorToMonitorSensor(sensor))
//           .filter((sensor): sensor is MonitorSensorItem => sensor !== null);

//         this.refreshBuildingGroups();
//         this.initWebSocket();
//         this.loading = false;
//       },
//       error: (error: unknown) => {
//         console.error('Sensör monitor verileri yüklenemedi:', error);
//         this.buildingGroups = [];
//         this.loading = false;
//       }
//     });
//   }

//   private mapSensorToMonitorSensor(sensor: Sensor): MonitorSensorItem | null {
//     const room = this.rooms.find((r) => r.id === sensor.room_id);
//     if (!room) {
//       return null;
//     }

//     const building = this.buildings.find((b) => b.id === room.building_id);
//     if (!building || building.id === undefined) {
//       return null;
//     }

//     return {
//       id: sensor.id,
//       title: sensor.title,
//       type: sensor.type,
//       room_id: sensor.room_id,
//       coordinate_id: sensor.coordinate_id,
//       floor_number: room.floor_number,
//       x: sensor.coordinate?.start_coordinate_x ?? 0,
//       y: sensor.coordinate?.start_coordinate_y ?? 0,
//       current_value: null,
//       statusColor: 'unknown',
//       building_id: building.id,
//       building_title: building.title,
//       room_title: room.title
//     };
//   }

//   private initWebSocket(): void {
//     if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//       return;
//     }

//     if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
//       return;
//     }

//     this.ws = new WebSocket('ws://localhost:3000');

//     this.ws.onopen = () => {
//       console.log('Sensor monitor WS bağlandı');
//     };

//     this.ws.onerror = (error) => {
//       console.error('Sensor monitor WS hata:', error);
//     };

//     this.ws.onclose = () => {
//       console.log('Sensor monitor WS bağlantısı kapandı');
//       this.ws = undefined;
//     };

//     this.ws.onmessage = (event) => {
//       const message = JSON.parse(event.data);

//       if (message.type === 'initial' && Array.isArray(message.data)) {
//         message.data.forEach((item: any) => this.handleSensorStreamMessage(item));
//         return;
//       }

//       this.handleSensorStreamMessage(message);
//     };
//   }


// private handleSensorStreamMessage(message: any): void {
//   if (!message || typeof message.sensor_id !== 'number') {
//     return;
//   }

//   const index = this.monitorSensors.findIndex(
//     sensor => sensor.id === message.sensor_id
//   );

//   if (index === -1) {
//     return;
//   }

//   const sensor = { ...this.monitorSensors[index] };

//   sensor.sicaklik =
//     typeof message.sicaklik === 'number' ? message.sicaklik : sensor.sicaklik;

//   sensor.nem =
//     typeof message.nem === 'number' ? message.nem : sensor.nem;

//   sensor.lastUpdated =
//     typeof message.timestamp === 'number' ? message.timestamp : sensor.lastUpdated;
//   sensor.statusColor = 'unknown';

//   this.monitorSensors[index] = sensor;
//   this.monitorSensors = [...this.monitorSensors];

//   this.refreshBuildingGroups();
// }

// private getMetricStatus(
//   currentValue: number | null | undefined,
//   minValue: number | null,
//   maxValue: number | null,
//   optimumValue: number | null
// ): 'green' | 'yellow' | 'red' | 'unknown' {
//   if (
//     currentValue === null ||
//     currentValue === undefined ||
//     minValue === null ||
//     maxValue === null ||
//     optimumValue === null
//   ) {
//     return 'unknown';
//   }

//   const isOptimum = Math.abs(currentValue - optimumValue) < 0.0001;

//   if (currentValue < minValue || currentValue > maxValue) {
//     return 'red';
//   }

//   if (isOptimum) {
//     return 'green';
//   }

//   return 'yellow';
// }


// private readonly sensorTypeValueKeyMap: Record<string, string> = {
//   sicaklik: 'sicaklik',
//   sıcaklık: 'sicaklik',
//   temperature: 'sicaklik',
//   isi: 'sicaklik',
//   ısı: 'sicaklik',
//   nem: 'nem',
//   humidity: 'nem'
// };


//   private refreshBuildingGroups(): void {
//     const groupedMap = new Map<number, BuildingSensorGroup>();

//     for (const building of this.buildings) {
//       if (building.id === undefined) {
//         continue;
//       }

//       groupedMap.set(building.id, {
//         buildingId: building.id,
//         buildingTitle: building.title,
//         warningCount: 0,
//         criticalCount: 0,
//         sensors: []
//       });
//     }

//     this.monitorSensors
//       .filter((sensor) => sensor.statusColor === 'yellow' || sensor.statusColor === 'red')
//       .forEach((sensor) => {
//         const group = groupedMap.get(sensor.building_id);
//         if (!group) {
//           return;
//         }

//         let status: 'warning' | 'critical' | 'offline' = 'offline';
//         let statusText = 'Bilinmiyor';
//         let message = 'Sensör verisi değerlendirilemedi.';

//         if (sensor.statusColor === 'red') {
//           status = 'critical';
//           statusText = 'Kritik';
//           message = `${sensor.title} sensöründe en az bir ölçüm kritik seviyeye çıktı.`;
//           group.criticalCount++;
//         } else if (sensor.statusColor === 'yellow') {
//           status = 'warning';
//           statusText = 'Uyarı';
//           message = `${sensor.title} sensöründe en az bir ölçüm optimum değerden sapma gösteriyor.`;
//           group.warningCount++;
//         }
//         group.sensors.push({
//           sensorId: sensor.id as number,
//           title: sensor.title,
//           floorNumber: sensor.floor_number ?? '-',
//           roomTitle: sensor.room_title,
//           type: sensor.type,
//           status,
//           statusText,
//           message,
//           updatedAt: sensor.lastUpdated
//           ? new Date(sensor.lastUpdated * 1000).toLocaleTimeString('tr-TR')
//           : '-',
//           sicaklik: sensor.sicaklik,
//           nem: sensor.nem
//         });
//       });

//     this.buildingGroups = Array.from(groupedMap.values());
//   }

//   trackByBuilding(index: number, item: BuildingSensorGroup): number {
//     return item.buildingId;
//   }

//   trackBySensor(index: number, item: FaultySensorItem): number {
//     return item.sensorId;
//   }
// }



import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BuildingApiService } from '../../buildings/services/building-api.service';
import { RoomApiService } from '../../rooms/services/room-api.service';
import { SensorApiService } from '../services/sensor-api.service';
import { Building, Room, Sensor, SensorViewModel } from '../../../models/data';

interface MonitorSensorItem extends SensorViewModel {
  building_id: number;
  building_title: string;
  room_title: string;
}

// interface ProblematicRoomItem {
//   roomId: number;
//   title: string;
//   floorNumber: number | string;
//   buildingId: number;
//   buildingTitle: string;
//   avgTemperature: number | null;
//   avgHumidity: number | null;
//   status: 'warning' | 'critical' | 'unknown' | 'normal';
//   statusText: string;
//   message: string;
//   updatedAt: string;
// }

// interface BuildingRoomGroup {
//   buildingId: number;
//   buildingTitle: string;
//   warningCount: number;
//   criticalCount: number;
//   rooms: ProblematicRoomItem[];
// }

interface ProblematicRoomItem {
  roomId: number;
  title: string;
  floorNumber: number | string;
  buildingId: number;
  buildingTitle: string;
  avgTemperature: number | null;
  avgHumidity: number | null;
  status: 'warning' | 'critical' | 'unknown' | 'normal';
  statusText: string;
  message: string;
  updatedAt: string;
}

interface BuildingFloorGroup {
  floorNumber: number | string;
  warningCount: number;
  criticalCount: number;
  rooms: ProblematicRoomItem[];
}

interface BuildingRoomGroup {
  buildingId: number;
  buildingTitle: string;
  warningCount: number;
  criticalCount: number;
  floors: BuildingFloorGroup[];
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

  buildingGroups: BuildingRoomGroup[] = [];
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
        console.error('Oda monitor verileri yüklenemedi:', error);
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
      console.log('Room monitor WS bağlandı');
    };

    this.ws.onerror = (error) => {
      console.error('Room monitor WS hata:', error);
    };

    this.ws.onclose = () => {
      console.log('Room monitor WS bağlantısı kapandı');
      this.ws = undefined;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (Array.isArray(message.data)) {
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

    this.monitorSensors[index] = sensor;
    this.monitorSensors = [...this.monitorSensors];

    this.refreshBuildingGroups();
  }

  private getSensorsByRoomId(roomId: number): MonitorSensorItem[] {
    return this.monitorSensors.filter(sensor => sensor.room_id === roomId);
  }

  private getRoomAverageValues(roomId: number): {
    avgTemperature: number | null;
    avgHumidity: number | null;
    lastUpdated: number | null;
  } {
    const roomSensors = this.getSensorsByRoomId(roomId);

    const temperatureValues = roomSensors
      .map(sensor => sensor.sicaklik)
      .filter((value): value is number => typeof value === 'number');

    const humidityValues = roomSensors
      .map(sensor => sensor.nem)
      .filter((value): value is number => typeof value === 'number');

    const timestamps = roomSensors
      .map(sensor => sensor.lastUpdated)
      .filter((value): value is number => typeof value === 'number');

    const avgTemperature =
      temperatureValues.length > 0
        ? temperatureValues.reduce((sum, value) => sum + value, 0) / temperatureValues.length
        : null;

    const avgHumidity =
      humidityValues.length > 0
        ? humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length
        : null;

    const lastUpdated =
      timestamps.length > 0
        ? Math.max(...timestamps)
        : null;

    return {
      avgTemperature,
      avgHumidity,
      lastUpdated
    };
  }

  private getRoomStatus(
    room: Room,
    avgTemperature: number | null,
    avgHumidity: number | null
  ): 'normal' | 'warning' | 'critical' | 'unknown' {
    let tempStatus: 'normal' | 'warning' | 'critical' | 'unknown' = 'unknown';
    let humidityStatus: 'normal' | 'warning' | 'critical' | 'unknown' = 'unknown';

    if (
      avgTemperature != null &&
      room.temperature_min_value != null &&
      room.temperature_max_value != null &&
      room.temperature_optimum_value != null
    ) {
      if (
        avgTemperature < room.temperature_min_value ||
        avgTemperature > room.temperature_max_value
      ) {
        tempStatus = 'critical';
      } else if (Math.abs(avgTemperature - room.temperature_optimum_value) < 0.0001) {
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
      if (
        avgHumidity < room.humidity_min_value ||
        avgHumidity > room.humidity_max_value
      ) {
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

  private getRoomStatusText(status: 'normal' | 'warning' | 'critical' | 'unknown'): string {
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

  private getRoomStatusMessage(
    room: Room,
    avgTemperature: number | null,
    avgHumidity: number | null
  ): string {
    const messages: string[] = [];

    if (
      avgTemperature != null &&
      room.temperature_min_value != null &&
      room.temperature_max_value != null
    ) {
      if (avgTemperature < room.temperature_min_value) {
        messages.push('Ortalama sıcaklık minimum eşik altındadır.');
      } else if (avgTemperature > room.temperature_max_value) {
        messages.push('Ortalama sıcaklık maksimum eşik üstündedir.');
      }
    }

    if (
      avgHumidity != null &&
      room.humidity_min_value != null &&
      room.humidity_max_value != null
    ) {
      if (avgHumidity < room.humidity_min_value) {
        messages.push('Ortalama nem minimum eşik altındadır.');
      } else if (avgHumidity > room.humidity_max_value) {
        messages.push('Ortalama nem maksimum eşik üstündedir.');
      }
    }

    if (!messages.length) {
      return 'Oda değerleri izleniyor.';
    }

    return messages.join(' ');
  }

  // private refreshBuildingGroups(): void {
  //   const groupedMap = new Map<number, BuildingRoomGroup>();

  //   for (const building of this.buildings) {
  //     if (building.id === undefined) {
  //       continue;
  //     }

  //     groupedMap.set(building.id, {
  //       buildingId: building.id,
  //       buildingTitle: building.title,
  //       warningCount: 0,
  //       criticalCount: 0,
  //       rooms: []
  //     });
  //   }

  //   this.rooms
  //     .filter((room) => !room.is_corridor && room.id != null)
  //     .forEach((room) => {
  //       const building = this.buildings.find((b) => b.id === room.building_id);
  //       if (!building || building.id == null || room.id == null) {
  //         return;
  //       }

  //       const { avgTemperature, avgHumidity, lastUpdated } = this.getRoomAverageValues(room.id);
  //       const status = this.getRoomStatus(room, avgTemperature, avgHumidity);

  //       if (status !== 'warning' && status !== 'critical') {
  //         return;
  //       }

  //       const group = groupedMap.get(building.id);
  //       if (!group) {
  //         return;
  //       }

  //       if (status === 'critical') {
  //         group.criticalCount++;
  //       } else if (status === 'warning') {
  //         group.warningCount++;
  //       }

  //       group.rooms.push({
  //         roomId: room.id,
  //         title: room.title,
  //         floorNumber: room.floor_number ?? '-',
  //         buildingId: building.id,
  //         buildingTitle: building.title,
  //         avgTemperature,
  //         avgHumidity,
  //         status,
  //         statusText: this.getRoomStatusText(status),
  //         message: this.getRoomStatusMessage(room, avgTemperature, avgHumidity),
  //         updatedAt: lastUpdated
  //           ? new Date(lastUpdated * 1000).toLocaleTimeString('tr-TR')
  //           : '-'
  //       });
  //     });

  //   this.buildingGroups = Array.from(groupedMap.values());
  // }

  private refreshBuildingGroups(): void {
  const groupedMap = new Map<number, BuildingRoomGroup>();

  for (const building of this.buildings) {
    if (building.id === undefined) {
      continue;
    }

    groupedMap.set(building.id, {
      buildingId: building.id,
      buildingTitle: building.title,
      warningCount: 0,
      criticalCount: 0,
      floors: []
    });
  }

  this.rooms
    .filter((room) => !room.is_corridor && room.id != null)
    .forEach((room) => {
      const building = this.buildings.find((b) => b.id === room.building_id);
      if (!building || building.id == null || room.id == null) {
        return;
      }

      const { avgTemperature, avgHumidity, lastUpdated } = this.getRoomAverageValues(room.id);
      const status = this.getRoomStatus(room, avgTemperature, avgHumidity);

      if (status !== 'warning' && status !== 'critical') {
        return;
      }

      const buildingGroup = groupedMap.get(building.id);
      if (!buildingGroup) {
        return;
      }

      if (status === 'critical') {
        buildingGroup.criticalCount++;
      } else if (status === 'warning') {
        buildingGroup.warningCount++;
      }

      let floorGroup = buildingGroup.floors.find(
        (floor) => floor.floorNumber === room.floor_number
      );

      if (!floorGroup) {
        floorGroup = {
          floorNumber: room.floor_number ?? '-',
          warningCount: 0,
          criticalCount: 0,
          rooms: []
        };
        buildingGroup.floors.push(floorGroup);
      }

      if (status === 'critical') {
        floorGroup.criticalCount++;
      } else if (status === 'warning') {
        floorGroup.warningCount++;
      }

      floorGroup.rooms.push({
        roomId: room.id,
        title: room.title,
        floorNumber: room.floor_number ?? '-',
        buildingId: building.id,
        buildingTitle: building.title,
        avgTemperature,
        avgHumidity,
        status,
        statusText: this.getRoomStatusText(status),
        message: this.getRoomStatusMessage(room, avgTemperature, avgHumidity),
        updatedAt: lastUpdated
          ? new Date(lastUpdated * 1000).toLocaleTimeString('tr-TR')
          : '-'
      });
    });

  this.buildingGroups = Array.from(groupedMap.values()).map((group) => ({
    ...group,
    floors: [...group.floors].sort((a, b) => Number(a.floorNumber) - Number(b.floorNumber))
  }));
}

  // trackByBuilding(index: number, item: BuildingRoomGroup): number {
  //   return item.buildingId;
  // }

  // trackByRoom(index: number, item: ProblematicRoomItem): number {
  //   return item.roomId;
  // }

  trackByBuilding(index: number, item: BuildingRoomGroup): number {
  return item.buildingId;
}

trackByFloor(index: number, item: BuildingFloorGroup): number | string {
  return item.floorNumber;
}

trackByRoom(index: number, item: ProblematicRoomItem): number {
  return item.roomId;
}

getTotalProblematicRooms(group: BuildingRoomGroup): number {
  return group.floors.reduce((sum, floor) => sum + floor.rooms.length, 0);
}
}
