import {
  Input,
  Output,
  OnInit,
  NgZone,
  Renderer2,
  OnChanges,
  OnDestroy,
  Component,
  forwardRef,
  ElementRef,
  TemplateRef,
  ContentChild,
  EventEmitter,
  SimpleChanges,
  IterableDiffer,
  IterableDiffers,
  ChangeDetectorRef,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Group, ScrollSpeed, SortableEvent } from 'sortable-dnd';
import {
  Range,
  Virtual,
  Sortable,
  debounce,
  DragEvent,
  DropEvent,
  getDataKey,
  isSameValue,
  ScrollEvent,
  VirtualAttrs,
  SortableAttrs,
  VirtualOptions,
  SortableOptions,
} from './core';

@Component({
  selector: 'virtual-dnd-list, [virtual-dnd-list]',
  template: `
    <ng-container
      *ngTemplateOutlet="spacerTemplate; context: { $implicit: range.front }"
    ></ng-container>

    <ng-template
      *ngFor="let item of renderList; index as i; trackBy: trackByFn"
      [virtualItem]="item"
      [dataKey]="dataKey"
      [dragging]="dragging"
      [chosenKey]="chosenKey"
      [itemClass]="itemClass"
      [isHorizontal]="isHorizontal"
      (sizeChange)="onSizeChange($event)"
    >
      <ng-container
        *ngTemplateOutlet="
          listItemTemplateRef;
          context: { $implicit: item, index: i + range.start }
        "
      ></ng-container>
    </ng-template>

    <ng-container
      *ngTemplateOutlet="spacerTemplate; context: { $implicit: range.behind }"
    ></ng-container>

    <ng-template #spacerTemplate let-offset>
      <tr *ngIf="tableMode">
        <td
          [ngStyle]="{
            border: 0,
            padding: 0,
            width: this.isHorizontal ? offset + 'px' : '',
            height: this.isHorizontal ? '' : offset + 'px'
          }"
        ></td>
      </tr>
    </ng-template>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VirtualDndListComponent),
      multi: true,
    },
  ],
  encapsulation: ViewEncapsulation.None,
})
export class VirtualDndListComponent<T>
  implements OnInit, OnDestroy, OnChanges, ControlValueAccessor
{
  @Input() size: number;
  @Input() keeps: number = 30;
  @Input() scroller: HTMLElement | Document | Window;
  @Input() tableMode: boolean = false;
  @Input() direction: 'vertical' | 'horizontal' = 'vertical';
  @Input() keepOffset: boolean = false;
  @Input() debounceTime: number = 0;
  @Input() throttleTime: number = 0;

  @Input() wrapper: HTMLElement;
  @Input() delay: number;
  @Input() group: string | Group;
  @Input() handle: string | ((event: Event & (TouchEvent | MouseEvent)) => boolean);
  @Input() dataKey: string;
  @Input() sortable: boolean = true;
  @Input() lockAxis: 'x' | 'y' | '' = '';
  @Input() disabled: boolean = false;
  @Input() itemClass: string = 'virtual-dnd-list-item';
  @Input() draggable: string = '.virtual-dnd-list-item';
  @Input() animation: number = 150;
  @Input() autoScroll: boolean = true;
  @Input() scrollSpeed: ScrollSpeed = { x: 10, y: 10 };
  @Input() ghostClass: string = '';
  @Input() ghostStyle: any;
  @Input() chosenClass: string = '';
  @Input() placeholderClass: string = '';
  @Input() fallbackOnBody: boolean = false;
  @Input() scrollThreshold: number = 55;
  @Input() delayOnTouchOnly: boolean = false;

  @Output() onTop = new EventEmitter();
  @Output() onBottom = new EventEmitter();
  @Output() onDrag: EventEmitter<DragEvent<T>> = new EventEmitter();
  @Output() onDrop: EventEmitter<DropEvent<T>> = new EventEmitter();
  @Output() rangeChange: EventEmitter<Range> = new EventEmitter();

  @ContentChild(TemplateRef) listItemTemplateRef: TemplateRef<T>;

  public get renderList() {
    return this.modelValue.slice(this.range.start, this.range.end + 1);
  }

  public get isHorizontal() {
    return this.direction === 'horizontal';
  }

  /**
   * Get the size of the current item by data key
   */
  public getSize(key: string | number) {
    return this.virtual.getSize(key);
  }

  /**
   * Get the current scroll height
   */
  public getOffset() {
    return this.virtual.getOffset();
  }

  /**
   * Get all scroll size (scrollHeight or scrollWidth)
   */
  public getScrollSize() {
    return this.virtual.getScrollSize();
  }

  /**
   * Get the scroller's client viewport size (width or height)
   */
  public getClientSize() {
    return this.virtual.getClientSize();
  }

  /**
   * Scroll to the specified data-key position
   */
  public scrollToKey(key: string | number) {
    const index = this.uniqueKeys.indexOf(key);
    if (index > -1) {
      this.virtual.scrollToIndex(index);
    }
  }

  /**
   * Scroll to the specified offset left/top
   */
  public scrollToOffset(offset: number) {
    this.virtual.scrollToOffset(offset);
  }

  /**
   * Scroll to the specified index position
   */
  public scrollToIndex(index: number) {
    this.virtual.scrollToIndex(index);
  }

  /**
   * Scroll to bottom of list
   */
  public scrollToBottom() {
    this.virtual.scrollToBottom();
  }

  private differ: IterableDiffer<any>;
  constructor(
    protected readonly el: ElementRef,
    protected readonly cdr: ChangeDetectorRef,
    protected readonly zone: NgZone,
    protected readonly render2: Renderer2,
    protected readonly iterableDiffers: IterableDiffers
  ) {
    this.differ = this.iterableDiffers.find([]).create(null);
  }

  ngOnInit(): void {
    this.installVirtual();
    this.installSortable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    SortableAttrs.forEach((key) => {
      if (key in changes) {
        this.dnd?.option(key as keyof SortableOptions<T>, this[key]);
      }
    });
    VirtualAttrs.forEach((key) => {
      if (key in changes) {
        this.virtual?.option(key as keyof VirtualOptions, this[key]);
      }
    });
  }

  ngDoCheck(): void {
    const changes = this.differ.diff(this.modelValue);
    if (changes) {
      this.writeValue(this.modelValue);
    }
  }

  ngOnDestroy(): void {
    this.virtual.removeScrollEventListener();
    this.dnd.destroy();
  }

  public trackByFn = (_: number, item: T) => {
    return getDataKey(item, this.dataKey);
  };

  public modelValue: T[] = [];
  public onModelTouched = (_: T[]) => {};
  public onModelChange = (_: T[]) => {};

  public registerOnChange(fn: (_: T[]) => void): void {
    this.onModelChange = fn;
  }

  public registerOnTouched(fn: (_: T[]) => void): void {
    this.onModelTouched = fn;
  }

  private lastList: T[] = [];
  public writeValue(value: T[]): void {
    this.modelValue = value || [];

    this.updateUniqueKeys();
    this.detectRangeUpdate();

    // auto scroll to the last offset
    if (this.lastLength && this.keepOffset) {
      const index = this.modelValue.length - this.lastLength;
      if (index > 0) {
        this.scrollToIndex(index);
      }
      this.lastLength = 0;
    }

    this.lastList = [...this.modelValue];
  }

  private updateUniqueKeys() {
    this.uniqueKeys = this.modelValue.map((item) => getDataKey(item, this.dataKey));
    this.virtual.option('uniqueKeys', this.uniqueKeys);
    this.dnd.option('uniqueKeys', this.uniqueKeys);
    this.dnd.option('list', this.modelValue);
  }

  private detectRangeUpdate() {
    if (!this.modelValue.length && !this.lastList.length) {
      return;
    }

    if (this.modelValue.length === this.lastList.length) {
      return;
    }

    let range = { ...this.range };
    if (
      this.lastList.length > this.keeps &&
      this.modelValue.length > this.lastList.length &&
      this.range.end === this.lastList.length - 1 &&
      this.scrolledToBottom()
    ) {
      range.start++;
    }
    this.virtual.updateRange(range);
  }

  private scrolledToBottom() {
    const offset = this.getOffset();
    const clientSize = this.getClientSize();
    const scrollSize = this.getScrollSize();
    return offset + clientSize + 1 >= scrollSize;
  }

  // ========================================== use sortable ==========================================
  public dragging: boolean = false;
  public chosenKey: string;
  private dnd: Sortable<T>;

  private installSortable() {
    let props = {};
    for (let i = 0; i < SortableAttrs.length; i++) {
      let key = SortableAttrs[i];
      props[key] = this[key];
    }

    this.dnd = new Sortable(this.wrapper || this.el.nativeElement, {
      ...props,
      list: this.modelValue,
      uniqueKeys: this.uniqueKeys,
      onDrag: (event) => this.onSortableDrag(event),
      onDrop: (event) => this.onSortableDrop(event),
      onChoose: (event) => this.onSortableChoose(event),
      onUnchoose: (event) => this.onSortableUnchoose(event),
    });
  }

  private onSortableChoose(event: SortableEvent) {
    this.chosenKey = event.node.getAttribute('data-key');
  }

  private onSortableUnchoose(event: SortableEvent) {
    this.chosenKey = '';
  }

  private onSortableDrag(event: DragEvent<T>) {
    this.dragging = true;
    this.onDrag.emit(event);
  }

  private onSortableDrop(event: DropEvent<T>) {
    this.dragging = false;

    if (event.changed) {
      this.modelValue = event.list;
      this.writeValue(this.modelValue);
      this.onModelChange(this.modelValue);
    }

    this.onDrop.emit(event);
  }

  // ========================================== use virtual ==========================================
  public range: Range = { start: 0, end: this.keeps - 1, front: 0, behind: 0 };
  private virtual: Virtual;
  private lastLength: number = 0;
  private uniqueKeys: (string | number)[] = [];

  public onSizeChange({ key, size }: { key: string | number; size: number }) {
    if (isSameValue(key, this.chosenKey)) {
      return;
    }

    const sizes = this.virtual.sizes.size;
    const renders = Math.min(this.keeps, this.modelValue.length);
    this.virtual.onItemResized(key, size);

    if (sizes === renders - 1) {
      this.virtual.updateRange(this.range);
    }
  }

  private installVirtual() {
    this.virtual = new Virtual({
      size: this.size,
      keeps: this.keeps,
      buffer: Math.round(this.keeps / 3),
      wrapper: this.el.nativeElement,
      scroller: this.scroller,
      direction: this.direction,
      uniqueKeys: this.uniqueKeys,
      debounceTime: this.debounceTime,
      throttleTime: this.throttleTime,
      onScroll: (event) => this.onScroll(event),
      onUpdate: (range) => this.onUpdate(range),
    });
  }

  private onScroll(event: ScrollEvent) {
    this.lastLength = 0;
    if (event.top) {
      this.handleToTop();
    }
    if (event.bottom) {
      this.handleToBottom();
    }
  }

  private handleToTop = debounce(() => {
    this.onTop.emit();
    this.lastLength = this.modelValue.length;
  }, 50);

  private handleToBottom = debounce(() => {
    this.onBottom.emit();
  }, 50);

  private onUpdate(range: Range) {
    const rangeChanged = range.start !== this.range.start;

    if (this.dragging && rangeChanged) {
      this.dnd.rangeChanged = !!this.dragging;
    }

    this.range = range;

    rangeChanged && this.rangeChange.emit(range);

    this.updateSpacerStyle();
    this.cdr.detectChanges();
  }

  private updateSpacerStyle() {
    if (this.tableMode) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      const { front, behind } = this.range;
      const padding = this.isHorizontal ? `0 ${behind}px 0 ${front}px` : `${front}px 0 ${behind}px`;

      this.render2.setStyle(this.el.nativeElement, 'padding', padding);
    });
  }
}
