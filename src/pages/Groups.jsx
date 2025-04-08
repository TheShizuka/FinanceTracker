// src/pages/Groups.jsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  getDoc,
  orderBy,
  getDocs,
  serverTimestamp,
  limit
} from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { 
  FaArrowLeft, 
  FaUsers, 
  FaPlus, 
  FaTimes, 
  FaUser, 
  FaUserPlus, 
  FaCog, 
  FaTrash,
  FaBell,
  FaBriefcase,
  FaMoneyBillWave,
  FaRegCalendarAlt,
  FaFilter
} from "react-icons/fa";
import { getCurrencySymbol } from "../utils/currencyUtils";

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(""); 
  const [friends, setFriends] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [groupInvites, setGroupInvites] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all, budget, split
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Fetch groups where user is a member
  useEffect(() => {
    if (!user) return;
    
    const qGroups = query(
      collection(db, "groups"), 
      where("members", "array-contains", user.uid),
      orderBy("createdAt", "desc")
    );
    
    const unsub = onSnapshot(qGroups, async (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Enhance group data with members and last activity
      const enhancedGroups = await Promise.all(
        groupsData.map(async (group) => {
          // Get latest transaction
          const transactionsQuery = query(
            collection(db, "groupTransactions"),
            where("groupId", "==", group.id),
            orderBy("createdAt", "desc"),
            limit(1)
          );
          
          const transactionsSnapshot = await getDocs(transactionsQuery);
          let lastActivity = group.createdAt;
          
          if (!transactionsSnapshot.empty) {
            const latestTransaction = transactionsSnapshot.docs[0].data();
            if (latestTransaction.createdAt && 
                latestTransaction.createdAt.seconds > (lastActivity?.seconds || 0)) {
              lastActivity = latestTransaction.createdAt;
            }
          }
          
          // Get member details for the first 3 members
          const memberPromises = group.members.slice(0, 3).map(async (memberId) => {
            const memberDoc = await getDoc(doc(db, "users", memberId));
            if (memberDoc.exists()) {
              return { id: memberDoc.id, ...memberDoc.data() };
            }
            return { id: memberId, displayName: "Unknown User" };
          });
          
          const memberDetails = await Promise.all(memberPromises);
          
          return {
            ...group,
            memberDetails,
            totalMembers: group.members.length,
            lastActivity,
          };
        })
      );
      
      setGroups(enhancedGroups);
      setLoading(false);
    });
    
    return () => unsub();
  }, [user]);

  // Fetch current user's friend list from their profile
  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFriends(data?.friends || []);
      }
    });
    
    return () => unsub();
  }, [user]);

  // Fetch profiles for each friend UID
  useEffect(() => {
    const fetchFriendProfiles = async () => {
      if (friends.length === 0) {
        setFriendProfiles([]);
        return;
      }
      
      try {
        const promises = friends.map(async (uid) => {
          const docSnap = await getDoc(doc(db, "users", uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            return { 
              uid, 
              username: data.username || uid,
              photoURL: data.photoURL || null,
              handle: data.handle || null
            };
          }
          return { uid, username: uid };
        });
        
        const profiles = await Promise.all(promises);
        setFriendProfiles(profiles);
      } catch (error) {
        console.error("Error fetching friend profiles:", error);
      }
    };
    
    fetchFriendProfiles();
  }, [friends]);

  // Fetch group invites from notifications
  useEffect(() => {
    if (!user) return;
    
    // First get the user's handle
    const fetchUserAndInvites = async () => {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userHandle = userData.handle;
        
        if (userHandle) {
          const q = query(
            collection(db, "notifications"),
            where("to", "==", userHandle),
            where("type", "==", "group-invite")
          );
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
            const invites = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setGroupInvites(invites);
          });
          
          return unsubscribe;
        }
      }
    };
    
    fetchUserAndInvites();
  }, [user]);

  const handleNavigateToGroup = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  const handleNavigateToCreateGroup = () => {
    navigate("/create-group");
  };

  const acceptGroupInvite = async (invite) => {
    try {
      if (!invite.groupId) {
        toast.error("Group ID not found in invite");
        return;
      }
      
      const groupRef = doc(db, "groups", invite.groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        toast.error("Group no longer exists");
        await deleteDoc(doc(db, "notifications", invite.id));
        return;
      }
      
      const groupData = groupDoc.data();
      
      if (groupData.members.includes(user.uid)) {
        toast.error("You are already a member of this group");
        await deleteDoc(doc(db, "notifications", invite.id));
        return;
      }
      
      // Add user to group members
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid),
        invites: arrayRemove(user.uid)
      });
      
      // Delete notification
      await deleteDoc(doc(db, "notifications", invite.id));
      
      toast.success("Group invite accepted!");
    } catch (error) {
      console.error("Error accepting group invite:", error);
      toast.error("Error accepting invite: " + error.message);
    }
  };

  const rejectGroupInvite = async (invite) => {
    try {
      if (invite.groupId) {
        const groupRef = doc(db, "groups", invite.groupId);
        const groupDoc = await getDoc(groupRef);
        
        if (groupDoc.exists()) {
          // Remove user from invites list
          await updateDoc(groupRef, {
            invites: arrayRemove(user.uid)
          });
        }
      }
      
      // Delete notification
      await deleteDoc(doc(db, "notifications", invite.id));
      
      toast.success("Group invite rejected");
    } catch (error) {
      console.error("Error rejecting group invite:", error);
      toast.error("Error rejecting invite: " + error.message);
    }
  };

  const filteredGroups = activeTab === "all" 
    ? groups 
    : groups.filter(group => group.type === activeTab);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => navigate("/")} 
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
            aria-label="Go back"
          >
            <FaArrowLeft />
          </button>
          <h1 className="heading-lg">Groups</h1>
        </div>
        
        <button
          onClick={handleNavigateToCreateGroup}
          className="p-2 rounded-full bg-primary text-white hover:bg-primary-dark"
          aria-label="Create group"
        >
          <FaPlus />
        </button>
      </div>
      
      {/* Filter tabs */}
      <div className="card p-1 mb-6 flex justify-between">
        <button
          className={`flex-1 py-2 px-4 rounded-lg text-center transition-colors ${
            activeTab === "all" 
              ? "bg-primary text-white" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          onClick={() => setActiveTab("all")}
        >
          All
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-lg text-center transition-colors ${
            activeTab === "budget" 
              ? "bg-primary text-white" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          onClick={() => setActiveTab("budget")}
        >
          <FaBriefcase className="inline mr-1 -mt-1" />
          Budget
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-lg text-center transition-colors ${
            activeTab === "split" 
              ? "bg-primary text-white" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          onClick={() => setActiveTab("split")}
        >
          <FaUsers className="inline mr-1 -mt-1" />
          Split
        </button>
      </div>
      
      {/* Group invites */}
      {groupInvites.length > 0 && (
        <div className="card p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <h2 className="heading-sm mb-3 flex items-center">
            <FaBell className="text-blue-500 mr-2" />
            Group Invites
          </h2>
          
          <div className="space-y-3">
            {groupInvites.map((invite) => (
              <div key={invite.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <p className="font-medium mb-1">{invite.groupName || "Group"}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {invite.message}
                </p>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptGroupInvite(invite)}
                    className="btn-sm bg-green-500 hover:bg-green-600 text-white rounded py-1 px-3 text-sm"
                  >
                    Accept
                  </button>
                  
                  <button
                    onClick={() => rejectGroupInvite(invite)}
                    className="btn-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded py-1 px-3 text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Groups list */}
      <div className="card mb-6">
        <h2 className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold">My Groups</h2>
        
        {filteredGroups.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">You don't have any groups yet</p>
            <button
              onClick={handleNavigateToCreateGroup}
              className="btn btn-primary"
            >
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleNavigateToGroup(group.id)}
              >
                <div className="flex items-start">
                  {/* Group image */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mr-4">
                    {group.imageUrl ? (
                      <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" />
                    ) : group.type === "budget" ? (
                      <FaBriefcase className="text-gray-500 dark:text-gray-400 text-xl" />
                    ) : (
                      <FaUsers className="text-gray-500 dark:text-gray-400 text-xl" />
                    )}
                  </div>
                  
                  {/* Group details */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        group.type === "budget" 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      }`}>
                        {group.type === "budget" ? "Budget" : "Split"}
                      </span>
                    </div>
                    
                    {group.type === "budget" && (
                      <div className="flex items-center mt-1 text-sm">
                        <FaMoneyBillWave className="text-gray-500 dark:text-gray-400 mr-1" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {getCurrencySymbol(group.currency)}{group.budget?.toLocaleString()}
                        </span>
                        <span className="mx-1 text-gray-500">•</span>
                        <span className="text-red-500">
                          {group.budget ? ((group.spent || 0) / group.budget * 100).toFixed(0) : 0}% spent
                        </span>
                      </div>
                    )}
                    
                    {/* Members preview */}
                    <div className="flex items-center mt-3">
                      <div className="flex -space-x-2">
                        {group.memberDetails?.map((member, index) => (
                          <div 
                            key={member.id} 
                            className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 overflow-hidden"
                          >
                            {member.photoURL ? (
                              <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {member.displayName?.charAt(0) || "U"}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {group.totalMembers > 3 && (
                          <div className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              +{group.totalMembers - 3}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">
                        {group.totalMembers} member{group.totalMembers !== 1 ? "s" : ""}
                      </span>
                      
                      {group.lastActivity && (
                        <div className="ml-auto flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <FaRegCalendarAlt className="mr-1" />
                          {format(new Date(group.lastActivity.seconds * 1000), "MMM d")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;