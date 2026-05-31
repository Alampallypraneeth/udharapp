import { createContext, useState, useEffect } from 'react';
import API from '../api/axios';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const stored = JSON.parse(localStorage.getItem('udhaar-user'));
      if (stored?.token) {
        setUser(stored);
        try {
          const { data } = await API.get('/auth/me');
          if (data.success) {
            const freshUser = { ...stored, ...data.data };
            localStorage.setItem('udhaar-user', JSON.stringify(freshUser));
            setUser(freshUser);
          }
        } catch (err) {
          console.warn("Failed to fetch fresh user profile:", err);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    const userData = { ...data.data, token: data.token };
    sessionStorage.removeItem('udhaar-unlocked');
    localStorage.setItem('udhaar-user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    const userData = { ...data.data, token: data.token };
    localStorage.setItem('udhaar-user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('udhaar-user');
    sessionStorage.removeItem('udhaar-unlocked');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    localStorage.setItem('udhaar-user', JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
