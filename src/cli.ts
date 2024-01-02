#!/usr/bin/env node

import fs from "fs";
import inquirer from 'inquirer'
import {createWriteStream} from "node:fs";
import path from "node:path";
import got from 'got'
import cliProgress from 'cli-progress'
import {CLI_PROGRESS} from "./helpers/constants.js";
import { octokitInstance } from './helpers/octokit.js'
import { parseOptions } from './cli/parseOptions.js'
import * as Questions from "./cli/questions/index.js";

/**
 * Main Executable Function
 * @description Runs by default.
 * @since 1.0.0
 */
export const cli = async (): Promise<void> => {
  // get options
  const options = await parseOptions()

  // Step 1: Gather Repos
  const setOneAnswers = await Questions.setOne(options)

  let mergedOwner
  mergedOwner = typeof process.env.GITHUB_USER !== 'undefined' ? process.env.GITHUB_USER : setOneAnswers.repoUsername
  if (typeof mergedOwner === 'undefined') {
    mergedOwner = typeof process.env.GITHUB_ORG !== 'undefined' ? process.env.GITHUB_ORG : setOneAnswers.repoOrg
  }

  // build the connection
  const gitHub = octokitInstance(typeof setOneAnswers.repoToken !== 'undefined' ? setOneAnswers.repoToken : process.env.NPM_TOKEN)

  let repos
  if (setOneAnswers.repoType === 'user') {
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
  const setTwoAnswers = await Questions.setTwo(listReposSelection)

  const repoName = listRepos.find((item: { name: string; }) => item.name == setTwoAnswers.selectedRepo)

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
