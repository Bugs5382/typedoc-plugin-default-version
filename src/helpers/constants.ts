export const CLI_PROGRESS = (area: string): any => {
  return {
    format: `${area} {bar}\u25A0 {percentage}% | ETA: {eta}s | {value}/{total}`,
    barCompleteChar: '\u25A0',
    barIncompleteChar: ' '
  }
}