/* global d3 */

const svg       = d3.select('svg');
const g         = svg.append('g');
const columns   = 100;
const rows      = 100;
const hexRadius = 40;

const hexbin = d3.hexbin().radius(hexRadius);
const color  = d3.scaleSequential(d3.interpolateHslLong('steelblue',  'orange'));

var points = [];
for (let i = 0; i < rows; i++) {
  for (let j = 0; j < columns; j++) {
    points.push([hexRadius * j * 1.75, hexRadius * i * 1.5 /**/]);
  }
}

g.append('g')
  .attr('class', 'hexagon')
  .selectAll('path')
  .data(hexbin(points))
  .enter().append('path')
  .attr('class', 'hexagon')
  .attr('d', (d) => 'M' + (d.x-hexRadius) + ',' + d.y + hexbin.hexagon())
  .attr('stroke', () => '#fff')
  .attr('stroke-width', '1px')
  .attr('fill', () => color(d3.randomUniform(0.0,1.0)()));
