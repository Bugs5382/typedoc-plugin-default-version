import inquirer from "inquirer";

export const setOne = async(options: any): Promise<any> => {

  return inquirer.prompt([
    {
      choices: [
        {name: 'Organizational', value: 'org'},
        {name: 'User', value: 'user'}
      ],
      default: 1,
      name: 'repoType',
      message: 'GitHub Type of Repo:',
      type: 'list',
      filter(val: string) {
        return val.toLowerCase()
      }
    }, {
      type: 'input',
      name: 'repoUsername',
      message: 'Enter GitHub Username:',
      when: (answers) => answers.repoType === 'user' && typeof process.env.GITHUB_USER === 'undefined' || typeof options.repoUsername !== 'undefined'
    }, {
      type: 'input',
      name: 'repoOrg',
      message: 'Enter GitHub Org:',
      when: (answers) => answers.repoType === 'org' && typeof process.env.GITHUB_ORG === 'undefined' || typeof options.repoOrg !== 'undefined'
    }, {
      type: 'password',
      name: 'repoToken',
      message: 'Enter Valid Token: ',
      when: typeof options.token === 'undefined' && typeof process.env.NPM_TOKEN === 'undefined'
    }]
  );

}