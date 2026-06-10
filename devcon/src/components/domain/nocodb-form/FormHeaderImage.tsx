import Image from 'next/image'
import formHeader from 'assets/images/dc-8/form-header.jpg'

// Full-bleed banner shown at the top of the form card. It assumes it's the
// first child of the `p-8 rounded-2xl` form card: the negative margins cancel
// the card padding so the artwork runs edge-to-edge and the top corners are
// rounded to match the card. The artwork already includes the Devcon wordmark,
// so it replaces the standalone logo.
export function FormHeaderImage() {
  return (
    <Image
      src={formHeader}
      alt="Devcon VIII India"
      priority
      placeholder="blur"
      sizes="(max-width: 672px) 100vw, 672px"
      className="-mt-8 -mx-8 w-[calc(100%+4rem)] max-w-none h-auto rounded-t-2xl"
    />
  )
}
