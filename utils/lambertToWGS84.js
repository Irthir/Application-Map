// utils/lambertToWGS84.js

export function LambertToWGS84(x, y) {
    const GRS80 = {
      a: 6378137.0,
      f: 1 / 298.257222101,
    };
  
    const n = 0.7256077650532670;
    const C = 11754255.426096; // Constante projetée
    const xs = 700000.0;
    const ys = 12655612.049876;
  
    const lonMerid = 3 * Math.PI / 180;
  
    const R = Math.sqrt((x - xs) ** 2 + (y - ys) ** 2);
    const gamma = Math.atan((x - xs) / (ys - y));
  
    const latiso = Math.log(C / R) / n;
  
    const phi = latitudeFromLatiso(latiso);
    const lon = lonMerid + gamma / n;
  
    return [phi * 180 / Math.PI, lon * 180 / Math.PI];
  }
  
  function latitudeFromLatiso(latiso) {
    const e = Math.sqrt(2 * (1 / 298.257222101) - (1 / 298.257222101) ** 2);
    let phi = 2 * Math.atan(Math.exp(latiso)) - Math.PI / 2;
    let delta;
  
    do {
      const esinPhi = e * Math.sin(phi);
      delta = (2 * Math.atan(Math.pow((1 + esinPhi) / (1 - esinPhi), e / 2) * Math.exp(latiso)) - Math.PI / 2) - phi;
      phi += delta;
    } while (Math.abs(delta) > 1e-11);
  
    return phi;
  }
  