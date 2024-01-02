import inquirer from 'inquirer'

export const setTwo = async (listReposSelection: Array<{ name: string, value: string }>): Promise<{ selectedRepo: string }> => {
  return await inquirer.prompt([
    {
      choices: listReposSelection,
      name: 'selectedRepo',
      message: 'Which repositories would you like to generate for?',
      type: 'list'
    }])
}
