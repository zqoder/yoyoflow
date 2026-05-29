import { useState, useEffect } from "react";
import "./App.css";
import Translate from "@/pages/Translate";
import Service from "@/pages/Service";
import Shortcuts from "@/pages/Shortcuts";
import ShortcutTranslate from "@/pages/ShortcutTranslate";
import Vocabulary from "@/pages/Vocabulary";
import HistoryPage from "@/pages/History";
import Settings from "@/pages/Settings";
import { useServiceStore } from "@/store/services";
import { useSettingsStore } from "@/store/settings";
import { useVocabularyStore } from "@/store/vocabulary";
import { useHistoryStore } from "@/store/history";
import { HashRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

function App() {
  const [isShortcutTranslateWindow, setIsShortcutTranslateWindow] =
    useState(false);
  const initStore = useServiceStore((state) => state.initStore);
  const initSettingsStore = useSettingsStore((state) => state.initStore);
  const initVocabulary = useVocabularyStore((state) => state.initStore);
  const initHistory = useHistoryStore((state) => state.initStore);

  useEffect(() => {
    initStore();
    initSettingsStore();
    initVocabulary();
    initHistory();

    // Check if this is the shortcut-translate window
    if (window.location.pathname === "/shortcut-translate") {
      setIsShortcutTranslateWindow(true);
    }
  }, [initStore, initSettingsStore, initVocabulary, initHistory]);

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
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
