import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "@/lib/utils";

function LayoutContent() {
  const { open } = useSidebar();

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-background text-foreground h-screen">
      <div
        className={cn(
          "h-12 border-b flex items-center px-4 shrink-0 gap-2 transition-all duration-200 ease-linear",
          !open && "pl-20"
        )}
        onMouseDown={(e) => {
          if (e.buttons === 1 && e.detail === 1) {
            getCurrentWindow().startDragging();
          }
        }}
      >
        <SidebarTrigger onMouseDown={(e) => e.stopPropagation()} />
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
