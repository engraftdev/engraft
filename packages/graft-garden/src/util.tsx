import { makeBasicContext } from "@engraft/basic-setup";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);
  return user;
}

// TODO: it's a hack to put this here as a global
export const context = makeBasicContext();
