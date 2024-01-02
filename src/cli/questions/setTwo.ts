import inquirer from "inquirer";

export const setTwo = async(listReposSelection: {name: string, value: string}[]): Promise<any> => {
  return inquirer.prompt([
    {
      choices: listReposSelection,
      name: 'selectedRepo',
      message: 'Which repositories would you like to generate for?',
      type: 'list'
    }])
}