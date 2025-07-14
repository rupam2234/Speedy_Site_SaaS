"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddWebsiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWebsiteModal({ open, onOpenChange }: AddWebsiteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Add a New Website
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enter the primary domain you want to track. This enables performance
            and experience monitoring across your site.{" "}
            <span className="text-red-500">
              If you&apos;d like to track subdomains, you can add specific pages
              from those subdomains later.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="website">Website domain</Label>
            <Input
              id="website"
              placeholder="e.g. example.com"
              autoFocus
              className="text-base"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" className="cursor-pointer">
            Add Website
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
