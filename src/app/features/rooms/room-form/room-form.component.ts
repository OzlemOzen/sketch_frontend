import { FormsModule } from '@angular/forms';
import { RoomFormValue } from '../models/room-form-value.model';
import { CommonModule } from '@angular/common';
import { Building } from '../../../models/data';

import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  SimpleChanges
} from '@angular/core';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [CommonModule , FormsModule],
  templateUrl: './room-form.component.html',
  styleUrls: ['./room-form.component.scss']
})
export class RoomFormComponent {

  @ViewChild('roomFormRef') roomFormRef?: NgForm;

  @Input() formData: RoomFormValue = {
  title: '',
  buildingId: null,
  floorNumber: null,
  x: null,
  y: null,
  width: null,
  height: null,
  temperature_min_value: null,
  temperature_max_value: null,
  temperature_optimum_value: null,
  humidity_min_value: null,
  humidity_max_value: null,
  humidity_optimum_value: null
};

@Input() buildings: Building[] = [];
@Input() floors: { floor_number: number }[] = [];
@Input() submitLabel = 'Kaydet';

  @Output() save = new EventEmitter<RoomFormValue>();
  @Output() cancel = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
  if (changes['formData'] && this.roomFormRef) {
    queueMicrotask(() => {
      this.roomFormRef?.resetForm(this.formData);
    });
  }
}


focusNext(event: Event): void {
  event.preventDefault();

  const current = event.target as HTMLElement;
  const form = current.closest('form');

  if (!form) {
    return;
  }

  const fields = Array.from(
    form.querySelectorAll('input, select, button')
  ).filter((el) => {
    const htmlEl = el as HTMLInputElement | HTMLSelectElement | HTMLButtonElement;
    return !htmlEl.disabled && htmlEl.offsetParent !== null;
  }) as HTMLElement[];

  const index = fields.indexOf(current);

  if (index > -1 && index < fields.length - 1) {
    fields[index + 1].focus();
  }
}

  onSubmit(): void {
    this.save.emit(this.formData);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}