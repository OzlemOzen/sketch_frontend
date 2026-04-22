export interface RoomFormValue {
  title: string;
  floorNumber: number | null;
  buildingId: number | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;

  last_x?: number | null;
  last_y?: number | null;

  temperature_min_value: number | null;
  temperature_max_value: number | null;
  temperature_optimum_value: number | null;

  humidity_min_value: number | null;
  humidity_max_value: number | null;
  humidity_optimum_value: number | null;
}