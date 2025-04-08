# FinanceTrack 📊💰

A personal finance management application that helps you track your income, expenses, budgets, and financial statistics. FinanceTrack offers individual and group budget management with rich visualizations and insights to improve your financial health.

## Features

- **User Authentication** - Secure login, registration, and email verification
- **Budget Management** - Create and manage multiple budgets with different currencies
- **Transaction Tracking** - Record income and expenses with categorization
- **Financial Statistics** - Visualize your spending patterns with interactive charts
- **Dark/Light Mode** - Toggle between themes for comfortable viewing
- **Responsive Design** - Optimized for mobile and desktop devices
- **Group Budgeting** - Create groups to manage shared expenses and split costs
- **Friends System** - Connect with friends to collaborate on group budgets
- **Data Import/Export** - Import and export transaction data in Excel format
- **Real-time Updates** - Changes reflect instantly across devices

## Screenshots

*(Add screenshots of your application here)*

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/financetrack.git

# Navigate to the project directory
cd financetrack

# Install dependencies
npm install

# Create a .env file with your Firebase configuration
# See .env.example for required variables

# Start the development server
npm run dev
```

## Firebase Setup

1. Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication with Email/Password and Google providers
3. Create a Firestore database
4. Create a Storage bucket
5. Add your Firebase configuration to .env file

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Technologies Used

- **Frontend**: React, React Router, TailwindCSS
- **State Management**: React Context API, useState/useEffect hooks
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Charts**: Recharts
- **Icons**: React Icons
- **Animations**: Framer Motion
- **Notifications**: React Toastify
- **Date Handling**: date-fns
- **Build Tool**: Vite

## Project Structure

```
src/
├── assets/      	 # Assets
├── components/      # Reusable UI components
├── pages/           # Application pages
├── layout/          # Layout components
├── utils/           # Utility functions
├── firebase.js      # Firebase configuration
├── App.jsx          # Main application component
└── main.jsx         # Entry point
```

## Deployment

The application can be built for production using:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request