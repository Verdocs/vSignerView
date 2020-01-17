import {
  Inject,
  Injectable,
  InjectionToken,
  Injector,
  OnDestroy,
  Optional,
  SkipSelf,
  TemplateRef
} from '@angular/core';
import { ComponentPortal, PortalInjector } from '@angular/cdk/portal';
import { Subject, ReplaySubject } from 'rxjs';
import { Overlay, OverlayConfig, OverlayContainer, OverlayRef } from '../overlay';
import { FixedDialogConfig } from './fixed-dialog-config';
import { CreateEnvelopeContainer } from './create-envelope-container';
import { FixedDialogRef } from './fixed-dialog-ref';

export const FIXED_DIALOG_DATA = new InjectionToken<any>('FixedDialogData');
export const FIXED_DIALOG_DEFAULT_OPTIONS =
  new InjectionToken<FixedDialogConfig>('fixed-dialog-default-options');

@Injectable()
export class CreateEnvelopeService implements OnDestroy {
  private _openDialogsAtThisLevel: FixedDialogRef<any>[] = [];
  private readonly _afterAllClosedAtThisLevel = new Subject<void>();
  private readonly _afterOpenedAtThisLevel = new Subject<FixedDialogRef<any>>();

  public allDialogsClosed = new ReplaySubject<boolean>();

  get openDialogs(): FixedDialogRef<any>[] {
    return this._parentDialog ? this._parentDialog.openDialogs : this._openDialogsAtThisLevel;
  }

  get afterOpened(): Subject<FixedDialogRef<any>> {
    return this._parentDialog ? this._parentDialog.afterOpened : this._afterOpenedAtThisLevel;
  }

  get afterOpen(): Subject<FixedDialogRef<any>> {
    return this.afterOpened;
  }

  get _afterAllClosed(): Subject<void> {
    const parent = this._parentDialog;
    return parent ? parent._afterAllClosed : this._afterAllClosedAtThisLevel;
  }

  constructor(
    private _overlay: Overlay,
    private _injector: Injector,
    @Optional() @Inject(FIXED_DIALOG_DEFAULT_OPTIONS) private _defaultOptions: FixedDialogConfig,
    @Optional() @SkipSelf() private _parentDialog: CreateEnvelopeService,
    private _overlayContainer: OverlayContainer
  ) { }

  ngOnDestroy() {
    this._closeDialogs(this._openDialogsAtThisLevel);
    this._afterAllClosedAtThisLevel.complete();
    this._afterOpenedAtThisLevel.complete();
  }

  open<D = any, R = any>(config?: FixedDialogConfig<D>): FixedDialogRef<R> {
    config = _applyConfigDefaults(config, this._defaultOptions || new FixedDialogConfig());

    if (config.id && this.getDialogById(config.id)) {
      throw Error(`Dialog with id "${config.id}" exists already.`);
    }

    const overlayRef = this._createOverlay(config);
    const dialogContainer = this._attachDialogContainer(overlayRef, config);
    const dialogRef = this._attachDialogContent<R>(dialogContainer, overlayRef, config);

    this.openDialogs.unshift(dialogRef);
    dialogRef.afterClosed().subscribe(() => {
      this._removeOpenDialog(dialogRef);
      if (this.openDialogs.length === 0) {
        this.allDialogsClosed.next(true);
      } else {
        this.allDialogsClosed.next(false);
      }
    });
    this.afterOpened.next(dialogRef);

    return dialogRef;
  }
  

  closeAll(): void {
    this._closeDialogs(this.openDialogs);
  }

  collapseAll(): void {
    this._collapseDialogs(this.openDialogs);
  }

  updateAllPositions(dialogs: FixedDialogRef<any>[]): void {
    let rightMargin = 24;
    let dialogWidth = 380;

    if (window) {
      if (window.innerWidth < 480) {
        rightMargin = 0;
        dialogWidth = window.innerWidth;
      } else {
        rightMargin = 24;
        dialogWidth = 380;
      }
    }

    for (let i = 0; i < dialogs.length; i++) {
      dialogs[i].updatePosition({
        bottom: '0px',
        right: `${(i * (dialogWidth + 8)) + rightMargin}px`
      });
    }
  }

  updateAllSizes(dialogs: FixedDialogRef<any>[]): void {
    let i = dialogs.length;
    let dialogWidth = 380;

    if (window) {
      if (window.innerWidth < 480) {
        dialogWidth = window.innerWidth;
      } else {
        dialogWidth = 380;
      }
    }

    while (i--) {
      const dialogHeight = dialogs[i].currentHeight;
      dialogs[i].updateSize(`${dialogWidth}px`, `${dialogHeight}px`);
    }
  }

  getDialogById(id: string): FixedDialogRef<any> | undefined {
    return this.openDialogs.find(dialog => dialog.id === id);
  }

  private _createOverlay(config: FixedDialogConfig): OverlayRef {
    const overlayConfig = this._getOverlayConfig(config);
    return this._overlay.create(overlayConfig);
  }

  private _getOverlayConfig(dialogConfig: FixedDialogConfig): OverlayConfig {
    const state = new OverlayConfig({
      positionStrategy: this._overlay.position().global(),
      role: dialogConfig.role,
      hasBackdrop: dialogConfig.hasBackdrop ? dialogConfig.hasBackdrop : dialogConfig.role === 'single',
      minWidth: dialogConfig.minWidth,
      minHeight: dialogConfig.minHeight,
      maxWidth: dialogConfig.maxWidth,
      maxHeight: dialogConfig.maxHeight,
    });

    return state;
  }

  private _attachDialogContainer(overlay: OverlayRef, config: FixedDialogConfig): CreateEnvelopeContainer {
    const userInjector = config && config.viewContainerRef && config.viewContainerRef.injector;
    const injector = new PortalInjector(userInjector || this._injector, new WeakMap([
      [FixedDialogConfig, config]
    ]));
    const containerPortal =
      new ComponentPortal(CreateEnvelopeContainer, config.viewContainerRef, injector);
    const containerRef = overlay.attach(containerPortal);

    return containerRef.instance;
  }

  private _attachDialogContent<R>(dialogContainer: CreateEnvelopeContainer, overlayRef: OverlayRef, config: FixedDialogConfig): FixedDialogRef<R> {
    const dialogRef = new FixedDialogRef<R>(overlayRef, dialogContainer, config.id);
    dialogContainer.attach();
    dialogRef
      .updateSize(config.width, config.height)
      .updatePosition(config.position);
    return dialogRef;
  }

  private _removeOpenDialog(dialogRef: FixedDialogRef<any>) {
    const index = this.openDialogs.indexOf(dialogRef);

    if (index > -1) {
      this.openDialogs.splice(index, 1);
      if (!this.openDialogs.length) {
        this._afterAllClosed.next();
      }
    }
  }

  private _closeDialogs(dialogs: FixedDialogRef<any>[]) {
    let i = dialogs.length;

    while (i--) {
      dialogs[i].close();
    }
  }

  private _collapseDialogs(dialogs: FixedDialogRef<any>[]) {
    let i = dialogs.length;

    while (i--) {
      dialogs[i].collapse();
    }
  }
}

function _applyConfigDefaults(
  config?: FixedDialogConfig, defaultOptions?: FixedDialogConfig): FixedDialogConfig {
  return { ...defaultOptions, ...config };
}
