import {
  Input,
  Output,
  OnInit,
  Component,
  ElementRef,
  EventEmitter,
  SimpleChanges,
} from "@angular/core";
import { getDataKey } from "./utils";

@Component({
  selector: "[virtual-dnd-list-item]",
  template: ` <ng-content></ng-content> `,
  host: {
    class: "virtual-dnd-list-item",
  },
  styles: [],
})
export class VirtualDndListItemComponent implements OnInit {
  @Input() source: any;
  @Input() dataKey: any;
  @Input() sizeKey: "offsetHeight" | "offsetWidth" = "offsetHeight";
  @Input() dragging: string;
  @Output() sizeChange = new EventEmitter();

  private sizeObserver: ResizeObserver;

  private get key() {
    return getDataKey(this.source, this.dataKey);
  }

  constructor(public el: ElementRef) {}

  ngOnInit(): void {
    this.el.nativeElement.setAttribute("data-key", this.key);

    this.sizeObserver = new ResizeObserver(() => {
      this.sizeChange.emit({
        key: this.key,
        size: this.el.nativeElement[this.sizeKey],
      });
    });

    this.sizeObserver.observe(this.el.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["dragging"]) {
      this.el.nativeElement.style["display"] = this.dragging === this.key ? "none" : "";
    }
  }
}
