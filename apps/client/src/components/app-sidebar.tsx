import * as React from "react";
import { SiGooglemaps } from "react-icons/si";
import { FastForwardIcon, DatabaseIcon } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Scrape",
            path: "/",
            icon: FastForwardIcon,
        },
        {
            title: "Records",
            path: "/records",
            icon: DatabaseIcon,
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:p-1.5!"
                        >
                            <a href="#">
                                <SiGooglemaps className="size-5!" />
                                <span className="text-base font-semibold">
                                    Maps scrapper
                                </span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>{/* <NavUser user={data.user} /> */}</SidebarFooter>
        </Sidebar>
    );
}
