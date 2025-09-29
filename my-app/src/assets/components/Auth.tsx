

import { useState } from "react";
import { supabase } from "./supabaseClient";



export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

const handleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert("Login failed: " + error.message);
  } else {
    console.log("Login success:", data);
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("Current session:", sessionData.session);
    alert("Login success!");
  }
};
const handleSignup = async () => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert("Signup failed: " + error.message);
  } else {
    console.log("Signup success:", data);
    alert("Check your email to confirm your account (if confirmation required).");
  }
};






  return (
    <div>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleSignup}>Signup</button>
    </div>
  );
}
