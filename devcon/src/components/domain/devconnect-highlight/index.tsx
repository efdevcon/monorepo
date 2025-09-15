import { Dialog, DialogTrigger, DialogContent } from 'lib/components/ui/dialog'
import Button from 'lib/components/voxel-button/button'
import { useState } from 'react'
import DevconnectHighlightImage from './hero.jpg'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
// import CubeLogo from './cube-logo.png'
// import LogoText from './LogoText'
import DevconnectLogoWithText from './DevconnectLogoWithText'

export default function DevconnectHighlight() {
  const [open, setOpen] = useState(true)

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!bg-transparent border-none flex flex-col items-center justify-center">
          <div
            className="relative p-8 lg:p-24 rounded-lg w-[900px] max-w-[90vw] shadow-lg border border-solid
           border-white/40"
          >
            {/* <Image src={CubeLogo} alt="Devconnect Cube Logo" className="absolute bottom-0 left-0 w-[80px] m-4 z-10" />
            <LogoText className="absolute right-0 top-0 z-10 m-2 mr-4" /> */}
            <Image
              src={DevconnectHighlightImage}
              alt="Devconnect Highlight"
              fill
              className="object-cover w-full h-full rounded-lg"
            />
            <div className="absolute inset-0 bg-black/65 rounded-lg"></div>
            <div className="relative z-10 text-white flex flex-col h-full items-center justify-center">
              <DevconnectLogoWithText className="w-48 h-auto mb-6" />
              <div className="text-xl font-semibold font-secondary">
                Devconnect ARG is coming to Buenos Aires on November 17, 2025!
              </div>
              <div className="text-sm text-center mt-2">
                Devconnect ARG is the Ethereum World's Fair: A showcase of apps and an event to connect, build, and
                accelerate Ethereum adoption.
              </div>
              <Button className="mt-8 gap-2 text-sm">
                Visit Devconnect.org <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div
            className="text-center text-white cursor-pointer mt-2 font-medium text-sm"
            onClick={() => setOpen(false)}
          >
            Continue to the Devcon Website
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
