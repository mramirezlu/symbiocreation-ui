import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { DimensionsType } from '../utils/types';
import * as d3 from "d3";
import { OneDot, OneDotParticipant } from '../models/oneDotTypes';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-onedot-grid',
    templateUrl: './onedot-grid.component.html',
    styleUrls: ['./onedot-grid.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class OnedotGridComponent implements OnInit, AfterViewInit, OnChanges {

  @Input() oneDot: OneDot;
  @Input() participant: OneDotParticipant;
  @Output() gridUpdated = new EventEmitter<number[]>();

  gridToRender: any[][];
  paletteColors: string[] = ['#FF0266', '#0336FF', '#75E900', '#FFDE03', '#FFFFFF', '#000000'];
  colorSelected: number;

  dimensions: DimensionsType;
  simulation: any;
  wrapper: any;
  bounds: any;

  private previousGrid: number[][];

  @ViewChild('container', {static: true}) container: ElementRef;

  constructor() {
    this.oneDot = { name: '', grid: [], participants: [], screenshots: [] };
    this.colorSelected = -1;

    this.dimensions = {
      marginTop: 10,
      marginRight: 10,
      marginBottom: 10,
      marginLeft: 10,
      height: 350,
      width: 350,
    }
    this.dimensions = {
      ...this.dimensions,
      boundedHeight: Math.max(this.dimensions.height - this.dimensions.marginTop - this.dimensions.marginBottom, 0),
      boundedWidth: Math.max(this.dimensions.width - this.dimensions.marginLeft - this.dimensions.marginRight, 0),
    }
  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['oneDot'] && !changes['oneDot'].isFirstChange()) {
      const prev = changes['oneDot'].previousValue?.grid;
      const curr = changes['oneDot'].currentValue?.grid;

      if (prev && curr && prev.length === curr.length && this.bounds) {
        this.updateChangedCells(prev, curr);
      } else {
        this.removeGridContainer();
        this.createGridContainer();
        this.drawGrid();
      }
    }
  }

  ngAfterViewInit(): void {
    this.updateDimensions();
    this.createGridContainer();
    this.drawGrid();
  }

  createGridContainer(): void {
    this.wrapper = d3.select(this.container.nativeElement)
      .append("svg")
        .attr("width", this.dimensions.width)
        .attr("height", this.dimensions.height);

    this.bounds = this.wrapper.append("g")
        .attr("transform", `translate(${this.dimensions.marginLeft} ${this.dimensions.marginTop})`);
  }

  drawGrid(): void {
    this.gridToRender = [];
    const cellHeight = this.dimensions.boundedHeight / this.oneDot.grid.length;
    const cellWidth = this.dimensions.boundedWidth / this.oneDot.grid[0].length;

    for (let i = 0; i < this.oneDot.grid.length; i++) {
      let xpos = 1;
      let ypos = 1 + cellHeight * i;
      const row = [];

      for (let j = 0; j < this.oneDot.grid[0].length; j++) {
        row.push({
          i: i,
          j: j,
          x: xpos,
          y: ypos,
          width: cellWidth,
          height: cellHeight,
          color: this.oneDot.grid[i][j]
        });
        xpos += cellWidth;
      }
      this.gridToRender.push(row);
    }

    // draw rows
    const rows = this.bounds.selectAll(".row")
      .data(this.gridToRender)
      .enter().append("g")
        .attr("class", "row");
    // draw cells
    const cells = rows.selectAll(".square")
      .data(d => d)
      .enter().append("rect")
        .attr("class","square")
        .attr("id", d => `cell-${d.i}-${d.j}`)
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("width", d => d.width)
        .attr("height", d => d.height)
        .attr("fill", d => d.color === -1 ? '#FFFFFF' : this.paletteColors[d.color])
        .attr("stroke", "#9E9E9E")
        .attr("stroke-width", 0.4)
        .on('click', d => {
          if (!this.participant) {
            return;
          }
          if (this.colorSelected <= -1 && this.colorSelected >= this.paletteColors.length) {
            return;
          }

          d3.select(d3.event.currentTarget)
            .style("fill", this.paletteColors[this.colorSelected]);
          this.gridUpdated.emit([d.i, d.j, this.colorSelected]);
        });

    this.previousGrid = this.cloneGrid(this.oneDot.grid);
  }

  updateChangedCells(prev: number[][], curr: number[][]): void {
    for (let i = 0; i < curr.length; i++) {
      for (let j = 0; j < curr[i].length; j++) {
        if (prev[i][j] !== curr[i][j]) {
          d3.select(`#cell-${i}-${j}`)
            .attr("fill", curr[i][j] === -1 ? '#FFFFFF' : this.paletteColors[curr[i][j]]);
        }
      }
    }
    this.previousGrid = this.cloneGrid(curr);
  }

  private cloneGrid(grid: number[][]): number[][] {
    return grid.map(row => [...row]);
  }

  removeGridContainer(): void {
    this.wrapper.remove();
  }

  @HostListener('window:resize') windowResize() {
    this.updateDimensions();
    this.removeGridContainer();
    this.createGridContainer();
    this.drawGrid();
  }

  updateDimensions() {
    const width = this.container.nativeElement.offsetWidth;
    const height = this.container.nativeElement.offsetHeight;

    this.dimensions.width = width;
    this.dimensions.height = height;
    this.dimensions.boundedWidth = Math.max(
      this.dimensions.width
        - this.dimensions.marginLeft
        - this.dimensions.marginRight,
      0
    );
    this.dimensions.boundedHeight = Math.max(
      this.dimensions.height
        - this.dimensions.marginTop
        - this.dimensions.marginBottom,
      0
    );
  }
}
