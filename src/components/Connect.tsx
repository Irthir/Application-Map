import { useState } from "react"; // Ajoute cet import
import { supabase } from "../services/Authentification";

const Auth = () => {
  const [email, setEmail] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) console.error(error.message);
    else
    //alert("Check your email for the login link!");
    toast.success("Un lien de connexion a été envoyé à votre email.");
  };

  return (
    <div>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Auth;
