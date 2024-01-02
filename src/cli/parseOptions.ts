import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

/**
 * Parse CLI options
 * @since 1.5.0
 */
export const parseOptions = async (): Promise<{
  branch: string
  createBranch: boolean
  dryRun: boolean
  generate: boolean
  repoOrg?: string
  token?: string
  skipCommit: boolean
}> => {
  const options = await yargs(hideBin(process.argv))
    .usage('Usage: $0 <cmd> [options]')
    .command('generate', 'Generate a Typedoc site for multiple versions of your code into a unified site. The export will be available for you to use do with you wish, or can be automatically committed to a branch in your repository.')
    .option('repoOrg', {
      alias: 'org',
      type: 'string',
      description: 'Enter the repository org or name.'
    })
    .option('token', {
      alias: 't',
      type: 'string',
      description: 'Provide an access token that can at minimum read the repository.'
    })
    .option('dry-run', {
      alias: 'd',
      type: 'boolean',
      default: false,
      description: 'Will skip the step of generation, but will go through all the other steps.'
    })
    .option('skip-commit', {
      alias: 'skip',
      type: 'boolean',
      default: false,
      description: 'Will skip committing to the repository on the target branch.'
    })
    .option('branch', {
      alias: 'b',
      type: 'string',
      default: 'main',
      description: 'The target branch that we will attempt to update.'
    })
    .option('create-branch', {
      alias: 'cb',
      type: 'boolean',
      default: false,
      description: 'The target branch, if not found, will be created.'
    })
    .option('h', {
      alias: 'help',
      description: 'display help message'
    })
    .strict()
    .wrap(250)
    .parseAsync()

  const generate = options._.map(String)

  return {
    branch: options.branch,
    createBranch: options.createBranch,
    dryRun: options.dryRun,
    generate: generate[0] === 'generate',
    repoOrg: options.repoOrg,
    skipCommit: options.skipCommit,
    token: options.token
  }
}
