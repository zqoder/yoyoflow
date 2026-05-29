import {
  Languages,
  Server,
  Keyboard,
  Book,
  History,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Menu items.
const items = [
  {
    title: "翻译",
    url: "/",
    icon: Languages,
  },
  {
    title: "生词本",
    url: "/vocabulary",
    icon: Book,
  },
  {
    title: "历史记录",
    url: "/history",
    icon: History,
  },
  {
    title: "服务",
    url: "/service",
    icon: Server,
  },
  {
    title: "快捷键",
    url: "/shortcuts",
    icon: Keyboard,
  },
  {
    title: "通用设置",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader
        className="h-10 flex items-start justify-end select-none pb-0"
        onMouseDown={(e) => {
          if (e.buttons === 1 && e.detail === 1) {
            getCurrentWindow().startDragging();
          }
        }}
      >
        {/* <div className="font-mono text-sm">YoYoFlow</div> */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
