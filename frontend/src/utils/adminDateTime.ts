export interface AdminLocalePreferences{timezone:string;dateFormat:'DD/MM/YYYY'|'MM/DD/YYYY'|'YYYY-MM-DD';timeFormat:'12h'|'24h'}
let preferences:AdminLocalePreferences={timezone:'Asia/Dhaka',dateFormat:'DD/MM/YYYY',timeFormat:'12h'};
export const setAdminLocalePreferences=(next:AdminLocalePreferences)=>{preferences=next};
const parts=(value:string|Date)=>{const map:Record<string,string>={};new Intl.DateTimeFormat('en-US',{timeZone:preferences.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).forEach(part=>{map[part.type]=part.value});return map};
export const formatAdminDate=(value:string|Date)=>{const p=parts(value);if(preferences.dateFormat==='YYYY-MM-DD')return`${p.year}-${p.month}-${p.day}`;if(preferences.dateFormat==='MM/DD/YYYY')return`${p.month}/${p.day}/${p.year}`;return`${p.day}/${p.month}/${p.year}`};
export const formatAdminTime=(value:string|Date)=>new Intl.DateTimeFormat('en-US',{timeZone:preferences.timezone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:preferences.timeFormat==='12h'}).format(new Date(value));
export const formatAdminDateTime=(value:string|Date)=>`${formatAdminDate(value)} ${formatAdminTime(value)}`;
