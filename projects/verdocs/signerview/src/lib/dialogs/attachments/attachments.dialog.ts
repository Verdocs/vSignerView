import { Component, OnInit } from '@angular/core';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { MatDialogRef } from '@angular/material/dialog';

import { EnvelopeService } from '../../services/envelope.service';
import { SnackbarService } from '../../services/snackbar.service';

@Component({
  selector: 'app-attachments',
  templateUrl: './attachments.dialog.html',
  styleUrls: ['./attachments.dialog.scss']
})
export class AttachmentsDialogComponent implements OnInit {
  public selectedFiles;
  public field;
  public fileToUpload;
  public hasDragover = false;
  public documentFilename = '';
  public progress = 0;
  public inProgress = false;
  public envelopeId;

  constructor(
    private snackbarService: SnackbarService,
    private envelopeService: EnvelopeService,
    private dialog: MatDialogRef<AttachmentsDialogComponent>
  ) { }

  ngOnInit() {
    if (this.field && this.field['settings'] && this.field['settings']['name']) {
      this.selectedFiles = [this.field['settings']['name']];
    }
  }

  selectedFileTracking(index, item) {
    return index;
  }

  public fileSelect(selectedFiles: FileList) {
    this.selectedFiles = [selectedFiles[0].name];
    this.fileToUpload = selectedFiles[0];
  }

  public dragEvent(event): void {
    if (!!event) {
      this.hasDragover = true;
    } else {
      this.hasDragover = false;
    }
  }

  public remove(index) {
    this.selectedFiles.splice(index, 1);
    this.selectedFiles = null;
    this.fileToUpload = null;
  }

  public done() {
    this.inProgress = true;
    this.envelopeService.uploadAttachment(this.envelopeId, this.fileToUpload, this.field.name).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress) {
        this.progress = event.loaded / event.total * 100;
      } else if (event instanceof HttpResponse) {
        this.progress = 100;
        this.inProgress = false;
        if (event.body) {
          this.dialog.close(this.selectedFiles ? {
            saved: event.body
          } : {
              removed: event.body
            })
        }
      }
    });
  }

  cancel() {
    this.dialog.close();
  }
}
