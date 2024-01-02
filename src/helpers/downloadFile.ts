import cliProgress from 'cli-progress'
import got from 'got'
import { createWriteStream } from 'node:fs'
import { CLI_PROGRESS } from './constants.js'

export const downloadFile = async (fileUrl: { value: string, name: string }): Promise<void> => {
  const downloadStream = got.stream(fileUrl.value)
  const fileWriterStream = createWriteStream(`temp/${fileUrl.name}.gz`)

  const bar = new cliProgress.SingleBar({}, CLI_PROGRESS(`${fileUrl.name}.gz`))
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
