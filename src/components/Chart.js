import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';


function Chart() {
  const [data, setData] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);
  const d3Container = useRef(null);

  const width = 800;
  const height = 600;

  /* Load data */
  useEffect(() => {
    if (!dataLoaded) {
      console.log("Loading data.");
      d3.csv('/data/top_100.csv', d3.autoType)
      .then(function(csvData) {
          var processedData = {};
          csvData.forEach((row) => {
            var name = row.person;
            if (!(name in processedData)) {
              processedData[name] = [];
            } 
            processedData[name].push({
              'year_month':row.year_month,
              'screen_time_seconds':row.screen_time_seconds,
            });
          });
          console.log("Processed data: ", processedData["adam schiff"]);
          setData(processedData["adam schiff"]);
          setDataLoaded(true);
      })
      .catch(function(error){
        // handle error   
      })
    }
  }, [dataLoaded]);

  /* Create D3 visualization */
  useEffect(() => {
    if (dataLoaded) {

      d3.select('#visualization')
      .select('svg')
      .remove();
      d3.select('#visualization')
            .select('.tooltip')
            .remove();

      console.log("Creating visualization.");
      const margin = {top:50, right:50, bottom:50, left:50};
      const yMaxValue = d3.max(data, d => d.screen_time_seconds);
      const yMinValue = d3.min(data, d => d.screen_time_seconds);
      const xMaxValue = d3.max(data, d => d.year_month);
      const xMinValue = d3.min(data, d => d.year_month);
      
      const svg = d3.select(d3Container.current)
                  .append('svg')
                  .attr('width', width+margin.left+margin.right)
                  .attr('height', height+margin.top+margin.bottom)
                  .append('g')
                  .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
          .scaleUtc()
          .domain(d3.extent(data, d => d.year_month))
          .range([xMinValue, xMaxValue]);
      const yScale = d3
          .scaleLinear()
          .range([height, 0])
          .domain([yMinValue, yMaxValue]);
      const line = d3
          .line()
          .x(d => xScale(d.label))
          .y(d => yScale(d.value))    

      svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(xScale)
        .tickSize(-height)
        .tickFormat('')
      );

      svg
      .append('g')
      .attr('class', 'grid')
      .call(
          d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(''),
      );

      svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom().scale(xScale).tickSize(15));

      svg
        .append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale));
      svg
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-width', 4)
        .attr('class', 'line') 
        .attr('d', line);

      

    }
  }, [data, dataLoaded]);

  return (
    <div>
      <svg
        id="visualization"
        width={width}
        height={height}
        ref={d3Container}
      />
    </div>
  )
}

export default Chart;