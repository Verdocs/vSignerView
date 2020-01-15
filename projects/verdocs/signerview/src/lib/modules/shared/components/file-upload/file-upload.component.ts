import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'file-upload-drag-drop',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  public files;

  @Output() public onFileRetrieval = new EventEmitter<any>();

  getFile(event) {
    this.files = event;
    this.onFileRetrieval.emit(this.files);
  }
}
