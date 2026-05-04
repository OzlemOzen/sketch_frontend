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


type ChartPoint = {
  x: number;
  y: number;
  value: number;
  label: string;
  timeLabel: string;
};

type ChartSeries = {
  sensorId: number;
  sensorTitle: string;
  points: ChartPoint[];
  color: string;
};

type AverageChartItem = {
  timestamp: number;
  value: number;
};

type ChartTooltip = {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  metric: string;
  value: string;
  timeLabel: string;
};

@Component({
  selector: 'app-sensor-data-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './sensor-data-analysis.component.html',
  styleUrls: ['./sensor-data-analysis.component.scss']
})
export class SensorDataAnalysisComponent implements OnInit {

  temperatureChartSeries: ChartSeries[] = [];
  humidityChartSeries: ChartSeries[] = [];

  roomAverageTemperatureSeries: ChartSeries[] = [];
  roomAverageHumiditySeries: ChartSeries[] = [];
  
  chartLabels: string[] = [];
  chartWidth = 1000;
  chartHeight = 300;
  chartPadding = 48;
  
  temperatureMin = 0;
  temperatureMax = 100;
  humidityMin = 0;
  humidityMax = 100;

  chartTooltip: ChartTooltip = {
  visible: false,
  x: 0,
  y: 0,
  title: '',
  metric: '',
  value: '',
  timeLabel: ''
};

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

get temperatureMiddleValue(): number {
  return Number(((this.temperatureMin + this.temperatureMax) / 2).toFixed(1));
}

get humidityMiddleValue(): number {
  return Number(((this.humidityMin + this.humidityMax) / 2).toFixed(1));
}

getYPosition(value: number, minValue: number, maxValue: number): number {
  if (maxValue === minValue) {
    return this.chartHeight / 2;
  }

  const drawableHeight = this.chartHeight - this.chartPadding * 2;
  const ratio = (value - minValue) / (maxValue - minValue);

  return this.chartPadding + drawableHeight - ratio * drawableHeight;
}

get temperatureOptimumY(): number {
  return this.getYPosition(
    this.roomTemperatureOptimum,
    this.temperatureMin,
    this.temperatureMax
  );
}

get humidityOptimumY(): number {
  return this.getYPosition(
    this.roomHumidityOptimum,
    this.humidityMin,
    this.humidityMax
  );
}

private createChartPoints(
  sensorItems: SensorDataItem[],
  timestamps: number[],
  valueKey: 'sicaklik' | 'nem',
  minValue: number,
  maxValue: number
): ChartPoint[] {
  const drawableWidth = this.chartWidth - this.chartPadding * 2;
  const drawableHeight = this.chartHeight - this.chartPadding * 2;

  return timestamps
    .map((timestamp, index) => {
      const item = sensorItems.find(sensorItem => sensorItem.timestamp === timestamp);

      if (!item) {
        return null;
      }

      const value = Number(item[valueKey]);

      if (Number.isNaN(value)) {
        return null;
      }

      const x = timestamps.length === 1
        ? this.chartPadding + drawableWidth / 2
        : this.chartPadding + (index / (timestamps.length - 1)) * drawableWidth;

      const range = maxValue - minValue || 1;

      const y = this.chartPadding + drawableHeight - ((value - minValue) / range) * drawableHeight;

      return {
        x,
        y,
        value,
        label: String(value),
        timeLabel: this.formatChartTime(timestamp)
      };
    })
    .filter((point): point is ChartPoint => point !== null);
}

getPolylinePoints(points: ChartPoint[]): string {
  return points.map(point => `${point.x},${point.y}`).join(' ');
}

private formatTooltipValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

showChartTooltip(
  event: MouseEvent,
  serieTitle: string,
  metric: string,
  point: ChartPoint,
  unit: string
): void {
  this.chartTooltip = {
    visible: true,
    x: event.clientX + 14,
    y: event.clientY - 14,
    title: serieTitle,
    metric,
    value: `${this.formatTooltipValue(point.value)} ${unit}`,
    timeLabel: point.timeLabel
  };
}

moveChartTooltip(event: MouseEvent): void {
  if (!this.chartTooltip.visible) {
    return;
  }

  this.chartTooltip = {
    ...this.chartTooltip,
    x: event.clientX + 14,
    y: event.clientY - 14
  };
}

hideChartTooltip(): void {
  this.chartTooltip = {
    ...this.chartTooltip,
    visible: false
  };
}

private getNiceMin(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  const min = Math.min(...values);
  return Math.floor(min - 5);
}

private getNiceMax(values: number[]): number {
  if (!values.length) {
    return 100;
  }

  const max = Math.max(...values);
  return Math.ceil(max + 5);
}

private formatChartTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

private getChartColor(index: number): string {
  const colors = [
    '#0a3b9e',
    '#dc2626',
    '#16a34a',
    '#f59e0b',
    '#7c3aed',
    '#0891b2',
    '#be123c',
    '#4b5563'
  ];

  return colors[index % colors.length];
}


private getPaddedRange(values: number[], thresholdValues: number[]): { min: number; max: number } {
  const allValues = [...values, ...thresholdValues].filter(
    (value): value is number => value != null && !Number.isNaN(value)
  );

  if (!allValues.length) {
    return { min: 0, max: 100 };
  }

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = Math.max(rawMax - rawMin, 1);
  const padding = range * 0.1;

  return {
    min: Number((rawMin - padding).toFixed(1)),
    max: Number((rawMax + padding).toFixed(1))
  };
}

get temperatureMinThresholdY(): number {
  return this.getYPosition(
    this.roomTemperatureMin,
    this.temperatureMin,
    this.temperatureMax
  );
}

get temperatureMaxThresholdY(): number {
  return this.getYPosition(
    this.roomTemperatureMax,
    this.temperatureMin,
    this.temperatureMax
  );
}

get humidityMinThresholdY(): number {
  return this.getYPosition(
    this.roomHumidityMin,
    this.humidityMin,
    this.humidityMax
  );
}

get humidityMaxThresholdY(): number {
  return this.getYPosition(
    this.roomHumidityMax,
    this.humidityMin,
    this.humidityMax
  );
}


private roundUpToNearestTen(value: number): number {
  return Math.ceil(value / 10) * 10;
}

private buildTenStepTicks(maxValue: number): number[] {
  const roundedMax = this.roundUpToNearestTen(maxValue);
  const ticks: number[] = [];

  for (let value = roundedMax; value >= 0; value -= 10) {
    ticks.push(value);
  }

  return ticks;
}

get temperatureAxisTicks(): number[] {
  return this.buildTenStepTicks(this.temperatureMax);
}

get humidityAxisTicks(): number[] {
  return this.buildTenStepTicks(this.humidityMax);
}

private buildAxisValuesWithThresholds(
  minValue: number,
  maxValue: number,
  thresholds: number[]
): number[] {
  const roundedMax = this.roundUpToNearestTen(maxValue);

  const cleanThresholds = thresholds
    .map(value => Number(value))
    .filter(value => !Number.isNaN(value) && value >= minValue && value <= roundedMax);

  const regularTicks: number[] = [];
  for (let value = 0; value <= roundedMax; value += 10) {
    regularTicks.push(value);
  }

  const filteredRegularTicks = regularTicks.filter(tick => {
    return !cleanThresholds.some(threshold => {
      const diff = Math.abs(tick - threshold);
      if (diff === 0) {
        return true;
      }

      return diff < 2;
    });
  });

  const merged = [...filteredRegularTicks, ...cleanThresholds];

  const uniqueValues = [...new Set(merged.map(value => Number(value.toFixed(1))))];

  return uniqueValues.sort((a, b) => b - a);
}

get temperatureAxisValues(): number[] {
  return this.buildAxisValuesWithThresholds(
    this.temperatureMin,
    this.temperatureMax,
    [
      this.roomTemperatureMin,
      this.roomTemperatureOptimum,
      this.roomTemperatureMax
    ]
  );
}

get humidityAxisValues(): number[] {
  return this.buildAxisValuesWithThresholds(
    this.humidityMin,
    this.humidityMax,
    [
      this.roomHumidityMin,
      this.roomHumidityOptimum,
      this.roomHumidityMax
    ]
  );
}


private isCloseTo(value1: number, value2: number, epsilon = 0.1): boolean {
  return Math.abs(value1 - value2) < epsilon;
}

isTemperatureThresholdValue(value: number): boolean {
  return this.isCloseTo(value, this.roomTemperatureMin) ||
         this.isCloseTo(value, this.roomTemperatureOptimum) ||
         this.isCloseTo(value, this.roomTemperatureMax);
}

isHumidityThresholdValue(value: number): boolean {
  return this.isCloseTo(value, this.roomHumidityMin) ||
         this.isCloseTo(value, this.roomHumidityOptimum) ||
         this.isCloseTo(value, this.roomHumidityMax);
}

private readonly manualTemperatureMax = 50;
private readonly manualHumidityMax = 50;

private buildRoomHistoryCharts(data: SensorDataItem[]): void {
  if (!data.length) {
    this.temperatureChartSeries = [];
    this.humidityChartSeries = [];
    this.chartLabels = [];
    return;
  }

  const sortedData = [...data].sort((a, b) => {
    const firstTime = a.timestamp ?? 0;
    const secondTime = b.timestamp ?? 0;
    return firstTime - secondTime;
  });

  const timestamps = [...new Set(
    sortedData
      .map(item => item.timestamp)
      .filter((timestamp): timestamp is number => timestamp !== null && timestamp !== undefined)
  )];

  this.chartLabels = timestamps.map(timestamp => this.formatChartTime(timestamp));

  const temperatureValues = sortedData
    .map(item => Number(item.sicaklik))
    .filter(value => !Number.isNaN(value));

  const humidityValues = sortedData
    .map(item => Number(item.nem))
    .filter(value => !Number.isNaN(value));

  const selectedRoom = this.selectedRoom;

  const dataTemperatureMin = this.getNiceMin(temperatureValues);
  const dataTemperatureMax = this.getNiceMax(temperatureValues);

  const dataHumidityMin = this.getNiceMin(humidityValues);
  const dataHumidityMax = this.getNiceMax(humidityValues);

  const roomTemperatureMin = selectedRoom?.temperature_min_value != null
    ? Number(selectedRoom.temperature_min_value)
    : dataTemperatureMin;

  const roomTemperatureOptimum = selectedRoom?.temperature_optimum_value != null
    ? Number(selectedRoom.temperature_optimum_value)
    : Number(((roomTemperatureMin + dataTemperatureMax) / 2).toFixed(1));

  const roomTemperatureMax = selectedRoom?.temperature_max_value != null
    ? Number(selectedRoom.temperature_max_value)
    : dataTemperatureMax;

  const roomHumidityMin = selectedRoom?.humidity_min_value != null
    ? Number(selectedRoom.humidity_min_value)
    : dataHumidityMin;

  const roomHumidityOptimum = selectedRoom?.humidity_optimum_value != null
    ? Number(selectedRoom.humidity_optimum_value)
    : Number(((roomHumidityMin + dataHumidityMax) / 2).toFixed(1));

  const roomHumidityMax = selectedRoom?.humidity_max_value != null
    ? Number(selectedRoom.humidity_max_value)
    : dataHumidityMax;

  const temperatureRange = this.getPaddedRange(
    temperatureValues,
    [roomTemperatureMin, roomTemperatureOptimum, roomTemperatureMax]
  );

  const humidityRange = this.getPaddedRange(
    humidityValues,
    [roomHumidityMin, roomHumidityOptimum, roomHumidityMax]
  );

  this.temperatureMin = 0;
  this.temperatureMax = this.manualTemperatureMax;

  this.humidityMin = 0;
  this.humidityMax = this.manualHumidityMax;

  const sensorIds = [...new Set(sortedData.map(item => item.sensor_id))];

  this.temperatureChartSeries = sensorIds.map((sensorId, index) => {
    const sensorItems = sortedData.filter(item => item.sensor_id === sensorId);

    return {
      sensorId,
      sensorTitle: this.getSensorTitle(sensorId),
      color: this.getChartColor(index),
      points: this.createChartPoints(
        sensorItems,
        timestamps,
        'sicaklik',
        this.temperatureMin,
        this.temperatureMax
      )
    };
  });

  this.humidityChartSeries = sensorIds.map((sensorId, index) => {
    const sensorItems = sortedData.filter(item => item.sensor_id === sensorId);

    return {
      sensorId,
      sensorTitle: this.getSensorTitle(sensorId),
      color: this.getChartColor(index),
      points: this.createChartPoints(
        sensorItems,
        timestamps,
        'nem',
        this.humidityMin,
        this.humidityMax
      )
    };
  });
}


private buildRoomAverageCharts(data: SensorDataItem[]): void {
  if (!data.length) {
    this.roomAverageTemperatureSeries = [];
    this.roomAverageHumiditySeries = [];
    return;
  }

  const sortedData = [...data].sort((a, b) => {
    const firstTime = a.timestamp ?? 0;
    const secondTime = b.timestamp ?? 0;
    return firstTime - secondTime;
  });

  const groupedByTimestamp = new Map<number, SensorDataItem[]>();

  for (const item of sortedData) {
    if (item.timestamp == null) {
      continue;
    }

    const items = groupedByTimestamp.get(item.timestamp) ?? [];
    items.push(item);
    groupedByTimestamp.set(item.timestamp, items);
  }

  const averageTemperatureItems: AverageChartItem[] = [];
  const averageHumidityItems: AverageChartItem[] = [];

  groupedByTimestamp.forEach((items, timestamp) => {
    const temperatureValues = items
      .map(item => Number(item.sicaklik))
      .filter(value => !Number.isNaN(value));

    const humidityValues = items
      .map(item => Number(item.nem))
      .filter(value => !Number.isNaN(value));

    if (temperatureValues.length > 0) {
      const averageTemperature =
        temperatureValues.reduce((sum, value) => sum + value, 0) / temperatureValues.length;

      averageTemperatureItems.push({
        timestamp,
        value: Number(averageTemperature.toFixed(2))
      });
    }

    if (humidityValues.length > 0) {
      const averageHumidity =
        humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length;

      averageHumidityItems.push({
        timestamp,
        value: Number(averageHumidity.toFixed(2))
      });
    }
  });

  const temperaturePoints = this.createAverageChartPoints(
    averageTemperatureItems,
    this.temperatureMin,
    this.temperatureMax
  );

  const humidityPoints = this.createAverageChartPoints(
    averageHumidityItems,
    this.humidityMin,
    this.humidityMax
  );

  this.roomAverageTemperatureSeries = temperaturePoints.length
    ? [
        {
          sensorId: -1,
          sensorTitle: 'Oda Ortalama Sıcaklık',
          points: temperaturePoints,
          color: '#7c3aed'
        }
      ]
    : [];

  this.roomAverageHumiditySeries = humidityPoints.length
    ? [
        {
          sensorId: -2,
          sensorTitle: 'Oda Ortalama Nem',
          points: humidityPoints,
          color: '#0891b2'
        }
      ]
    : [];
}

private createAverageChartPoints(
  items: AverageChartItem[],
  minValue: number,
  maxValue: number
): ChartPoint[] {
  if (!items.length) {
    return [];
  }

  const drawableWidth = this.chartWidth - this.chartPadding * 2;

  return items.map((item, index) => {
    const x = items.length === 1
      ? this.chartPadding + drawableWidth / 2
      : this.chartPadding + (index / (items.length - 1)) * drawableWidth;

    const y = this.getYPosition(item.value, minValue, maxValue);

    return {
      x,
      y,
      value: item.value,
      label: String(item.value),
      timeLabel: this.formatChartTime(item.timestamp)
    };
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
      this.buildRoomHistoryCharts(filteredData);
      this.buildRoomAverageCharts(filteredData);

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
      const sortedData = [...data].sort((a, b) => {
        const firstTime = a.timestamp ?? 0;
        const secondTime = b.timestamp ?? 0;
        return firstTime - secondTime;
      });

      this.sensorLastNData = sortedData;
      this.buildRoomHistoryCharts(sortedData);

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

    this.temperatureChartSeries = [];
    this.humidityChartSeries = [];
    this.roomAverageTemperatureSeries = [];
    this.roomAverageHumiditySeries = [];
    this.chartLabels = [];
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

get selectedRoom(): Room | undefined {
  if (this.selectedRoomId == null) {
    return undefined;
  }

  return this.visibleRooms.find(room => room.id === this.selectedRoomId);
}

get roomTemperatureMin(): number {
  return this.selectedRoom?.temperature_min_value != null
    ? Number(this.selectedRoom.temperature_min_value)
    : this.temperatureMin;
}

get roomTemperatureOptimum(): number {
  return this.selectedRoom?.temperature_optimum_value != null
    ? Number(this.selectedRoom.temperature_optimum_value)
    : this.temperatureMiddleValue;
}

get roomTemperatureMax(): number {
  return this.selectedRoom?.temperature_max_value != null
    ? Number(this.selectedRoom.temperature_max_value)
    : this.temperatureMax;
}

get roomHumidityMin(): number {
  return this.selectedRoom?.humidity_min_value != null
    ? Number(this.selectedRoom.humidity_min_value)
    : this.humidityMin;
}

get roomHumidityOptimum(): number {
  return this.selectedRoom?.humidity_optimum_value != null
    ? Number(this.selectedRoom.humidity_optimum_value)
    : this.humidityMiddleValue;
}

get roomHumidityMax(): number {
  return this.selectedRoom?.humidity_max_value != null
    ? Number(this.selectedRoom.humidity_max_value)
    : this.humidityMax;
}

}