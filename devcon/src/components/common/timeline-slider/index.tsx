import React, { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import css from './timeline-slider.module.scss'
import cn from 'classnames'

type Event = {
  name: string
  location: string
  year: number
  isNext?: boolean
}

const events: Event[] = [
  { name: 'Devcon 0', location: 'Berlin', year: 2014 },
  { name: 'Devcon 1', location: 'London', year: 2015 },
  { name: 'Devcon 2', location: 'Shanghai', year: 2016 },
  { name: 'Devcon 3', location: 'Cancún', year: 2017 },
  { name: 'Devcon 4', location: 'Prague', year: 2018 },
  { name: 'Devcon 5', location: 'Osaka', year: 2019 },
  { name: 'Devconnect AMS', location: 'Amsterdam', year: 2022 },
  { name: 'Devcon 6', location: 'Bogotá', year: 2022 },
  { name: 'Devconnect IST', location: 'Istanbul', year: 2023 },
  { name: 'Devcon 7', location: 'Bangkok', year: 2024 },
  { name: 'Devconnect ARG', location: 'Buenos Aires', year: 2025 },
  { name: 'Devcon 8', location: 'Mumbai', year: 2026, isNext: true },
]

export const TimelineSlider = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: false,
  })

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index)
    },
    [emblaApi]
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return

    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)

    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  // Scroll to the "next edition" event on mount
  useEffect(() => {
    if (!emblaApi) return
    const nextIndex = events.findIndex(e => e.isNext)
    if (nextIndex !== -1) {
      emblaApi.scrollTo(nextIndex, true)
    }
  }, [emblaApi])

  return (
    <div className={css['timeline-container']}>
      <button
        className={cn(css['nav-button'], css['nav-button-prev'], !canScrollPrev && css['disabled'])}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Previous events"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className={css['timeline-line']} />
      <div className={css['timeline-wrapper']} ref={emblaRef}>
        <div className={css['timeline-track']}>
          {events.map((event, index) => (
            <button
              key={index}
              className={cn(css['timeline-item'], selectedIndex === index && css['selected'])}
              onClick={() => scrollTo(index)}
              type="button"
            >
              {event.isNext && <div className={css['next-badge']}>Next edition</div>}
              <div className={cn(css['timeline-dot'], selectedIndex === index && css['active'])} />
              <div className={css['event-info']}>
                <div className={css['event-name']}>{event.name}</div>
                <div className={css['event-location']}>
                  {event.location}, {event.year}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        className={cn(css['nav-button'], css['nav-button-next'], !canScrollNext && css['disabled'])}
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Next events"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

export default TimelineSlider
