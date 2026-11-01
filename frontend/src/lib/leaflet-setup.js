import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

// Vite rewrites asset URLs, so Leaflet's default icon path detection breaks
delete L.Icon.Default.prototype._getIconUrl; // else Leaflet prepends its detected path to our URLs
L.Icon.Default.mergeOptions({
  iconUrl: icon,
  iconRetinaUrl: icon2x,
  shadowUrl: shadow,
});

// ponytail: static center (Pontianak, from the spec's examples); make it configurable once the survey area is fixed
export const CENTER = [-0.026, 109.342];
