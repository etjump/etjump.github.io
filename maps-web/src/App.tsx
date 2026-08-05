import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import MapDetail from "./pages/MapDetail";
import Upload from "./pages/Upload";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="maps/:id" element={<MapDetail />} />
        <Route path="upload" element={<Upload />} />
      </Route>
    </Routes>
  );
}
