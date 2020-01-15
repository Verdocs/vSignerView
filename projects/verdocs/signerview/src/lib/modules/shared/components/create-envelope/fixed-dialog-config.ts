import {ViewContainerRef} from '@angular/core';

export type DialogRole = 'single' | 'multi';

export interface DialogPosition {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

export class FixedDialogConfig<D = any> {
  viewContainerRef?: ViewContainerRef;
  id?: string;
  role?: DialogRole = 'single';
  hasBackdrop?: boolean;
  width?: string = '';
  height?: string = '';
  minWidth?: string = '';
  minHeight?: string = '';
  maxWidth?: string = '';
  maxHeight?: string = '';
  position?: DialogPosition;
  data?: D | null = null;
  ariaDescribedBy?: string | null = null;
  ariaLabelledBy?: string | null = null;
  ariaLabel?: string | null = null;
  restoreFocus?: boolean = true;
  closeOnNavigation?: boolean = false;
}
