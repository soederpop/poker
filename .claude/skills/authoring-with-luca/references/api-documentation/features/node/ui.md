# UI (features.ui)

UI Feature - Interactive Terminal User Interface Builder This feature provides comprehensive tools for creating beautiful, interactive terminal experiences. It combines several popular libraries (chalk, figlet, inquirer) into a unified interface for building professional CLI applications with colors, ASCII art, and interactive prompts. **Core Capabilities:** - Rich color management using chalk library - ASCII art generation with multiple fonts - Interactive prompts and wizards - Automatic color assignment for consistent theming - Text padding and formatting utilities - Gradient text effects (horizontal and vertical) - Banner creation with styled ASCII art **Color System:** - Full chalk API access for complex styling - Automatic color assignment with palette cycling - Consistent color mapping for named entities - Support for hex colors and gradients **ASCII Art Features:** - Multiple font options via figlet - Automatic font discovery and caching - Banner creation with color gradients - Text styling and effects **Interactive Elements:** - Wizard creation with inquirer integration - External editor integration - User input validation and processing **Usage Examples:** **Basic Colors:** ```typescript const ui = container.feature('ui'); // Direct color usage ui.print.red('Error message'); ui.print.green('Success!'); // Complex styling console.log(ui.colors.blue.bold.underline('Important text')); ``` **ASCII Art Banners:** ```typescript const banner = ui.banner('MyApp', { font: 'Big', colors: ['red', 'white', 'blue'] }); console.log(banner); ``` **Interactive Wizards:** ```typescript const answers = await ui.wizard([ { type: 'input', name: 'name', message: 'Your name?' }, { type: 'confirm', name: 'continue', message: 'Continue?' } ]); ``` **Automatic Color Assignment:** ```typescript const userColor = ui.assignColor('john'); const adminColor = ui.assignColor('admin'); console.log(userColor('John\'s message')); console.log(adminColor('Admin notice')); ```

## Usage

```ts
container.feature('ui')
```

## Methods

### markdown

Parse markdown text and render it for terminal display using marked-terminal.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The markdown string to parse and render |

**Returns:** `void`



### assignColor

Assigns a consistent color to a named entity. This method provides automatic color assignment that remains consistent across the application session. Each unique name gets assigned a color from the palette, and subsequent calls with the same name return the same color function. **Assignment Strategy:** - First call with a name assigns the next available palette color - Subsequent calls return the previously assigned color - Colors cycle through the palette when all colors are used - Returns a chalk hex color function for styling text

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The unique identifier to assign a color to |

**Returns:** `(str: string) => string`

```ts
// Assign colors to users
const johnColor = ui.assignColor('john');
const janeColor = ui.assignColor('jane');

// Use consistently throughout the app
console.log(johnColor('John: Hello there!'));
console.log(janeColor('Jane: Hi John!'));
console.log(johnColor('John: How are you?')); // Same color as before

// Different entities get different colors
const errorColor = ui.assignColor('error');
const successColor = ui.assignColor('success');
```



### wizard

Creates an interactive wizard using inquirer prompts. This method provides a convenient wrapper around inquirer for creating interactive command-line wizards. It supports all inquirer question types and can handle complex validation and conditional logic. **Supported Question Types:** - input: Text input fields - confirm: Yes/no confirmations - list: Single selection from options - checkbox: Multiple selections - password: Hidden text input - editor: External editor integration **Advanced Features:** - Conditional questions based on previous answers - Input validation and transformation - Custom prompts and styling - Initial answer pre-population

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `questions` | `any[]` | ✓ | Array of inquirer question objects |
| `initialAnswers` | `any` |  | Pre-populated answers to skip questions or provide defaults |

**Returns:** `void`

```ts
// Basic wizard
const answers = await ui.wizard([
 {
   type: 'input',
   name: 'projectName',
   message: 'What is your project name?',
   validate: (input) => input.length > 0 || 'Name is required'
 },
 {
   type: 'list',
   name: 'framework',
   message: 'Choose a framework:',
   choices: ['React', 'Vue', 'Angular', 'Svelte']
 },
 {
   type: 'confirm',
   name: 'typescript',
   message: 'Use TypeScript?',
   default: true
 }
]);

console.log(`Creating ${answers.projectName} with ${answers.framework}`);

// With initial answers
const moreAnswers = await ui.wizard([
 { type: 'input', name: 'version', message: 'Version?' }
], { version: '1.0.0' });
```



### askQuestion

Prompt the user with a single text input question.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `question` | `string` | ✓ | The question message to display |

**Returns:** `void`



### openInEditor

Opens text in the user's external editor for editing. This method integrates with the user's configured editor (via $EDITOR or $VISUAL environment variables) to allow editing of text content. The edited content is returned when the user saves and closes the editor. **Editor Integration:** - Respects $EDITOR and $VISUAL environment variables - Creates temporary file with specified extension - Returns modified content after editor closes - Handles editor cancellation gracefully

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The initial text content to edit |
| `extension` | `any` |  | File extension for syntax highlighting (default: ".ts") |

**Returns:** `void`

```ts
// Edit code snippet
const code = `function hello() {\n  console.log('Hello');\n}`;
const editedCode = await ui.openInEditor(code, '.js');

// Edit configuration
const config = JSON.stringify({ port: 3000 }, null, 2);
const newConfig = await ui.openInEditor(config, '.json');

// Edit markdown content
const markdown = '# Title\n\nContent here...';
const editedMarkdown = await ui.openInEditor(markdown, '.md');
```



### asciiArt

Generates ASCII art from text using the specified font. This method converts regular text into stylized ASCII art using figlet's extensive font collection. Perfect for creating eye-catching headers, logos, and decorative text in terminal applications. **Font Capabilities:** - Large collection of artistic fonts - Various styles: block, script, decorative, technical - Different sizes and character sets - Consistent spacing and alignment

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The text to convert to ASCII art |
| `font` | `Fonts` | ✓ | The figlet font to use (see fonts property for available options) |

**Returns:** `void`

```ts
// Create a banner
const banner = ui.asciiArt('WELCOME', 'Big');
console.log(banner);

// Different fonts for different purposes
const title = ui.asciiArt('MyApp', 'Standard');
const subtitle = ui.asciiArt('v2.0', 'Small');

// Technical/coding themes
const code = ui.asciiArt('CODE', '3D-ASCII');

// List available fonts first
console.log('Available fonts:', ui.fonts.slice(0, 10).join(', '));
```



### banner

Creates a styled banner with ASCII art and color gradients. This method combines ASCII art generation with color gradient effects to create visually striking banners for terminal applications. It automatically applies color gradients to the generated ASCII art based on the specified options. **Banner Features:** - ASCII art text generation - Automatic color gradient application - Customizable gradient directions - Multiple color combinations - Professional terminal presentation

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The text to convert to a styled banner |
| `options` | `{ font: Fonts; colors: Color[] }` |  | Banner styling options |

`{ font: Fonts; colors: Color[] }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `font` | `any` | The figlet font to use for ASCII art generation |
| `colors` | `any` | Array of colors for the gradient effect |

**Returns:** `void`

```ts
// Classic patriotic banner
const banner = ui.banner('AMERICA', {
 font: 'Big',
 colors: ['red', 'white', 'blue']
});
console.log(banner);

// Tech company banner
const techBanner = ui.banner('TechCorp', {
 font: 'Slant',
 colors: ['cyan', 'blue', 'magenta']
});

// Warning banner
const warningBanner = ui.banner('WARNING', {
 font: 'Standard',
 colors: ['yellow', 'red']
});

// Available fonts: see ui.fonts property
// Available colors: any chalk color names
```



### endent

Dedent and format a tagged template literal using endent. Strips leading indentation while preserving relative indentation.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `args` | `any[]` | ✓ | Tagged template literal arguments |

**Returns:** `void`



### applyGradient

Applies color gradients to text with configurable direction. This method creates smooth color transitions across text content, supporting both horizontal (character-by-character) and vertical (line-by-line) gradients. Perfect for creating visually appealing terminal output and ASCII art effects. **Gradient Types:** - Horizontal: Colors transition across characters in each line - Vertical: Colors transition across lines of text - Customizable color sequences and transitions - Automatic color cycling for long content

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The text content to apply gradients to |
| `lineColors` | `Color[]` |  | Array of colors to cycle through in the gradient |
| `direction` | `"horizontal" | "vertical"` |  | Gradient direction: 'horizontal' or 'vertical' |

**Returns:** `void`

```ts
// Horizontal rainbow effect
const rainbow = ui.applyGradient('Hello World!', 
 ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'], 
 'horizontal'
);

// Vertical gradient for multi-line text
const multiline = 'Line 1\nLine 2\nLine 3\nLine 4';
const vertical = ui.applyGradient(multiline, 
 ['red', 'white', 'blue'], 
 'vertical'
);

// Fire effect
const fire = ui.applyGradient('FIRE', ['red', 'yellow'], 'horizontal');

// Ocean effect
const ocean = ui.applyGradient('OCEAN', ['blue', 'cyan', 'white'], 'vertical');
```



### applyHorizontalGradient

Applies horizontal color gradients character by character. This method creates color transitions across characters within the text, cycling through the provided colors to create smooth horizontal gradients. Each character gets assigned a color based on its position in the sequence. **Horizontal Gradient Behavior:** - Each character is individually colored - Colors cycle through the provided array - Creates smooth transitions across text width - Works well with ASCII art and single lines

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The text to apply horizontal gradients to |
| `lineColors` | `Color[]` |  | Array of colors to cycle through |

**Returns:** `void`

```ts
// Rainbow effect across characters
const rainbow = ui.applyHorizontalGradient('RAINBOW', 
 ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta']
);

// Simple two-color transition
const sunset = ui.applyHorizontalGradient('SUNSET', ['red', 'orange']);

// Great for short text and ASCII art
const art = ui.asciiArt('COOL', 'Big');
const coloredArt = ui.applyHorizontalGradient(art, ['cyan', 'blue']);
```



### applyVerticalGradient

Applies vertical color gradients line by line. This method creates color transitions across lines of text, with each line getting a different color from the sequence. Perfect for multi-line content like ASCII art, banners, and structured output. **Vertical Gradient Behavior:** - Each line is colored uniformly - Colors cycle through the provided array - Creates smooth transitions across text height - Ideal for multi-line ASCII art and structured content

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The text to apply vertical gradients to (supports newlines) |
| `lineColors` | `Color[]` |  | Array of colors to cycle through for each line |

**Returns:** `void`

```ts
// Patriotic vertical gradient
const flag = 'USA\nUSA\nUSA\nUSA';
const patriotic = ui.applyVerticalGradient(flag, ['red', 'white', 'blue']);

// Sunset effect on ASCII art
const banner = ui.asciiArt('SUNSET', 'Big');
const sunset = ui.applyVerticalGradient(banner, 
 ['yellow', 'orange', 'red', 'purple']
);

// Ocean waves effect
const waves = 'Wave 1\nWave 2\nWave 3\nWave 4\nWave 5';
const ocean = ui.applyVerticalGradient(waves, ['cyan', 'blue']);
```



### padLeft

Pads text on the left to reach the specified length. This utility method adds padding characters to the left side of text to achieve a desired total length. Useful for creating aligned columns, formatted tables, and consistent text layout in terminal applications. **Padding Behavior:** - Adds padding to the left (start) of the string - Uses specified padding character (default: space) - Returns original string if already at or beyond target length - Handles multi-character padding by repeating the character

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `str` | `string` | ✓ | The string to pad |
| `length` | `number` | ✓ | The desired total length after padding |
| `padChar` | `any` |  | The character to use for padding (default: " ") |

**Returns:** `void`

```ts
// Number alignment
const numbers = ['1', '23', '456'];
numbers.forEach(num => {
 console.log(ui.padLeft(num, 5, '0')); // '00001', '00023', '00456'
});

// Text alignment in columns
const items = ['apple', 'banana', 'cherry'];
items.forEach(item => {
 console.log(ui.padLeft(item, 10) + ' | Price: $1.00');
});

// Custom padding character
const title = ui.padLeft('TITLE', 20, '-'); // '---------------TITLE'
```



### padRight

Pads text on the right to reach the specified length. This utility method adds padding characters to the right side of text to achieve a desired total length. Essential for creating properly aligned columns, tables, and formatted output in terminal applications. **Padding Behavior:** - Adds padding to the right (end) of the string - Uses specified padding character (default: space) - Returns original string if already at or beyond target length - Handles multi-character padding by repeating the character

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `str` | `string` | ✓ | The string to pad |
| `length` | `number` | ✓ | The desired total length after padding |
| `padChar` | `any` |  | The character to use for padding (default: " ") |

**Returns:** `void`

```ts
// Create aligned table columns
const data = [
 ['Name', 'Age', 'City'],
 ['John', '25', 'NYC'],
 ['Jane', '30', 'LA'],
 ['Bob', '35', 'Chicago']
];

data.forEach(row => {
 const formatted = row.map((cell, i) => {
   const widths = [15, 5, 10];
   return ui.padRight(cell, widths[i]);
 }).join(' | ');
 console.log(formatted);
});

// Progress bars
const progress = ui.padRight('████', 20, '░'); // '████░░░░░░░░░░░░░░░░'

// Menu items with dots
const menuItem = ui.padRight('Coffee', 20, '.') + '$3.50';
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `colors` | `typeof colors` | Provides access to the full chalk colors API. Chalk provides extensive color and styling capabilities including: - Basic colors: red, green, blue, yellow, etc. - Background colors: bgRed, bgGreen, etc. - Styles: bold, italic, underline, strikethrough - Advanced: rgb, hex, hsl color support Colors and styles can be chained for complex formatting. |
| `colorPalette` | `string[]` | Gets the current color palette used for automatic color assignment. The color palette is a predefined set of hex colors that are automatically assigned to named entities in a cycling fashion. This ensures consistent color assignment across the application. |
| `randomColor` | `any` | Gets a random color name from the available chalk colors. This provides access to a randomly selected color from chalk's built-in color set. Useful for adding variety to terminal output or testing. |
| `fonts` | `string[]` | Gets an array of available fonts for ASCII art generation. This method provides access to all fonts available through figlet for creating ASCII art. The fonts are automatically discovered and cached on first access for performance. **Font Discovery:** - Fonts are loaded from figlet's built-in font collection - Results are cached in state to avoid repeated file system access - Returns comprehensive list of available font names |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `fonts` | `array` | Array of available fonts for ASCII art generation |
| `colorPalette` | `array` | Color palette of hex colors for automatic color assignment |

## Examples

**assignColor**

```ts
// Assign colors to users
const johnColor = ui.assignColor('john');
const janeColor = ui.assignColor('jane');

// Use consistently throughout the app
console.log(johnColor('John: Hello there!'));
console.log(janeColor('Jane: Hi John!'));
console.log(johnColor('John: How are you?')); // Same color as before

// Different entities get different colors
const errorColor = ui.assignColor('error');
const successColor = ui.assignColor('success');
```



**wizard**

```ts
// Basic wizard
const answers = await ui.wizard([
 {
   type: 'input',
   name: 'projectName',
   message: 'What is your project name?',
   validate: (input) => input.length > 0 || 'Name is required'
 },
 {
   type: 'list',
   name: 'framework',
   message: 'Choose a framework:',
   choices: ['React', 'Vue', 'Angular', 'Svelte']
 },
 {
   type: 'confirm',
   name: 'typescript',
   message: 'Use TypeScript?',
   default: true
 }
]);

console.log(`Creating ${answers.projectName} with ${answers.framework}`);

// With initial answers
const moreAnswers = await ui.wizard([
 { type: 'input', name: 'version', message: 'Version?' }
], { version: '1.0.0' });
```



**openInEditor**

```ts
// Edit code snippet
const code = `function hello() {\n  console.log('Hello');\n}`;
const editedCode = await ui.openInEditor(code, '.js');

// Edit configuration
const config = JSON.stringify({ port: 3000 }, null, 2);
const newConfig = await ui.openInEditor(config, '.json');

// Edit markdown content
const markdown = '# Title\n\nContent here...';
const editedMarkdown = await ui.openInEditor(markdown, '.md');
```



**asciiArt**

```ts
// Create a banner
const banner = ui.asciiArt('WELCOME', 'Big');
console.log(banner);

// Different fonts for different purposes
const title = ui.asciiArt('MyApp', 'Standard');
const subtitle = ui.asciiArt('v2.0', 'Small');

// Technical/coding themes
const code = ui.asciiArt('CODE', '3D-ASCII');

// List available fonts first
console.log('Available fonts:', ui.fonts.slice(0, 10).join(', '));
```



**banner**

```ts
// Classic patriotic banner
const banner = ui.banner('AMERICA', {
 font: 'Big',
 colors: ['red', 'white', 'blue']
});
console.log(banner);

// Tech company banner
const techBanner = ui.banner('TechCorp', {
 font: 'Slant',
 colors: ['cyan', 'blue', 'magenta']
});

// Warning banner
const warningBanner = ui.banner('WARNING', {
 font: 'Standard',
 colors: ['yellow', 'red']
});

// Available fonts: see ui.fonts property
// Available colors: any chalk color names
```



**applyGradient**

```ts
// Horizontal rainbow effect
const rainbow = ui.applyGradient('Hello World!', 
 ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'], 
 'horizontal'
);

// Vertical gradient for multi-line text
const multiline = 'Line 1\nLine 2\nLine 3\nLine 4';
const vertical = ui.applyGradient(multiline, 
 ['red', 'white', 'blue'], 
 'vertical'
);

// Fire effect
const fire = ui.applyGradient('FIRE', ['red', 'yellow'], 'horizontal');

// Ocean effect
const ocean = ui.applyGradient('OCEAN', ['blue', 'cyan', 'white'], 'vertical');
```



**applyHorizontalGradient**

```ts
// Rainbow effect across characters
const rainbow = ui.applyHorizontalGradient('RAINBOW', 
 ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta']
);

// Simple two-color transition
const sunset = ui.applyHorizontalGradient('SUNSET', ['red', 'orange']);

// Great for short text and ASCII art
const art = ui.asciiArt('COOL', 'Big');
const coloredArt = ui.applyHorizontalGradient(art, ['cyan', 'blue']);
```



**applyVerticalGradient**

```ts
// Patriotic vertical gradient
const flag = 'USA\nUSA\nUSA\nUSA';
const patriotic = ui.applyVerticalGradient(flag, ['red', 'white', 'blue']);

// Sunset effect on ASCII art
const banner = ui.asciiArt('SUNSET', 'Big');
const sunset = ui.applyVerticalGradient(banner, 
 ['yellow', 'orange', 'red', 'purple']
);

// Ocean waves effect
const waves = 'Wave 1\nWave 2\nWave 3\nWave 4\nWave 5';
const ocean = ui.applyVerticalGradient(waves, ['cyan', 'blue']);
```



**padLeft**

```ts
// Number alignment
const numbers = ['1', '23', '456'];
numbers.forEach(num => {
 console.log(ui.padLeft(num, 5, '0')); // '00001', '00023', '00456'
});

// Text alignment in columns
const items = ['apple', 'banana', 'cherry'];
items.forEach(item => {
 console.log(ui.padLeft(item, 10) + ' | Price: $1.00');
});

// Custom padding character
const title = ui.padLeft('TITLE', 20, '-'); // '---------------TITLE'
```



**padRight**

```ts
// Create aligned table columns
const data = [
 ['Name', 'Age', 'City'],
 ['John', '25', 'NYC'],
 ['Jane', '30', 'LA'],
 ['Bob', '35', 'Chicago']
];

data.forEach(row => {
 const formatted = row.map((cell, i) => {
   const widths = [15, 5, 10];
   return ui.padRight(cell, widths[i]);
 }).join(' | ');
 console.log(formatted);
});

// Progress bars
const progress = ui.padRight('████', 20, '░'); // '████░░░░░░░░░░░░░░░░'

// Menu items with dots
const menuItem = ui.padRight('Coffee', 20, '.') + '$3.50';
```



**colors**

```ts
// Basic colors
ui.colors.red('Error message')
ui.colors.green('Success!')

// Chained styling
ui.colors.blue.bold.underline('Important link')
ui.colors.white.bgRed.bold(' ALERT ')

// Hex and RGB colors
ui.colors.hex('#FF5733')('Custom color')
ui.colors.rgb(255, 87, 51)('RGB color')
```



**randomColor**

```ts
const randomColor = ui.randomColor;
console.log(ui.colors[randomColor]('This text is a random color!'));

// Use in loops for varied output
items.forEach(item => {
 const color = ui.randomColor;
 console.log(ui.colors[color](`- ${item}`));
});
```



**fonts**

```ts
// List all available fonts
const fonts = ui.fonts;
console.log(`Available fonts: ${fonts.join(', ')}`);

// Use random font for variety
const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
const art = ui.asciiArt('Hello', randomFont);

// Common fonts: 'Big', 'Standard', 'Small', 'Slant', '3D-ASCII'
```

