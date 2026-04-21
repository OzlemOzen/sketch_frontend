export interface CoordinatePayload {
  start_coordinate_x: number;
  start_coordinate_y: number;
  width: number;
  height: number;
}

/* ---------------- BUILDING ---------------- */

export interface CreateBuildingRequest {
  title: string;
  city: string;
  county: string;
  postcode: string;
  address: string;
}

export interface UpdateBuildingRequest {
  title: string;
  city: string;
  county: string;
  postcode: string;
  address: string;
}

/* ---------------- ROOM ---------------- */

export interface CreateRoomRequest {
  title: string;
  floor_number: number;
  building_id: number;
  coordinate: CoordinatePayload;
}

export interface UpdateRoomRequest {
  title: string;
  floor_number: number;
  building_id: number;
  coordinate: CoordinatePayload;
}

/* ---------------- SENSOR ---------------- */

export interface CreateSensorRequest {
  title: string;
  type: string;
  room_id: number;
  coordinate: CoordinatePayload;
  optimum_value: number;
  min_value: number;
  max_value: number
}

export interface UpdateSensorRequest {
  title: string;
  type: string;
  room_id: number;
  coordinate: CoordinatePayload;
  optimum_value: number;
  min_value: number;
  max_value: number
}

/* ---------------- RESTRICTED AREA ---------------- */

export interface CreateRestrictedAreaRequest {
  room_id: number;
  coordinate: CoordinatePayload;
}

export interface UpdateRestrictedAreaRequest {
  room_id: number;
  coordinate: CoordinatePayload;
}

export interface Building {
  id?: number;
  title: string;
  city: string;
  county: string;
  postcode: string;
  address: string;
}

export interface Coordinate {
  id?: number;
  start_coordinate_x: number;
  start_coordinate_y: number;
  width: number;
  height: number;
}

/*BURADAKİ İNTERFACELERİ KULLANMADIM */

export interface Room {
  id?: number;
  title: string;
  floor_number: number;
  coordinate_id?: number;
  building_id: number;
  coordinate: Coordinate;
  restrictedAreas?: RestrictedArea[];
}

export interface RestrictedArea {
  id?: number;
  room_id: number;
  coordinate_id?: number;
  coordinate: Coordinate;
}

export interface Sensor {
  id: number;
  title: string;
  type: string;
  room_id: number;
  coordinate_id: number;

  min_value: number | null;
  max_value: number | null;
  optimum_value: number | null;

  coordinate?: {
    id?: number;
    start_coordinate_x: number;
    start_coordinate_y: number;
    width: number;
    height: number;
  };
}

/* ---------------- UI / VIEW MODELS ---------------- */

export interface RestrictedAreaViewModel {
  id?: number;
  room_id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  x_last: number;
  y_last: number;
  statusColor?: 'normal' | 'warning' | 'critical' | 'unknown';
  avgTemperature?: number | null;
  avgHumidity?: number | null;
}

export interface RoomViewModel {
  id?: number;
  title: string;
  floor_number: number;
  building_id: number;
  coordinate_id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  x_last: number;
  y_last: number;
  restrictedAreas: RestrictedAreaViewModel[];
  temperature_min_value: number;
  temperature_max_value: number;
  temperature_optimum_value: number;
  humidity_min_value: number;
  humidity_max_value: number;
  humidity_optimum_value: number;
}

export interface SensorViewModel {
  id: number;
  title: string;
  type: string;
  room_id: number;
  coordinate_id?: number;
  floor_number?: number;
  x: number;
  y: number;
  
  sicaklik?: number;
  nem?: number;
  lastUpdated?: number;

  current_value?: number | null;
  statusColor?: 'green' | 'yellow' | 'red' | 'unknown';
}

export interface FaultySensorItem {
  sensorId: number;
  title: string;
  buildingTitle: string;
  floorNumber: number | string;
  roomTitle: string;
  type: string;
  status: 'warning' | 'critical' | 'offline';
  statusText: string;
  message: string;
  updatedAt: string;
}