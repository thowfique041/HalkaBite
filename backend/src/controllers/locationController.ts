import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const cache = new Map<string, { expires: number; value: unknown }>();
let lastRequestAt = 0;
let requestQueue = Promise.resolve();
const sanitize = (value: unknown, max = 200) => String(value ?? '').replace(/[<>\x00-\x1F]/g, '').trim().slice(0, max);
const cached = async (key: string, loader: () => Promise<unknown>) => {
  const hit = cache.get(key); if (hit && hit.expires > Date.now()) return hit.value;
  requestQueue = requestQueue.then(async () => { const wait = Math.max(0, 1100 - (Date.now() - lastRequestAt)); if (wait) await new Promise(resolve => setTimeout(resolve, wait)); lastRequestAt = Date.now(); });
  await requestQueue;
  const value = await loader(); cache.set(key, { value, expires: Date.now() + 30 * 60 * 1000 });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return value;
};
const nominatim = async (path: string) => {
  const response = await fetch(`https://nominatim.openstreetmap.org${path}`, { headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'HalkaBite/1.0 (restaurant-location)', Accept: 'application/json', 'Accept-Language': 'en' } });
  if (!response.ok) throw new Error(`Location service returned ${response.status}`);
  return response.json();
};
const normalize = (item: any) => { const address = item.address || {}; return {
  displayName: sanitize(item.display_name, 500), latitude: Number(item.lat), longitude: Number(item.lon),
  restaurantAddress: sanitize(address.road || address.pedestrian || address.neighbourhood || item.display_name, 300),
  area: sanitize(address.suburb || address.neighbourhood || address.quarter || address.village),
  city: sanitize(address.city || address.town || address.municipality || address.village),
  district: sanitize(address.state_district || address.county || address.district),
  division: sanitize(address.state || address.region), postalCode: sanitize(address.postcode, 30), country: sanitize(address.country), countryCode: sanitize(address.country_code, 5)
}; };

export const searchLocations = async (req: AuthRequest, res: Response) => { try {
  const query = sanitize(req.query.q); if (query.length < 3) return res.json({ success: true, data: [] });
  const raw: any = await cached(`search:${query.toLowerCase()}`, () => nominatim(`/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`));
  res.json({ success: true, data: raw.map(normalize) });
} catch (error: any) { res.status(502).json({ success: false, message: error.message || 'Location search failed' }); } };

export const reverseLocation = async (req: AuthRequest, res: Response) => { try {
  const latitude = Number(req.query.lat); const longitude = Number(req.query.lng);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return res.status(400).json({ success: false, message: 'Invalid coordinates' });
  const key = `reverse:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const raw: any = await cached(key, () => nominatim(`/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${latitude}&lon=${longitude}`));
  res.json({ success: true, data: normalize(raw) });
} catch (error: any) { res.status(502).json({ success: false, message: error.message || 'Reverse geocoding failed' }); } };
