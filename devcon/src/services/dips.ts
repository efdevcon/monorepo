import { Contributor, DIP } from 'types/DIP'

const fetchContributors = () => {
  return fetch('https://api.devcon.org/dips/contributors')
    .then(resp => resp.json())
    .then(dips => dips.data)
}

const fetchDips = () => {
  return fetch('https://api.devcon.org/dips')
    .then(resp => resp.json())
    .then(dips => dips.data)
}

export async function GetContributors(): Promise<Array<Contributor>> {
  return fetchContributors()
}

export async function GetDIPs(): Promise<Array<DIP>> {
  return fetchDips()
}
