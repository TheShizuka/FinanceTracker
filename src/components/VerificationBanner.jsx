// src/components/VerificationBanner.jsx
import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { sendEmailVerification, reload } from "firebase/auth";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { FaEnvelope, FaExclamationTriangle } from "react-icons/fa";

const VerificationBanner = () => {
  const [isVerified, setIsVerified] = useState(true); // Default to true to avoid flash
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;
  
  useEffect(() => {
    const checkVerification = async () => {
      if (user) {
        try {
          await reload(user); // Refresh user data
          setIsVerified(user.emailVerified);
        } catch (error) {
          console.error("Error refreshing user status:", error);
        }
      }
    };
    
    checkVerification();
    
    // Check verification status every 5 minutes
    const interval = setInterval(checkVerification, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);
  
  const handleResendEmail = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await sendEmailVerification(user);
      toast.success("Verification email sent!");
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error("Error sending email: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // If no user, user is verified, or checking status, don't show banner
  if (!user || isVerified) {
    return null;
  }
  
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 dark:bg-yellow-900/20 dark:border-yellow-600">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700 dark:text-yellow-200">
            Please verify your email address to access all features.
          </p>
          <div className="mt-2 flex space-x-4">
            <button
              onClick={handleResendEmail}
              disabled={loading}
              className="text-sm text-yellow-700 dark:text-yellow-200 font-medium hover:text-yellow-800 dark:hover:text-yellow-100 focus:outline-none flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <FaEnvelope className="mr-1 h-3 w-3" />
                  Resend Email
                </>
              )}
            </button>
            <Link
              to="/verify-email"
              className="text-sm text-yellow-700 dark:text-yellow-200 font-medium hover:text-yellow-800 dark:hover:text-yellow-100 focus:outline-none"
            >
              Verification Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationBanner;