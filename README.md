# 🌱 Bumi Baik

### [Project Tagline]

Bumi Baik is a web-based application developed to [describe the main purpose of the application and the problem it aims to solve].

This project is built to provide [main solution or value] through a modern, responsive, and user-friendly web application.

---

## 📌 Overview

**Bumi Baik** is a web application designed to [explain the main purpose of the project].

The application aims to [describe the problem or needs being addressed] by providing [describe the main solution].

Developed using Next.js, React, TypeScript, and Supabase, this project combines modern frontend technologies with backend services to deliver a scalable and maintainable application.

## ✨ Features

The main features of Bumi Baik include:

- **[Feature 1]**
  - [Description of the feature and its functionality].

- **[Feature 2]**
  - [Description of the feature and its functionality].

- **[Feature 3]**
  - [Description of the feature and its functionality].

- **[Feature 4]**
  - [Description of the feature and its functionality].

> Replace the feature descriptions above with functionality that has been implemented in the application.

## 🛠️ Tech Stack

Technologies and tools used in this project:

| Technology | Description |
|---|---|
| Next.js 15 | React framework for building web applications |
| React 19 | Library for building user interfaces |
| TypeScript | Static typing for JavaScript |
| Tailwind CSS 3 | Utility-first CSS framework |
| Supabase | Backend services and database integration |
| Zustand | Lightweight state management |
| Zod | Schema validation |
| Lucide React | Icon library |
| Vitest | Unit testing framework |
| ESLint | Code quality and linting |
| Prettier | Code formatting |

## 📸 Preview

Screenshots of the Bumi Baik application.

<!-- Replace the image paths with actual screenshots -->

![Bumi Baik Preview](./docs/images/preview.png)

<!-- Additional screenshots can be added below -->

## 📁 Project Structure

```text
Bumi_Baik/
│
├── docs/                   # Project documentation
│
├── src/                    # Application source code
│
├── supabase/               # Supabase configuration and resources
│
├── .env.example            # Environment variable template
├── .gitignore              # Git ignored files
│
├── eslint.config.mjs       # ESLint configuration
├── next.config.ts          # Next.js configuration
├── postcss.config.mjs      # PostCSS configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.mts       # Vitest configuration
│
├── package.json            # Project dependencies and scripts
├── package-lock.json       # Dependency lock file
└── README.md               # Project documentation
```

## 🚀 Getting Started

Follow these instructions to run Bumi Baik locally.

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git
- A Supabase project

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Nova11-F/Bumi_Baik.git
```

**2. Navigate to the project directory**

```bash
cd Bumi_Baik
```

**3. Install dependencies**

```bash
npm install
```

**4. Configure environment variables**

Create a `.env.local` file in the project root directory.

Copy the contents of `.env.example` into `.env.local` and configure the required values.

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false

SUPABASE_SECRET_KEY=

PAYMENT_PROVIDER=mock
PAYMENKU_BASE_URL=https://paymenku.com/api/v1
PAYMENKU_API_KEY=
PAYMENKU_WEBHOOK_SECRET=

CRON_SECRET=
```

> Important: Never expose secret keys or sensitive credentials in public repositories. Keep server-only environment variables private.

**5. Run the development server**

```bash
npm run dev
```

**6. Open the application**

Visit the following URL in your browser:

```text
http://localhost:3000
```

## ⚙️ Available Scripts

The following scripts are available in `package.json`:

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript types |
| `npm run test` | Run tests using Vitest |
| `npm run format` | Format code using Prettier |

## 🧪 Testing

This project uses Vitest as its testing framework.

To execute the test suite, run:

```bash
npm run test
```

To check TypeScript errors:

```bash
npm run typecheck
```

To check code quality:

```bash
npm run lint
```

## 🗺️ Roadmap

Planned improvements and future development:

- [ ] Complete core application functionality.
- [ ] Improve user interface and user experience.
- [ ] Expand application features.
- [ ] Improve application performance.
- [ ] Add comprehensive test coverage.
- [ ] Optimize production deployment.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

If you would like to contribute:

1. Fork this repository.
2. Create a new branch:

   ```bash
   git checkout -b feature/your-feature
   ```

3. Commit your changes:

   ```bash
   git commit -m "feat: add new feature"
   ```

4. Push your branch:

   ```bash
   git push origin feature/your-feature
   ```

5. Open a Pull Request.

## 📄 License

This project is currently provided for development and educational purposes.

License information can be added here once the project's license has been established.

## 👨‍💻 Author

**Nova11-F**

- GitHub: [@Nova11-F](https://github.com/Nova11-F)

---

<p align="center">
  Developed with ❤️ by <a href="https://github.com/Nova11-F">Nova11-F</a>
</p>
