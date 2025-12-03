<!-- markdownlint-disable-next-line -->
<center>
<h1 >Gamification API</h1>
</center>

**Gamification API** contains foundational game elements to quickly add gamification to any application such as SaaS,
Mobile, PaaS.

<center >

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/nodeJs->=22.0.0-brightgreen.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0+-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0+-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![NestJS](https://img.shields.io/badge/NestJS-10.4-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</center>

## Table of Contents

- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Docker Setup](#docker-setup)
  - [Environment Variables](#environment-variables)
- [Contribution](#contribution)
- [Roadmap](#roadmap)

## Installation

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 22.0.0 ([Download](https://nodejs.org))
- **npm**: >= 10.0.0 (comes with Node.js)
- **MongoDB**: >= 8.0 ([Download](https://www.mongodb.com/try/download/community))
- **Redis**: >= 7.0 ([Download](https://redis.io/download))
- **Docker** (optional): For containerized development ([Download](https://www.docker.com/get-started))

### Local Development

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/gamification-api.git
cd gamification-api
```

#### 2. Install Dependencies

```bash
# Using npm
npm install

# If you encounter peer dependency issues
npm install --legacy-peer-deps
```

#### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Application
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gamification
MONGODB_DATABASE=gamification

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=3600

# API Keys
API_KEY_SECRET=your-api-key-secret-change-this

# Logging
LOG_LEVEL=debug
```

#### 4. Start MongoDB and Redis

**MongoDB:**
```bash
# macOS (using Homebrew)
brew services start mongodb-community@8.0

# Linux (systemd)
sudo systemctl start mongod

# Windows
net start MongoDB
```

**Redis:**
```bash
# macOS (using Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis

# Windows
redis-server
```

#### 5. Run the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`

#### 6. Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "info": {
#     "database": { "status": "up" },
#     "redis": { "status": "up" }
#   }
# }
```

### Docker Setup

#### Using Docker Compose (Recommended)

Docker Compose will start all required services (MongoDB, Redis, and the API):

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

#### Docker Services

The following services will be available:

| Service | Port | Description |
|---------|------|-------------|
| API | 3000 | Gamification API |
| MongoDB | 27017 | Database |
| Redis | 6379 | Cache & Sessions |

#### Build Docker Image Only

```bash
# Build the image
docker build -t gamification-api .

# Run the container
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/gamification \
  -e REDIS_HOST=host.docker.internal \
  gamification-api
```

### Environment Variables

Complete list of available environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production/test) | `development` | No |
| `PORT` | API server port | `3000` | No |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/gamification` | Yes |
| `MONGODB_DATABASE` | MongoDB database name | `gamification` | Yes |
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | Yes |
| `REDIS_PASSWORD` | Redis password | `` | No |
| `REDIS_DB` | Redis database number | `0` | No |
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `JWT_EXPIRATION` | JWT token expiration (seconds) | `3600` | No |
| `API_KEY_SECRET` | Secret for API key generation | - | Yes |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` | No |

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

The built files will be in the `dist/` directory.

### Troubleshooting

**MongoDB Connection Issues:**
```bash
# Check if MongoDB is running
mongo --eval "db.adminCommand('ping')"

# Check MongoDB logs
tail -f /usr/local/var/log/mongodb/mongo.log  # macOS
tail -f /var/log/mongodb/mongod.log           # Linux
```

**Redis Connection Issues:**
```bash
# Check if Redis is running
redis-cli ping
# Expected: PONG

# Check Redis connection
redis-cli
> ping
> PONG
```

**Port Already in Use:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

**Node Version Issues:**
```bash
# Check Node.js version
node --version

# Use nvm to switch versions
nvm use 22
```

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
