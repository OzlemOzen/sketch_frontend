 import { CommonModule } from '@angular/common';
 import { FormsModule } from '@angular/forms';

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

export interface FloorFormValue{
  floor_number: number| null;
}

 @Component({
   selector: 'app-floor-form',
   standalone: true,
   imports: [CommonModule, FormsModule],
   templateUrl: './floor-form.component.html',
   styleUrls: ['./floor-form.component.scss']
 })
 export class FloorFormComponent {

    @ViewChild('floorFormRef') floorFormRef?: NgForm;

   @Input() submitLabel = "Kaydet";

   @Input() formData: FloorFormValue = {
       floor_number: null
   };

    @Output() save = new EventEmitter<FloorFormValue>();
    @Output() cancel = new EventEmitter();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['formData'] && this.floorFormRef) {
            queueMicrotask(() => {
                this.floorFormRef?.resetForm(this.formData);
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

     onSubmit(): void{
         const data: FloorFormValue = {
             floor_number: this.formData.floor_number,
         };

         if (
             data.floor_number !== null
         ) {
            this.save.emit(data);
         } else {
             console.log("floor-form eksik");
         }
        }
      }

