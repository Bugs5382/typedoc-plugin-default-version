#!/usr/bin/env node

import fs from 'fs'
import inquirer from 'inquirer'
import path from 'node:path'
import { downloadFile } from './helpers/downloadFile.js'
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
  // @ts-expect-error
  const { branchCommit } = await inquirer.prompt([
    {
      name: 'branchCommit',
      message: typeof options.branch !== 'undefined' ? `Are we going to commit to the target branch (${options.branch}) automatically?` : 'Are we going to commit to a branch (to be determined) automatically?',
      default: options.skipCommit,
      type: 'confirm'
    }])

  // Step 5: Select the target branch,
  // get the remote branches, and if the 'branch' option matches one of the remote branches, set it as the default
  const listOfBranches = await gitHub.request('GET /repos/{owner}/{repo}/branches', {
    owner: mergedOwner,
    repo: repoName.name
  })

  const listOfBranchesSelection = listOfBranches.data.map(branch => {
    return { name: branch.name }
  })

  const { branchTarget } = await inquirer.prompt([
    {
      choices: ['none', ...listOfBranchesSelection],
      name: 'branchTarget',
      message: 'Select target branch:',
      default: !isNaN(listOfBranchesSelection.findIndex(branch => branch.name === options.branch)) ? listOfBranchesSelection.findIndex(branch => branch.name === options.branch) : 0,
      type: 'list'
    }])

  // Step 6: If the branch is not selected, do we create one?
  // Step 7: If we need to create one, what is the name of that branch?
  if (branchTarget === 'none') {
    // @ts-expect-error
    const { branchName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'branchName',
        message: 'Target Branch Name:',
        default: typeof options.branch !== 'undefined' ? options.branch : 'gh-pages',
        when: () => branchTarget === 'none' && typeof options.branch === 'undefined',
        validate: (result) => {
          if (result === '') {
            return 'Error: Please enter a branch name. Control-X to exit.'
          } else {
            if (listOfBranchesSelection.findIndex(branch => branch.name === result) > -1) {
              return 'Error: Please enter a branch name that does not exist. Control-X to exit.'
            }
            return true
          }
        }
      }])

    // console.log(branchName)
  }

  // @ts-ignore
  const { workingFolder, dryRun, finalConfirmation } = await inquirer.prompt([
    {
      type: 'input',
      name: 'workingFolder',
      message: 'The temp folder that is created in your current working folder to do this work. It will include a Git repo that where all the magic will happen.',
      default: 'temp',
      validate: (result) => {
        if (result === '') {
          return 'Error: Please enter a folder name. Control-X to exit.'
        } else {
          return true
        }
      }
    }, {
      name: 'dryRun',
      message: 'DRY RUN: This will do all steps other than running `git commit` and `git push`:',
      default: options.dryRun,
      type: 'confirm'
    }, {
      name: 'finalConfirmation',
      message: 'Confirm your selections above are correct above. Are they?',
      default: false,
      type: 'confirm'
    }])

  if (finalConfirmation === false) {
    process.exit()
  }

  // Downloading and Processing!
  const cwd = path.join(process.cwd(), workingFolder)
  fs.mkdirSync(cwd, { recursive: true })

  // Download Tarballs first
  for (const tarBall of tarBalls) {
    if (typeof tarBall !== 'undefined') {
      await downloadFile(tarBall)
    }
  }

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
