# DealFlow

DealFlow is a comprehensive CRM application designed to help businesses manage their contacts, companies, deals, tasks, and notes effectively. Built with Next.js, React, and Tailwind CSS, DealFlow provides a clean, modern, and responsive user interface with a powerful backend to support your sales and relationship management workflows.

## Features

- **Contact Management:** Add, edit, and delete contact information.
- **Company Directory:** Organize and track companies and their associated contacts.
- **Deal Tracking:** Manage deals through customizable pipeline stages (e.g., Opportunity, Proposal Sent, Won, Lost).
- **Kanban Board:** Visualize your deal pipeline and easily move deals through stages using a drag-and-drop interface.
- **Task & Note Management:** Create and assign tasks, and add notes to deals and contacts.
- **Tagging:** Categorize contacts and deals with a flexible tagging system for easy filtering and organization.
- **Smart Tag Suggestions:** Leverage AI-powered suggestions to automatically tag contacts and deals.

## Technology Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **UI Components:** Radix UI
- **Backend:** Node.js, Firebase, SQLite
- **AI:** Genkit (for smart tag suggestions)

## Getting Started

### Prerequisites

- Node.js (>= 18.x)
- npm or yarn
- Firebase project

### Installation

1.  Clone the repository:
    `bash git clone <repository_url>`
2.  Navigate to the project directory:
    `bash cd dealflow`
3.  Install dependencies:
    `bash npm install` or `yarn install`
4.  Set up your Firebase project and configure the environment variables (refer to the Firebase documentation for details).
5.  Run database migrations if necessary (details on database setup are needed).

### Running the Development Server

To run the application in development mode:
`bash npm run dev`
OR
`yarn dev`

The application will be available at `http://localhost:9002`.

To run the Genkit AI development server:

`bash npm run genkit:dev`
OR
`yarn genkit:dev`

### Building for Production

To build the application for production:
`bash npm run build`
OR
`yarn build`

To start the production server:
`bash npm start`
OR
`yarn start`

## Project Structure

(Add a brief overview of the project's directory structure and key files)

## Contributing

(Add information on how to contribute to the project)

## License

(Add license information)

## Contact

(Add contact information)
