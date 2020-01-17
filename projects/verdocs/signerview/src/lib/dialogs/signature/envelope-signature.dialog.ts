import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  AfterViewInit,
  Inject,
  ChangeDetectorRef
} from '@angular/core';
import { DOCUMENT } from "@angular/common";
import { MatDialogRef } from '@angular/material/dialog';
import { MatTabGroup } from '@angular/material/tabs';
import { Subscription } from 'rxjs';


import html2canvas from 'html2canvas';
import { isEmpty } from 'lodash';

import { SignatureService } from '../../services/envelope-signature.service';
import { RecipientService } from '../../services/recipients.service';
import { SnackbarService } from '../../services/snackbar.service';
import { EnvelopeViewService } from '../../services/envelope-view.service';
import { EventTrackerService } from '@verdocs/event-tracker';

@Component({
  selector: 'app-envelope-signature-dialog',
  templateUrl: './envelope-signature.dialog.html',
  styleUrls: ['./envelope-signature.dialog.scss']
})
export class EnvelopeSignatureDialogComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  @ViewChild('signatureBody', { static: true }) signatureBody: ElementRef;
  @ViewChild('signatureCanvas', { static: true }) signatureCanvas: ElementRef;
  @ViewChild('signatureGuide', { static: true }) signatureGuide: ElementRef;
  @ViewChild('signatureText', { static: true }) signatureText: ElementRef;
  @ViewChild('signatureBlock', { static: true }) signatureBlock: ElementRef;
  @ViewChild('fullNameInput', { static: true }) fullNameInput: ElementRef;
  @ViewChild('signatureTabGroup', { static: true }) signatureTabGroup: MatTabGroup;

  public color: string;
  public adopt = false;
  public full_name = '';
  public initial = '';
  public fieldCoordinate: any;
  public fieldCoordinateOverride: any;
  public signatureMode = 'Signature';
  public placeholder = 'Full Name';
  public fieldName: string = null;
  public roleName = '';
  public envelopeId: string;
  public adoptedAndSigned = false;
  public recipient;
  public tabIndex = 0;

  private paint = false;
  private pointX: number[] = [];
  private pointY: number[] = [];
  private pointDrag: boolean[] = [];
  private canvas: any;
  private fields: any[] = [];
  private mode: string;
  private fieldsSubscription: Subscription = new Subscription;
  private recipientSubscription: Subscription = new Subscription;
  private modeSubscription: Subscription = new Subscription;
  private liveFieldsSubscription: Subscription = new Subscription;
  private fieldCoordinateSubscription: Subscription = new Subscription;
  private oldFullName: string;

  constructor(
    private signatureService: SignatureService,
    private envelopeViewService: EnvelopeViewService,
    private dialog: MatDialogRef<EnvelopeSignatureDialogComponent>,
    private snackbarService: SnackbarService,
    private cdr: ChangeDetectorRef,
    private recipientService: RecipientService,
    private eventTracker: EventTrackerService,
    @Inject(DOCUMENT) private document
  ) { }

  ngOnInit() {
    this.canvas = this.signatureCanvas.nativeElement.getContext('2d');
    this.fieldsSubscription = this.signatureService._fields.subscribe(fields => {
      this.fields = fields;
    });
    this.recipientSubscription = this.signatureService._recipient.subscribe(recipient => {
      if (recipient) {
        this.recipient = recipient;
        if (recipient['full_name']) {
          this.full_name = recipient['full_name'];
          if (this.signatureMode === 'Initial') {
            const nameArray = recipient['full_name'].split(' ');
            const initial = nameArray.map(name => {
              return name.charAt(0);
            });
            this.full_name = initial.join('');
          }
        }
        if (!this.oldFullName) {
          this.oldFullName = recipient['full_name'];
        }
      }
    });
    this.modeSubscription = this.envelopeViewService.viewModeSubject.subscribe(mode => {
      this.mode = mode;
    });
    this.fieldCoordinateSubscription = this.envelopeViewService.jumpCoordinateSubject.subscribe(fieldCoordinate => {
      if (fieldCoordinate.pageNum !== null) {
        this.fieldCoordinate = fieldCoordinate;
      }
    });
  }

  ngAfterViewChecked() {
    this.resizeText();
    this.cdr.detectChanges();
  }

  ngAfterViewInit() {
    this.resizeText();
    this.resizeCanvas();
    this.signatureTabGroup.selectedIndexChange.subscribe(index => {
      if (index === 1) {
        this.adoptedAndSigned = !this.hasSignature();
      } else {
        this.adoptedAndSigned = false;
      }
    })
  }

  ngOnDestroy() {
    this.fieldsSubscription.unsubscribe();
    this.recipientSubscription.unsubscribe();
    this.modeSubscription.unsubscribe();
    this.liveFieldsSubscription.unsubscribe();
    this.fieldCoordinateSubscription.unsubscribe();
  }

  updateFullName() {
    if (this.canUpdateName() && this.full_name !== this.oldFullName && this.signatureMode === 'Signature') {
      return this.recipientService.updateRecipientName(this.envelopeId, this.roleName, this.full_name);
    } else {
      return;
    }
  }

  canUpdateName() {
    return this.recipient && this.recipient.profile_id.includes('guest');
  }

  captureSignatureFromCanvas() {
    const signatureCanvas = (this.tabIndex === 0) ?
      this.signatureBlock.nativeElement : this.canvas.canvas;
    const canvasOption: any = {
      onrendered: (canvas) => {
        this.updateSignaturePicture(canvas);
      }
    }
    return html2canvas(signatureCanvas, canvasOption);
  }

  updateSignaturePicture(canvas) {
    const dataUrl = canvas.toDataURL('image/png');
    if (this.signatureMode === 'Signature') {
      this.signatureService.setSignatureData(dataUrl);
    } else {
      this.signatureService.setInitialData(dataUrl);
    }
  }

  selColor(hex: string) {
    this.color = hex;
    this.animateDraw();
  }

  stopDraw() {
    this.paint = false;
    this.adoptedAndSigned = !this.hasSignature();
  }

  draw(e) {
    this.paint = true;
    this.addPoints(e, false);
    this.animateDraw();
  }

  recordPoints(e) {
    if (this.paint) {
      this.addPoints(e, true);
      this.animateDraw();
    }
  }

  animateDraw() {
    this.canvas.clearRect(0, 0, this.canvas.canvas.offsetWidth, this.canvas.canvas.offsetHeight);

    this.canvas.strokeStyle = this.color || '#000000';
    this.canvas.lineJoin = 'round';
    this.canvas.lineWidth = 3;

    for (let i = 0; i < this.pointX.length; i++) {
      this.canvas.beginPath();
      if (this.pointDrag[i] && i) {
        this.canvas.moveTo(this.pointX[i - 1], this.pointY[i - 1]);
      } else {
        this.canvas.moveTo(this.pointX[i] - 1, this.pointY[i]);
      }

      this.canvas.lineTo(this.pointX[i], this.pointY[i]);
      this.canvas.closePath();
      this.canvas.stroke();
    }
  }

  addPoints(e, drag: boolean) {
    if (window) {
      let x;
      let y;
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX;
      } else {
        x = e.pageX;
      }

      if (e.touches && e.touches.length > 0) {
        y = e.touches[0].clientY;
      } else {
        y = e.pageY;
      }
      const signatureBodyWidth = this.signatureBody.nativeElement.offsetWidth;
      const signatureBodyHeight = this.signatureBody.nativeElement.offsetHeight;
      const offsetX = (document.getElementsByClassName('envelope__body')[0].clientWidth / 2) - (signatureBodyWidth / 2) + 26;
      const offsetY = (window.innerHeight / 2) - (signatureBodyHeight / 2) + 203;
      this.pointX.push(x - offsetX);
      this.pointY.push(y - offsetY);
      this.pointDrag.push(drag);
    }
  }

  clearPad() {
    this.canvas.clearRect(0, 0, this.canvas.canvas.offsetWidth, this.canvas.canvas.offsetHeight);
    this.pointX = [];
    this.pointY = [];
    this.pointDrag = [];
    this.adoptedAndSigned = !this.hasSignature();
  }

  updateSignature() {
    let pageNum;
    let fieldIndex;
    if (!isEmpty(this.fieldCoordinateOverride)) {
      pageNum = this.fieldCoordinateOverride.pageNum;
      fieldIndex = this.fieldCoordinateOverride.fieldIndex;
    } else {
      pageNum = this.fieldCoordinate.pageNum;
      fieldIndex = this.fieldCoordinate.fieldIndex;
    }
    this.fields[pageNum][fieldIndex]['value'] = 'signed';
    this.signatureService.updateFields(this.fields);
  }

  updateInitial() {
    let pageNum;
    let fieldIndex;
    if (!isEmpty(this.fieldCoordinateOverride)) {
      pageNum = this.fieldCoordinateOverride.pageNum;
      fieldIndex = this.fieldCoordinateOverride.fieldIndex;
    } else {
      pageNum = this.fieldCoordinate.pageNum;
      fieldIndex = this.fieldCoordinate.fieldIndex;
    }
    this.fields[pageNum][fieldIndex]['value'] = 'initialed';
    this.signatureService.updateFields(this.fields);
  }

  resizeCanvas() {
    const signatureBodyWidth = this.signatureBody.nativeElement.offsetWidth;
    this.signatureText.nativeElement.style.height = `${80 / 305 * this.signatureBlock.nativeElement.offsetWidth - 10}px`
    this.signatureText.nativeElement.style.lineHeight = `${80 / 305 * this.signatureBlock.nativeElement.offsetWidth - 10}px`
    this.signatureCanvas.nativeElement.style.height = `${80 / 305 * (signatureBodyWidth - 40)}px`
    this.signatureCanvas.nativeElement.height = `${80 / 305 * (signatureBodyWidth - 40)}`
    this.signatureCanvas.nativeElement.style.width = `${(signatureBodyWidth - 42)}px`
    this.signatureCanvas.nativeElement.width = `${(signatureBodyWidth - 42)}`
    this.signatureGuide.nativeElement.style.height = `${(80 / 305 * (signatureBodyWidth - 40)) * .8}px`;
    this.canvas = this.signatureCanvas.nativeElement.getContext('2d');
  }

  resizeText() {
    let currWidth = this.signatureText.nativeElement.offsetWidth;
    let blockWidth = this.signatureBlock.nativeElement.offsetWidth;
    let fontSize;
    if (this.signatureText.nativeElement.style.fontSize) {
      fontSize = parseFloat(this.signatureText.nativeElement.style.fontSize);
    } else {
      fontSize = 38;
    }
    this.signatureText.nativeElement.style.fontSize = `${fontSize}px`
    if (currWidth > blockWidth) {
      while (currWidth > blockWidth - 20) {
        fontSize -= 1;
        this.signatureText.nativeElement.style.fontSize = fontSize + 'px';
        currWidth = this.signatureText.nativeElement.offsetWidth;
        blockWidth = this.signatureBlock.nativeElement.offsetWidth;
      }
    } else {
      while (currWidth < blockWidth - 20 && fontSize < 50) {
        fontSize += 1;
        this.signatureText.nativeElement.style.fontSize = fontSize + 'px';
        currWidth = this.signatureText.nativeElement.offsetWidth;
        blockWidth = this.signatureBlock.nativeElement.offsetWidth;
      }
    }
  }

  async adoptAndSign() {
    try {
      this.adoptedAndSigned = true;
      await this.updateFullName();
      await this.captureSignatureFromCanvas();
      const message = this.signatureMode === 'Signature' ? 'Saving Signature' : 'Saving Initial';
      this.snackbarService.open(message);
      this.handleMode();
    } catch (err) {
      this.snackbarService.open('Failed to apply signature', null);
    }
  }

  handleMode() {
    let currentField;
    switch (this.mode) {
      case 'signerview':
        if (this.signatureMode === 'Signature') {
          this.signatureService.postSignatureBlob().then(result => {
            if (result && result.id && result.url) {
              currentField = this.signatureService.currField;
              this.signatureService.updateSigned(currentField.fName, true);
              this.signatureService.toggleSig(false);
              this.signatureService.setSignatureId(result.id);
              this.updateSignature();
              this.signatureService.putSignatureField(this.envelopeId, this.fieldName, result.id).then(res => {
                this.eventTracker.createEvent({
                  category: 'verdoc',
                  action: 'verdoc signed',
                  label: `verdoc id: ${this.envelopeId}`
                });
                if (res && res.settings) {
                  this.signatureService.setSignatureData(res.settings.base64);
                  this.signatureService.setSignatureId(res.settings.signature_id);
                }
                this.snackbarService.dismiss();
                this.dialog.close({ status: 'saved', temp_sig: res.settings.base64, sig_id: res.settings.signature_id });
              });
            }
          });
        } else {
          this.signatureService.postInitialBlob().then(result => {
            if (result && result.id && result.url) {
              currentField = this.signatureService.currField;
              this.signatureService.updateInitialed(currentField.fName, true);
              this.signatureService.setInitialId(result.id);
              this.signatureService.toggleSig(false);
              this.updateInitial();
              this.signatureService.putInitialField(this.envelopeId, this.fieldName, result.id).then(res => {
                if (res && res.settings) {
                  this.signatureService.setInitialData(res.settings.base64);
                  this.signatureService.setInitialId(res.settings.initial_id);
                }
                this.snackbarService.dismiss();
                this.dialog.close({ status: 'saved', temp_int: res.settings.base64, int_id: res.settings.initial_id });
              });
            }
          });
        }
        break;
    }
  }

  hasSignature() {
    return this.pointDrag.length > 0 && this.pointX.length > 0 && this.pointY.length > 0;
  }

  close() {
    this.dialog.close();
  }
}
