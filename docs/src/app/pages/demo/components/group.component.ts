import { Component } from '@angular/core';
import { getPageData } from '../../../shared/utils';

@Component({
  selector: 'demo-group',
  template: `
    <div class="group">
      <div #scroller1 class="list">
        <div
          virtual-list
          dataKey="id"
          [scroller]="scroller1"
          handle=".handle"
          group="group"
          chosenClass="chosen"
          class="list-wrapper"
          [(ngModel)]="list1"
        >
          <ng-template #item let-item let-index="index" let-key="key">
            <div class="list-item">
              <div class="flex j-c-s">
                <span class="index">{{ item.index }}</span>
                <span class="handle">☰</span>
              </div>
            </div>
          </ng-template>
        </div>
      </div>

      <div #scroller2 class="list">
        <div
          virtual-list
          dataKey="id"
          [scroller]="scroller2"
          handle=".handle"
          group="group"
          chosenClass="chosen"
          [(ngModel)]="list2"
        >
          <ng-template #item let-item let-index="index">
            <div class="list-item">
              <div class="flex j-c-s">
                <span class="index">{{ item.index }}</span>
                <span class="handle">☰</span>
              </div>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../demo.component.less'],
})
export class DemoGroupComponent {
  public list1 = [];
  public list2 = [];

  constructor() {}

  ngOnInit() {
    this.list1 = getPageData(1000, 0);
    this.list2 = getPageData(1000, 0);
  }
}
