import { Component, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';

import { ITemplate } from '../../../../models/template.model';

@Component({
  selector: 'preview-link-dialog',
  templateUrl: './preview-link.dialog.html',
  styleUrls: ['./preview-link.dialog.scss']
})
export class PreviewLinkDialog implements OnInit, AfterViewInit{
  @ViewChild('previewUrlInput', { static: true }) previewUrlInput: ElementRef;
  public template: ITemplate;
  public mode: 'livelink' | 'previewlink';
  public previewUrl = '';
  public template_visibility: string = null;
  public visibility_helper_message: string = null;

  constructor(
    private dialogRef: MatDialogRef<PreviewLinkDialog>,
    private router: Router
  ) { }

  ngOnInit() {
    if (this.mode === 'previewlink') {
      if (this.template.is_personal) {
        if (this.template.is_public) {
          this.template_visibility = 'Public';
          this.visibility_helper_message = 'Anyone on the web can access this document.';
        } else {
          this.template_visibility = 'Myself';
          this.visibility_helper_message = 'Only you can see this document.';
        }
      } else {
        if (this.template.is_public) {
          this.template_visibility = 'Shared and Public';
          this.visibility_helper_message = 'Anyone in your organization and anyone on the web can access this document';
        } else {
          this.template_visibility = 'Shared';
          this.visibility_helper_message = 'Anyone in your organization can see this document.';
        }
      }
    } else if (this.mode === 'livelink') {
      this.visibility_helper_message = 'This link allows anyone to create a Verdoc on your behalf.';
    }
  }

  ngAfterViewInit() {
    const previewInput = <HTMLInputElement>this.previewUrlInput.nativeElement;
    this.copy(previewInput);
  }

  copy(dom: HTMLInputElement) {
    dom.select();
    document.execCommand('copy');
  }

  editVisibility() {
    this.router.navigate([`/builder/${this.template['id']}/docs`]);
    this.close();
  } 

  close() {
    this.dialogRef.close();
  }
}
