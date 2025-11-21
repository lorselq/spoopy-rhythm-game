import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Invoker } from './game/minigames/invoker/Invoker'
import { ensureStrudelInitialized } from "./game/audio/StrudelEngine";


function App() {
  const [count, setCount] = useState(0)

  const handleStrudelPlay = async () => {
  try {
    await ensureStrudelInitialized();
    // Simple Strudel pattern from the docs:
    // note('<c a f e>(3,8)').jux(rev).play()
    note('<c a f e>(3,8)').jux(rev).play();
  } catch (e) {
    console.error("Strudel play error", e);
  }
};

const handleStrudelStop = async () => {
  try {
    await ensureStrudelInitialized();
    hush();
  } catch (e) {
    console.error("Strudel stop error", e);
  }
};


  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
  <h2>🌀 Strudel Test</h2>
  <p>Click to summon a tiny Strudel pattern.</p>
  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
    <button
      onClick={handleStrudelPlay}
      style={{ padding: "0.5rem 1rem" }}
    >
      Play Strudel
    </button>
    <button
      onClick={handleStrudelStop}
      style={{ padding: "0.5rem 1rem" }}
    >
      Stop Strudel
    </button>
    <div>
      <Invoker />   
    </div>
  </div>
</div>
    </>
  )
}

export default App
