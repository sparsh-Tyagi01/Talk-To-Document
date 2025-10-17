import { Route, Routes } from "react-router-dom";
import Homepage from "./components/homepage";
import Chat from "./components/chat";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage/>}/>
      <Route path="/chat" element={<Chat/>}/>
    </Routes>
  );
}

export default App;
