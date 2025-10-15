import FlexibleDrawer from 'lib/components/flexible-drawer';
import { Dispatch, SetStateAction } from 'react';

const FallbackPane = ({ selection }: { selection: string | null }) => {
  return <div>{selection}</div>;
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

  const ActivePane = () => {
    switch (selection) {
      //   case 'art-exhibition':
      //     return <ArtExhibition />;
      //   case 'cowork':
      //     return <Cowork />;
      //   case 'toilet':
      //     return <Toilet />;
      default:
        return <FallbackPane selection={selection} />;
    }
  };

  return (
    <FlexibleDrawer
      open={paneOpen}
      onOpenChange={() => setSelection(null)}
      className="bg-gradient-to-t from-[#F6B40E] to-[#AAA7FF] bg-white/70 bg-blend-normal"
      hideHandle={true}
    >
      <ActivePane />
    </FlexibleDrawer>
  );
};

export default MapPane;
