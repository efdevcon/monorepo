export function isEmail(text: string): boolean {
  var regex = /\S+@\S+\.\S+/
  return regex.test(text)
}
