import { Component } from '@angular/core';
import { getPageData } from '../../../shared/utils';

@Component({
  selector: 'demo-horizontal',
  template: `
    <div #scroller class="list horizontal">
      <div
        virtual-list
        dataKey="id"
        [scroller]="scroller"
        handle=".handle"
        direction="horizontal"
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
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styleUrls: ['../demo.component.less'],
})
export class DemoHorizontalComponent {
  public list = [];

  constructor() {}

  ngOnInit() {
    this.list = getPageData(1000, 0);
  }
}
