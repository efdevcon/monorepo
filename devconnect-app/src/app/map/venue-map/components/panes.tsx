import FlexibleDrawer from 'lib/components/flexible-drawer';
import { Dispatch, SetStateAction } from 'react';
import cn from 'classnames';
import { MapPin, GlobeIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import X from './icons/x.svg';
import FarcasterIcon from './icons/farcaster.svg';
// import GlobeIcon from './icons/globe.svg';
import Link from 'next/link';

const Pane = ({
  children,
  className,
  paneOpen,
  selection,
  setSelection,
  description,
  links,
}: {
  children?: React.ReactNode;
  className?: string;
  paneOpen: boolean;
  links?: Record<'website' | 'x' | 'farcaster', string>;
  selection: string | null;
  setSelection: Dispatch<SetStateAction<string | null>>;
  description?: string;
}) => {
  console.log(paneOpen, 'paneOpen');
  console.log(children, 'children');

  const LinkItems = (() => {
    // if (!links || Object.keys(links).length === 0) return null;

    return (
      <div className="flex flex-col mt-4">
        <div className="font-semibold text-sm mb-1">Links</div>
        <div className="flex items-center gap-2 mt-1">
          {links && links.website && (
            <Link href={links.website}>
              <button className="flex items-center gap-1 cursor-pointer basic-button white-button small-button">
                Visit Website
                <GlobeIcon className="w-4 h-4 shrink-0" />
              </button>
            </Link>
          )}
          {links && links.x && (
            <Link href={links.x}>
              <button className="flex items-center justify-center gap-1 cursor-pointer basic-button white-button small-button square-button overflow-visible">
                <X className="!h-4 !w-auto shrink-0 icon" />
              </button>
            </Link>
          )}
          {links && links.farcaster && (
            <Link href={links.farcaster}>
              <button className="flex items-center gap-1 cursor-pointer basic-button white-button small-button square-button">
                <FarcasterIcon className="!h-4 !w-auto shrink-0 icon" />
              </button>
            </Link>
          )}

          <button
            className="flex items-center gap-1 cursor-pointer basic-button white-button small-button"
            onClick={() => {
              navigator.clipboard.writeText(
                window.location.origin +
                  '/map?filter=' +
                  encodeURIComponent(selection || '')
              );

              toast.success('Location link copied to clipboard', {
                duration: 1000,
              });
            }}
          >
            Copy Location
            <MapPin className="w-4 h-4 cursor-pointer" />
          </button>
        </div>
      </div>
    );
  })();

  return (
    <FlexibleDrawer
      open={paneOpen}
      onOpenChange={() => console.log('onOpenChange', setSelection(null))}
      className={cn('p-4', className)}
      hideHandle={true}
    >
      <div className="flex justify-between">
        <div className="flex items-center gap-2 self-start">
          <img
            src="https://storage.googleapis.com/zapper-fi-assets/apps%2Faave-v3.png"
            alt={selection || ''}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="font-medium text-sm break-all leading-none">
            {selection}
          </div>
        </div>
        <button
          onClick={() => setSelection(null)}
          className="flex items-center justify-center p-4 -translate-y-2 translate-x-2 shrink-0 cursor-pointer"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
      {children}
      {description && (
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-sm">About</div>
          <div className="text-xs">{description}</div>
        </div>
      )}
      {LinkItems}
    </FlexibleDrawer>
  );
};

const MapPane = (props: {
  selection: string | null;
  setSelection: Dispatch<SetStateAction<string | null>>;
}) => {
  const { selection, setSelection } = props;

  //   const handleClose = () => {
  //     setCurrentFilters(initialFilters);
  //     window.location.href = '/map';
  //   };

  //   const handleBack = () => {
  //     window.location.href = '/quests/app-showcase#14';
  //   };

  const paneOpen = !!selection;

  const ActivePane = (() => {
    switch (selection) {
      //   case 'art-exhibition':
      //     return <ArtExhibition />;
      //   case 'cowork':
      //     return <Cowork />;
      //   case 'toilet':
      //     return <Toilet />;
      case 'quest':
        return (
          <Pane
            paneOpen={paneOpen}
            setSelection={setSelection}
            selection={selection}
            className="bg-gradient-to-t from-[#F6B40E] to-[#AAA7FF] bg-white/70 bg-blend-normal"
          >
            <div>I am a quest.</div>
          </Pane>
        );
      default:
        return (
          <Pane
            paneOpen={paneOpen}
            setSelection={setSelection}
            selection={selection}
            links={{
              website: 'aa',
              x: 'bb',
              farcaster: 'cc',
            }}
            description="This is a description of the selection."
          >
            {/* <div>{selection}</div> */}
          </Pane>
        );
    }
  })();

  return ActivePane;
};

export default MapPane;
