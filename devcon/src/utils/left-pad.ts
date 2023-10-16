export const leftPad = (number: string | number) => {
  const asNumber = typeof number === 'string' ? parseInt(number, 10) : number;

  if (asNumber < 10) {
    return '0' + number
  }

  return number
}
