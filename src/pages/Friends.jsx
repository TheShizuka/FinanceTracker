// src/pages/Friends.jsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { doc, onSnapshot, query, where, collection, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft, FaUserPlus, FaUserFriends, FaBell, FaUser, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
import AddFriend from "./AddFriend";

const Friends = () => {
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Fetch current user's profile
  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(data);
        setFriends(data?.friends || []);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Fetch profiles for each friend
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
        toast.error("Couldn't load friend profiles");
      }
    };
    
    fetchFriendProfiles();
  }, [friends]);

  // Fetch pending friend requests (received)
  useEffect(() => {
    if (!userProfile || !userProfile.handle) return;
    
    const q = query(
      collection(db, "friendRequests"),
      where("to", "==", userProfile.handle),
      where("status", "==", "pending")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFriendRequests(requests);
    });
    
    return () => unsubscribe();
  }, [userProfile]);

  // Fetch sent friend requests
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "friendRequests"),
      where("from", "==", user.uid),
      where("status", "==", "pending")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSentRequests(requests);
    });
    
    return () => unsubscribe();
  }, [user]);

  const acceptFriendRequest = async (request) => {
    if (!user) return;
    
    try {
      // Update request status
      await updateDoc(doc(db, "friendRequests", request.id), { 
        status: "accepted",
        acceptedAt: new Date()
      });
      
      // Update both users' friend lists
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayUnion(request.from)
      });
      
      await updateDoc(doc(db, "users", request.from), {
        friends: arrayUnion(user.uid)
      });
      
      // Delete notification
      const q = query(
        collection(db, "notifications"),
        where("requestId", "==", request.id)
      );
      
      const notificationSnapshot = await getDocs(q);
      if (!notificationSnapshot.empty) {
        notificationSnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }
      
      toast.success("Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Error accepting friend request");
    }
  };

  const rejectFriendRequest = async (request) => {
    try {
      await updateDoc(doc(db, "friendRequests", request.id), { 
        status: "rejected",
        rejectedAt: new Date()
      });
      
      // Delete notification
      const q = query(
        collection(db, "notifications"),
        where("requestId", "==", request.id)
      );
      
      const notificationSnapshot = await getDocs(q);
      if (!notificationSnapshot.empty) {
        notificationSnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }
      
      toast.success("Friend request rejected");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Error rejecting friend request");
    }
  };

  const cancelFriendRequest = async (request) => {
    try {
      await deleteDoc(doc(db, "friendRequests", request.id));
      
      // Delete notification
      const q = query(
        collection(db, "notifications"),
        where("requestId", "==", request.id)
      );
      
      const notificationSnapshot = await getDocs(q);
      if (!notificationSnapshot.empty) {
        notificationSnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }
      
      toast.success("Friend request canceled");
    } catch (error) {
      console.error("Error canceling friend request:", error);
      toast.error("Error canceling friend request");
    }
  };

  const deleteFriend = async (friendUid) => {
    if (!window.confirm("Are you sure you want to remove this friend?")) return;
    
    try {
      // Remove from current user's friend list
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayRemove(friendUid)
      });
      
      // Remove from friend's friend list
      await updateDoc(doc(db, "users", friendUid), {
        friends: arrayRemove(user.uid)
      });
      
      toast.success("Friend removed");
    } catch (error) {
      console.error("Error deleting friend:", error);
      toast.error("Error removing friend");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-fadeIn">
      <div className="mb-6 flex items-center">
        <button 
          onClick={() => navigate("/")} 
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
          aria-label="Go to home"
        >
          <FaArrowLeft />
        </button>

        <h1 className="heading-lg">Friends</h1>
      </div>
      
      {/* Tab navigation */}
      <div className="mb-6">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center ${
              activeTab === "friends" 
                ? "bg-white dark:bg-gray-700 shadow-sm" 
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            <FaUserFriends className="mr-2" />
            <span>My Friends</span>
          </button>
          
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center ${
              activeTab === "requests" 
                ? "bg-white dark:bg-gray-700 shadow-sm" 
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            <FaBell className="mr-2" />
            <span>Requests</span>
            {friendRequests.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {friendRequests.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center ${
              activeTab === "add" 
                ? "bg-white dark:bg-gray-700 shadow-sm" 
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            <FaUserPlus className="mr-2" />
            <span>Add</span>
          </button>
        </div>
      </div>
      
      {/* Friends list */}
      {activeTab === "friends" && (
        <div className="card">
          <h2 className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold">My Friends</h2>
          
          {friendProfiles.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">You don't have any friends yet</p>
              <button 
                onClick={() => setActiveTab("add")}
                className="btn btn-primary"
              >
                Add Friends
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {friendProfiles.map((friend) => (
                <li key={friend.uid} className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mr-3">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.username} className="w-full h-full object-cover" />
                      ) : (
                        <FaUser className="text-gray-400" />
                      )}
                    </div>
                    
                    <div>
                      <p className="font-medium">{friend.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{friend.handle || ""}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => deleteFriend(friend.uid)}
                    className="p-2 text-gray-400 hover:text-red-500"
                    aria-label="Remove friend"
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* Friend requests */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {/* Received requests */}
          <div className="card">
            <h2 className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold">Received Requests</h2>
            
            {friendRequests.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No pending friend requests
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {friendRequests.map((req) => (
                  <li key={req.id} className="p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mr-3">
                        {req.senderPhotoURL ? (
                          <img src={req.senderPhotoURL} alt={req.senderName} className="w-full h-full object-cover" />
                        ) : (
                          <FaUser className="text-gray-400" />
                        )}
                      </div>
                      
                      <div>
                        <p className="font-medium">{req.senderName || "User"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(req.timestamp?.seconds * 1000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => acceptFriendRequest(req)}
                        className="flex-1 py-2 px-4 bg-green-500 text-white rounded-md flex items-center justify-center"
                      >
                        <FaCheck className="mr-2" />
                        Accept
                      </button>
                      
                      <button 
                        onClick={() => rejectFriendRequest(req)}
                        className="flex-1 py-2 px-4 bg-red-500 text-white rounded-md flex items-center justify-center"
                      >
                        <FaTimes className="mr-2" />
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Sent requests */}
          <div className="card">
            <h2 className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold">Sent Requests</h2>
            
            {sentRequests.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No pending sent requests
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {sentRequests.map((req) => (
                  <li key={req.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">To: {req.to}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Sent: {new Date(req.timestamp?.seconds * 1000).toLocaleString()}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => cancelFriendRequest(req)}
                      className="py-1 px-3 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      {/* Add friend */}
      {activeTab === "add" && (
        <div className="card p-6">
          <h2 className="heading-sm mb-4">Add a Friend</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enter your friend's UID to send them a friend request
          </p>
          
          <AddFriend />
        </div>
      )}
    </div>
  );
};

export default Friends;