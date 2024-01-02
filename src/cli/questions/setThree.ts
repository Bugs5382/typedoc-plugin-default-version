import inquirer from 'inquirer'

export const setThree = async (listTagsSelection: Array<{ name: string }>): Promise<{ selectedTags: string[] }> => {
  return await inquirer.prompt([
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
}
