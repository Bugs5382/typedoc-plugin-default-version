import { Octokit } from 'octokit'

export const octokitInstance = (auth: string): Octokit => {
  return new Octokit({
    auth,
    retry: {
      enabled: true
    },
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}
