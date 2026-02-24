import { Outlet } from "react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Layout() {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <main>
                    <SidebarTrigger />
                    <Outlet />
                </main>
            </SidebarProvider>
        </TooltipProvider>
    );
}
