# PackageFinder (features.packageFinder)

PackageFinder Feature - Comprehensive package discovery and analysis tool This feature provides powerful capabilities for discovering, indexing, and analyzing npm packages across the entire project workspace. It recursively scans all node_modules directories and builds a comprehensive index of packages, enabling: **Core Functionality:** - Recursive node_modules scanning across the workspace - Package manifest parsing and indexing - Duplicate package detection and analysis - Dependency relationship mapping - Scoped package organization (@scope/package) - Package count and statistics **Use Cases:** - Dependency auditing and analysis - Duplicate package identification - Package version conflict detection - Dependency tree analysis - Workspace package inventory **Performance Features:** - Parallel manifest reading for fast scanning - Efficient duplicate detection using unique paths - Lazy initialization - only scans when started - In-memory indexing for fast queries **Usage Example:** ```typescript const finder = container.feature('packageFinder'); await finder.start(); // Find duplicates console.log('Duplicate packages:', finder.duplicates); // Find package by name const lodash = finder.findByName('lodash'); // Find dependents of a package const dependents = finder.findDependentsOf('react'); ```

## Usage

```ts
container.feature('packageFinder', {
  // Optional configuration parameter
  option,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `option` | `string` | Optional configuration parameter |

## Methods

### afterInitialize

Initializes the feature state after construction. Sets the started flag to false, indicating the initial scan hasn't completed.

**Returns:** `void`



### addPackage

Adds a package manifest to the internal index. This method ensures uniqueness based on file path and maintains an array of all versions/instances of each package found across the workspace. Packages with the same name but different paths (versions) are tracked separately.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `manifest` | `PartialManifest` | ✓ | The package manifest data from package.json |

`PartialManifest` properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | The package name (e.g., 'lodash', '@types/node') |
| `version` | `string` | The package version (e.g., '1.0.0', '^2.1.3') |
| `description` | `string` | Optional package description |
| `dependencies` | `Record<string, Record<string,string>>` | Runtime dependencies with version constraints |
| `devDependencies` | `Record<string, Record<string,string>>` | Development dependencies with version constraints |
| `peerDependencies` | `Record<string, Record<string,string>>` | Peer dependencies with version constraints |
| `optionalDependencies` | `Record<string, Record<string,string>>` | Optional dependencies with version constraints |
| `path` | `string` | ✓ | The file system path to the package.json file |

**Returns:** `void`

```ts
finder.addPackage({
 name: 'lodash',
 version: '4.17.21',
 description: 'A modern JavaScript utility library'
}, '/project/node_modules/lodash/package.json');
```



### start

Starts the package finder and performs the initial workspace scan. This method is idempotent - calling it multiple times will not re-scan if already started. It triggers the complete workspace scanning process.

**Returns:** `void`

```ts
await finder.start();
console.log(`Found ${finder.packageNames.length} unique packages`);
```



### scan

Performs a comprehensive scan of all node_modules directories in the workspace. This method orchestrates the complete scanning process: 1. Discovers all node_modules directories recursively 2. Finds all package directories (including scoped packages) 3. Reads and parses all package.json files in parallel 4. Indexes all packages for fast querying The scan is performed in parallel for optimal performance, reading multiple package.json files simultaneously.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ exclude?: string | string[] }` |  | Scanning options (currently unused) |

`{ exclude?: string | string[] }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `exclude` | `any` | Optional exclusion patterns (not implemented) |

**Returns:** `void`

```ts
// Manual scan (usually called automatically by start())
await finder.scan();

// Check results
console.log(`Scanned ${finder.manifests.length} packages`);
```



### findByName

Finds the first package manifest matching the given name. If multiple versions of the package exist, returns the first one found. Use the packages property directly if you need all versions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The exact package name to search for |

**Returns:** `void`

```ts
const lodash = finder.findByName('lodash');
if (lodash) {
 console.log(`Found lodash version ${lodash.version}`);
}
```



### findDependentsOf

Finds all packages that declare the specified package as a dependency. Searches through dependencies and devDependencies of all packages to find which ones depend on the target package. Useful for impact analysis when considering package updates or removals.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `packageName` | `string` | ✓ | The name of the package to find dependents for |

**Returns:** `void`

```ts
const reactDependents = finder.findDependentsOf('react');
console.log(`${reactDependents.length} packages depend on React:`);
reactDependents.forEach(pkg => {
 console.log(`- ${pkg.name}@${pkg.version}`);
});
```



### find

Finds the first package manifest matching the provided filter function.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filter` | `(manifest: PartialManifest) => boolean` | ✓ | Function that returns true for matching packages |

**Returns:** `void`

```ts
// Find a package with specific version
const specific = finder.find(pkg => pkg.name === 'lodash' && pkg.version.startsWith('4.'));

// Find a package with description containing keyword
const utility = finder.find(pkg => pkg.description?.includes('utility'));
```



### filter

Finds all package manifests matching the provided filter function.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filter` | `(manifest: PartialManifest) => boolean` | ✓ | Function that returns true for matching packages |

**Returns:** `void`

```ts
// Find all packages with 'babel' in the name
const babelPackages = finder.filter(pkg => pkg.name.includes('babel'));

// Find all packages with no description
const undocumented = finder.filter(pkg => !pkg.description);

// Find all scoped packages
const scoped = finder.filter(pkg => pkg.name.startsWith('@'));
```



### exclude

Returns all packages that do NOT match the provided filter function. This is the inverse of filter() - returns packages where filter returns false.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filter` | `(manifest: PartialManifest) => boolean` | ✓ | Function that returns true for packages to exclude |

**Returns:** `void`

```ts
// Get all non-development packages (those not in devDependencies)
const prodPackages = finder.exclude(pkg => isDevDependency(pkg.name));

// Get all non-scoped packages
const unscoped = finder.exclude(pkg => pkg.name.startsWith('@'));
```



### findLocalPackageFolders

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `duplicates` | `any` | Gets a list of package names that have multiple versions/instances installed. This is useful for identifying potential dependency conflicts or opportunities for deduplication in the project. |
| `isStarted` | `any` | Checks if the package finder has completed its initial scan. |
| `packageNames` | `any` | Gets an array of all unique package names discovered in the workspace. |
| `scopes` | `any` | Gets an array of all scoped package prefixes found in the workspace. Scoped packages are those starting with '@' (e.g., @types/node, @babel/core). This returns just the scope part (e.g., '@types', '@babel'). |
| `manifests` | `any` | Gets a flat array of all package manifests found in the workspace. This includes all versions/instances of packages, unlike packageNames which returns unique names only. |
| `counts` | `any` | Gets a count of instances for each package name. Useful for quickly identifying which packages have multiple versions and how many instances of each exist. |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `started` | `boolean` | Whether the package finder has been started and initial scan completed |

## Examples

**addPackage**

```ts
finder.addPackage({
 name: 'lodash',
 version: '4.17.21',
 description: 'A modern JavaScript utility library'
}, '/project/node_modules/lodash/package.json');
```



**start**

```ts
await finder.start();
console.log(`Found ${finder.packageNames.length} unique packages`);
```



**scan**

```ts
// Manual scan (usually called automatically by start())
await finder.scan();

// Check results
console.log(`Scanned ${finder.manifests.length} packages`);
```



**findByName**

```ts
const lodash = finder.findByName('lodash');
if (lodash) {
 console.log(`Found lodash version ${lodash.version}`);
}
```



**findDependentsOf**

```ts
const reactDependents = finder.findDependentsOf('react');
console.log(`${reactDependents.length} packages depend on React:`);
reactDependents.forEach(pkg => {
 console.log(`- ${pkg.name}@${pkg.version}`);
});
```



**find**

```ts
// Find a package with specific version
const specific = finder.find(pkg => pkg.name === 'lodash' && pkg.version.startsWith('4.'));

// Find a package with description containing keyword
const utility = finder.find(pkg => pkg.description?.includes('utility'));
```



**filter**

```ts
// Find all packages with 'babel' in the name
const babelPackages = finder.filter(pkg => pkg.name.includes('babel'));

// Find all packages with no description
const undocumented = finder.filter(pkg => !pkg.description);

// Find all scoped packages
const scoped = finder.filter(pkg => pkg.name.startsWith('@'));
```



**exclude**

```ts
// Get all non-development packages (those not in devDependencies)
const prodPackages = finder.exclude(pkg => isDevDependency(pkg.name));

// Get all non-scoped packages
const unscoped = finder.exclude(pkg => pkg.name.startsWith('@'));
```



**duplicates**

```ts
const duplicates = finder.duplicates;
// ['lodash', 'react', '@types/node'] - packages with multiple versions

duplicates.forEach(name => {
 console.log(`${name} has ${finder.packages[name].length} versions`);
});
```



**packageNames**

```ts
const names = finder.packageNames;
console.log(`Found ${names.length} unique packages`);
```



**scopes**

```ts
const scopes = finder.scopes;
// ['@types', '@babel', '@angular'] - all scopes in use

scopes.forEach(scope => {
 const scopedPackages = finder.packageNames.filter(name => name.startsWith(scope));
 console.log(`${scope}: ${scopedPackages.length} packages`);
});
```



**manifests**

```ts
const all = finder.manifests;
console.log(`Total package instances: ${all.length}`);

// Group by name to see duplicates
const grouped = all.reduce((acc, pkg) => {
 acc[pkg.name] = (acc[pkg.name] || 0) + 1;
 return acc;
}, {});
```



**counts**

```ts
const counts = finder.counts;
// { 'lodash': 3, 'react': 2, 'express': 1 }

Object.entries(counts)
 .filter(([name, count]) => count > 1)
 .forEach(([name, count]) => {
   console.log(`${name}: ${count} versions installed`);
 });
```

