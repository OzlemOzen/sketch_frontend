// export interface CoordinateRequest {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// }

// export interface CreateRoomRequest {
//   title: string;
//   floor_number: number;
//   building_id: number;
//   coordinate: CoordinateRequest;
//   temperature_optimum_value: number | null;
//   temperature_min_value: number | null;
//   temperature_max_value: number | null;
//   humidity_optimum_value: number | null;
//   humidity_min_value: number | null;
//   humidity_max_value: number | null;
//   restricted_areas?: RestrictedAreaRequest[];
// }

// export interface UpdateRoomRequest {
//   title: string;
//   floor_number: number;
//   building_id: number;
//   coordinate: CoordinateRequest;
//   temperature_optimum_value: number | null;
//   temperature_min_value: number | null;
//   temperature_max_value: number | null;
//   humidity_optimum_value: number | null;
//   humidity_min_value: number | null;
//   humidity_max_value: number | null;
//   restricted_areas?: RestrictedAreaRequest[];
// }

// export interface RestrictedAreaRequest {
//   room_id: number;
//   coordinate_id: number;
// }

export interface RestrictedAreaRequest {
  room_id: number;
  coordinate_id: number;
}

export interface CoordinateRequest {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateRoomRequest {
  title: string;
  floor_number: number;
  building_id: number;
  coordinate: CoordinateRequest;
  temperature_optimum_value: number | null;
  temperature_min_value: number | null;
  temperature_max_value: number | null;
  humidity_optimum_value: number | null;
  humidity_min_value: number | null;
  humidity_max_value: number | null;
  restricted_areas?: RestrictedAreaRequest[];
}

export interface UpdateRoomRequest {
  title: string;
  floor_number: number;
  building_id: number;
  coordinate: CoordinateRequest;
  coordinate_id?: number | null;
  temperature_optimum_value: number | null;
  temperature_min_value: number | null;
  temperature_max_value: number | null;
  humidity_optimum_value: number | null;
  humidity_min_value: number | null;
  humidity_max_value: number | null;
  restricted_areas?: RestrictedAreaRequest[];
}