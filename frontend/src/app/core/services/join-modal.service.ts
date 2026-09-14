import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class JoinModalService {
  private _isOpen = signal<boolean>(false);
  public isOpen = this._isOpen.asReadonly();

  open() {
    this._isOpen.set(true);
  }

  close() {
    this._isOpen.set(false);
  }
}
