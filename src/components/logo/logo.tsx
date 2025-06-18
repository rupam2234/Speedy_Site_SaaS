import Link from "next/link";

const Logo = () => {
  return (
    <Link
      href={"/"}
      className="text-3xl font-bold dark:text-muted-foreground z-10"
    >
      <span className="text-purple-300">Speedy</span>Sense
    </Link>
  );
};

export default Logo;
