import { useState, useEffect } from "react";
import "./App.css";
import { Flex } from "@/components/ui/flex";
import Translate from "@/pages/Translate";
import Service from "@/pages/Service";
import Shortcuts from "@/pages/Shortcuts";
import ShortcutTranslate from "@/pages/ShortcutTranslate";
import { useServiceStore } from "@/store/services";
import { useSettingsStore } from "@/store/settings";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";

function App() {
  const [activeTab, setActiveTab] = useState("translate");
  const [isShortcutTranslateWindow, setIsShortcutTranslateWindow] = useState(false);
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

  const renderContent = () => {
    switch (activeTab) {
      case "translate":
        return <Translate />;
      case "service":
        return <Service />;
      case "shortcuts":
        return <Shortcuts />;
      case "vocabulary":
        return <div>生词本组件内容</div>;
      case "history":
        return <div>历史记录组件内容</div>;
      case "settings":
        return <div>通用设置组件内容</div>;
      default:
        return <div>Welcome to YoYoFlow</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <div
        className="border-b flex-none relative flex justify-center"
        onMouseDown={(e) => {
          if (e.buttons === 1 && e.detail === 1) {
            getCurrentWindow().startDragging();
          }
        }}
      >
        <Flex
          className="h-16 items-center justify-center px-4"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger
                onClick={() => setActiveTab("translate")}
                className={
                  activeTab === "translate"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                翻译
              </MenubarTrigger>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger
                onClick={() => setActiveTab("service")}
                className={
                  activeTab === "service"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                服务
              </MenubarTrigger>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger
                onClick={() => setActiveTab("shortcuts")}
                className={
                  activeTab === "shortcuts"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                快捷键
              </MenubarTrigger>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger
                onClick={() => setActiveTab("vocabulary")}
                className={
                  activeTab === "vocabulary"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                生词本
              </MenubarTrigger>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger
                onClick={() => setActiveTab("history")}
                className={
                  activeTab === "history"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                历史记录
              </MenubarTrigger>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger
                onClick={() => setActiveTab("settings")}
                className={
                  activeTab === "settings"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                通用设置
              </MenubarTrigger>
            </MenubarMenu>
          </Menubar>
        </Flex>
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl p-4 md:p-4">
          <div className="w-full">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
}

export default App;
