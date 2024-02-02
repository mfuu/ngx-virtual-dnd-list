import {
    Component,
    Input,
    Output,
    OnInit,
    ElementRef,
    EventEmitter,
  } from '@angular/core';
  
  @Component({
    selector: 'virtual-dnd-list-item',
    template: ` <ng-content></ng-content> `,
    styles: [],
  })
  export class VirtualDndListItemComponent implements OnInit {
    @Input() dataKey: any;
    @Input() sizeKey: 'offsetHeight' | 'offsetWidth' = 'offsetHeight';
    @Output() sizeChange = new EventEmitter();
  
    public sizeObserver: ResizeObserver;
  
    constructor(public el: ElementRef) {}
  
    ngOnInit(): void {
      this.sizeObserver = new ResizeObserver(() => {
        this.sizeChange.emit({
          key: this.dataKey,
          size: this.el.nativeElement[this.sizeKey],
        });
      });
  
      this.sizeObserver.observe(this.el.nativeElement);
    }
  }
  