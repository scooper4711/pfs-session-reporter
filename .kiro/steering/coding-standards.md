# Coding Standards

## Clean Code Principles

This project follows the principles from Robert C. Martin's "Clean Code". These are fundamental guidelines that apply to all code:

**Meaningful Names**:
- Use intention-revealing names that explain why something exists and what it does
- Avoid abbreviations and single-letter variables (except loop counters in small scopes)
- Use pronounceable, searchable names
- Class names should be nouns (`SessionReportValidator`, `FormFiller`)
- Function names should be verbs (`validateReport`, `fillFormField`, `handleClick`)
- Be consistent - use one word per concept (don't mix `fetch`, `retrieve`, and `get`)

**Functions**:
- Functions should do ONE thing and do it well (Single Responsibility Principle)
- Keep functions small - ideally under 20 lines, definitely under 50
- Function arguments: 0 is ideal, 1-2 is good, 3 requires justification, 4+ needs refactoring
- Avoid flag arguments (boolean parameters that change behavior) - split into separate functions
- No side effects - functions should do what their name says and nothing else
- Use descriptive names - long descriptive names are better than short enigmatic ones

**Comments**:
- Strive for self-explanatory code, but use comments liberally when they add value
- Good comments explain WHY, not WHAT - the code shows what it does, comments explain the reasoning
- Encouraged comments:
  - Legal comments (copyright, licenses)
  - Explanatory comments for complex algorithms, regex patterns, or business logic
  - Warning of consequences (e.g., "This test takes 10 minutes to run")
  - TODO comments (but address them promptly)
  - JSDoc for public APIs
  - Context comments explaining architectural decisions or constraints
  - Clarifying comments for non-obvious code that can't be easily refactored
- Avoid these comment types:
  - Redundant comments that merely repeat what code already says clearly
  - Misleading or outdated comments (keep comments in sync with code changes)
  - Noise comments that add no information ("// Constructor", "// Returns the value")
- Commented-out code:
  - Prefer version control over commented-out code for long-term storage
  - Temporary commented-out code during active development is acceptable
  - If keeping commented code, add a comment explaining why it's preserved

**Formatting**:
- Vertical formatting: Related concepts should be close together
- Use blank lines to separate concepts
- Variables should be declared close to their usage
- Dependent functions should be vertically close (caller above callee)
- Horizontal formatting: Keep lines short (under 120 characters)
- Use consistent indentation (this project uses 2 spaces for TypeScript)

**Error Handling**:
- Use exceptions rather than return codes
- Write try-catch-finally first when writing code that could throw
- Provide context with exceptions - include operation name and failure type
- Don't return null - return empty objects, arrays, or use Optional pattern
- Don't pass null - avoid null parameters in function signatures

**Objects and Data Structures**:
- Objects hide data and expose operations (methods)
- Data structures expose data and have no meaningful operations
- Don't create hybrid structures that are half object, half data structure
- Follow the Law of Demeter: a method should only call methods on:
  - Itself
  - Objects passed as parameters
  - Objects it creates
  - Its direct properties
- Avoid "train wrecks": `a.getB().getC().doSomething()` - use intermediate variables

**Classes**:
- Classes should be small - measured by responsibilities, not lines
- Single Responsibility Principle: a class should have one reason to change
- High cohesion: methods and variables should be interdependent
- Low coupling: minimize dependencies between classes
- Organize from high-level to low-level (public methods first, private helpers below)

**Tests**:
- Tests should be FIRST:
  - Fast: Tests should run quickly
  - Independent: Tests should not depend on each other
  - Repeatable: Tests should work in any environment
  - Self-Validating: Tests should have boolean output (pass/fail)
  - Timely: Write tests before production code (TDD)
- One assert per test (or one concept per test)
- Test code is production code that must be maintained — it must adhere to all coding standards including DRY, meaningful names, clean functions, and consistent formatting
- The only exemptions for test files are file length and function length limits (tests often need to be longer)
- Use shared test helpers and factory functions to avoid duplicating setup logic across test files
- Use descriptive test names that explain what is being tested

**General Rules**:
- Follow the Boy Scout Rule: "Leave the code cleaner than you found it"
- Use consistent conventions throughout the codebase
- Replace magic numbers with named constants
- Be precise - don't use `any` type in TypeScript without good reason
- **TypeScript Type Safety**:
  - Do NOT use the `any` type except when interfacing with Chrome extension APIs that lack precise types
  - When `any` is necessary, add a comment explaining why and document the expected shape
  - Prefer `unknown` over `any` when the type is truly unknown - it forces type checking before use
  - Use proper type definitions or interfaces instead of `any` whenever possible
- **Prefer `Number` methods over global equivalents**:
  - Use `Number.parseInt()` instead of `parseInt()`
  - Use `Number.isNaN()` instead of `isNaN()`
  - Use `Number.parseFloat()` instead of `parseFloat()`
- **Prefer `String#codePointAt()` over `String#charCodeAt()`** for proper Unicode support
- **Prefer `String.fromCodePoint()` over `String.fromCharCode()`** for proper Unicode support
- **Prefer `.dataset` over `getAttribute('data-...')`** for accessing data attributes
- **Prefer `String#replaceAll()` over `String#replace()` with global regex**
- Encapsulate conditionals: `if (isValid())` is better than `if (value > 0 && value < 100)`
- Avoid negative conditionals: `if (isValid())` is clearer than `if (!isInvalid())`
- Don't repeat yourself (DRY) - avoid repeated code and duplication
- **Parameter Management**:
  - When dealing with large groups of parameters (4+), create structures (interfaces or types)
  - Group related parameters into objects for better maintainability

## DRY Principle (Don't Repeat Yourself)

The DRY principle states that "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system." Code duplication is one of the most common sources of bugs and maintenance issues.

**Core Tenets of DRY**:

1. **Single Source of Truth**
   - Each piece of logic should exist in exactly one place
   - When logic needs to change, there should be only one place to change it
   - Duplication means multiple places to update, increasing the risk of inconsistency

2. **Abstraction Over Duplication**
   - When you find yourself copying code, create an abstraction instead
   - Extract repeated logic into functions, classes, or modules
   - Use parameters to handle variations rather than duplicating code

3. **Knowledge Representation**
   - DRY applies to more than just code - it includes:
     - Business logic and algorithms
     - Data structures and schemas
     - Configuration and constants
     - Documentation and comments
   - If the same concept appears in multiple places, consolidate it

**When to Apply DRY**:

✅ **DO apply DRY when**:
- The same logic appears in 2+ places
- Changes to one instance would require changing others
- The duplication represents the same concept or knowledge
- The code is stable and unlikely to diverge

❌ **DON'T apply DRY when**:
- Code looks similar but represents different concepts (coincidental duplication)
- The duplication is temporary during active development
- Abstracting would make the code harder to understand
- The code is likely to diverge in the future (premature abstraction)

**Rule of Three**:
- First time: Write the code
- Second time: Duplicate with a comment noting the duplication
- Third time: Refactor to eliminate duplication

## File Size and Complexity

To maintain code quality and readability, all production code must adhere to these standards:

**File Size Limit**:
- Production class files SHOULD be kept under 300 lines
- Production class files MUST be kept under 500 lines
- If a file exceeds 300 lines, consider refactoring
- If a file approaches 500 lines, refactoring is mandatory

**Cyclomatic Complexity**:
- Functions SHOULD maintain cyclomatic complexity below 5
- Functions MUST maintain cyclomatic complexity below 15
- High complexity (≥15) indicates code that is difficult to test, understand, and maintain

**Important Nuance**:
- CCN is a **guideline, not an absolute rule**
- Simple, repetitive patterns are acceptable even if they increase CCN:
  - Null-coalescing operators (`value || defaultValue`)
  - Optional chaining (`obj?.prop ?? default`)
  - Simple switch statements with straightforward cases
  - Flat validation checks without nesting
- **Focus on cognitive complexity** - how hard is the code to understand?

**How to Reduce Complexity**:
1. Extract complex conditionals into well-named helper functions
2. Use early returns to reduce nesting
3. Replace nested if-else chains with guard clauses
4. Use lookup tables or strategy patterns instead of long switch statements
5. Break down complex functions into smaller, single-purpose functions

**Exceptions**:
- Test files are exempt from file size and function length limits only — all other coding standards still apply
- Configuration files and type definition files are exempt
- Generated code is exempt
- If an exception is truly necessary, document the reason in comments

## Property-Based Testing Best Practices

Property-based tests (PBT) use random input generation to find edge cases. This power comes with pitfalls that can cause flaky tests. Follow these guidelines to write robust property tests.

**Use `fc.uniqueArray` for Keyed Data**:
When generating arrays of records that will be used as object keys (e.g., player IDs), use `fc.uniqueArray` with a `selector` to prevent duplicate key collisions:

```typescript
// BAD - Can generate duplicate orgPlayNumbers, causing key collisions
fc.array(
  fc.record({
    orgPlayNumber: fc.integer({ min: 1, max: 999999 }),
    characterName: fc.string({ minLength: 1, maxLength: 30 }),
  }),
  { minLength: 1, maxLength: 6 }
)

// GOOD - Guarantees unique orgPlayNumbers
fc.uniqueArray(
  fc.record({
    orgPlayNumber: fc.integer({ min: 1, max: 999999 }),
    characterName: fc.string({ minLength: 1, maxLength: 30 }),
  }),
  { minLength: 1, maxLength: 6, selector: (r) => r.orgPlayNumber }
)
```

**Avoid `not.toBe` Between Independently Generated Values**:
Never assert that two independently generated values are different. Random generation can produce coincidental matches, causing flaky failures.

**Prefer Positive Assertions**:
Positive assertions ("X equals Y") are more robust than negative assertions ("X doesn't equal Z"):

```typescript
// GOOD - Proves the property directly
expect(report.gmOrgPlayNumber).toBe(inputData.gmOrgPlayNumber);

// AVOID - Doesn't prove the property, just that it's not one specific wrong value
expect(report.gmOrgPlayNumber).not.toBe(someOtherValue);
```

**Common Flaky Test Patterns to Avoid**:
1. `fc.array` with records containing ID fields → Use `fc.uniqueArray` with `selector`
2. `not.toBe` between two independently generated values → Remove or use positive assertions
3. Assertions that depend on `fc.pre` filtering individual fields → The filter is OR-based, not AND-based
4. Comparing generated strings for inequality → Strings can coincidentally match

## Pre-Push Testing Requirements

Before any `git push`, all tests MUST pass. Do NOT push code with failing tests.

**Required steps before pushing**:
1. Run `npm run lint` and verify no lint errors
2. Run `npx jest --silent` and verify all tests pass
3. If lint or tests fail, fix them before committing/pushing
4. Only push when both lint and the full test suite are green

**This is a hard rule** — no exceptions. Broken tests on main break CI for everyone.

## Git Commit Standards

This project follows [Conventional Commits](https://www.conventionalcommits.org/) combined with the [seven rules of a great Git commit message](https://cbea.ms/git-commit/).

**Git commits should happen after most tasks are completed.** Don't wait until the end of a feature to commit — commit incrementally as meaningful units of work are done.

**All work for features, bugfixes, and refactors should be done on branches.** Never commit directly to main. Use the branch naming conventions below and merge via pull request.

**Commit Message Format**:
```
<type>: <subject>

[optional body]
```

**Type Prefixes** (Conventional Commits):
- `feat:` — A new feature
- `fix:` — A bug fix
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `docs:` — Documentation only changes
- `chore:` — Maintenance tasks (dependency updates, file cleanup, etc.)
- `test:` — Adding or updating tests
- `style:` — Formatting, whitespace, etc. (no code logic change)

**Subject Line Rules**:
1. Capitalize the first word after the type prefix
2. Use the imperative mood ("Add feature" not "Added feature")
3. Do not end with a period
4. Limit to 72 characters (aim for 50)
5. The subject should complete: "If applied, this commit will ___"

**Body Rules** (when needed):
1. Separate from subject with a blank line
2. Wrap at 72 characters
3. Explain what and why, not how
4. Use bullet points if listing multiple changes

**Branch Naming**:
- Feature work: `feat/<feature-name>`
- Refactoring: `refactor/<scope>`
- Bugfixes: `fix/<bug-name>`

**Merge Strategy**:
- Use merge commits (`git merge --no-ff`) when integrating feature, refactor, and bugfix branches into main
- Do NOT use fast-forward merges — branches should be preserved in the commit graph so their history is visible
- The merge commit message should follow Conventional Commits format and reference the branch purpose
- This preserves the context of grouped work and makes `git log --graph` useful

## Chrome Extension Specific Guidelines

**Manifest V3 Best Practices**:
- Use the minimum required permissions — don't request permissions the extension doesn't need
- Prefer `activeTab` over broad host permissions where possible
- Service workers (background scripts) are ephemeral — don't rely on persistent state in the service worker
- Use `chrome.storage` for any data that needs to persist across service worker restarts

**Content Script Isolation**:
- Content scripts run in an isolated world but share the DOM with the page
- Avoid polluting the page's global namespace
- Use message passing (`chrome.runtime.sendMessage` / `chrome.runtime.onMessage`) for communication between popup, background, and content scripts
- Keep content scripts focused on DOM manipulation only — business logic belongs in the background script or shared modules

**Security**:
- Never use `eval()` or `new Function()` — Manifest V3 enforces a strict CSP
- Sanitize any data read from the clipboard or external sources before using it
- Validate the SessionReport structure before trusting its contents
- Use `textContent` instead of `innerHTML` when inserting user-provided text into the DOM

**Popup UI**:
- Keep the popup lightweight — it closes when the user clicks away
- Don't rely on popup state persisting between opens
- Provide clear, immediate feedback for user actions (loading states, success/error messages)
