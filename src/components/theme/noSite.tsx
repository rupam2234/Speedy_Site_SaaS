import Link from "next/link";

export default function NoSiteSelected() {
  return (
    <div className="flex flex-col space-y-4 md:-mt-12.5 items-center justify-center min-h-full dark:text-secondary-background p-8">
      <p className="text-4xl md:text-6xl font-bold text-primary/50">No site yet</p>
      <p className="text-center text-muted-foreground w-full">
        Nothing is configured yet.
        <br />
        <Link
          href="/dashboard/onboarding"
          className="font-medium text-primary underline hover:opacity-80"
        >
          Start the setup
        </Link>{" "}
        to connect your first site, install the plugin and activate the service.
      </p>
    </div>
  );
}