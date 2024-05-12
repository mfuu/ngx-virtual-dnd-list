import {
  Input,
  Output,
  OnInit,
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
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Dnd, { Group, SortableEvent } from 'sortable-dnd';
import { Virtual, VirtualAttrs, Range } from './virtual';
import { debounce, getDataKey } from './utils';

const SortableAttrs = [
  'delay',
  'group',
  'handle',
  'lockAxis',
  'sortable',
  'disabled',
  'draggable',
  'animation',
  'autoScroll',
  'ghostClass',
  'ghostStyle',
  'chosenClass',
  'fallbackOnBody',
  'scrollThreshold',
  'delayOnTouchOnly',
];

@Component({
  selector: 'virtual-dnd-list, [virtual-dnd-list]',
  template: `
    <div virtual-dnd-list-item
      *ngFor="
        let item of model.slice(range.start, range.end + 1);
        index as i;
        trackBy: trackByFn
      "
      [source]="item"
      [dataKey]="dataKey"
      [dragging]="dragging"
      [isHorizontal]="isHorizontal"
      (sizeChange)="onSizeChange($event)"
    >
      <ng-container
        *ngTemplateOutlet="
          listItemTemplateRef;
          context: { $implicit: item, index: i }
        "
      ></ng-container>
    </div>
  `,
  host: {
    '[class.horizontal]': 'isHorizontal',
    '[class.vertical]': '!isHorizontal',
  },
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VirtualDndListComponent),
      multi: true,
    },
  ],
})
export class VirtualDndListComponent implements OnInit, OnDestroy, OnChanges, ControlValueAccessor {
  @Input() keepOffset: boolean = false;
  @Input() size: number;
  @Input() keeps: number = 30;
  @Input() scroller: HTMLElement | Document;
  @Input() direction: 'vertical' | 'horizontal' = 'vertical';
  @Input() debounceTime: number = 0;
  @Input() throttleTime: number = 0;

  @Input() delay: number;
  @Input() group: string | Group;
  @Input() handle: any;
  @Input() dataKey: string;
  @Input() sortable: boolean = true;
  @Input() lockAxis: 'x' | 'y' | '' = '';
  @Input() disabled: boolean = false;
  @Input() draggable: string = '';
  @Input() animation: number = 150;
  @Input() autoScroll: boolean = true;
  @Input() ghostClass: string = '';
  @Input() ghostStyle: CSSStyleDeclaration;
  @Input() chosenClass: string = '';
  @Input() fallbackOnBody: boolean = false;
  @Input() scrollThreshold: number = 55;
  @Input() delayOnTouchOnly: boolean = false;

  @Output() onDrag = new EventEmitter();
  @Output() onDrop = new EventEmitter();
  @Output() onTop = new EventEmitter();
  @Output() onBottom = new EventEmitter();
  @Output() rangeChange = new EventEmitter();

  @ContentChild(TemplateRef) listItemTemplateRef: any;

  public get isHorizontal() {
    return this.direction === 'horizontal';
  }

  /**
   * Get the size of the current item by data key
   * @param key data-key
   */
  public getSize(key: any): number {
    return this.virtual.getSize(key);
  }

  /**
   * Get the current scroll height
   */
  public getOffset(): number {
    return this.virtual.getOffset();
  }

  /**
   * Get all scroll size (scrollHeight or scrollWidth)
   */
  public getScrollSize(): number {
    return this.virtual.getScrollSize();
  }

  /**
   * Get the scroller's client viewport size (width or height)
   */
  public getClientSize(): number {
    return this.virtual.getClientSize();
  }

  /**
   * Scroll to the specified offset left/top
   * @param offset
   */
  public scrollToOffset(offset: number) {
    this.virtual.scrollToOffset(offset);
  }

  /**
   * Scroll to the specified index position
   * @param index
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
    private el: ElementRef,
    private render2: Renderer2,
    private iterableDiffers: IterableDiffers
  ) {
    this.differ = this.iterableDiffers.find([]).create(null);
  }

  ngOnInit(): void {
    this.initVirtual();
    this.initSortable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    SortableAttrs.forEach((key: any) => {
      if (key in changes) {
        this.dnd?.option(key, this[key]);
      }
    });
    VirtualAttrs.forEach((key: any) => {
      if (key in changes) {
        this.virtual?.option(key, this[key]);
      }
    });
  }

  ngDoCheck(): void {
    const changes = this.differ.diff(this._model);
    if (changes) {
      this.writeValue(this._model);
    }
  }

  ngOnDestroy(): void {
    this.virtual.removeScrollEventListener();
    this.dnd.destroy();
  }

  private _model: any[] = [];
  private onModelTouched = (_: any) => {};
  private onModelChange = (_: any) => {};

  public get model() {
    return this._model;
  }
  public set model(val) {
    this._model = val;
    this.onModelChange(val);
  }

  private lastList: any[] = [];
  public writeValue(value: any[]): void {
    this._model = value || [];

    this.updateUniqueKeys();
    this.detectRangeUpdate();

    // auto scroll to the last offset
    if (this.lastLength && this.keepOffset) {
      const index = this._model.length - this.lastLength;
      if (index > 0) {
        this.scrollToIndex(index);
      }
      this.lastLength = 0;
    }

    this.lastList = [...this._model];
  }

  public registerOnChange(fn: (_: any) => void): void {
    this.onModelChange = fn;
  }

  public registerOnTouched(fn: (_: any) => void): void {
    this.onModelTouched = fn;
  }

  public trackByFn = (_: number, item: any) => {
    return getDataKey(item, this.dataKey);
  };

  public dragging: string = '';
  private dnd: Dnd;
  private reRendered: boolean = false;

  private initSortable() {
    let props = {};
    for (let i = 0; i < SortableAttrs.length; i++) {
      let key = SortableAttrs[i];
      props[key] = this[key];
    }

    this.dnd = new Dnd(this.el.nativeElement, {
      ...props,
      swapOnDrop: (event) => event.from === event.to,
      onDrag: (event) => this.onSortableDrag(event),
      onDrop: (event) => this.onSortableDrop(event),
    });
  }

  private onSortableDrag(event: SortableEvent) {
    const key = event.node.getAttribute('data-key');
    const index = this.getIndex(key);
    const item = this._model[index];

    this.dragging = key;
    this.dnd.option('store', { item, key, index });

    this.onDrag.emit({ item, key, index, event });
  }

  private onSortableDrop(event: SortableEvent) {
    const { item, key, index } = Dnd.get(event.from).option('store');
    const params = {
      key,
      item,
      list: this._model,
      event,
      changed: false,
      oldList: [...this._model],
      oldIndex: index,
      newIndex: index,
    };

    // No changes in current list
    if (event.from === event.to && event.node === event.target) {
      this.onDrop.emit(params);
    } else {
      const targetKey = event.target.getAttribute('data-key');
      let newIndex = -1;
      let oldIndex = index;

      // changes position in current list
      if (event.from === event.to) {
        // re-get the dragged element's index
        oldIndex = this.getIndex(key);
        newIndex = this.getIndex(targetKey);
        if (
          (oldIndex < newIndex && event.relative === -1) ||
          (oldIndex > newIndex && event.relative === 1)
        ) {
          newIndex += event.relative;
        }

        this._model.splice(index, 1);
        this._model.splice(newIndex, 0, item);
      } else {
        // remove from
        if (event.from === this.el.nativeElement) {
          oldIndex = this.getIndex(key);
          this._model.splice(oldIndex, 1);
        }

        // added to
        if (event.to === this.el.nativeElement) {
          oldIndex = -1;
          newIndex = this.getIndex(targetKey);
          if (event.relative === 0) {
            // added to last
            newIndex = this._model.length;
          } else if (event.relative === 1) {
            newIndex += event.relative;
          }

          this._model.splice(newIndex, 0, item);
        }
      }
      params.changed = event.from !== event.to || newIndex !== oldIndex;
      params.oldIndex = oldIndex;
      params.newIndex = newIndex;

      this.writeValue(this._model);
      this.onModelChange(this._model);
      this.onDrop.emit(params);
    }

    if (event.from === this.el.nativeElement && this.reRendered) {
      Dnd.dragged?.remove();
    }
    if (event.from !== event.to && event.pullMode === 'clone') {
      Dnd.clone?.remove();
    }

    this.dragging = '';
    this.reRendered = false;
  }

  private getIndex(key: any) {
    return this.uniqueKeys.indexOf(key);
  }

  public range: Range = { start: 0, end: this.keeps - 1, front: 0, behind: 0 };
  private virtual: Virtual;
  private lastLength: number = 0;
  private uniqueKeys: any[] = [];

  public onSizeChange({ key, size }: { key: any; size: number }) {
    const sizes = this.virtual.sizes.size;
    const renders = Math.min(this.keeps, this._model.length);
    this.virtual.onItemResized(key, size);

    if (sizes === renders - 1) {
      this.detectRangeUpdate();
    }
  }

  private detectRangeUpdate() {
    let range = { ...this.range };
    if (
      this._model.length > this.lastList.length &&
      this.range.end === this.lastList.length - 1 &&
      this.scrolledToBottom()
    ) {
      range.end++;
      range.start = Math.max(0, range.end - this.keeps + 1);
    }
    this.virtual.updateRange(range);
  }

  private scrolledToBottom() {
    const offset = this.getOffset();
    const clientSize = this.getClientSize();
    const scrollSize = this.getScrollSize();
    return offset + clientSize + 1 >= scrollSize;
  }

  private initVirtual() {
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
      onScroll: (event) => {
        this.lastLength = 0;
        if (event.top) {
          this.handleToTop();
        }
        if (event.bottom) {
          this.handleToBottom();
        }
      },
      onUpdate: (range) => {
        const rangeChanged = range.start !== this.range.start;
        if (this.dragging && rangeChanged) {
          this.reRendered = true;
        }
        this.range = range;
        this.rangeChange.emit(range);

        const padding = this.isHorizontal
          ? `0 ${this.range.behind}px 0 ${this.range.front}px`
          : `${this.range.front}px 0 ${this.range.behind}px`;
        this.render2.setStyle(this.el.nativeElement, 'padding', padding);
      },
    });
  }

  private updateUniqueKeys() {
    this.uniqueKeys = this._model.map((item) => getDataKey(item, this.dataKey));
    this.virtual.option('uniqueKeys', this.uniqueKeys);
  }

  private handleToTop = debounce(() => {
    this.onTop.emit();
    this.lastLength = this._model.length;
  }, 50);

  private handleToBottom = debounce(() => {
    this.onBottom.emit();
  }, 50);
}
