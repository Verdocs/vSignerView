import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { FileDragDropDirective } from '../../../../modules/shared/directives/file-drag-and-drop.directive';

import { FileUploadComponent } from './file-upload.component';

@NgModule({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule
  ],
  declarations: [
    FileDragDropDirective,
    FileUploadComponent
  ],
  exports: [
    FileDragDropDirective,
    FileUploadComponent
  ]
})
export class FileUploadModule {}
