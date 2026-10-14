import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
export interface TableColumn { key: string; label: string; }
export interface TableRow { id: string; [key: string]: string; }
/** Tabla agnóstica: búsqueda bidireccional, ordenación y eventos hacia el padre. */
@Component({ selector: 'app-data-table', imports: [FormsModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
  <div class="table-tools"><label class="search-field"><span aria-hidden="true">⌕</span><span class="sr-only">Buscar en {{ caption() }}</span><input type="search" placeholder="Buscar…" [ngModel]="query()" (ngModelChange)="search($event)"></label><span class="muted">{{ filtered().length }} resultados</span></div>
  <div class="table-scroll" tabindex="0" [attr.aria-label]="caption() + ': tabla desplazable'"><table><caption class="sr-only">{{ caption() }}</caption><thead><tr>@for (column of columns(); track column.key) {<th scope="col" [attr.aria-sort]="sortKey() === column.key ? (direction() === 1 ? 'ascending' : 'descending') : 'none'"><button class="sort-button" (click)="sort(column.key)">{{ column.label }} <span aria-hidden="true">↕</span></button></th>}@if (actionLabel()) {<th scope="col">Acción</th>}</tr></thead>
  <tbody>@for (row of filtered(); track row.id) {<tr>@for (column of columns(); track column.key) {<td>@if (column.key === 'status') {<span class="badge" [class.complete]="row[column.key] === 'Completado'" [class.active]="row[column.key] === 'En curso'">{{ row[column.key] }}</span>} @else { {{ row[column.key] }} }</td>}@if(actionLabel()){<td><button class="text-button" (click)="rowAction.emit(row.id)" [attr.aria-label]="actionLabel() + ' ' + row['name']">{{ actionLabel() }} ↗</button></td>}</tr>} @empty {<tr><td [attr.colspan]="columns().length + (actionLabel() ? 1 : 0)">No hay registros que coincidan con la búsqueda.</td></tr>}</tbody></table></div>` })
export class DataTableComponent {
  columns = input.required<TableColumn[]>(); rows = input.required<TableRow[]>(); caption = input('Registros'); actionLabel = input('');
  rowAction = output<string>(); searchChange = output<string>();
  query = signal(''); sortKey = signal(''); direction = signal(1);
  filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('es');
    const rows = this.rows().filter(row => this.columns().some(col => row[col.key]?.toLocaleLowerCase('es').includes(query)));
    return this.sortKey() ? rows.sort((a, b) => a[this.sortKey()].localeCompare(b[this.sortKey()], 'es', { numeric: true }) * this.direction()) : rows;
  });
  search(value: string) { this.query.set(value); this.searchChange.emit(value); }
  sort(key: string) { this.direction.set(this.sortKey() === key ? -this.direction() : 1); this.sortKey.set(key); }
}
