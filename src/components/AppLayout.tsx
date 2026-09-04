import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "@/lib/utils";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useServiceStore, ServiceType } from "@/store/services";

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  "text-translation": "文本翻译",
  "text-recognition": "文本识别",
  "speech-synthesis": "语音合成",
};

const SERVICE_TYPES: ServiceType[] = [
  "text-translation",
  "text-recognition",
  "speech-synthesis",
];

function LayoutContent() {
  const { open } = useSidebar();
  const location = useLocation();
  const { activeServiceType, setActiveServiceType } = useServiceStore();
  const showServiceMenu = location.pathname === "/service";

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-background text-foreground h-screen">
      <div
        className={cn(
          "relative h-12 border-b flex items-center px-4 shrink-0 gap-2 transition-all duration-200 ease-linear",
          !open && "pl-20",
        )}
        onMouseDown={(e) => {
          if (e.buttons === 1 && e.detail === 1) {
            getCurrentWindow().startDragging();
          }
        }}
        onDoubleClick={() => {
          getCurrentWindow().toggleMaximize();
        }}
      >
        <div className="z-10 flex items-center">
          <SidebarTrigger onMouseDown={(e) => e.stopPropagation()} />
        </div>
        {showServiceMenu && (
          <>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <Menubar
                className="bg-muted/50 border-none h-9 p-1"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {SERVICE_TYPES.map((type) => (
                  <MenubarMenu key={type}>
                    <MenubarTrigger
                      className={cn(
                        "cursor-pointer hover:bg-background/50 hover:text-accent-foreground data-[state=open]:bg-background data-[state=open]:text-foreground",
                        activeServiceType === type &&
                          "bg-background text-foreground shadow-sm hover:bg-background",
                      )}
                      onClick={() => setActiveServiceType(type)}
                    >
                      {SERVICE_TYPE_LABELS[type]}
                    </MenubarTrigger>
                  </MenubarMenu>
                ))}
              </Menubar>
            </div>
            {activeServiceType === "text-translation" && (
              <Button
                size="icon"
                variant="ghost"
                className="z-10 ml-auto h-8 w-8"
                title="添加自定义服务"
                aria-label="添加自定义服务"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  window.dispatchEvent(
                    new Event("yoyoflow:open-custom-service-editor"),
                  );
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </main>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <LayoutContent />
    </SidebarProvider>
  );
}
