export function started(assistant: any) {
  console.log(`[player] Assistant started — ready to play poker.`)
}

export function response(text: string, assistant: any) {
  // Log each response for debugging / hand history review
  const timestamp = new Date().toISOString()
  console.log(`[player ${timestamp}] Response received (${text.length} chars)`)
}

export function toolCall(name: string, args: any) {
  if (name === 'runScript') {
    console.log(`[player] Running script: ${args.description || '(no description)'}`)
  }
}

export function error(err: any) {
  console.error(`[player] Error:`, err?.message || err)
}
