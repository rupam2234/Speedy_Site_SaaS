export default function NoSiteSelected() {
  return (
    <div className="flex flex-col space-y-4 md:-mt-12.5 items-center justify-center min-h-full dark:text-secondary-background p-8">
      <p className="text-4xl md:text-6xl font-bold text-primary/50">
        Website 404
      </p>
      <p className="text-center text-muted-foreground w-full">
        We couldn&apos;t find the website you&apos;re looking for.
        <br />
        To get started, try{" "}
        <span className="font-medium text-foreground">
          adding a new site
        </span>{" "}
        using the left sidebar.
      </p>
    </div>
  );
}
