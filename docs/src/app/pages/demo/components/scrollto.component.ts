import { Component, ViewChild } from '@angular/core';
import { getPageData } from '../../../shared/utils';
import { VirtualListComponent } from 'public-api';

@Component({
  selector: 'demo-scrollto',
  template: `
    <button (click)="scrollToIndex()">
      scroll to index:
      <input [(ngModel)]="index" type="number" (click)="stopPropagation($event)" />
      align:
      <select [(ngModel)]="align" (click)="stopPropagation($event)">
        <option value="top">top</option>
        <option value="bottom">bottom</option>
        <option value="auto">auto</option>
      </select>
    </button>
    <div #scroller class="list my-4">
      <div
        #virtualList
        virtual-list
        dataKey="id"
        [scroller]="scroller"
        handle=".handle"
        chosenClass="chosen"
        class="list-wrapper"
        [(ngModel)]="list"
      >
        <ng-template #item let-item let-index="index" let-key="key">
          <div class="list-item">
            <div class="flex j-c-s">
              <span class="index">{{ item.index }}</span>
              <span class="handle">☰</span>
            </div>
            <p>{{ item.desc }}</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styleUrls: ['../demo.component.less'],
})
export class DemoScrollToComponent {
  @ViewChild('virtualList') virtualList: VirtualListComponent<any>;

  public list = [];
  public index = 20;
  public align: 'top' | 'bottom' | 'auto' = 'top';

  constructor() {}

  ngOnInit() {
    this.list = getPageData(1000, 0);
  }

  scrollToIndex() {
    this.virtualList.scrollToIndex(this.index, this.align);
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
