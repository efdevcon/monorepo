import React from 'react'
import Image from 'next/image'
import cn from 'classnames'
import styles from './voxel-card.module.scss'

interface VoxelCardProps {
  children: React.ReactNode
  image: any
  imageAlt: string
  tag: string
  tagClass: string
}

const VoxelCard: React.FC<VoxelCardProps> = ({ children, image, imageAlt, tag, tagClass }) => {
  return (
    <div
      className={cn(
        'relative border border-solid border-b-4 border-b-[rgba(55,54,76,1)] border-box bg-white',
        styles['cut-corner']
      )}
    >
      <div className="absolute top-[calc(100%-16px)] right-0 w-[16px] border border-solid border-b-4 border-b-[rgba(55,54,76,1)]"></div>
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

      <div className="flex h-[194px] relative w-full">
        <div className="aspect-[143/194] relative shrink-0">
          <Image src={image} alt={imageAlt} fill className="object-cover h-full w-full " />
        </div>

        <div className="px-[25px] relative flex items-center">{children}</div>
      </div>
    </div>
  )
}

export default VoxelCard
