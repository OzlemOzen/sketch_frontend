export interface CreateSensorRequest {
  title: string;
  type: string;
  room_id: number;
  coordinate: {
    start_coordinate_x: number;
    start_coordinate_y: number;
    width: number;
    height: number;
  };
}

export interface UpdateSensorRequest {
  title: string;
  type: string;
  room_id: number;
  coordinate: {
    start_coordinate_x: number;
    start_coordinate_y: number;
    width: number;
    height: number;
  };
}