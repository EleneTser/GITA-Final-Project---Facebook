import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Home } from './components/Home/Home';
import { Auth } from './components/auth/Auth';
import { LoadingScreen } from './components/Common/LoadingScreen';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || user.emailVerified) return;

    const interval = setInterval(async () => {
      try {
        await auth.currentUser?.reload();
        if (auth.currentUser?.emailVerified) {
          setUser({ ...auth.currentUser });
        }
      } catch (err) {
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="App">
      <AnimatePresence>
        {showLoadingScreen && (
          <LoadingScreen ready={!loading} onFinished={() => setShowLoadingScreen(false)} />
        )}
      </AnimatePresence>

      {!showLoadingScreen && (
        <Routes>
          {!user || !user.emailVerified ? (
            <Route path="/*" element={<Auth />} />
          ) : (
            <Route
              path="/*"
              element={
                <Home
                  userDisplayName={user.displayName || user.email?.split('@')[0] || 'Facebook User'}
                  currentUserId={user.uid}
                  onLogout={() => signOut(auth)}
                />
              }
            />
          )}
        </Routes>
      )}
    </div>
  );
}

export default App;