import React from 'react';
import logo from './logo.svg';
import './App.css';
import Chart from './components/Chart';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        {/* <p>
          Top 100 Celebrities on Cable News
        </p> */}
        <div id="visualization-container">
          <Chart/>
        </div>
        
      </header>
    </div>
  );
}

export default App;
