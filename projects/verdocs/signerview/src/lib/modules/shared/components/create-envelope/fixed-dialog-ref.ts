import { OverlayRef, GlobalPositionStrategy } from '../overlay';
import { Observable, Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { CreateEnvelopeContainer } from './create-envelope-container';
import { DialogPosition } from './fixed-dialog-config';

let uniqueId = 0;

export class FixedDialogRef<R = any> {
  private readonly _afterOpened = new Subject<void>();
  private readonly _afterClosed = new Subject<R | undefined>();
  private readonly _beforeClosed = new Subject<R | undefined>();
  private _result: R | undefined;
  private _position: DialogPosition;

  constructor(
    private _overlayRef: OverlayRef,
    public _containerInstance: CreateEnvelopeContainer,
    readonly id: string = `fixed-dialog-${uniqueId++}`
  ) {
    _containerInstance._id = id;
    _containerInstance._animationStateChanged.pipe(
      filter(event => event.phaseName === 'done' && event.toState === 'enter'),
      take(1)
    )
      .subscribe(() => {
        this._afterOpened.next();
        this._afterOpened.complete();
      });
    _containerInstance._animationStateChanged.pipe(
      filter(event => event.phaseName === 'done' && event.toState === 'exit'),
      take(1)
    ).subscribe(() => this._overlayRef.dispose());
    _overlayRef.detachments().subscribe(() => {
      this._beforeClosed.next(this._result);
      this._beforeClosed.complete();
      this._afterClosed.next(this._result);
      this._afterClosed.complete();
      this._overlayRef.dispose();
    });
    _containerInstance._hasPreparerChanged.subscribe((event) => {
      const width = this.currentWidth;
      const height = this.getWindowHeight(event.template);
      if (event.status === true) {
        this.updateSize(`${width}px`, `${height + 45}px`);
      } else {
        this.updateSize(`${width}px`, `${height}px`);
      }
    })
  }

  get currentHeight() {
    return this._overlayRef.getConfig().height;
  }

  get currentWidth() {
    return this._overlayRef.getConfig().width;
  }

  getId() {
    return this.id;
  }

  getPosition() {
    return this._position;
  }

  close(dialogResult?: R): void {
    this._result = dialogResult;
    if (this._containerInstance.isFormPristine) {
      this.startCloseProcess(dialogResult);
    } else {
      const discardDialog = this._containerInstance.close();
      discardDialog.afterClosed().subscribe(status => {
        if (status && status.discard) {
          this.startCloseProcess(dialogResult);
        }
      });
    }
  }

  startCloseProcess(dialogResult?: R) {
    // Transition the backdrop in parallel to the dialog.
    this._containerInstance._animationStateChanged.pipe(
      filter(event => event.phaseName === 'start'),
      take(1)
    )
      .subscribe(() => {
        this._beforeClosed.next(dialogResult);
        this._beforeClosed.complete();
        this._overlayRef.detachBackdrop();
      });
    this._containerInstance._startExitAnimation();
  }

  collapse(): void {
    this._containerInstance._windowState = 'collapsed';
    this.updateSize(`${this.currentWidth}` || '380px', '48px');
    // this.hideBackdrop();
  }

  expand(): void {
    const template = this._containerInstance.template;
    if (template && template.roles && template.roles.length > 0) {
      const windowHeight: string = this.getWindowHeight(template) + 'px';
      this.updateSize(`${this.currentWidth}` || '380px', windowHeight);
      this._containerInstance._windowState = 'expanded';
      // this.showBackdrop();
    }
  }

  maximize(): void {
    const template = this._containerInstance.template;
    if (template && template.roles && template.roles.length > 0) {
      this._containerInstance._windowState = 'maximized';
    }
  }

  showBackdrop(): void {
    if (this._overlayRef.getConfig().role === 'single') {
      this._overlayRef.attachBackdrop();
    }
  }

  hideBackdrop(): void {
    if (this._overlayRef.getConfig().role === 'single') {
      this._overlayRef.detachBackdrop();
    }
  }

  numberOfRoles(template): number {
    if (template && template.roles && template.roles.length > 0) {
      return template.roles.length;
    }
    return 1;
  }

  getWindowHeight(template) {
    this._containerInstance.currentProfile
    const headerHeight = 48;
    const senderHeight = 45;
    const rolesHeight = this.numberOfRoles(template) * 45;
    const completeHeight = 45;
    const dividerHeight = 25;
    const footerHeight = 53.5;

    return !!this._containerInstance.currentProfile || this._containerInstance._templateSource === 'liveview' ? headerHeight + senderHeight + rolesHeight + completeHeight + dividerHeight + footerHeight : 335;
  }

  afterOpened(): Observable<void> {
    return this._afterOpened.asObservable();
  }

  afterClosed(): Observable<R | undefined> {
    return this._afterClosed.asObservable();
  }

  beforeClosed(): Observable<R | undefined> {
    return this._beforeClosed.asObservable();
  }

  updatePosition(position?: DialogPosition): this {
    let strategy = this._getPositionStrategy();
    if (position) {
      this._position = position;
      if (position.left || position.right) {
        position.left ? strategy.left(position.left) : strategy.right(position.right);
      } else {
        strategy.centerHorizontally();
      }

      if (position.top || position.bottom) {
        position.top ? strategy.top(position.top) : strategy.bottom(position.bottom);
      } else {
        strategy.centerVertically();
      }
    }
    this._overlayRef.updatePosition();

    return this;
  }

  updateSize(width: string = '', height: string = ''): this {
    this._getPositionStrategy().width(width).height(height);
    this._overlayRef.updatePosition();
    return this;
  }

  addPanelClass(classes: string | string[]): this {
    this._overlayRef.addPanelClass(classes);
    return this;
  }

  removePanelClass(classes: string | string[]): this {
    this._overlayRef.removePanelClass(classes);
    return this;
  }

  private _getPositionStrategy(): GlobalPositionStrategy {
    return this._overlayRef.getConfig().positionStrategy as GlobalPositionStrategy;
  }
}
