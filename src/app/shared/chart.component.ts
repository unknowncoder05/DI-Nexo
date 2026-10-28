import {
  afterRenderEffect, ChangeDetectionStrategy, Component, computed,
  ElementRef, inject, input, output, signal, viewChild, DestroyRef,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  Chart, DoughnutController, ArcElement, LineController, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Filler,
} from 'chart.js';

Chart.register(DoughnutController, ArcElement, LineController, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Filler);

export interface ChartDatum {
  key?: string;
  label: string;
  value: number;
  color?: string;
}

/** Gráfico independiente de la vista, con alternativa tabular accesible. */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasValues()) {
      <div class="chart-canvas"><canvas #canvas role="img" [attr.aria-label]="title() + '. Datos disponibles en la tabla inferior.'"></canvas></div>
      @if (type() === 'doughnut') {
        <ul class="chart-legend" [attr.aria-label]="title()">
          @for (item of data(); track item.label) {
            <li><button type="button" (click)="itemSelected.emit(item.key || item.label)" [attr.aria-pressed]="selectedKey() === (item.key || item.label)" [attr.aria-label]="'Filtrar por ' + item.label"><span class="chart-dot" [style.background]="item.color" aria-hidden="true"></span><span>{{item.label}}</span><strong>{{format(item.value)}}</strong></button></li>
          }
        </ul>
      }
    } @else {
      <p class="muted chart-empty">No hay datos con valores mayores que cero para este gráfico.</p>
    }
    <details class="chart-data">
      <summary>Ver datos de {{title()}}</summary>
      <div class="table-scroll" tabindex="0" [attr.aria-label]="title() + ': datos del gráfico'">
        <table>
          <caption class="sr-only">{{title()}}</caption>
          <thead><tr><th scope="col">{{categoryLabel()}}</th><th scope="col">{{unit() === 'currency' ? 'Presupuesto (€)' : 'Proyectos'}}</th></tr></thead>
          <tbody>
            @for (item of data(); track item.label) {
              <tr><th scope="row"><button type="button" class="chart-value" (click)="itemSelected.emit(item.key || item.label)" [attr.aria-pressed]="selectedKey() === (item.key || item.label)">{{item.label}}</button></th><td>{{format(item.value)}}</td></tr>
            } @empty {<tr><td colspan="2">Sin datos.</td></tr>}
          </tbody>
        </table>
      </div>
    </details>
  `,
  styles: `
    :host { display:block; min-width:0; }
    .chart-canvas { position:relative; height:220px; }
    .chart-canvas canvas { max-width:100%; }
    .chart-legend { list-style:none; margin:18px 0; padding:0; display:grid; gap:10px; font-size:.85rem; }
    .chart-legend li { min-width:0; }
    .chart-legend button { display:flex; align-items:center; gap:9px; width:100%; padding:7px 9px; border:1px solid transparent; border-radius:4px; color:inherit; background:transparent; font:inherit; text-align:left; cursor:pointer; }
    .chart-legend button:hover, .chart-legend button[aria-pressed="true"] { background:rgba(128,146,142,.1); border-color:var(--line); }
    .chart-legend button[aria-pressed="true"] { border-left:3px solid #d0a33b; }
    .chart-value { background:transparent; border:0; color:inherit; font:inherit; text-decoration:underline; text-underline-offset:3px; cursor:pointer; }
    .chart-value[aria-pressed="true"] { font-weight:700; }
    .chart-legend strong { margin-left:auto; }
    .chart-dot { width:11px; height:11px; border-radius:50%; flex-shrink:0; }
    .chart-data { margin-top:18px; font-size:.8rem; }
    summary { cursor:pointer; padding:8px 0; }
    .chart-empty { min-height:180px; display:grid; place-content:center; text-align:center; }
    .table-scroll { margin-top:12px; }
  `,
})
export class ChartComponent {
  title = input.required<string>();
  type = input.required<'doughnut' | 'line'>();
  data = input.required<ChartDatum[]>();
  categoryLabel = input('Categoría');
  unit = input<'count' | 'currency'>('count');
  locale = input('es-ES');
  theme = input<'light' | 'dark' | 'system'>('light');
  selectedKey = input('');
  itemSelected = output<string>();
  hasValues = computed(() => this.data().some(item => item.value > 0));
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private media = inject(DOCUMENT).defaultView?.matchMedia('(prefers-color-scheme: dark)');
  private systemDark = signal(this.media?.matches ?? false);

  constructor() {
    const updateTheme = () => this.systemDark.set(this.media?.matches ?? false);
    this.media?.addEventListener('change', updateTheme);
    inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', updateTheme));
    afterRenderEffect(onCleanup => {
      const canvas = this.canvas()?.nativeElement;
      const data = this.data();
      const type = this.type();
      const selected = this.selectedKey();
      const dark = this.theme() === 'dark' || (this.theme() === 'system' && this.systemDark());
      const text = dark ? '#dce7dc' : '#53614d';
      const grid = dark ? '#435248' : '#e1e5dc';
      if (!canvas) return;
      const chart = new Chart(canvas, {
        type,
        data: {
          labels: data.map(item => item.label),
          datasets: [{
            label: this.unit() === 'currency' ? 'Presupuesto' : 'Proyectos',
            data: data.map(item => item.value),
            backgroundColor: type === 'doughnut' ? data.map(item => (item.color || '#497b94') + (selected && selected !== (item.key || item.label) ? '55' : '')) : 'rgba(73,123,148,.08)',
            borderColor: type === 'doughnut' ? (dark ? '#25342d' : '#ffffff') : (dark ? '#b8d7a5' : '#497b94'),
            borderWidth: 2, pointRadius: data.map(item => selected === (item.key || item.label) ? 7 : 4), pointHoverRadius: 7,
            pointBackgroundColor: dark ? '#b8d7a5' : '#497b94',
            fill: type === 'line', tension: 0,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          locale: this.locale(),
          onClick: (_event,elements) => {
            const item = data[elements[0]?.index];
            if (item) this.itemSelected.emit(item.key || item.label);
          },
          onHover: (_event,elements) => {canvas.style.cursor = elements.length ? 'pointer' : 'default';},
          plugins: { legend: {display:false}, tooltip: {callbacks: {
            label: context => `${context.label}: ${this.format(Number(context.raw))}`,
          }}},
          ...(type === 'doughnut' ? {cutout:'68%'} : {scales: {
            x: {grid:{display:false},ticks:{color:text,maxRotation:45}},
            y: {beginAtZero:true,grid:{color:grid},ticks:{color:text,callback:value => this.format(Number(value))}},
          }}),
        },
      });
      onCleanup(() => chart.destroy());
    });
  }

  format(value: number): string {
    return new Intl.NumberFormat(this.locale(), this.unit() === 'currency'
      ? {style:'currency', currency:'EUR', maximumFractionDigits:0}
      : {maximumFractionDigits:0}).format(value);
  }
}
