import React, { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ScrapePage() {
    const [query, setQuery] = useState("");

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (query.length < 5) {
            toast.error("Query must be at least 5 characters");
            return;
        }

        if (query.length > 255) {
            toast.error("Query must be at most 255 characters");
            return;
        }

        const response = await fetch("/api/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            toast.error("Failed to start scraping");
            return;
        }

        toast.success("Scraping started");
    };

    return (
        <div className="container p-4">
            <div className="mb-4">
                <form onSubmit={handleSubmit}>
                    <div className="flex gap-2">
                        <Input
                            id="scrape-query"
                            placeholder="Dentist in NY"
                            autoComplete="off"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            min={5}
                            max={255}
                        />
                        <Button type="submit">Scrape</Button>
                    </div>
                </form>
            </div>
            <div>
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                    Active scrappers
                </h4>
                <div>
                    <p className="text-muted-foreground text-sm">
                        No active scrappers found
                    </p>
                </div>
            </div>
        </div>
    );
}
