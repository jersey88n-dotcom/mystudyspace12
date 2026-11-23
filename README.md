# Mystudyspace12

GOLDEN MASTER PROMPT – MyStudySpace

Build a complete, fully functional, secure, cloud-based full-stack website named MyStudySpace. It is a personal learning platform where I can store, organize, manage, search, and access all my study materials from my Android phone, laptop, or desktop using the same account.

1. Technology Stack

Frontend: React.js, HTML5, CSS3, JavaScript.

Backend: Node.js and Express.js.

Database: MongoDB with Mongoose.

Database Connection: Create a separate backend/config/connection.js file to connect MongoDB using Mongoose.

Environment Variables: Store the MongoDB connection URL in .env as MONGODB_URI. Never expose secrets in frontend code.

File Storage: Use Cloudinary or secure cloud object storage for documents and video files.

API: Create REST APIs connecting the frontend, backend, and MongoDB.

2. Website Sections

Create exactly these four main sections:

A. My Documents

Upload single or multiple PDF, PPT, PPTX, DOC, DOCX, notes, and other suitable document files.

Add, edit, delete, preview, open, and download documents.

Add titles, descriptions, and categories.

Search, sort, and filter documents.

B. Programming & DSA Questions

Categories: C, C++, Python, Java, and DSA.

Add, edit, update, and delete questions.

Save answers, explanations, notes, and code solutions.

Difficulty levels: Easy, Medium, Hard.

Track solved and unsolved questions.

Include DSA topics such as Arrays, Strings, Linked Lists, Stacks, Queues, Trees, Graphs, Searching, Sorting, Recursion, Dynamic Programming, Greedy, and Hashing.

C. Aptitude & HR Questions

Include Aptitude, Logical Reasoning, and HR Interview Questions.

Add, edit, update, and delete questions.

Save answers, explanations, and personal notes.

Add categories, difficulty levels, search, and filters.

Track completed and pending questions.

D. Video Tutorials

Add YouTube links and external tutorial links.

Upload personal video files.

Add, edit, and delete video details.

Watch videos directly on the website.

Embed YouTube videos using the official player.

Allow downloads of uploaded videos where authorized.

Add categories, search, and filters.

3. Dashboard

Create a clean, modern dashboard.

Display exactly four main section cards.

Show resource counts and recently added resources.

Include global search across all four sections.

Track learning history and progress.

Use statuses: Not Started, In Progress, Completed, and Review Again.

Do not create unnecessary main sections.

4. Authentication and Security

Implement secure owner-only login and logout.

Use email/username and password authentication.

Hash passwords securely; never store plaintext passwords.

Use protected APIs, authentication middleware, and secure sessions or tokens.

Prevent unauthorized access to personal resources.

5. MongoDB Structure and Connection

Create a separate backend/config/connection.js file and connect MongoDB using Mongoose.

Read MONGODB_URI from the backend .env file.

Import and initialize the database connection from the main backend entry point.

Create separate Mongoose models and schemas for Users, Documents, Programming Questions, Aptitude & HR Questions, Tutorials, and learning progress where needed.

Add timestamps and suitable database indexes.

Store file metadata and cloud-storage references in MongoDB. Do not store large files directly inside ordinary MongoDB documents.

Implement database connection error handling and validate the connection before starting the server.

6. Backend Requirements

Organize the backend into routes, controllers, models, middleware, and configuration folders.

Create complete REST APIs for all four sections.

Implement create, read, update, and delete operations.

Add file-upload handling, validation, authentication middleware, and error handling.

Ensure all frontend operations communicate with the backend APIs and persist in MongoDB.

7. Frontend Design

Create a beautiful, professional, modern, responsive UI.

Support Android phones, tablets, laptops, and desktops.

Use simple navigation, clean cards, readable typography, and a consistent design.

Include loading indicators, success/error messages, empty states, and confirmation dialogs.

Make all buttons and forms functional.

8. Cloud Storage and Synchronization

Store uploaded documents and videos securely in cloud storage.

Save their metadata and storage references in MongoDB.

Make all resources accessible across devices after login.

Ensure data remains available after refreshing or closing the website.

Handle upload failures, duplicate uploads, network errors, and storage errors.

9. Quality and Reliability

Implement form validation and proper error handling.

Add delete confirmation before removing resources.

Support searching, sorting, and filtering.

Ensure all CRUD operations work correctly.

Provide a backup and restore strategy.

Do not use dummy data, fake buttons, or static-only functionality.

10. Project Structure and Deployment

Create a clean, maintainable frontend and backend folder structure.

Include backend/config/connection.js, .env.example, package files, models, routes, controllers, and middleware.

Provide complete installation and setup instructions.

Explain how to configure MongoDB Atlas and cloud file storage.

Provide instructions for running locally and deploying online.

Include API testing instructions.

Final Instruction

Build the complete working MyStudySpace application, not just a UI design or prototype. Connect React frontend, Node.js/Express backend, MongoDB database, Mongoose connection, authentication, REST APIs, and cloud storage properly. Every feature must work and save data permanently. The website must be secure, responsive, user-friendly, and accessible from my phone and laptop using the same account.

Before finishing, test all four sections, authentication, uploads, downloads, search, editing, deletion, database connection, and cross-device access. Provide the complete source code and clear setup and deployment instructions.
make a proper website using this prompt ,In dark theme

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mystudyspace12.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/af01d03b-1fe1-506f-8452-8f5db5cf438d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
