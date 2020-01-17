import {
  Directive,
  Input,
  OnChanges,
  OnInit,
  Optional,
  SimpleChanges,
  ElementRef,
} from '@angular/core';
import { CreateEnvelopeService } from './create-envelope';
import { FixedDialogRef } from './fixed-dialog-ref';

@Directive({
  selector: `button[fixed-dialog-close], button[fixedDialogClose]`,
  exportAs: 'fixedDialogClose',
  host: {
    '(click)': 'dialogRef.close(dialogResult)',
    '[attr.aria-label]': 'ariaLabel || null',
    'type': 'button', // Prevents accidental form submits.
  }
})
export class FixedDialogClose implements OnInit, OnChanges {
  @Input('aria-label') ariaLabel: string;

  /** Dialog close input. */
  @Input('fixed-dialog-close') dialogResult: any;

  @Input('fixedDialogClose') _fixedDialogClose: any;

  constructor(
    @Optional() public dialogRef: FixedDialogRef<any>,
    private _elementRef: ElementRef<HTMLElement>,
    private _dialog: CreateEnvelopeService) {
    }

  ngOnInit() {
    if (!this.dialogRef) {
      this.dialogRef = getClosestDialog(this._elementRef, this._dialog.openDialogs)!;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    const proxiedChange = changes['_fixedDialogClose'] || changes['_fixedDialogCloseResult'];
    if (proxiedChange) {
      this.dialogResult = proxiedChange.currentValue;
    }
  }
}

@Directive({
  selector: `button[fixed-dialog-expand], button[fixedDialogExpand]`,
  exportAs: 'fixedDialogClose',
  host: {
    '(click)': 'dialogRef.expand()',
    '[attr.aria-label]': 'ariaLabel || null',
    'type': 'button', // Prevents accidental form submits.
  }
})
export class FixedDialogExpand implements OnInit {
  @Input('aria-label') ariaLabel: string;

  /** Dialog close input. */
  @Input('fixed-dialog-expand') dialogResult: any;

  @Input('fixedDialogExpand') _fixedDialogExpand: any;

  constructor(
    @Optional() public dialogRef: FixedDialogRef<any>,
    private _elementRef: ElementRef<HTMLElement>,
    private _dialog: CreateEnvelopeService) { }

  ngOnInit() {
    if (!this.dialogRef) {
      this.dialogRef = getClosestDialog(this._elementRef, this._dialog.openDialogs)!;
    }
  }
}

@Directive({
  selector: `button[fixed-dialog-collapse], button[fixedDialogCollapse]`,
  exportAs: 'fixedDialogClose',
  host: {
    '(click)': 'dialogRef.collapse()',
    '[attr.aria-label]': 'ariaLabel || null',
    'type': 'button', // Prevents accidental form submits.
  }
})
export class FixedDialogCollapse implements OnInit {
  @Input('aria-label') ariaLabel: string;

  /** Dialog close input. */
  @Input('fixed-dialog-collapse') dialogResult: any;

  @Input('fixedDialogCollapse') _fixedDialogCollapse: any;

  constructor(
    @Optional() public dialogRef: FixedDialogRef<any>,
    private _elementRef: ElementRef<HTMLElement>,
    private _dialog: CreateEnvelopeService) { }

  ngOnInit() {
    if (!this.dialogRef) {
      this.dialogRef = getClosestDialog(this._elementRef, this._dialog.openDialogs)!;
    }
  }
}

function getClosestDialog(element: ElementRef<HTMLElement>, openDialogs: FixedDialogRef<any>[]) {
  let parent: HTMLElement | null = element.nativeElement.parentElement;

  while (parent && !parent.classList.contains('fixed-dialog-container')) {
    parent = parent.parentElement;
  }

  return parent ? openDialogs.find(dialog => dialog.id === parent!.id) : null;
}
