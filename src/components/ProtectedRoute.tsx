import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../components/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

import LoadingScreen from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserReady, setIsUserReady] = useState(false);
  const [isEmailConsentValid, setIsEmailConsentValid] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await checkUserConsent(currentUser); // Check Firestore once user is available
      } else {
        setUser(null);
        setIsUserReady(true);
      }
    });

    return () => unsubscribe(); // Cleanup the listener when the component unmounts
  }, []);

  const checkUserConsent = async (currentUser: User) => {
    try {
      const userDocRef = doc(db, 'user', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setIsEmailConsentValid(userDoc.data()?.emailConsent ?? true);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsUserReady(true);
    }
  };

  if (!isUserReady) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isEmailConsentValid) {
    return <Navigate to="/setup" />;
  }

  return <>{children}</>;
};
