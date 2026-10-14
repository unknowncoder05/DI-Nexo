import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from "@angular/core";
/** Indicador reutilizable y navegable sin dependencias de negocio. */
@Component({
  selector: "app-stat-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button class="stat-card" (click)="selected.emit()">
    <span class="stat-label"
      >{{ label() }} <span aria-hidden="true">↗</span></span
    ><strong>{{ value() }}</strong
    ><span class="stat-note">{{ note() }}</span>
  </button>`,
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string>();
  note = input("");
  selected = output<void>();
}
