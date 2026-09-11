import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';

/**
 * Miniatura estática del grid de un SymbioGame (OneDot).
 * Dibuja el estado tal como se cargó, sin socket ni interacción, usando la
 * misma paleta que la vista viva (OnedotGridComponent).
 */
@Component({
    selector: 'app-onedot-grid-preview',
    templateUrl: './onedot-grid-preview.component.html',
    styleUrls: ['./onedot-grid-preview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class OnedotGridPreviewComponent implements AfterViewInit, OnChanges {

  @Input() grid: number[][];

  // Mismos colores que OnedotGridComponent. -1 = celda vacía (blanco).
  private readonly paletteColors: string[] = ['#FF0266', '#0336FF', '#75E900', '#FFDE03', '#FFFFFF', '#000000'];
  private readonly emptyColor = '#FFFFFF';
  private readonly strokeColor = '#9E9E9E';

  @ViewChild('canvas', { static: true }) canvasRef: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['grid'] && !changes['grid'].isFirstChange()) {
      this.draw();
    }
  }

  private draw(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = this.grid?.length ?? 0;
    const cols = rows > 0 ? (this.grid[0]?.length ?? 0) : 0;

    if (rows === 0 || cols === 0) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }

    // Tamaño de celda: acota el lado mayor del canvas a ~300px para mantenerlo liviano y nítido.
    // El canvas luego se escala por CSS para caber en el área de portada de la tarjeta.
    const cell = Math.max(3, Math.floor(300 / Math.max(rows, cols)));
    canvas.width = cols * cell;
    canvas.height = rows * cell;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = 0.5;

    for (let i = 0; i < rows; i++) {
      const row = this.grid[i] ?? [];
      for (let j = 0; j < cols; j++) {
        const v = row[j];
        ctx.fillStyle = (v === undefined || v === -1) ? this.emptyColor : (this.paletteColors[v] ?? this.emptyColor);
        const x = j * cell;
        const y = i * cell;
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeRect(x + 0.25, y + 0.25, cell - 0.5, cell - 0.5);
      }
    }
  }
}
