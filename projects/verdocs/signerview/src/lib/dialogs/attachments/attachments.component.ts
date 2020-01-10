import { Component, OnDestroy, Input, OnChanges, Compiler } from '@angular/core';
import { Subscription } from 'rxjs';

import { EnvelopeViewService } from '../../../../core/services/envelope-view.service';
import { EnvelopeService } from '../../../../core/services/envelope.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-envelope-attachments',
  templateUrl: './attachments.component.html',
  styleUrls: ['./attachments.component.scss']
})
export class AttachmentsComponent implements OnDestroy, OnChanges {
  @Input()
  envelopeId: string;

  public attachments: any[];
  private attachmentsSubscription = new Subscription();
  constructor(
    private envelopeViewService: EnvelopeViewService,
    private envelopeService: EnvelopeService,
    private compiler: Compiler
  ) { }

  ngOnDestroy() {
    this.attachmentsSubscription.unsubscribe();
    this.compiler.clearCache();
  }

  attachmentTracking(index, item) {
    return index;
  }

  ngOnChanges(changes) {
    if (changes && (changes.envelopeId.firstChange || changes.envelopeId.previousValue)) {
      this.attachmentsSubscription = this.envelopeViewService.attachmentsSubject.subscribe(attachments => {
        this.attachments = attachments;
      });
    }
  }

  downloadFile(attachmentField) {
    this.envelopeService.downloadAttachment(attachmentField).subscribe(fileBlob => {
      saveAs(fileBlob, attachmentField.settings.name);
    });
  }
}
