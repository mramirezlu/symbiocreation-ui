import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

// Traduce las etiquetas del mat-paginator (por defecto vienen en inglés: "of", "Items per page", etc.).
// Se aplica a TODOS los paginadores de la app y se actualiza al cambiar de idioma.
@Injectable()
export class CustomMatPaginatorIntl extends MatPaginatorIntl {

    constructor(private translate: TranslateService) {
        super();
        this.getRangeLabel = this.rangeLabel.bind(this);
        this.translate.onLangChange.subscribe(() => this.updateLabels());
        this.updateLabels();
    }

    private isEs(): boolean {
        const lang = this.translate.currentLang || localStorage.getItem('lang') || 'es';
        return lang === 'es';
    }

    private updateLabels(): void {
        const es = this.isEs();
        this.itemsPerPageLabel = es ? 'Ítems por página' : 'Items per page';
        this.nextPageLabel = es ? 'Página siguiente' : 'Next page';
        this.previousPageLabel = es ? 'Página anterior' : 'Previous page';
        this.firstPageLabel = es ? 'Primera página' : 'First page';
        this.lastPageLabel = es ? 'Última página' : 'Last page';
        this.changes.next();
    }

    // "1 – 12 de 54" (es) / "1 – 12 of 54" (en)
    private rangeLabel(page: number, pageSize: number, length: number): string {
        const of = this.isEs() ? 'de' : 'of';
        if (length === 0 || pageSize === 0) {
            return `0 ${of} ${length}`;
        }
        length = Math.max(length, 0);
        const startIndex = page * pageSize;
        const endIndex = startIndex < length
            ? Math.min(startIndex + pageSize, length)
            : startIndex + pageSize;
        return `${startIndex + 1} – ${endIndex} ${of} ${length}`;
    }
}
