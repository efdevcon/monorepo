import React from 'react';
import css from './event.module.scss';
import Panzoom, { PanZoom } from 'panzoom';
import { Plus, Minus } from 'lucide-react';
// import IconPlus from 'assets/icons/plus.svg';
// import IconMinus from 'assets/icons/minus.svg';

export const PanzoomControls = (props: { pz: PanZoom | null }) => {
  const onClick = (e: any) => {
    e.nativeEvent.preventDefault();

    const scene = document.getElementById('image-container');

    if (!scene || !props.pz) return;

    const rect = scene.getBoundingClientRect();
    // const cx = rect.x + rect.width / 2
    // const cy = rect.y + rect.height / 2
    const cx = scene.offsetLeft + rect.width / 2;
    const cy = scene.offsetTop + rect.height / 2;
    const isZoomIn = e.currentTarget.id === 'zoomIn';
    const zoomBy = isZoomIn ? 2 : 0.5;
    props.pz.smoothZoom(cx, cy, zoomBy);
  };

  return (
    <div className={'absolute top-4 left-4 flex flex-col z-[1] gap-2 text-xs'}>
      <div
        id="zoomIn"
        onClick={onClick}
        className={
          'cursor-pointer h-[30px] w-[30px] glass !shadow-none select-none hover:bg-gray-100 border border-solid !border-gray-200 hover:scale-110 transition-all duration-300 rounded-full flex items-center justify-center'
        }
      >
        <Plus />
      </div>
      <div
        id="zoomOut"
        onClick={onClick}
        className={
          'cursor-pointer h-[30px] w-[30px] glass !shadow-none select-none hover:bg-gray-100 border border-solid !border-gray-200 hover:scale-110 transition-all duration-300 border-gray-200 rounded-full flex items-center justify-center'
        }
      >
        <Minus />
      </div>
    </div>
  );
};

export const usePanzoom = (elementId: string, setZoomLevel: any) => {
  const [panzoomInstance, setPanzoomInstance] = React.useState<PanZoom | null>(
    null
  );
  const [isZooming, setIsZooming] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);

  React.useEffect(() => {
    const scene = document.getElementById(elementId);

    if (scene) {
      const panzoomInstance = Panzoom(scene, {
        bounds: true,
        boundsPadding: 0.5,
        maxZoom: 6,
        zoomDoubleClickSpeed: 1,
        minZoom: 0.5,
        beforeWheel: function (e) {
          // allow wheel-zoom only if altKey is down. Otherwise - ignore
          var shouldIgnore = !e.altKey && !e.ctrlKey;
          return shouldIgnore;
        },
        beforeMouseDown: function (e) {
          // Ignore mouse events on buttons and their children
          const target = e.target as Element;
          const isButton = target.closest('button');
          return !!isButton; // Return true to ignore the event
        },
      });

      // panzoomInstance.on('transform', (e: any) => {
      //   // const zoomLevels = e.getTransform();

      //   // setPanAndZoomLevels(zoomLevels);
      // });

      panzoomInstance.on('zoom', (e: any) => {
        // console.log('zoomstart', e);
        setIsZooming(true);

        // Set a timeout to ensure the zoom animation is complete
        setTimeout(() => {
          setIsZooming(false);
        }, 600);
      });

      // panzoomInstance.on('zoomend', (e: any) => {
      //   console.log('zoomend', e);
      //   // setTimeout(() => {
      //   //   setIsZooming(false);
      //   // }, 300);
      //   // setIsZooming(false);
      // });

      // panzoomInstance.on('panstart', (e: any) => {
      //   console.log('panstart', e);
      //   // setIsPanning(true);
      // });

      // panzoomInstance.on('pan', (e: any) => {
      //   console.log('pan', e);
      // });

      // panzoomInstance.on('panend', (e: any) => {
      //   console.log('panend', e);
      //   // setIsPanning(false);
      // });

      panzoomInstance.on('transform', (e: any) => {
        const transform = e.getTransform();
        // console.log('transform', transform);

        if (transform.scale > 1.2) {
          setZoomLevel('zoomed-in');
        } else {
          setZoomLevel('zoomed-out');
        }
      });

      // Prevent double-click zoom by intercepting double-click events
      // scene.addEventListener('dblclick', (e) => {
      //   e.preventDefault();
      //   e.stopPropagation();
      // });

      setPanzoomInstance(panzoomInstance);

      return () => {
        setPanzoomInstance(null);
        panzoomInstance.dispose();
      };
    }
  }, [elementId]);

  return {
    panzoomInstance,
    isZooming,
    isPanning,
    interactionsLocked: isZooming || isPanning,
  };
};

// export const Venue = (props: Props) => {
//   const router = useRouter()
//   const isStandalone = useIsStandalone()
//   const [openFloors, setOpenFloors] = React.useState({} as { [key: string]: boolean })
//   const [listView, setListView] = React.useState(false)
//   const [search, setSearch] = React.useState('')

//   const filteredFloors = (
//     search
//       ? props.floors.filter(floor => {
//           if (floor.toLowerCase().includes(search.toLowerCase())) return true

//           const roomsByFloor = props.rooms.filter(i => i.info === floor)

//           return roomsByFloor.some(
//             room => room.name.toLowerCase().includes(search) || room.description.toLowerCase().includes(search)
//           )
//         })
//       : props.floors
//   ).sort((a, b) => b.localeCompare(a))
//   const basement = filteredFloors.shift()
//   if (basement) filteredFloors.push(basement)

//   function onSearch(nextVal: any) {
//     setSearch(nextVal)

//     if (!nextVal) {
//       setOpenFloors({})
//     } else {
//       filteredFloors.forEach(floor =>
//         setOpenFloors(openFloors => {
//           return {
//             ...openFloors,
//             [floor]: true,
//           }
//         })
//       )
//     }
//   }

//   return (
//     <>
//       <AppNav
//         nested
//         links={[
//           {
//             title: 'Venue Map',
//           },
//         ]}
//         renderRight={() => {
//           return (
//             <>
//               <Link
//                 style={{ display: 'flex' }}
//                 to="https://www.google.com/maps/place/Agora+Bogot%C3%A1+Convention+Center/@4.6299916,-74.0945735,17z/data=!3m1!4b1!4m5!3m4!1s0x8e3f9bd91908ed1d:0x23880f62017a68ac!8m2!3d4.6299916!4d-74.0923848"
//               >
//                 <IconDirections />
//               </Link>

//               <Link style={{ display: 'flex' }} to="/info#venue-guide">
//                 <IconInformation />
//               </Link>
//             </>
//           )
//         }}
//       />

//       {/* <div className={css['panzoom-cover']}>
//         <div className={css['image']} id="image-container">
//           <Image src={VenueMap} alt="venue map" layout="raw" />
//         </div>
//       </div> */}

//       <div className={`${filterCss['filter']} border-top`}>
//         <div className="section clear-bottom-less">
//           <div className={css['filter']}>
//             <Search className={css['search']} placeholder="Search venue" onChange={onSearch} value={search} />

//             <div className={css['end']}>
//               <button
//                 onClick={() => setListView(true)}
//                 className={`${listView ? 'hover' : ''} app squared sm thin-borders`}
//               >
//                 <ListIcon />
//               </button>
//               <button
//                 onClick={() => setListView(false)}
//                 className={`${listView ? '' : 'hover'} app squared sm thin-borders`}
//               >
//                 <TileIcon />
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="section clear-top-less">
//         {/* <h2 className="app-header clear-bottom-less">Floors</h2> */}

//         <div className={`${css['agora']}`}>
//           <div className={css['info']}>
//             <p className="app-header">Agora Bogotá Convention Center</p>
//             <Button className="red sm" onClick={() => router.push('/info#venue-guide')}>
//               Info
//             </Button>
//           </div>
//           <div className={css['image']}>
//             <Image alt="Agora Bogotá Convention Center" objectFit="cover" src={imageAgora} />
//           </div>
//         </div>

//         {listView &&
//           filteredFloors.map(floor => {
//             const roomsByFloor = props.rooms.filter(i => i.info === floor)

//             return (
//               <CollapsedSection
//                 key={floor}
//                 open={openFloors[floor]}
//                 setOpen={() => {
//                   const isOpen = openFloors[floor]
//                   const nextOpenState = {
//                     ...openFloors,
//                     [floor]: true,
//                   }

//                   if (isOpen) {
//                     delete nextOpenState[floor]
//                   }

//                   setOpenFloors(nextOpenState)
//                 }}
//               >
//                 <CollapsedSectionHeader>
//                   <p className="app-header">{floor}</p>
//                 </CollapsedSectionHeader>
//                 <CollapsedSectionContent>
//                   <div className="clear-top-less">
//                     <RoomList rooms={roomsByFloor} />
//                   </div>
//                 </CollapsedSectionContent>
//               </CollapsedSection>
//             )
//           })}

//         {!listView &&
//           filteredFloors.map(floor => {
//             return (
//               <Link
//                 to={isStandalone ? `/venue?floor=${defaultSlugify(floor)}` : `/venue/floor/${defaultSlugify(floor)}`}
//                 className={`${css['list-item']} clear-top-less`}
//                 key={floor}
//               >
//                 <div className={`padded bold app-header`}>{floor}</div>
//                 <div className={css['floor-image']}>{getFloorImage(floor, 'fill')}</div>
//               </Link>
//             )
//           })}
//       </div>
//     </>
//   )
// }
