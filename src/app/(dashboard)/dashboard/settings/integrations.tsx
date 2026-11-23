"use client";

import { Mail, Plug } from "lucide-react";
import { EmailReporting } from ".";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type CfConnection = {
  isConnected: boolean;
  key?: string | null;
};

export default function Integrations() {
  // Only Weekly Report tab remains
  return (
    <Card className="gap-0 py-0 rounded-sm">
      <CardHeader className="px-6 py-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Plug className="size-4 text-muted-foreground" />
          Integrations
        </CardTitle>
        <CardDescription>
          Connect the services that power your site and control how Speedy Site
          reports back to you.
        </CardDescription>
      </CardHeader>

      <Separator />

      <CardContent className="px-6 py-6">
        {/* Weekly report section - the only remaining integration */}
        <div className="mb-5 space-y-0.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Mail className="size-4 text-muted-foreground" />
            Weekly Report
          </h3>
          <p className="text-xs text-muted-foreground">
            Receive a weekly performance report for this site.
          </p>
        </div>

        <EmailReporting />
      </CardContent>
    </Card>
  );
}
