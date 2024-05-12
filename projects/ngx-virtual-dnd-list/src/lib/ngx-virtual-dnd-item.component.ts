import {
  Input,
  Output,
  OnInit,
  Renderer2,
  Component,
  ElementRef,
  EventEmitter,
  SimpleChanges,
} from '@angular/core';
import { getDataKey } from './utils';

@Component({
  selector: '[virtual-dnd-list-item]',
  template: ` <ng-content></ng-content> `,
  host: {
    class: 'virtual-dnd-list-item',
  },
  styles: [],
})
export class VirtualDndListItemComponent implements OnInit {
  @Input() source: any;
  @Input() dataKey: any;
  @Input() dragging: string;
  @Input() isHorizontal: boolean;

  @Output() sizeChange = new EventEmitter();

  private sizeObserver: ResizeObserver;

  private get key() {
    return getDataKey(this.source, this.dataKey);
  }

  constructor(private el: ElementRef, private render2: Renderer2) {}

  ngOnInit(): void {
    this.render2.setAttribute(this.el.nativeElement, 'data-key', this.key);

    this.sizeObserver = new ResizeObserver(() => {
      this.sizeChange.emit({
        key: this.key,
        size: this.el.nativeElement[this.isHorizontal ? 'offsetWidth' : 'offsetHeight'],
      });
    });

    this.sizeObserver.observe(this.el.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dragging']) {
      const display = this.dragging === this.key ? 'none' : '';
      this.render2.setStyle(this.el.nativeElement, 'display', display);
    }
  }
}
