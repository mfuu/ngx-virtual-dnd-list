import { Component } from '@angular/core';
import { getPageData } from '../../../shared/utils';

@Component({
  selector: 'demo-infinity',
  template: `
    <div #scroller class="list">
      <div
        virtual-list
        dataKey="id"
        [scroller]="scroller"
        handle=".handle"
        chosenClass="chosen"
        class="list-wrapper"
        [(ngModel)]="list"
        (onBottom)="loadMore()"
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
      <div class="footer">
        <div class="loading"></div>
      </div>
    </div>
  `,
  styleUrls: ['../demo.component.less'],
})
export class DemoInfinityComponent {
  public list = [];
  public loading = false;

  constructor() {}

  ngOnInit() {
    this.list = getPageData(50, 0);
  }

  loadMore() {
    this.loading = true;

    setTimeout(() => {
      this.list = [...this.list, ...getPageData(10, this.list.length)];
      this.loading = false;
    }, 1000);
  }
}
