import { RoomFormValue } from '../models/room-form-value.model';
import {
  CreateRoomRequest,
  UpdateRoomRequest
} from '../models/room-request.model';

function validateRoomForm(formValue: RoomFormValue): void {
  if (!formValue.title || !formValue.title.trim()) {
    throw new Error('Oda adı zorunludur.');
  }

  if (
    formValue.floorNumber === null ||
    formValue.buildingId === null ||
    formValue.x === null ||
    formValue.y === null ||
    formValue.width === null ||
    formValue.height === null
  ) {
    throw new Error('Tüm oda alanları doldurulmalıdır.');
  }

  if (formValue.width <= 0 || formValue.height <= 0) {
    throw new Error('Genişlik ve yükseklik 0’dan büyük olmalıdır.');
  }
}

export function mapRoomFormToCreateRoomRequest(
  formValue: RoomFormValue
): CreateRoomRequest {
  validateRoomForm(formValue);

  return {
    title: formValue.title.trim(),
    floor_number: formValue.floorNumber as number,
    building_id: formValue.buildingId as number,
    coordinate: {
      x: formValue.x as number,
      y: formValue.y as number,
      width: formValue.width as number,
      height: formValue.height as number
    },
    temperature_min_value: formValue.temperature_min_value,
    temperature_max_value: formValue.temperature_max_value,
    temperature_optimum_value: formValue.temperature_optimum_value,
    humidity_min_value: formValue.humidity_min_value,
    humidity_max_value: formValue.humidity_max_value,
    humidity_optimum_value: formValue.humidity_optimum_value
  };
}

export function mapRoomFormToUpdateRoomRequest(
  formValue: RoomFormValue
): UpdateRoomRequest {
  validateRoomForm(formValue);

  return {
    title: formValue.title.trim(),
    floor_number: formValue.floorNumber as number,
    building_id: formValue.buildingId as number,
    coordinate: {
      x: formValue.x as number,
      y: formValue.y as number,
      width: formValue.width as number,
      height: formValue.height as number
    },
    temperature_min_value: formValue.temperature_min_value,
    temperature_max_value: formValue.temperature_max_value,
    temperature_optimum_value: formValue.temperature_optimum_value,
    humidity_min_value: formValue.humidity_min_value,
    humidity_max_value: formValue.humidity_max_value,
    humidity_optimum_value: formValue.humidity_optimum_value
  };
}