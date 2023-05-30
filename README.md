<!-- markdownlint-disable-next-line -->
<center>
<h1 >Gamification API</h1>
</center>

**Gamification API** contains foundational game elements to quickly add gamification to any application such as SaaS,
Mobile, PaaS.

<center >

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![License](https://img.shields.io/badge/nodeJs->=14.21-brightgreen.svg)](https://nodejs.org)

</center>

## Contribution

You can fork the repo and send a pull request. We care clean, understandable and high quality code.

### Rules

1. Git: Please follow the git feature branch rules and convetional commits

- Create a branch for feature => `feature/[category]-[feature]`
- Create a branch for bugfix => `bugfix/[category]-[couple-words-to-address]`
- Create a branch for comments and md updates => `chore/[category]-[feature]`
- Create conventional commits to explain your development
  - `feature([category]-[feature])/[heading]: [couple-words-to-describe]`

2. Variables: Please use `camelCase`

- [What is camelCase](https://www.freecodecamp.org/news/programming-naming-conventions-explained/#what-is-camel-case)

3. Naming Conventions

- Do not use shorthands
- Do not use any other language except English

4. Loops and If statements

- Do not use synchronous loops for example `for()`, `for-of()`, `while()` unless it is necessary
- Use higher order functions such as `map()`, `filter()`, `forEach()`
- Do not use `else`
- Do not use ìf - else`for equation instead use`switch`

5. Functions Definitions

- Use Ro - Ro approach when defining a
  functions [What is RoRo](https://www.freecodecamp.org/news/elegant-patterns-in-modern-javascript-roro-be01e7669cbd/)
- Consider single responsibility for functions
  - if function has multiple things to do please reafactor

6. NOTEs and TODOs

- If you would like to add a comment for functions, variables etc. please use `// NOTE: `
- If you would like to add a todo for functions, variables etc. please use `// TODO: `

7. Installing packages

- Please remove `^` for packages in `package.json`

## Roadmap

Roadmap is a living document to track upcoming features and updates.

| category       | feature                     | status | version | priority |
|----------------|-----------------------------|--------|---------|----------|
| Readme.md      | contribution rules          | ✅      | 0.1     | L        |
| Infrastructure | adding docker               | ✅️     | 0.1     | H        |
| Infrastructure | mongodb connection          | ✅️     | 0.1     | H        |
| Infrastructure | redis connection            | ✅️     | 0.1     | H        |
| Infrastructure | typebox models              | ✅️     | 0.1     | H        |
| Infrastructure | interceptors and middlwares | ✅️     | 0.1     | H        |
| Readme.md      | installation instructure    | ⌛️     | 0.1     | L        |
| Readme.md      | mongodb shield              | ⌛️     | 0.1     | L        |
| Readme.md      | redis shield                | ⌛️     | 0.1     | L        |
| Readme.md      | redis shield                | ⌛️     | 0.1     | L        |
| Infrastructure | localstack connection       | ⌛️     | 0.1     | L        |
| Infrastructure | queue implementation        | ⌛️     | 0.1     | L        |
| API            | api key authorization       | ⌛️     | 0.1     | L        |
| API            | leaderboard operations      | ⌛️     | 0.1     | L        |
| Infrastructure | grpc implementation         | ⌛️     | 0.1     | L        |
| Infrastructure | entity models               | ⌛️     | 0.1     | H        |
| Infrastructure | logging                     | ⌛️     | 0.1     | H        |
| API            | jwt token authorization     | ⌛️     | 0.1     | H        |
