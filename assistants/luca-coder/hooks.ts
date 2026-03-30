export function created(assistant) {
	assistant.use(
		container.feature('skillsLibrary'),
	)
}

export async function started() {
	await container.feature('skillsLibrary').start()
}
