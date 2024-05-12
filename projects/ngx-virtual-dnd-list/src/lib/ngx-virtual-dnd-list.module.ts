import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VirtualDndListComponent } from './ngx-virtual-dnd-list.component';
import { VirtualDndListItemComponent } from './ngx-virtual-dnd-item.component';

@NgModule({
  declarations: [VirtualDndListComponent, VirtualDndListItemComponent],
  imports: [CommonModule, FormsModule],
  exports: [VirtualDndListComponent],
})
export class VirtualDndListModule {}
