import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomMaterialModule } from '../../../../custom-material.module';

import { EnvelopeFieldsLite } from './envelope-fields-lite.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CustomMaterialModule
  ],
  declarations: [
    EnvelopeFieldsLite
  ],
  providers: [],
  exports: [
    EnvelopeFieldsLite
  ]
})
export class EnvelopeFieldsLiteModule { }
