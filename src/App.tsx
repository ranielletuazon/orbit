import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { auth, db } from './components/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from "firebase/auth"; // Import Firebase User type
import { ProtectedRoute } from './components/ProtectedRoute';
import { getDatabase, ref, set, onDisconnect, serverTimestamp, update, get } from 'firebase/database';

import Login from './pages/Login';
import Home from './pages/Home';
import Register from './pages/Register';
import Space from './pages/Space';
import AccountSetup from './pages/AccountSetup';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Rocket from './pages/Rocket';
import NotFound from './NotFound';
import Room from './pages/Room';

import './App.css';

function App() {

  const [user, setUser] = useState<User | null>(null);

  interface UserData {
    username: string;
    id: string;
    email?: string;
    profileImage: string;
  }

  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  // Detect if user is logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((userLoggedIn) => {
      setUser(userLoggedIn);
    });
    return () => unsubscribe();
  }, []);

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string) => {
    try {
      const userDocRef = doc(db, "user", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setCurrentUser({ id: uid, ...userDoc.data() } as UserData);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to fetch user data. Please try again.");
    }
  };

  // Fetch user data once user is available
  useEffect(() => {
    // Fix this soon
    if (user?.uid) {
      fetchUserData(user.uid);
    }
  }, [user]);

  // This is for setting the user's status in Realtime Database
  useEffect(() => {
    if (!user || !currentUser) {
      return;
    } else {
      // Set the user's status in Realtime Database
      try {
        const id = user.uid;
        const db = getDatabase();
        const rdbUserRef = ref(db, `users/${id}`);
        const onDisconnectRef = onDisconnect(rdbUserRef);

        update(rdbUserRef, {
          status: "online",
        });

        onDisconnectRef.update({
          status: "offline",
        });
      } catch (e) {
        console.error("Failed to write data to Realtime Database.");
        console.log(e);
      }
    }
  }, [user, currentUser]);

  // Reduce unnecessary writes by checking if the status has changed before updating.
  const updateUserStatus = async () => {
    if (!user) return;
    const db = getDatabase();
    const rdbUserRef = ref(db, `users/${user.uid}`);

    // Avoid unnecessary writes
    get(rdbUserRef).then((snapshot) => {
        if (snapshot.exists() && snapshot.val().status === "online") return;

        update(rdbUserRef, { status: "online" });
        onDisconnect(rdbUserRef).update({ status: "offline" });
    });
  };
  useEffect(() => {
      updateUserStatus();
  }, [user]);
  
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home user={user} />} />
          <Route path='/login' element={<Login/>} />
          <Route path='/register' element={<Register />} />
          <Route path='/space' element={<ProtectedRoute><Space user={user} /></ProtectedRoute>} />
          <Route path='/setup' element={<ProtectedRoute><AccountSetup user={user} currentUser={currentUser} /></ProtectedRoute>} />
          <Route path='/profile' element={<ProtectedRoute><Profile user={user} currentUser={currentUser} /></ProtectedRoute>} />
          <Route path='/community' element={<ProtectedRoute><Community user={user} /></ProtectedRoute>} />
          <Route path='/messages' element={<ProtectedRoute><Messages user={user} /></ProtectedRoute>} />
          <Route path='/rocket' element={<ProtectedRoute><Rocket user={user}/></ProtectedRoute>} />
          <Route path='/rocket/:roomID' element={<ProtectedRoute><Room user={user}/></ProtectedRoute>} />
          {/* Catch all component */}
          <Route path='*' element={<NotFound user={user} />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            backgroundColor: '#1c2120',
            border: '1px solid #2cc6ff',
            color: 'white',
            opacity: 0.9
          },
        }}
      />
    </>
  );
}

export default App;
