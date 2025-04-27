import { useState } from "react"; // Ajoute cet import
import { supabase } from "../services/Authentification"; // Import du client Supabase
import { toast } from "react-hot-toast"; // Import de toast pour les notifications

const Auth = () => {
  const [email, setEmail] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      console.error(error.message);
      //alert("Erreur lors de la connexion, vérifiez votre email.");
      toast.error("Erreur lors de la connexion, vérifiez votre email.");
    } else {
      //alert("Un lien de connexion a été envoyé à votre email.");
      toast.success("Un lien de connexion a été envoyé à votre email.");
    }
  };

  return (
    <div>
      <input
        type="email"
        placeholder="Entrez votre email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="p-2 border border-gray-300 rounded"
      />
      <button
        onClick={handleLogin}
        className="ml-2 p-2 bg-blue-500 text-white rounded"
      >
        Connexion
      </button>
    </div>
  );
};

export default Auth;
