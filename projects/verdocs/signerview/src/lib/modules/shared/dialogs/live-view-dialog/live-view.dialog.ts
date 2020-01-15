import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';


@Component({
  selector: 'live-view-dialog',
  templateUrl: 'live-view.dialog.html',
  styleUrls: ['live-view.dialog.scss']
})
export class LiveViewDialog implements AfterViewInit {
  @ViewChild('liveUrlInput', { static: true }) liveUrlInput: ElementRef;
  public liveUrl = '';

  constructor(
    private dialogRef: MatDialogRef<LiveViewDialog>
  ) { }

  ngAfterViewInit() {
    const liveInput = <HTMLInputElement>this.liveUrlInput.nativeElement;
    this.copy(liveInput);
  }

  copy(dom: HTMLInputElement) {
    dom.select();
    document.execCommand('copy');
  }
  close() {
    this.dialogRef.close();
  }
}
