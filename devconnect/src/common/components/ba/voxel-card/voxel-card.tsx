import React from 'react'
import Image from 'next/image'
import cn from 'classnames'
import styles from './voxel-card.module.scss'
import { motion, MotionProps } from 'framer-motion'

interface VoxelCardProps extends MotionProps {
  children: React.ReactNode
  image: any
  imageWide: any
  imageAlt: string
  tag: string
  tagClass: string
}

const VoxelCard: React.FC<VoxelCardProps> = ({
  children,
  imageWide,
  image,
  imageAlt,
  tag,
  tagClass,
  ...motionProps
}) => {
  return (
    <motion.div
      className={cn(
        'relative border border-solid border-b-[6px] border-b-[rgba(55,54,76,1)] border-box bg-white',
        styles['cut-corner']
      )}
      {...motionProps}
    >
      <div className="absolute top-[calc(100%-16px)] right-0 w-[16px] border border-solid border-b-[6px] border-b-[rgba(55,54,76,1)]"></div>
      <div className="absolute left-[calc(100%-16px)] h-[16px] bottom-0 border border-solid border-r-1 border-r-[rgba(55,54,76,1)]"></div>

      <div className="absolute top-0 right-0">
        <div
          className={cn(
            'p-0.5 px-2.5 text-[11px] border-solid border-b-4 font-semibold border-b-[rgba(228,89,127,1))] text-[rgba(36,36,54,1)] relative',
            tagClass
          )}
        >
          <span className="text-xs translate-y-[1px] block">{tag}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row relative w-full h-full self-stretch">
        <div className="w-full lg:max-w-[143px] shrink-0 relative self-stretch">
          <Image src={image} alt={imageAlt} className="object-cover h-full w-full hidden lg:block" />
          <Image src={imageWide} alt={imageAlt} className="object-cover h-full w-full block lg:hidden" />
        </div>

        <div className="px-[25px] relative flex items-center py-4">{children}</div>
      </div>
    </motion.div>
  )
}

export default VoxelCard
