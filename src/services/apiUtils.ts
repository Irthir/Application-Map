export const fetchCompanyBySIREN = async (siren: string) => {
  const formattedSiren = siren.replace(/\s+/g, ""); // Supprimer les espaces dans le SIREN

  const response = await fetch(`https://application-map.onrender.com/api/insee/${formattedSiren}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Erreur lors de la récupération des données INSEE");
  }

  return response.json();
};




export const geocodeAddress = async (address: string) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${import.meta.env.VITE_MAPBOX_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Erreur API Mapbox (${response.status})`);
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      throw new Error("Adresse non trouvée");
    }

    const [longitude, latitude] = data.features[0].center;
    return { latitude, longitude };
  } catch (error) {
    console.error("Erreur de géocodage :", error);
    throw error; // Renvoie l'erreur pour être gérée ailleurs
  }
};


export const geocodeCompany = async (companyName: string) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(companyName)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length === 0) {
      throw new Error("Adresse non trouvée");
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error("Erreur de géocodage :", error);
    return null;
  }
};


