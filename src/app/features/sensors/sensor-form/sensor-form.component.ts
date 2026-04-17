import { RoomViewModel } from 'src/app/models/data';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { NgForm } from '@angular/forms';

export interface SensorFormValue {
  title: string;
  type: string;
  sensorRoom: number | null;
  x: number | null;
  y: number | null;
}

@Component({
  selector: 'app-sensor-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './sensor-form.component.html',
  styleUrls: ['./sensor-form.component.scss'],
  standalone: true
})

export class SensorFormComponent  implements OnChanges{
  @ViewChild('sensorFormRef') sensorFormRef?: NgForm;

  @Input() formData: SensorFormValue = {
  title: '',
  type: '',
  sensorRoom: null,
  x: null,
  y: null,
};

@Input() rooms: RoomViewModel[] = [];
@Input() submitLabel = 'Kaydet';

  @Output() save = new EventEmitter<SensorFormValue>();
  @Output() cancel = new EventEmitter();

  ngOnChanges(changes: SimpleChanges): void {
  if (changes['formData'] && this.sensorFormRef) {
    queueMicrotask(() => {
      this.sensorFormRef?.resetForm(this.formData);
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

   onSubmit() : void {
     const data : SensorFormValue = {
         title: this.formData.title.trim(),
         type: this.formData.type.trim(),
         sensorRoom: this.formData.sensorRoom,
         x: this.formData.x,
         y: this.formData.y
     };

     if(
         data.title &&
         data.type &&
         data.sensorRoom !== null &&
         data.x !== null &&
         data.y !== null 
     ){
         this.save.emit(data);
     }else{
         console.log("sensor-form eksik");
     }
   }


// isCameraSensor(): boolean {
//   return (this.formData.type ?? '').trim().toLowerCase().includes('kamera');
// }
}
