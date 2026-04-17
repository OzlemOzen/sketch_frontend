// export interface Building {
//   id?: number;
//   title: string;
//   city: string;
//   county: string;
//   postcode: string;
//   address: string;
// }

// export interface Coordinate {
//   id?: number;
//   start_coordinate_x: number;
//   start_coordinate_y: number;
//   width: number;
//   height: number;
// }

// export interface Room {
//   id?: number;
//   title: string;
//   floor_number: number;
//   coordinate_id?: number;
//   building_id: number;
//   coordinate: Coordinate;
//   restrictedAreas?: RestrictedArea[];
// }

// export interface RestrictedArea {
//   id?: number;
//   room_id: number;
//   coordinate_id?: number;
//   coordinate: Coordinate;
// }

// export interface Sensor {
//   id: number;
//   title: string;
//   type: string;
//   room_id: number;
//   coordinate_id: number;

//   min_value: number | null;
//   max_value: number | null;
//   optimum_value: number | null;

//   coordinate?: {
//     id?: number;
//     start_coordinate_x: number;
//     start_coordinate_y: number;
//     width: number;
//     height: number;
//   };
// }

// /* ---------------- UI / VIEW MODELS ---------------- */

// export interface RestrictedAreaViewModel {
//   id?: number;
//   room_id: number;
//   title: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   x_last: number;
//   y_last: number;
// }

// export interface RoomViewModel {
//   id?: number;
//   title: string;
//   floor_number: number;
//   building_id: number;
//   coordinate_id?: number;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   x_last: number;
//   y_last: number;
//   restrictedAreas: RestrictedAreaViewModel[];
// }

// export interface SensorViewModel {
//   id?: number;
//   title: string;
//   type: string;
//   room_id: number;
//   coordinate_id?: number;
//   floor_number?: number;
//   x: number;
//   y: number;
//   optimum_value: number | null;
//   min_value: number | null;
//   max_value: number | null;

//   current_value?: number | null;
//   statusColor?: 'green' | 'yellow' | 'red' | 'unknown';
// }


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

export interface Room {
  id?: number;
  title: string;
  floor_number: number;
  coordinate_id?: number | null;
  building_id: number;
  is_corridor: boolean;
  coordinate?: Coordinate | null;
  restrictedAreas?: RestrictedArea[];
  // sensors?: Sensor[];
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

  // min_value: number | null;
  // max_value: number | null;
  // optimum_value: number | null;

  // temperature_optimum_value: number | null;
  // temperature_min_value: number | null;
  // temperature_max_value: number | null;
  // humidity_optimum_value: number | null;
  // humidity_min_value: number | null;
  // humidity_max_value: number | null;

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
}

export interface RoomViewModel {
  id?: number;
  title: string;
  floor_number: number;
  building_id: number;
  coordinate_id?: number | null;
  is_corridor: boolean;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  x_last: number | null;
  y_last: number | null;
  restrictedAreas: RestrictedAreaViewModel[];
  temperature_min_value: number | null;
  temperature_max_value: number | null;
  temperature_optimum_value: number | null;
  humidity_min_value: number | null;
  humidity_max_value: number | null;
  humidity_optimum_value: number | null;
  titleLeft?: number;
  titleTop?: number;
  statusColor?: 'normal' | 'warning' | 'critical' | 'unknown';
  avgTemperature?: number | null;
  avgHumidity?: number | null;
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
  // optimum_value: number | null;
  // min_value: number | null;
  // max_value: number | null;

  sicaklik?: number;
  nem?: number;
  lastUpdated?: number;

  current_value?: number | null;
  statusColor?: 'green' | 'yellow' | 'red' | 'unknown';
}

// export interface FaultySensorItem {
//   sensorId: number;
//   title: string;
//   roomTitle: string;
//   type: string;
//   status: 'green' | 'yellow' | 'red' | 'unknown';
//   statusText: string;
//   message: string;
//   updatedAt: string;
// }

// export interface FaultySensorItem {
//   sensorId: number;
//   title: string;
//   buildingTitle: string;
//   floorNumber: number | string;
//   roomTitle: string;
//   type: string;
//   status: 'warning' | 'critical' | 'offline';
//   statusText: string;
//   message: string;
//   updatedAt: string;
// }

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