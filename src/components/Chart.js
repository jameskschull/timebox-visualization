import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { brush, set } from 'd3';

// ROSE IN THE HOUSE

function Chart() {
  const [data, setData] = useState(null);
  const [pathState, setPathState] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [boxCoordinates, setBoxCoordinates] = useState({});
  const d3Container = useRef(null);

  const width = 800;
  const height = 600;

  /* Load data */
  useEffect(() => {
    if (!dataLoaded) {
      // consolee.log("Loading data.");
      d3.csv('/data/top_100.csv')
      .then(function(csvData) {
          // consolee.log("Processing data.");
          const uniqueNames = [...new Set(csvData.map(d => d.person))];
          const utcParser = d3.utcParse("%Y-%m");
          const dates = [...new Set(csvData.map(d => d.year_month))];
          var processedData = [];
          uniqueNames.forEach(name => {
            var values = csvData.filter((d) => {return d.person==name}).map(d => d.screen_time_seconds/3600);
            processedData.push({name:name, values:values});
          });
          setData({
            y: "# hours of screen time",
            series: processedData,
            dates: dates.map((d) => d3.timeMonth.floor(utcParser(d))),
          });
          setDataLoaded(true);
        })
        .catch(function(error){
        // handle error   
      })
    }
  }, [dataLoaded]);

  // Filter
  useEffect(()=> {
    console.log("Updated box coordinates: ", boxCoordinates);
    if (boxCoordinates==={} || !pathState) {
      return;
    } else {
      pathState.attr("stroke", "steelblue").attr("opacity", 0.2);
      pathState.filter((d) => {

        // Filter for each timebox
        for (const [id, coordinates] of Object.entries(boxCoordinates)) {
          const xMin = coordinates[0][0];
          const xMax = coordinates[0][1];
          const yMin = coordinates[1][1];
          const yMax = coordinates[1][0];
          const datesComparable = data.dates.map((d) => d.getTime());
          const idxMin = datesComparable.indexOf(xMin.getTime());
          const idxMax = datesComparable.indexOf(xMax.getTime());
          for (var i=idxMin;i<idxMax;i++) {
            if (d.values[i]<yMin || d.values[i]>yMax) {
              return false;
            }
          }
        }
        return true;
      }).attr("stroke", 'red').attr("opacity", 1);;
    }
  }, [boxCoordinates]);

  /* Create D3 visualization */
  useEffect(() => {
    if (dataLoaded) {
      // console.log("Box coordinates:", boxCoordinates);
      // consolee.log("Data:",data);
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

      /* Adapted from Ludwig Schubert's code
      http://bl.ocks.org/ludwigschubert/0236fa8594c4b02711b2606a8f95f605
      */

      var gBrushes = svg.append('g').attr("class", "brushes");
      var brushes = []

      /* CREATE NEW BRUSH
      *
      * This creates a new brush. A brush is both a function (in our array) and a set of predefined DOM elements
      * Brushes also have selections. While the selection are empty (i.e. a suer hasn't yet dragged)
      * the brushes are invisible. We will add an initial brush when this viz starts. (see end of file)
      * Now imagine the user clicked, moved the mouse, and let go. They just gave a selection to the initial brush.
      * We now want to create a new brush.
      * However, imagine the user had simply dragged an existing brush--in that case we would not want to create a new one.
      * We will use the selection of a brush in brushend() to differentiate these cases.
      */
      function newBrush() {
        var brush = d3.brush()
          .on("start", brushstart)
          .on("brush", brushed)
          .on("end", brushend);

        brushes.push({id: brushes.length, brush: brush});

        function brushstart(event) {
        };

        /* TODO: Update timeboxCoords when an existing box is moved */
        function brushed(event) {
          // console.log("Brushed");
          var lastBrushID = brushes[brushes.length - 1].id;
          var currentBrushID = parseInt(this.id.split('-')[1]);
          // console.log("Last brush ID: ", lastBrushID);
          // if (lastBrushID === currentBrushID) {
          //   console.log("Brushing a new brush");
          // } else {
          //   console.log("Moving an existing brush");
          // }
          // console.log("Brushing, final extent: ", event.selection)
          // console.log("Brushes: ", brushes)
        }

        function brushend(event) {
          // Figure out if our latest brush has a selection
          var lastBrushID = brushes[brushes.length - 1].id;
          var lastBrush = document.getElementById('brush-' + lastBrushID);
          var selection = d3.brushSelection(lastBrush);

          // If it does, that means we need another one
          if (selection && selection[0] !== selection[1]) {
            let targetX1 = d3.timeMonth.floor(x.invert(event.selection[0][0]));
            let targetY1 = y.invert(event.selection[0][1]);
            let targetX2 = d3.timeMonth.floor(x.invert(event.selection[1][0]));
            let targetY2 = y.invert(event.selection[1][1]);
            let xBounds = [targetX1, targetX2];
            let yBounds = [targetY1, targetY2];
            setBoxCoordinates(boxCoordinates => ({...boxCoordinates, 
              [lastBrushID]:[xBounds, yBounds]}));
            newBrush();
          } 
          // Always draw brushes
          drawBrushes();
        }
      }

      function drawBrushes() {
        var brushSelection = gBrushes
          .selectAll('.brush')
          .data(brushes, function (d){return d.id});

        // Set up new brushes
        brushSelection.enter()
          .insert("g", '.brush')
          .attr('class', 'brush')
          .attr('id', function(brush){ return "brush-" + brush.id; })
          .each(function(brushObject) {
            //call the brush
            brushObject.brush(d3.select(this));
          });

        /* REMOVE POINTER EVENTS ON BRUSH OVERLAYS
        *
        * This part is abbit tricky and requires knowledge of how brushes are implemented.
        * They register pointer events on a .overlay rectangle within them.
        * For existing brushes, make sure we disable their pointer events on their overlay.
        * This frees the overlay for the most current (as of yet with an empty selection) brush to listen for click and drag events
        * The moving and resizing is done with other parts of the brush, so that will still work.
        */
        brushSelection
          .each(function (brushObject){
            d3.select(this)
              .attr('class', 'brush')
              .selectAll('.overlay')
              .style('pointer-events', function() {
                var brush = brushObject.brush;
                if (brushObject.id === brushes.length-1 && brush !== undefined) {
                  return 'all';
                } else {
                  return 'none';
                }
              });
          })

        brushSelection.exit()
          .remove();
      }

      newBrush();
      drawBrushes();

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

      // Store path so we can access it in our filter function
      setPathState(path);
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