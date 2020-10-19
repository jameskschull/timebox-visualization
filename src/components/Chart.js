import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { brush, selection, set, svg } from 'd3';
import "./Chart.css"

/* Helper functions */
function updateCoordinates(id, selection, boxCoordinates, setBoxCoordinates, x, y) {
  let targetX1 = d3.timeMonth.floor(x.invert(selection[0][0]));
  let targetY1 = y.invert(selection[0][1]);
  let targetX2 = d3.timeMonth.floor(x.invert(selection[1][0]));
  let targetY2 = y.invert(selection[1][1]);
  let xBounds = [targetX1, targetX2];
  let yBounds = [targetY1, targetY2];

  setBoxCoordinates(boxCoordinates => ({...boxCoordinates, 
    [id]:[xBounds, yBounds]}));
}

function addBrush(brush, brushesArray, setBrushesArray) {
  setBrushesArray(prevArray => ([...prevArray, {id: prevArray.length, brush: brush}])); 
}

/* Visualization component */
function Chart() {
  const [data, setData] = useState(null);
  const [pathState, setPathState] = useState(null);
  const [labelState, setLabelState] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [boxCoordinates, setBoxCoordinates] = useState({});
  const [brushesArray, setBrushesArray] = useState([]);
  const [topBrushId, setTopBrushId] = useState(null);
  const [brushSelected, setBrushSelected] = useState(null);
  const d3Container = useRef(null);

  const width = window.innerWidth*0.75;
  const height = window.innerHeight*0.7;

  /* Load data */
  useEffect(() => {
    if (!dataLoaded) {
      d3.csv('/data/top_100.csv')
      .then(function(csvData) {
          const uniqueNames = [...new Set(csvData.map(d => d.person))];
          const utcParser = d3.utcParse("%Y-%m");
          const dates = [...new Set(csvData.map(d => d.year_month))];
          var processedData = [];
          uniqueNames.forEach(name => {
            var values = csvData.filter((d) => {return d.person==name}).map(d => d.screen_time_seconds/3600);
            processedData.push({name:name, values:values});
          });
          setData({
            //y: "# hours of screen time",
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

  const deleteBrush = useCallback(event => {
    if (event.key === 'd' && brushSelected) {
      let brushId = brushSelected.id.split('-')[1];

      if (brushSelected && parseInt(brushId) !== topBrushId) {
        d3.select(brushSelected).remove();
        setBoxCoordinates((prevCoordinates) => {
          const newCoordinates = {...prevCoordinates}
          delete newCoordinates[brushId];
          return newCoordinates;
        })
      } else if (parseInt(brushId) === topBrushId) {
      }
    }
  });

  useEffect(() => {
    if (brushSelected) {
      d3.selectAll('.brush').each(function () {
        this.classList.remove("selected-brush");
      });
      brushSelected.classList.add("selected-brush");
    }
  }, [brushSelected]);
  
  useEffect(() => {
    document.addEventListener('keypress', deleteBrush);
    return () => {
      document.removeEventListener('keypress', deleteBrush);
    }
  }, [deleteBrush]);

  // Filter
  useEffect(()=> {
    if (Object.entries(boxCoordinates).length===0 || !pathState) {
      if (pathState && labelState) {
        pathState.attr("stroke", "steelblue").attr("opacity", 1);
        labelState.attr("font-weight", "bold").attr("opacity", 1);
      }
      return;
    } else {
      pathState.attr("stroke", "steelblue").attr("opacity", 0.1);
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
      }).attr("stroke", 'salmon').attr("opacity", 1);

      labelState.attr("opacity", 0.1);
      labelState.filter((d) => {
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
      }).attr("font-weight", "bold").attr("opacity", 1);

    }
  }, [boxCoordinates]);

  /* Create D3 visualization */
  useEffect(() => {
    if (dataLoaded) {
      const svg = d3.select(d3Container.current);
      const margin = ({top: 40, right: 20, bottom: 30, left: 30});

      const title = svg.append("text")
      .attr("transform", `translate(${width/2}, 0)`)
      .attr("font-weight", "bold")
      .attr("font-family", "sans-serif")
      .attr("font-size", 14)
      .style("text-anchor", "middle")
      .text("Monthly Screentime of Top 100 Cable TV News Personalities");

      const instructionsHeader = svg.append("text")
      .attr("transform", `translate(0, ${height + margin.bottom*2})`)
      .attr("font-weight", "bold")
      .attr("font-family", "sans-serif")
      .attr("font-size", 13)
      .attr("dy", "0em")
      .style("text-anchor", "start")
      .text("How to use this visualization application:");

      const instructions1 = svg.append("text")
        .attr("transform", `translate(0, ${height + margin.bottom*2})`)
        .attr("font-weight", "normal")
        .attr("font-family", "sans-serif")
        .attr("font-size", 12)
        .attr("dy", "1em")
        .style("text-anchor", "start")
        .text("- Click and drag anywhere to create a new timebox, or click and drag an existing timebox to move it.");

      const instructions11 = svg.append("text")
        .attr("transform", `translate(0, ${height + margin.bottom*2})`)
        .attr("font-weight", "normal")
        .attr("font-family", "sans-serif")
        .attr("font-size", 12)
        .attr("dy", "2em")
        .style("text-anchor", "start")
        .text("- The highlighted timebox indicates the current selection.");

      const instructions2 = svg.append("text")
        .attr("transform", `translate(0, ${height + margin.bottom*2})`)
        .attr("font-weight", "normal")
        .attr("font-family", "sans-serif")
        .attr("font-size", 12)
        .attr("dy", "3em")
        .style("text-anchor", "start")
        .text("- To resize a timebox, click and drag the box's borders.");

      const instructions3 = svg.append("text")
        .attr("transform", `translate(0, ${height + margin.bottom*2})`)
        .attr("font-weight", "normal")
        .attr("font-family", "sans-serif")
        .attr("font-size", 12)
        .attr("dy", "4em")
        .style("text-anchor", "start")
        .text("- To delete a timebox, click to select it, then press the 'd' key.");

      const sourceRef = svg.append("text")
      .attr("transform", `translate(${width - margin.right}, ${height + margin.bottom*2})`)
      .attr("font-weight", "normal")
      .attr("font-family", "serif")
      .attr("font-size", 12)
      .attr("dy", "6em")
      .style("text-anchor", "end")
      .text("Created by: James Schull and Rose Li");

      const byline = svg.append("text")
      .attr("transform", `translate(${width - margin.right}, ${height + margin.bottom*2})`)
      .attr("font-weight", "normal")
      .attr("font-family", "serif")
      .attr("font-size", 12)
      .attr("dy", "7em")
      .style("text-anchor", "end")
      .text("Source: Stanford Cable TV News Analyzer Project");

      let x = d3.scaleUtc()
        .domain(d3.extent(data.dates))
        .range([margin.left, width - margin.right]);
        
      let xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

      const xAxisLabel = svg.append("text")
        .attr("transform", `translate(${width/2}, ${height + 0.5*margin.bottom})`)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("font-size", 14)
        .style("text-anchor", "middle")
        .text("Date");

      let y = d3.scaleLinear()
        .domain([0, d3.max(data.series, d => d3.max(d.values))]).nice()
        .range([height - margin.bottom, margin.top]);

      let yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove())
        .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 3)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(data.y));

      const yAxisLabel = svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0-margin.left)
        .attr("x", 0-(height/2))
        .attr("dy", "1em")
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("font-size", 14)
        .style("text-anchor", "middle")
        .text("Screen Time (hours)");
      
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
      var brushes = [];
      var nextBrushID = 0;

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

        addBrush(brush, brushesArray, setBrushesArray);
        brushes.push({id: nextBrushID, brush: brush}); 
        setTopBrushId(nextBrushID);
        nextBrushID += 1;

        function brushstart(event) {
        };

        function brushed(event) {
          var lastBrushID = brushes[nextBrushID - 1].id;
          var currentBrushID = parseInt(this.id.split('-')[1]);
          if (lastBrushID != currentBrushID) {
            updateCoordinates(currentBrushID, event.selection, boxCoordinates, setBoxCoordinates, x, y);
          }
        }

        function brushend(event) {
          // Figure out if our latest brush has a selection
          var lastBrushID = brushes[nextBrushID - 1].id;
          var lastBrush = document.getElementById('brush-' + lastBrushID);
          var selection = d3.brushSelection(lastBrush);

          // If it does, that means we need another one
          if (selection && selection[0] !== selection[1]) {
            updateCoordinates(lastBrushID, event.selection, boxCoordinates, setBoxCoordinates, x, y);
            newBrush();
          } 
          
          setBrushSelected(document.getElementById('brush-' + parseInt(this.id.split('-')[1])));

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
        * Brushes register pointer events on a .overlay rectangle within them.
        * For existing brushes, we disable their pointer events on their overlay.
        * This frees the overlay for the most current (as of yet with an empty selection) brush to listen for click and drag events
        * Note that the moving and resizing is done with other parts of the brush, so that will still work.
        */
        brushSelection
          .each(function (brushObject){
            d3.select(this)
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
        .attr("class", "data-line")
        .selectAll("path")
        .data(data.series)
        .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("d", d => line(d.values));

      const labels = svg.append("g")
        .selectAll("text")
        .data(data.series)
        .enter()
        .append("text")
        .attr("x", function(d) {
          return width - margin.right/2
        })
        .attr("y", function(d) {
          return y(d.values[126])
        })
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .text(function(d) {
          return d.name
        });

      // Store path so we can access it in our filter function
      setPathState(path);
      setLabelState(labels);

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