import {
  Component,
  Input,
  Output,
  OnInit,
  ElementRef,
  EventEmitter,
} from '@angular/core';
import { getDataKey } from './utils';

@Component({
  selector: 'virtual-dnd-list-item',
  template: ` <ng-content></ng-content> `,
  styles: [],
})
export class VirtualDndListItemComponent implements OnInit {
  @Input() source: any;
  @Input() dataKey: any;
  @Input() sizeKey: 'offsetHeight' | 'offsetWidth' = 'offsetHeight';
  @Output() sizeChange = new EventEmitter();

  private sizeObserver: ResizeObserver;

  private get key() {
    return getDataKey(this.source, this.dataKey);
  }

  constructor(public el: ElementRef) {}

  ngOnInit(): void {
    this.el.nativeElement.setAttribute('data-key', this.key);

    this.sizeObserver = new ResizeObserver(() => {
      this.sizeChange.emit({
        key: this.key,
        size: this.el.nativeElement[this.sizeKey],
      });
    });

    this.sizeObserver.observe(this.el.nativeElement);
  }
}
