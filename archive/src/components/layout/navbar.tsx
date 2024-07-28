import { DEVCON_URL, FORUM_URL, BLOG_URL } from "@/utils/site";
import LogoArchive from "@/assets/logos/archive.svg";
import { Link } from "@/components/link";
import css from "./navbar.module.scss";

interface Props {
  className?: string;
}

export function Navbar(props: Props) {
  let className = "sticky top-0";
  if (props.className) className += ` ${props.className}`;

  return (
    <header className={className}>
      <div className="flex flex-row container mx-auto w-full items-center">
        <div className="py-2 mr-12">
          <Link href="/" className="w-[135px] block">
            <LogoArchive />
          </Link>
        </div>
        <div className="flex justify-between w-full">
          <div className="flex gap-8">
            <Link href={DEVCON_URL} className="text-lg font-bold">
              Devcon
            </Link>
            <Link href={FORUM_URL} className="text-lg font-bold">
              Forum
            </Link>
            <Link href={BLOG_URL} className="text-lg font-bold">
              Blog
            </Link>
          </div>
          <div className="flex gap-8">
            <Link href="watch" className="text-lg font-bold">
              Watch
            </Link>
            <Link href="/" className="text-lg font-bold">
              Event
            </Link>
            <Link href="/" className="text-lg font-bold">
              Categories
            </Link>
            <Link href="/playlists" className="text-lg font-bold">
              Playlist
            </Link>
            <div>Search</div>
          </div>
        </div>
      </div>
    </header>
  );
}
