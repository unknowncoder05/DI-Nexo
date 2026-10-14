import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnChanges, OnDestroy, input, viewChild } from '@angular/core';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);
/** Gráfico con alternativa textual. Destruye la instancia al salir de la vista. */
@Component({ selector: 'app-chart', changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="chart"><canvas #canvas role="img" [attr.aria-label]="description()">{{ description() }}</canvas></div><p class="chart-description">{{ description() }}</p>` })
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  labels = input.required<string[]>(); values = input.required<number[]>(); description = input.required<string>();
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas'); private chart?: Chart;
  ngAfterViewInit() { this.chart = new Chart(this.canvas().nativeElement, { type: 'bar', data: { labels: this.labels(), datasets: [{ label: 'Presupuesto (€)', data: this.values(), backgroundColor: ['#244e43', '#63846c', '#a8bd8f', '#d5dfc7'], borderRadius: 6, maxBarThickness: 65 }] }, options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#52615c' }, grid: { color: '#eef0eb' } }, x: { ticks: { color: '#52615c' }, grid: { display: false } } } } }); }
  ngOnChanges() { if (this.chart) { this.chart.data.labels = this.labels(); this.chart.data.datasets[0].data = this.values(); this.chart.update(); } }
  ngOnDestroy() { this.chart?.destroy(); }
}
