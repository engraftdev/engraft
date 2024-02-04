import { makeFancyContext } from "@engraft/fancy-setup";
import { toolFromModule } from "@engraft/hostkit";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import ViteLib from "@engraft/tool-vite-lib";

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
export const context = makeFancyContext();

// TODO: snuck this in cuz it's nice
context.dispatcher.registerTool(toolFromModule(ViteLib))
