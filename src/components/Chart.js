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
      d3.csv('/data/top_100.csv')
      .then(function(csvData) {
          console.log("Processing data.");
          const uniqueNames = [...new Set(csvData.map(d => d.person))];
          const dates = [...new Set(csvData.map(d => d.year_month))];
          var processedData = [];
          uniqueNames.forEach(name => {
            var values = csvData.filter((d) => {return d.person==name}).map(d => d.screen_time_seconds/3600);
            processedData.push({name:name, values:values});
          });
          setData({
            y: "# hours of screen time",
            series: processedData,
            dates: dates.map(d3.utcParse("%Y-%m")),
          });
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
      console.log("Data:",data);
      const svg = d3.select(d3Container.current);
      
      const margin = ({top: 20, right: 20, bottom: 30, left: 30})

      let x = d3.scaleUtc()
        .domain(d3.extent(data.dates))
        .range([margin.left, width - margin.right])
      let xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

      let y = d3.scaleLinear()
        .domain([0, d3.max(data.series, d => d3.max(d.values))]).nice()
        .range([height - margin.bottom, margin.top])

      let yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove())
        .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 3)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(data.y))
      
      let line = d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => x(data.dates[i]))
        .y(d => y(d))

      svg.attr("viewBox", [0, 0, width, height])
        .style("overflow", "visible");
      svg.append("g")
        .call(xAxis);
      svg.append("g")
        .call(yAxis);

      // This is used by hover: it groups lines and will be useful for timeboxing
      const path = svg.append("g")
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 1.5)
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .selectAll("path")
          .data(data.series)
          .join("path")
          .style("mix-blend-mode", "multiply")
          .attr("d", d => line(d.values));

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