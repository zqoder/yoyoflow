import { useState, useEffect } from "react";
import "./App.css";
import Translate from "@/pages/Translate";
import Service from "@/pages/Service";
import Shortcuts from "@/pages/Shortcuts";
import ShortcutTranslate from "@/pages/ShortcutTranslate";
import { useServiceStore } from "@/store/services";
import { useSettingsStore } from "@/store/settings";
import { HashRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

function App() {
  const [isShortcutTranslateWindow, setIsShortcutTranslateWindow] =
    useState(false);
  const initStore = useServiceStore((state) => state.initStore);
  const initSettingsStore = useSettingsStore((state) => state.initStore);

  useEffect(() => {
    initStore();
    initSettingsStore();

    // Check if this is the shortcut-translate window
    if (window.location.pathname === "/shortcut-translate") {
      setIsShortcutTranslateWindow(true);
    }
  }, [initStore, initSettingsStore]);

  if (isShortcutTranslateWindow) {
    return <ShortcutTranslate />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Translate />} />
          <Route path="/service" element={<Service />} />
          <Route path="/shortcuts" element={<Shortcuts />} />
          <Route path="/vocabulary" element={<div>生词本组件内容</div>} />
          <Route path="/history" element={<div>历史记录组件内容</div>} />
          <Route path="/settings" element={<div>通用设置组件内容</div>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
