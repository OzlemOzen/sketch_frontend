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

export interface BuildingFormValue{
    title: string;
    city: string;
    county: string;
    postcode: string;
    address: string;
}

@Component({
  selector: 'app-building-form',
  imports: [CommonModule,FormsModule],
  templateUrl: './building-form.component.html',
  styleUrls: ['./building-form.component.scss'],
  standalone: true
})

export class BuildingFormComponent {
    @ViewChild('buildingFormRef') buildingFormRef?: NgForm;

    @Input() submitLabel = "Kaydet";

    @Input() formData: BuildingFormValue = {
        title: '',
        city: '',
        county: '',
        postcode: '',
        address: ''
    };

    @Output() save = new EventEmitter<BuildingFormValue>();
    @Output() cancel = new EventEmitter();
    
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['formData'] && this.buildingFormRef) {
            queueMicrotask(() => {
                this.buildingFormRef?.resetForm(this.formData);
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
  console.log('Building submit çalıştı');
  console.log('building formData:', this.formData);
  

  if (!this.formData) {
    console.log('formData tanımsız');
    return;
  }

  const data = {
    title: String(this.formData.title ?? '').trim(),
    city: String(this.formData.city ?? '').trim(),
    county: String(this.formData.county ?? '').trim(),
    postcode: String(this.formData.postcode ?? '').trim(),
    address: String(this.formData.address ?? '').trim()
  };

  console.log('building submit data:', data);

  if (data.title && data.city && data.county && data.postcode && data.address) {
    this.save.emit(data);
  } else {
    console.log('Form eksik veya hatalı');
  }
}
    
}



