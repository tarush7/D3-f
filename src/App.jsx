import React from "react"
import ForceGraph from "./Components/ForceGraph";

function App() {

  return (
    <div>
      <div className="m-3 w-screen h-screen">
      <h1 className="text-2xl font-bold mb-4">Force Directed Graph</h1>
      <ForceGraph />
    </div>
    </div>
  );
};

export default App
