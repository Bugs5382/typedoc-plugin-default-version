#!/usr/bin/env node

import inquirer from 'inquirer'
import { octokitInstance } from './cli/octokit.js'
import { parseOptions } from './cli/parseOptions.js'
import { Repo } from './decoraters/types.js'

/**
 * Main Executable Function
 * @description Runs by default.
 * @since 1.0.0
 */
export const cli = async (): Promise<void> => {
  // get options
  const options = await parseOptions()

  // Step 1: Gather Repos
  const { repoType, repoUsername, repoOrg, repoToken } =
    await inquirer.prompt([
      {
        choices: [
          { name: 'Organizational', value: 'org' },
          { name: 'User', value: 'user' }
        ],
        default: 1,
        name: 'repoType',
        message: 'GitHub Type of Repo:',
        type: 'list',
        filter (val: string) { return val.toLowerCase() }
      }, {
        type: 'input',
        name: 'repoUsername',
        message: 'Enter GitHub Username:',
        when: (answers) => answers.repoType === 'user' && typeof process.env.GITHUB_USER === 'undefined'
      }, {
        type: 'input',
        name: 'repoOrg',
        message: 'Enter GitHub Org:',
        when: (answers) => answers.repoType === 'org' && typeof process.env.GITHUB_ORG === 'undefined'
      }, {
        type: 'password',
        name: 'repoToken',
        message: 'Enter Valid Token: ',
        when: typeof options.token === 'undefined' && typeof process.env.NPM_TOKEN === 'undefined'
      }]
    )

  // build the connection
  const gitHub = octokitInstance(typeof repoToken !== 'undefined' ? repoToken : process.env.NPM_TOKEN)

  let repos
  if (repoType === 'user') {
    repos = await gitHub.request(
      'GET /users/{username}/repos',
      {
        username: typeof repoUsername !== 'undefined' ? repoUsername : process.env.GITHUB_USER,
        type: 'owner'
      })
  } else {
    repos = await gitHub.request(
      'GET /orgs/{org}/repos',
      {
        org: repoOrg
      })
  }

  // filter out all forked repos
  const validRepos = repos.data.filter(repo => !repo.fork)
  const list: Repo[] = []
  validRepos.forEach(repo => {
    list.push({ id: repo.id, name: repo.name })
  })

  // Step 2: Select Repos
  const { selectedRepo } = await inquirer.prompt([
    {
      choices: list,
      name: 'selectedRepo',
      message: 'Which repositories would you like to generate for?',
      type: 'checkbox'
    }])

  console.log(selectedRepo)
}

cli().catch((err) => {
  console.error(err)
  process.exit(1)
})
