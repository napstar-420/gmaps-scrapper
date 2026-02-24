import { createBrowserRouter } from "react-router";
import AppLayout from '@/layouts/app-layout';


export const router = createBrowserRouter([
    {
        path: "/",
        Component: AppLayout,
    },
]);
