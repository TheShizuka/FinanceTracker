// src/layout/MainLayout.jsx
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { 
  FaHome, 
  FaChartBar, 
  FaUsers, 
  FaUserFriends, 
  FaBell, 
  FaPlus, 
  FaCog,
  FaUser
} from "react-icons/fa";
import NotificationsList from "../components/NotificationsList";

const MainLayout = ({ user, darkMode, setDarkMode, setUser, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [username, setUsername] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [budgets, setBudgets] = useState([]);
  
  // Use a ref to store the current budget to ensure it's always up-to-date
  const [activeIndex, setActiveIndex] = useState(0);

  // Fetch user profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfilePic(data.photoURL);
        setUsername(data.username || "User");
      }
    };
    fetchProfile();
  }, [user]);

  // Sync with home page selection
  useEffect(() => {
    if (location.state && location.state.selectedBudgetIndex !== undefined) {
      setActiveIndex(location.state.selectedBudgetIndex);
    }
  }, [location.state]);

  // Fetch budgets for user
  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, "budgets"), where("userId", "==", user.uid));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const bs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBudgets(bs);
    });
    
    return () => unsub();
  }, [user]);

  // Check for notifications
  useEffect(() => {
    if (!user) return;
    
    // First get the user handle
    const fetchUserAndNotifications = async () => {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userHandle = userData.handle;
        
        if (userHandle) {
          // Now query notifications with the handle
          const q = query(
            collection(db, "notifications"),
            where("to", "==", userHandle)
          );
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
            const count = snapshot.docs.length;
            setNotificationCount(count);
            setHasNewNotifications(count > 0);
          });
          
          return unsubscribe;
        }
      }
    };
    
    fetchUserAndNotifications();
  }, [user]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showAddMenu) setShowAddMenu(false);
      if (showNotifications) setShowNotifications(false);
    };

    // Add event listener when menus are open
    if (showAddMenu || showNotifications) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showAddMenu, showNotifications]);

  const toggleNotifications = (e) => {
    e.stopPropagation(); // Prevent the document click handler from firing
    setShowNotifications(!showNotifications);
    if (showNotifications) {
      setHasNewNotifications(false);
    }
  };

  // Toggle theme function passed via context
  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newVal = !prev;
      localStorage.setItem("darkMode", JSON.stringify(newVal));
      return newVal;
    });
  };
  
  // Fixed goToStats function to handle invalid activeIndex
  const goToStats = () => {
    if (budgets.length === 0) return;
    
    // Make sure activeIndex is valid, or default to first budget
    const validIndex = activeIndex < budgets.length ? activeIndex : 0;
    const selectedBudget = budgets[validIndex];
    
    // Additional safety check to ensure selectedBudget exists
    if (!selectedBudget) {
      // If no budget at that index, use the first one
      navigate("/stats", { 
        state: { 
          selectedBudgetId: budgets[0].id,
          selectedBudgetIndex: 0
        } 
      });
      return;
    }
    
    navigate("/stats", { 
      state: { 
        selectedBudgetId: selectedBudget.id,
        selectedBudgetIndex: validIndex
      } 
    });
  };

  // Navigation items
  const navItems = [
    { 
      label: "Home", 
      icon: <FaHome size={20} />, 
      onClick: () => navigate("/")
    },
    { 
      label: "Stats", 
      icon: <FaChartBar size={20} />, 
      onClick: goToStats
    },
    { 
      label: "Add", 
      icon: <FaPlus size={20} />, 
      onClick: (e) => {
        e.stopPropagation(); // Prevent the document click handler from firing
        setShowAddMenu(!showAddMenu);
      },
      isAction: true
    },
    { 
      label: "Groups", 
      icon: <FaUsers size={20} />, 
      onClick: () => navigate("/groups")
    },
    { 
      label: "Friends", 
      icon: <FaUserFriends size={20} />, 
      onClick: () => navigate("/friends")
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white">
      {/* Top Header - Fixed alignment issues */}
      <header className="bg-white dark:bg-gray-800 shadow-sm fixed top-0 left-0 right-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <h1 
              className="text-xl font-bold text-primary cursor-pointer" 
              onClick={() => navigate("/")}
            >
              FinanceTrack
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                onClick={toggleNotifications}
                aria-label="Notifications"
              >
                <FaBell size={20} className="text-gray-600 dark:text-gray-300" />
                {hasNewNotifications && (
                  <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationsList userId={user.uid} onClose={() => setShowNotifications(false)} />
              )}
            </div>
            
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex items-center justify-center">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <FaUser size={16} className="text-gray-500 dark:text-gray-400" />
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Add padding to account for fixed header */}
      <main className="w-full px-4 pb-20 pt-20">
        <div className="max-w-lg mx-auto">
          {children || <Outlet context={{ toggleTheme }} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation - Fixed alignment issues */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around">
            {navItems.map((item, index) => (
              <div key={index} className="relative flex-1 flex justify-center">
                {item.isAction ? (
                  <button
                    onClick={item.onClick}
                    className="flex flex-col items-center py-3 px-2 text-center w-full"
                  >
                    <div className="p-2 rounded-full bg-primary text-white">
                      {item.icon}
                    </div>
                    <span className="text-xs mt-1">{item.label}</span>
                  </button>
                ) : (
                  <button
                    onClick={item.onClick}
                    className={`flex flex-col items-center py-3 px-2 text-center w-full ${
                      (item.label === "Home" && location.pathname === "/") ||
                      (item.label === "Stats" && location.pathname === "/stats") ||
                      (item.label === "Groups" && location.pathname === "/groups") ||
                      (item.label === "Friends" && location.pathname === "/friends")
                        ? "text-primary" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {item.icon}
                    <span className="text-xs mt-1">{item.label}</span>
                  </button>
                )}
                
                {/* Add menu dropdown */}
                {item.isAction && showAddMenu && (
                  <div 
                    className="absolute bottom-full mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-dropdown py-2 min-w-[160px] z-30"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                  >
                    <button 
                      onClick={() => {
                        if (budgets.length > 0) {
                          const selectedBudget = budgets[activeIndex];
                          navigate("/add-transaction", { 
                            state: { 
                              isIncome: true, 
                              selectedBudgetId: selectedBudget.id,
                              returnToIndex: activeIndex
                            } 
                          });
                        } else {
                          navigate("/add-transaction", { state: { isIncome: true } });
                        }
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Add Income
                    </button>
                    <button 
                      onClick={() => {
                        if (budgets.length > 0) {
                          const selectedBudget = budgets[activeIndex];
                          navigate("/add-transaction", { 
                            state: { 
                              isIncome: false, 
                              selectedBudgetId: selectedBudget.id,
                              returnToIndex: activeIndex
                            } 
                          });
                        } else {
                          navigate("/add-transaction", { state: { isIncome: false } });
                        }
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Add Expense
                    </button>
                    <button 
                      onClick={() => {
                        navigate("/create-group");
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Create Group
                    </button>
                    <button 
                      onClick={() => {
                        navigate("/add-budget");
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      New Budget
                    </button>
                    <button 
                      onClick={() => {
                        navigate("/add-friend");
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Add Friend
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default MainLayout;