export const leftPad = (number: string) => {
  if (parseInt(number, 10) < 10) {
    return '0' + number
  }

  return number
}
