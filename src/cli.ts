#!/usr/bin/env node

import fs from "fs";
import inquirer from 'inquirer'
import {createWriteStream} from "node:fs";
import path from "node:path";
import {CLI_PROGRESS} from "./cli/constants.js";
import { octokitInstance } from './cli/octokit.js'
import { parseOptions } from './cli/parseOptions.js'
import got from 'got'
import cliProgress from 'cli-progress'

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

  let mergedOwner
  mergedOwner = typeof process.env.GITHUB_USER !== 'undefined' ? process.env.GITHUB_USER : repoUsername
  if (typeof mergedOwner === 'undefined') {
    mergedOwner = typeof process.env.GITHUB_ORG !== 'undefined' ? process.env.GITHUB_ORG : repoOrg
  }

  // build the connection
  const gitHub = octokitInstance(typeof repoToken !== 'undefined' ? repoToken : process.env.NPM_TOKEN)

  let repos
  if (repoType === 'user') {
    repos = await gitHub.request(
      'GET /users/{username}/repos',
      {
        username: mergedOwner,
        type: 'owner'
      })
  } else {
    repos = await gitHub.request(
      'GET /orgs/{org}/repos',
      {
        org: mergedOwner
      })
  }

  // filter out all forked repos
  const validRepos = repos.data.filter(repo => !repo.fork)

  const listRepos = validRepos.map(repo => {
    return { id: repo.id, name: repo.name }
  })

  const listReposSelection = validRepos.map(repo => {
    return { name: repo.name, value: repo.name }
  })


  // Step 2: Select Repos
  const { selectedRepo } = await inquirer.prompt([
    {
      choices: listReposSelection,
      name: 'selectedRepo',
      message: 'Which repositories would you like to generate for?',
      type: 'list'
    }])


  const repoName = listRepos.find((item: { name: string; }) => item.name == selectedRepo)

  if (typeof repoName === 'undefined') {
    throw new Error('problem found.')
  }

  const listOfTags = await gitHub.request('GET /repos/{owner}/{repo}/tags', {
    owner: mergedOwner,
    repo: repoName.name
  })

  const listTags = listOfTags.data.map(tag => {
    return {name: tag.name, value: tag.tarball_url }
  })

  const listTagsSelection = listOfTags.data.map(tag => {
    return {name: tag.name }
  })

  // Step 3: Select Repos
  const { selectedTags } = await inquirer.prompt([
    {
      choices: listTagsSelection,
      name: 'selectedTags',
      message: 'Which tags would you like to generate for? Keep in mind if the tag has been previously generated, it will do it again, but it might not update your repository target since no data has changed. ',
      type: 'checkbox',
      validate: (result) => {
        if (result.length < 1) {
          return 'Error: Please select a repo name. If the repo does not exist, it will be created for you.'
        } else {
          return true
        }
      }
    }])

  // get the list of tarball we need to download to start processing
  const tarBalls = selectedTags.map((selectedTag: string) => {
    return listTags.find(tag => selectedTag === tag.name)
  })


  // Step 4: Ask if we are doing an automatic update to a Git branch, or local
  // Step 5: If branch, select the branch
  // Step 6: If the branch is not selected, do we create one?
  // Step 7: If we need to create one, what is the name of that branch?

  // Downloading and Processing!

  const cwd = path.join(process.cwd(), `temp`)
  fs.mkdirSync(cwd, { recursive: true })

  // Download Tarballs first
  tarBalls.forEach((tarBall: { value: got.GotUrl; name: any; }) => {
    const downloadStream = got.stream(tarBall.value);
    const fileWriterStream = createWriteStream(`temp/${tarBall.name}.gz`);

    const bar = new cliProgress.SingleBar({}, CLI_PROGRESS(`${tarBall.name}.gz`))
    bar.start(0, 0);

    downloadStream.on("downloadProgress", progress => {
      if (typeof progress.total !== 'number') {
        return
      }
      bar.setTotal(progress.total)
      bar.update(progress.transferred);
    })

    downloadStream.pipe(fileWriterStream)

    bar.stop()

  })

  // Extract Tar Balls

  // We need to check all the Extracted folders for typedoc.json
  // If it exists, great.
  // It was originally configured.

  // If not, we can't process it because we can not guarantee the entrypoint is even there and configured correctly.
  // Will have to add it to the 'manual' processing.
  // Make sure all the typedocs are the same.

  // Modify the out property on each one and then run local TypeDoc on it.

}

cli().catch((err) => {
  console.error(err)
  process.exit(1)
})
