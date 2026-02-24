import { createBrowserRouter } from "react-router";
import { routes } from "@/config";
import AppLayout from "@/layouts/app-layout";
import ScrapePage from "./pages/Scrape";
import RecordsPage from "./pages/Records";

export const router = createBrowserRouter([
    {
        path: routes.root.path,
        Component: AppLayout,
        children: [
            {
                index: true,
                Component: ScrapePage,
            },
            {
                path: routes.records.path,
                Component: RecordsPage,
            },
        ],
    },
]);
