#!/usr/bin/env node

import fs from 'fs'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import got from 'got'
import cliProgress from 'cli-progress'
import { CLI_PROGRESS } from './helpers/constants.js'
import { octokitInstance } from './helpers/octokit.js'
import { parseOptions } from './cli/parseOptions.js'
import * as Questions from './cli/questions/index.js'

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

  const mergedOwner = typeof setOneAnswers.repoUsername !== 'undefined' ? setOneAnswers.repoUsername : setOneAnswers.repoToken

  // build the connection
  const gitHub = octokitInstance(setOneAnswers.repoToken)

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

  const repoName = listRepos.find((item: { name: string }) => item.name === setTwoAnswers.selectedRepo)

  if (typeof repoName === 'undefined') {
    throw new Error('Problem found.')
  }

  const listOfTags = await gitHub.request('GET /repos/{owner}/{repo}/tags', {
    owner: mergedOwner,
    repo: repoName.name
  })

  const listTags = listOfTags.data.map(tag => {
    return { name: tag.name, value: tag.tarball_url }
  })

  const listTagsSelection = listOfTags.data.map(tag => {
    return { name: tag.name }
  })

  // Step 3: Select Repos
  const setThreeAnswers = await Questions.setThree(listTagsSelection)

  // get the list of tarball we need to download to start processing
  const tarBalls = setThreeAnswers.selectedTags.map(tagItem => {
    return listTags.find(tag => tagItem === tag.name)
  })

  // Step 4: Ask if we are doing an automatic update to a Git branch, or local
  // Step 5: If branch, select the branch
  // Step 6: If the branch is not selected, do we create one?
  // Step 7: If we need to create one, what is the name of that branch?

  // Downloading and Processing!

  const cwd = path.join(process.cwd(), 'temp')
  fs.mkdirSync(cwd, { recursive: true })

  // Download Tarballs first
  tarBalls.forEach((tarBall) => {
    if (typeof tarBall !== 'undefined') {
      const downloadStream = got.stream(tarBall.value)
      const fileWriterStream = createWriteStream(`temp/${tarBall.name}.gz`)

      const bar = new cliProgress.SingleBar({}, CLI_PROGRESS(`${tarBall.name}.gz`))
      bar.start(0, 0)

      downloadStream.on('downloadProgress', progress => {
        if (typeof progress.total !== 'number') {
          return
        }
        bar.setTotal(progress.total)
        bar.update(progress.transferred)
      })

      downloadStream.pipe(fileWriterStream)

      bar.stop()
    }
  })

  // Extract Tar Balls

  // We need to check all the Extracted folders for typedoc.json
  // If it exists, great.
  // It was originally configured.

  // If not, we can't process it because we can not guarantee the entrypoint is even there and configured correctly.
  // Will have to add it to the 'manual' processing.
  // Make sure all the TypeDocs are the same.

  // Modify the out property on each one and then run local TypeDoc on it.
}

cli().catch((err) => {
  console.error(err)
  process.exit(1)
})
