// src/App.jsx
import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

// Lazy loaded pages
const Home = lazy(() => import("./pages/Home"));
const AddTransaction = lazy(() => import("./pages/AddTransaction"));
const AddBudget = lazy(() => import("./pages/AddBudget"));
const Stats = lazy(() => import("./pages/Stats"));
const AllTransactions = lazy(() => import("./pages/AllTransactions"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Friends = lazy(() => import("./pages/Friends"));
const AddFriend = lazy(() => import("./pages/AddFriend"));
const Groups = lazy(() => import("./pages/Groups"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

// Lazy loaded components
const CreateGroup = lazy(() => import("./components/CreateGroup"));
const GroupDetail = lazy(() => import("./components/GroupDetail"));
const GroupAddTransaction = lazy(() => import("./components/GroupAddTransaction"));
const GroupEditTransaction = lazy(() => import("./components/GroupEditTransaction"));
const GroupSettings = lazy(() => import("./components/GroupSettings"));
const EditTransaction = lazy(() => import("./components/EditTransaction"));

// Components that don't need lazy loading
import VerificationBanner from "./components/VerificationBanner";
import VerifiedRoute from "./components/VerifiedRoute";

// Layout
import Layout from "./layout/MainLayout";

// CSS
import "./App.css";

function App() {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Preload critical routes
  useEffect(() => {
    const preloadRoutes = () => {
      import("./pages/Home");
      import("./pages/Login");
    };
    preloadRoutes();
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (isAuthLoading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" />;
    }

    return (
      <>
        {children}
      </>
    );
  };

  // Using VerifiedRoute for strict email verification
  const StrictVerifiedRoute = ({ children }) => {
    if (isAuthLoading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    return <VerifiedRoute>{children}</VerifiedRoute>;
  };

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
    <Router basename="/mywisewallet">
      <ToastContainer position="top-right" theme={darkMode ? "dark" : "light"} />
      <div className={`App ${darkMode ? "dark" : ""}`}>
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <VerificationBanner />
                  <Home />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Add Budget route - requires verified email */}
          <Route
            path="/add-budget"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <AddBudget />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          <Route
            path="/add-transaction"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <AddTransaction />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          <Route
            path="/edit-transaction/:transactionId"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <EditTransaction />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <VerificationBanner />
                  <Stats />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <VerificationBanner />
                  <AllTransactions />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <VerificationBanner />
                  <Profile toggleTheme={toggleDarkMode} />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <VerificationBanner />
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/friends"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <Friends />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          <Route
            path="/add-friend"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <AddFriend />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          {/* Group Routes - all require verified email */}
          <Route
            path="/groups"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <Groups />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          <Route
            path="/create-group"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <CreateGroup />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          <Route
            path="/group/:groupId"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <GroupDetail />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          <Route
            path="/group/:groupId/add-transaction"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <GroupAddTransaction />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          <Route
            path="/group/:groupId/edit-transaction/:transactionId"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <GroupEditTransaction />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
          
          <Route
            path="/group/:groupId/settings"
            element={
              <StrictVerifiedRoute>
                <Layout user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser}>
                  <GroupSettings />
                </Layout>
              </StrictVerifiedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
    </Suspense>
  );
}

export default App;