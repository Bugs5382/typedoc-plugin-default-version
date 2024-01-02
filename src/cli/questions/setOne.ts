import inquirer from 'inquirer'

export const setOne = async (options: any): Promise<{ repoUsername: string, repoOrg: string, repoToken: string, repoType: string }> => {
  return await inquirer.prompt([
    {
      choices: [
        { name: 'Organizational', value: 'org' },
        { name: 'User', value: 'user' }
      ],
      default: 1,
      name: 'repoType',
      message: 'GitHub Type of Repo:',
      type: 'list',
      filter (val: string) {
        return val.toLowerCase()
      }
    }, {
      type: 'input',
      name: 'repoUsername',
      message: 'Enter GitHub Username:',
      default: typeof options.repoUsername !== 'undefined' ? options.repoUsername : process.env.GITHUB_USER,
      when: (answers) => answers.repoType === 'user' && (typeof options.repoUsername === 'undefined' || typeof process.env.GITHUB_USER === 'undefined')
    }, {
      type: 'input',
      name: 'repoOrg',
      message: 'Enter GitHub Org:',
      default: typeof options.repoOrg !== 'undefined' ? options.repoOrg : process.env.GITHUB_ORG,
      when: (answers) => answers.repoType === 'org' && (typeof options.repoOrg === 'undefined' || typeof process.env.GITHUB_ORG === 'undefined')
    }, {
      type: 'password',
      name: 'repoToken',
      message: 'Enter Valid Token:',
      default: typeof options.token !== 'undefined' ? options.token : process.env.NPM_TOKEN,
      when: typeof options.token === 'undefined' && typeof process.env.NPM_TOKEN === 'undefined'
    }
  ]
  )
}
