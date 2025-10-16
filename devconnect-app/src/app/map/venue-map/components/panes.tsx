import FlexibleDrawer from 'lib/components/flexible-drawer';
import { Dispatch, SetStateAction } from 'react';
import cn from 'classnames';
import { MapPin, GlobeIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import X from './icons/x.svg';
import FarcasterIcon from './icons/farcaster.svg';
// import GlobeIcon from './icons/globe.svg';
import Link from 'next/link';
import Image from 'next/image';
import Placeholder from './images/placeholder.png';

const Pane = ({
  children,
  className,
  paneOpen,
  selection,
  setSelection,
  description,
  subtitle,
  links,
}: {
  children?: React.ReactNode;
  className?: string;
  paneOpen: boolean;
  links?: Record<'website' | 'x' | 'farcaster', string>;
  selection: string | null;
  setSelection: Dispatch<SetStateAction<string | null>>;
  description?: string;
  subtitle?: string;
}) => {
  const imageSrc = ''; // 'https://storage.googleapis.com/zapper-fi-assets/apps%2Faave-v3.png';

  const LinkItems = (() => {
    if (!links || Object.keys(links).length === 0) return null;

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
        </div>
      </div>
    );
  })();

  return (
    <FlexibleDrawer
      open={paneOpen}
      onOpenChange={() => setSelection(null)}
      className={cn('p-4', className)}
      hideHandle={true}
    >
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-2 self-start">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={selection || ''}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <Image
              src={Placeholder}
              alt={selection || ''}
              className="w-8 h-8 object-cover shrink-0"
              style={{ filter: 'brightness(0)' }}
            />
          )}

          <div className="flex flex-col gap-1 pr-2">
            <div className="font-medium text-base break-all leading-none flex items-center gap-1">
              {selection}
            </div>
            {subtitle && (
              <div className="text-xs leading-tight">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="flex items-center gap-1 cursor-pointer basic-button white-button small-button square-button"
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
            {/* Copy Location */}
            <MapPin className="w-4 h-4 cursor-pointer" />
          </button>
          <button
            onClick={() => setSelection(null)}
            className="flex items-center justify-center basic-button white-button small-button square-button shrink-0 cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      {description && (
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-sm">About</div>
          <div className="text-xs">{description}</div>
        </div>
      )}
      {children}
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

  let selectionTest =
    selection && selection.includes('district')
      ? 'district'
      : 'whatever fallback';

  const ActivePane = (() => {
    switch (selectionTest) {
      case 'district':
        const apps = [
          {
            name: 'App Name',
            description: 'App Description',
            image:
              'https://storage.googleapis.com/zapper-fi-assets/apps%2Faave-v3.png',
          },
        ];

        return (
          <Pane
            paneOpen={paneOpen}
            setSelection={setSelection}
            selection={selection}
            // description="This is a description of the selection."
            subtitle="District Subtitle"
            className="bg-gradient-to-t from-[rgba(136,85,204,0.3)] to-[rgba(221,102,170,0.3)] shadow-[0_-2px_4px_0_rgba(54,54,76,0.10)]"
          >
            <div className="bg-[rgba(255,255,255,0.4)] p-3 shadow-[0_2px_4px_0_rgba(54,54,76,0.10)]">
              <div className="text-sm font-medium mb-3">App Showcase</div>
              <div className="grid md:grid-cols-4 grid-cols-2 gap-2">
                {Array.from({ length: 15 }, (_, i) =>
                  apps.map((app, index) => (
                    <div
                      className="font-medium text-xs leading-none flex items-center gap-1.5"
                      key={`${i}-${index}`}
                    >
                      <Image
                        src={Placeholder}
                        alt={app.name}
                        className="w-[16px] h-[16px] object-cover"
                        style={{ filter: 'brightness(0)' }}
                      />
                      {app.name}
                    </div>
                  ))
                ).flat()}
              </div>
            </div>
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
