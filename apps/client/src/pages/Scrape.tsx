import React, { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ScrapePage() {
    const [query, setQuery] = useState("");

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (query.length < 5) {
            toast.error("Query must be at least 5 characters");
            return;
        }

        if (query.length > 255) {
            toast.error("Query must be at most 255 characters");
            return;
        }

        console.log(query);
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
