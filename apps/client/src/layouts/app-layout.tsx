import { Outlet } from "react-router";
import { Toaster } from "sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/site-header";

export default function Layout() {
    return (
        <>
            <Toaster richColors closeButton />
            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar variant="inset" />
                    <SidebarInset>
                        <SiteHeader />
                        <Outlet />
                    </SidebarInset>
                </SidebarProvider>
            </TooltipProvider>
        </>
    );
}
