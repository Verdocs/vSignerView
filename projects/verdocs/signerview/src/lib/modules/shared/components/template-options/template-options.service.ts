import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { BuilderDataService } from '../../../../services/builder-data.service';
import { ITemplate } from '../../../../models/template.model';
import { PreviewLinkDialog } from '../../dialogs/preview-link/preview-link.dialog';

@Injectable()
export class TemplateOptionsService {

  constructor(
    private dialog: MatDialog,
    private builderDataService: BuilderDataService
  ) {}

  liveViewClipboard(meetsPlanType, template: ITemplate) {
    if (window && meetsPlanType === true) {
      const lvDialog = this.dialog.open(PreviewLinkDialog, {
        panelClass: 'link__dialog'
      });
      lvDialog.componentInstance.mode = 'livelink';
      lvDialog.componentInstance.template = template;
      lvDialog.componentInstance.previewUrl =
        `${window.location.origin}/view/live/${template['id']}` +
        `/token/${encodeURIComponent(template['token'])}`;
    }
  }

  canPreview(template: ITemplate) {
    return this.builderDataService.canUserPreview(template);
  }

  createLinkClipboard(template: ITemplate) {
    if (window && this.canPreview(template)) {
      const previewLinkDialog = this.dialog.open(PreviewLinkDialog, {
        panelClass: 'link__dialog'
      });
      previewLinkDialog.componentInstance.mode = 'previewlink';
      previewLinkDialog.componentInstance.template = template;
      previewLinkDialog.componentInstance.previewUrl = `${window.location.origin}/document/${template['id']}`;
    }
  }
}
