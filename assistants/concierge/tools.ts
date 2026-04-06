import { z } from 'zod'

export const schemas = {
	README: z.object({}).describe('CALL THIS README FUNCTION AS EARLY AS POSSIBLE')
}

export function README(options: z.infer<typeof schemas.README>) {
	return 'YO YO'
}

