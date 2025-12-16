import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return user ? <Dashboard /> : <Auth />;
}

export default App;
