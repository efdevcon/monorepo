/**
 * The kiosk tells the updater when a session in its room starts or ends soon
 * (silentUpdate.changeoverNear), so a quiet app update never reloads the TV
 * mid-changeover. Module state: one kiosk per page.
 */
let changeoverNear = false;

export function setKioskChangeoverNear(near: boolean): void {
  changeoverNear = near;
}

export function isKioskChangeoverNear(): boolean {
  return changeoverNear;
}
